import hashlib
import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest

from backend.auth import SESSION_COOKIE
from backend.database import (
    CREATE_ALERTAS_TABLE,
    CREATE_REPORTES_VECINALES_TABLE,
    CREATE_SENSORES_ESTADO_TABLE,
    db_connection,
    get_db_path,
)


ACCOUNT = {"name": "Ana Pérez", "email": "Ana@example.com", "password": "Una frase privada 123"}


def test_registro_ciudadano_y_acceso_por_correo(anonymous_client):
    response = anonymous_client.post("/api/auth/register", json=ACCOUNT)
    assert response.status_code == 201
    assert response.json() == {
        "id": 1, "name": "Ana Pérez", "email": "ana@example.com", "role": "CIUDADANO", "profile": None,
    }
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=lax" in response.headers["set-cookie"].lower()
    assert response.headers["cache-control"] == "no-store"
    token = anonymous_client.cookies[SESSION_COOKIE]
    with db_connection() as db:
        stored_user = db.execute("SELECT password_hash FROM auth_users").fetchone()
        session = db.execute("SELECT token_hash FROM auth_sessions").fetchone()
    assert stored_user["password_hash"].startswith("$argon2id$")
    assert ACCOUNT["password"] not in stored_user["password_hash"]
    assert session["token_hash"] == hashlib.sha256(token.encode()).hexdigest()
    assert anonymous_client.get("/api/auth/me").json() == response.json()

    duplicate = anonymous_client.post("/api/auth/register", json={**ACCOUNT, "email": "ANA@example.com"})
    assert duplicate.status_code == 409
    wrong = anonymous_client.post("/api/auth/login", json={"email": "ana@example.com", "password": "incorrecta"})
    unknown = anonymous_client.post("/api/auth/login", json={"email": "otro@example.com", "password": "incorrecta"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    anonymous_client.cookies.clear()
    correct = anonymous_client.post("/api/auth/login", json={"email": ACCOUNT["email"], "password": ACCOUNT["password"]})
    assert correct.json()["role"] == "CIUDADANO"


def test_registro_rechaza_privilegios_y_protege_credenciales_en_errores(anonymous_client):
    for extra in ({"role": "ADMIN"}, {"profile": "bombero"}):
        response = anonymous_client.post("/api/auth/register", json={**ACCOUNT, **extra})
        assert response.status_code == 422
        assert ACCOUNT["password"] not in response.text
    short_password = "Corta123"
    response = anonymous_client.post("/api/auth/register", json={**ACCOUNT, "password": short_password})
    assert response.status_code == 422
    assert short_password not in response.text
    assert anonymous_client.get("/api/auth/me").status_code == 401


def test_alta_administrativa_explicita_y_sin_sobrescribir(anonymous_client, monkeypatch):
    from backend.create_admin import main

    credentials = {"email": "admin@example.com", "password": "Frase privada admin 34"}
    monkeypatch.setenv("PYROGUARD_ADMIN_EMAIL", credentials["email"])
    monkeypatch.setenv("PYROGUARD_ADMIN_PASSWORD", credentials["password"])
    monkeypatch.setenv("PYROGUARD_ADMIN_PROFILE", "bombero")
    monkeypatch.setenv("PYROGUARD_ADMIN_NAME", "Guardia PyroGuard")
    assert anonymous_client.post("/api/auth/login", json=credentials).status_code == 401
    main()
    with pytest.raises(SystemExit, match="ya está registrado"):
        main()
    account = anonymous_client.post("/api/auth/login", json=credentials).json()
    assert account["role"] == "ADMIN"
    assert account["profile"] == "bombero"
    assert anonymous_client.get("/api/alerts").status_code == 200

    assert anonymous_client.post("/api/auth/register", json=ACCOUNT).status_code == 201
    monkeypatch.setenv("PYROGUARD_ADMIN_EMAIL", ACCOUNT["email"])
    with pytest.raises(SystemExit, match="ya está registrado"):
        main()
    assert anonymous_client.get("/api/auth/me").json()["role"] == "CIUDADANO"


def test_apis_operativas_rechazan_anonimos_y_ciudadanos(anonymous_client, citizen_client):
    attempts = [
        ("GET", "/api/alerts"), ("GET", "/api/alerts/1"), ("PATCH", "/api/alerts/1/dispatch"),
        ("PATCH", "/api/alerts/1/validate"), ("PATCH", "/api/alerts/1/discard"), ("GET", "/api/sectors"),
        ("GET", "/api/sensors/status"), ("POST", "/api/sensors/detections"),
        ("PATCH", "/api/sensors/1/wind"), ("PATCH", "/api/sensors/1/battery"),
        ("POST", "/api/sensors/1/temperature"), ("GET", "/api/sensors/1/temperature-history"),
        ("GET", "/api/shelters"), ("PATCH", "/api/shelters/1/occupancy"), ("PATCH", "/api/shelters/1/status"),
        ("GET", "/api/water-requests"), ("POST", "/api/water-requests"),
        ("GET", "/api/reports/neighborhood"), ("GET", "/uploads/123.png"),
        ("PATCH", "/api/reports/neighborhood/1/status"), ("PUT", "/api/reports/neighborhood/1/alert"),
        ("GET", "/api/evacuations/safe"), ("GET", "/api/hydrants"), ("POST", "/api/hydrants"),
        ("DELETE", "/api/dev/alerts"),
    ]
    forged_role = {"X-Pyroguard-Role": "bombero"}
    for method, path in attempts:
        assert anonymous_client.request(method, path, headers=forged_role).status_code == 401, path
        assert citizen_client.request(method, path, headers=forged_role).status_code == 403, path


def test_aporte_ciudadano_requiere_su_propio_rol(anonymous_client, client):
    for path in ("/api/reports/neighborhood", "/api/evacuations/safe"):
        assert anonymous_client.post(path).status_code == 401
        assert client.post(path).status_code == 403


def test_rotacion_cierre_y_expiracion_en_el_servidor(anonymous_client, new_client, monkeypatch):
    monkeypatch.setenv("PYROGUARD_SESSION_TTL_SECONDS", "42")
    registered = anonymous_client.post("/api/auth/register", json=ACCOUNT)
    assert "Max-Age=42" in registered.headers["set-cookie"]
    first_token = anonymous_client.cookies[SESSION_COOKIE]
    credentials = {"email": ACCOUNT["email"], "password": ACCOUNT["password"]}
    rotated = anonymous_client.post("/api/auth/login", json=credentials)
    assert rotated.status_code == 200
    second_token = anonymous_client.cookies[SESSION_COOKIE]
    assert second_token != first_token
    replay = new_client()
    assert replay.get("/api/auth/me", headers={"Cookie": f"{SESSION_COOKIE}={first_token}"}).status_code == 401

    logout = anonymous_client.post("/api/auth/logout")
    assert logout.status_code == 204
    assert "Max-Age=0" in logout.headers["set-cookie"]
    assert anonymous_client.get("/api/auth/me").status_code == 401
    assert replay.get("/api/auth/me", headers={"Cookie": f"{SESSION_COOKIE}={second_token}"}).status_code == 401

    assert anonymous_client.post("/api/auth/login", json=credentials).status_code == 200
    with db_connection() as db:
        db.execute("UPDATE auth_sessions SET expires_at = 0")
    expired = anonymous_client.get("/api/auth/me")
    assert expired.status_code == 401
    assert "expiró" in expired.json()["detail"]
    assert anonymous_client.get("/api/alerts").status_code == 401


def test_cookie_https_y_proteccion_de_origen(new_client):
    client = new_client(base_url="https://testserver")
    blocked = client.post("/api/auth/register", json=ACCOUNT, headers={"Origin": "https://externo.example.com"})
    assert blocked.status_code == 403
    response = client.post("/api/auth/register", json=ACCOUNT, headers={"Origin": "https://testserver"})
    assert response.status_code == 201
    assert "secure" in response.headers["set-cookie"].lower()
    assert client.post("/api/auth/logout", headers={"Origin": "null"}).status_code == 403
    assert client.get("/api/auth/me").status_code == 200


def test_registros_concurrentes_conservan_una_base_sqlite_anterior(anonymous_client, new_client):
    with sqlite3.connect(get_db_path()) as old_db:
        old_db.execute(CREATE_ALERTAS_TABLE)
        old_db.execute(CREATE_SENSORES_ESTADO_TABLE)
        old_db.execute(CREATE_REPORTES_VECINALES_TABLE)
        old_db.execute("""INSERT INTO alertas
            (user_story, requirement, sensor_id, sector, smoke_level, latitude, longitude, priority, message, detected_at)
            VALUES ('HU-01','RF-01','sensor-1','Cerro',85,-33,-71,'ALTA','Alerta anterior','2026-01-01')""")
        old_db.execute("""INSERT INTO sensores_estado (sensor_id, sector, latitude, longitude, updated_at)
            VALUES ('sensor-1','Cerro',-33,-71,'2026-01-01')""")
        old_db.execute("""INSERT INTO reportes_vecinales (photo_path, original_filename, latitude, longitude, created_at)
            VALUES ('/uploads/foto.jpg','foto.jpg',-33,-71,'2026-01-01')""")
    clients = [anonymous_client, new_client()]
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda client: client.post("/api/auth/register", json=ACCOUNT), clients))
    assert sorted(response.status_code for response in responses) == [201, 409]
    with db_connection() as db:
        assert db.execute("SELECT message FROM alertas").fetchone()[0] == "Alerta anterior"
        assert db.execute("SELECT sector FROM sensores_estado").fetchone()[0] == "Cerro"
        assert db.execute("SELECT photo_path FROM reportes_vecinales").fetchone()[0] == "/uploads/foto.jpg"
        assert db.execute("SELECT role FROM auth_users").fetchone()[0] == "CIUDADANO"
