import sqlite3
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest

from backend.database import get_db_path


REPORTS = "/api/reports/neighborhood"
DETECTION = {
    "sensor_id": "PG-PRUEBA", "sector": "Cerro Alegre", "smoke_detected": True,
    "smoke_level": 57, "latitude": -33.045, "longitude": -71.626,
}


def send_report(client, photo, description="Posible foco desde el cerro", **fields):
    response = client.post(
        REPORTS,
        data={"latitude": "-33.04", "longitude": "-71.63", "description": description, **fields},
        files={"photo": ("foco.png", photo, "image/png")} if photo else None,
    )
    assert response.status_code == 201
    return response.json()


def test_revisar_validar_y_vincular_a_alerta_existente(client, citizen_client, image_bytes):
    png = image_bytes()
    report = send_report(citizen_client, png)
    report_url = f"{REPORTS}/{report['id']}"
    assert report["status"] == "PENDIENTE"
    assert client.get("/api/alerts").json() == []
    assert client.get(REPORTS).json()[0]["id"] == report["id"]
    assert client.get(report["photo_path"]).content == png
    assert client.put(f"{report_url}/alert", json={"alert_id": 1}).status_code == 409

    reviewing = client.patch(f"{report_url}/status", json={"status": "EN_REVISION"}).json()
    assert reviewing["status"] == "EN_REVISION"
    assert reviewing["reviewed_by"] == "Personal PyroGuard"
    assert reviewing["reviewed_at"]
    assert citizen_client.get(f"{REPORTS}/mine").json()[0]["status"] == "EN_REVISION"

    validated = client.patch(f"{report_url}/status", json={"status": "VALIDADO"}).json()
    assert validated["status"] == "VALIDADO"
    assert validated["alert_id"] is None
    assert client.get("/api/alerts").json() == []
    assert client.put(f"{report_url}/alert", json={"alert_id": 999}).status_code == 404

    operational = client.post("/api/sensors/detections", json=DETECTION).json()["alert"]
    link = client.put(f"{report_url}/alert", json={"alert_id": operational["id"]})
    assert link.status_code == 200
    assert link.json()["alert_id"] == operational["id"]
    assert client.put(f"{report_url}/alert", json={"alert_id": operational["id"]}).json() == link.json()
    assert client.patch(f"{report_url}/status", json={"status": "VALIDADO"}).json() == link.json()
    assert client.get("/api/alerts").json() == [operational]
    assert client.patch(f"{report_url}/status", json={"status": "DESCARTADO"}).status_code == 409

    another_alert = client.post("/api/sensors/detections", json=DETECTION).json()["alert"]
    assert client.put(f"{report_url}/alert", json={"alert_id": another_alert["id"]}).status_code == 409
    assert len(client.get(REPORTS).json()) == 1

    assert client.delete("/api/dev/alerts").status_code == 200
    report_after_delete = client.get(REPORTS).json()[0]
    assert report_after_delete["status"] == "VALIDADO"
    assert report_after_delete["alert_id"] is None


def test_cada_ciudadano_solo_ve_sus_reportes_y_fotos(client, citizen_client, anonymous_client, image_bytes):
    account = anonymous_client.post("/api/auth/register", json={
        "name": "Segundo vecino", "email": "segundo@example.com", "password": "Contraseña de prueba 234",
    }).json()
    png = image_bytes()
    first = send_report(citizen_client, png, citizen_id=account["id"])
    second = send_report(anonymous_client, png, "Otro foco")
    first_url = f"{REPORTS}/{first['id']}"
    assert client.patch(f"{first_url}/status", json={"status": "DESCARTADO"}).status_code == 200
    for viewer, report, excluded in [(citizen_client, first, second), (anonymous_client, second, first)]:
        own_report, = viewer.get(f"{REPORTS}/mine").json()
        assert own_report["id"] == report["id"]
        assert own_report["status"] == ("DESCARTADO" if report == first else "PENDIENTE")
        assert set(own_report) == set(report) | {"reviewed_at"}
        assert bool(own_report["reviewed_at"]) is (report == first)
        assert viewer.get(own_report["photo_path"]).content == png
        assert viewer.get(f"{REPORTS}/mine/{excluded['id']}/photo").status_code == 404
        assert viewer.get(report["photo_path"]).status_code == 403

    assert client.get(f"{REPORTS}/mine").status_code == 403
    assert citizen_client.patch(f"{first_url}/status", json={"status": "VALIDADO"}).status_code == 403
    assert citizen_client.put(f"{first_url}/alert", json={"alert_id": 1}).status_code == 403


def test_decisiones_finales_concurrentes_no_se_sobrescriben(client, citizen_client):
    report = send_report(citizen_client, None)

    def decide(status):
        return client.patch(f"{REPORTS}/{report['id']}/status", json={"status": status})

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(decide, ["VALIDADO", "DESCARTADO"]))
    assert sorted(response.status_code for response in results) == [200, 409]
    winner = next(response.json() for response in results if response.status_code == 200)
    assert client.get(REPORTS).json() == [winner]


def test_migracion_conserva_reportes_historicos_sin_asignarles_un_autor(new_client, login_admin):
    with sqlite3.connect(get_db_path()) as db:
        db.execute("""CREATE TABLE reportes_vecinales (
            id INTEGER PRIMARY KEY AUTOINCREMENT, photo_path TEXT NOT NULL, original_filename TEXT NOT NULL,
            latitude REAL NOT NULL, longitude REAL NOT NULL, description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'PENDIENTE', created_at TEXT NOT NULL
        )""")
        db.execute("""INSERT INTO reportes_vecinales
            (photo_path, original_filename, latitude, longitude, description, created_at)
            VALUES ('/uploads/historico.jpg','historico.jpg',-33,-71,'Reporte histórico','2026-01-01T00:00:00+00:00')
        """)
    client = login_admin()
    existing, = client.get(REPORTS).json()
    assert existing["description"] == "Reporte histórico"
    assert existing["status"] == "PENDIENTE"
    assert existing["alert_id"] is None
    assert client.patch(f"{REPORTS}/{existing['id']}/status", json={"status": "EN_REVISION"}).status_code == 200

    citizen = new_client()
    assert citizen.post("/api/auth/register", json={
        "name": "Vecino nuevo", "email": "nuevo@example.com", "password": "Contraseña de prueba 567",
    }).status_code == 201
    assert citizen.get(f"{REPORTS}/mine").json() == []
    submitted = send_report(citizen, None, location_label="Cerro Alto")
    assert submitted["photo_path"] is None
    assert [report["id"] for report in client.get(REPORTS).json()] == [submitted["id"], existing["id"]]


@pytest.mark.parametrize(("format", "extension", "mime"), [
    ("JPEG", "jpg", "image/jpeg"), ("PNG", "png", "image/png"), ("WEBP", "webp", "image/webp"),
])
def test_archivos_validos_admitidos(citizen_client, image_bytes, format, extension, mime):
    photo = image_bytes(format)
    response = citizen_client.post(REPORTS, data={"latitude": -33.04, "longitude": -71.63},
                                   files={"photo": (f"foto.{extension}", photo, mime)})
    assert response.status_code == 201
    owned_photo = citizen_client.get(f"{REPORTS}/mine/{response.json()['id']}/photo")
    assert owned_photo.content == photo


def test_archivos_contenido_invalido_y_tamano_se_rechazan(citizen_client, image_bytes, tmp_path):
    for photo in (b"texto disfrazado", image_bytes()[:24], image_bytes("JPEG"), b"x" * (5 * 1024 * 1024 + 1)):
        response = citizen_client.post(REPORTS, data={"latitude": -33.04, "longitude": -71.63},
                                       files={"photo": ("foto.png", photo, "image/png")})
        assert response.status_code == 422
    assert citizen_client.get(f"{REPORTS}/mine").json() == []
    assert not (tmp_path / "uploads").exists()


def test_reintentos_simultaneos_conservan_un_reporte_y_una_foto(citizen_client, image_bytes, tmp_path):
    identifier = str(uuid4())
    png = image_bytes()
    with ThreadPoolExecutor(max_workers=2) as pool:
        reports = list(pool.map(lambda _: send_report(citizen_client, png, submission_id=identifier), range(2)))
    assert reports[0] == reports[1]
    assert len(list((tmp_path / "uploads").iterdir())) == 1
    assert len(citizen_client.get(f"{REPORTS}/mine").json()) == 1


def test_reporte_sin_foto_visible_para_su_autor_y_administracion(client, citizen_client):
    report = send_report(citizen_client, None, location_label="  Cerro Alegre  ", submission_id=str(uuid4()))
    assert report["status"] == "PENDIENTE"
    assert report["location_label"] == "Cerro Alegre"
    assert report["photo_path"] is report["original_filename"] is None
    own, = citizen_client.get(f"{REPORTS}/mine").json()
    assert own["photo_path"] is None
    assert citizen_client.get(f"{REPORTS}/mine/{report['id']}/photo").status_code == 404
    assert client.get(REPORTS).json()[0]["id"] == report["id"]
