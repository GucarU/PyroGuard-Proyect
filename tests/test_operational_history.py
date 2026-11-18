import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest

from backend.database import db_connection, get_db_path
from backend.repositories import alert_repository


DETECTION = {
    "sensor_id": "PG-HIST", "sector": "Cerro Alegre", "smoke_detected": True,
    "smoke_level": 70, "latitude": -33.047, "longitude": -71.612,
}
HYDRANT = {"name": "Grifo Avenida", "sector": "Cerro Alegre", "latitude": -33.04, "longitude": -71.62}


def new_alert(client):
    response = client.post("/api/sensors/detections", json=DETECTION)
    assert response.status_code == 201
    return response.json()["alert"]["id"]


def test_hu07_historial_registra_responsables_desde_la_sesion(client, login_admin):
    operator = client.get("/api/auth/me").json()
    second_session = login_admin()
    assert second_session.get("/api/auth/me").json() == operator
    first = new_alert(client)
    second = new_alert(client)
    assert client.get(f"/api/alerts/{first}/history").json() == []
    assert client.patch(f"/api/alerts/{first}/dispatch", json={"unit": "BRAVO-1"}).status_code == 200
    validated = second_session.patch(f"/api/alerts/{first}/validate", json={"actor": "Nombre suplantado"}).json()
    discarded = second_session.patch(f"/api/alerts/{second}/discard", json={"actor": "Nombre suplantado"}).json()

    history = client.get(f"/api/alerts/{first}/history").json()
    assert [item["action"] for item in history] == ["UNIDAD_DESPACHADA", "VALIDADO"]
    assert [item["actor_id"] for item in history] == [operator["id"]] * 2
    assert [item["actor_name"] for item in history] == [operator["name"]] * 2
    assert all(item["id"] and item["alert_id"] == first for item in history)
    assert history[1]["acted_at"] == validated["validated_at"]

    dismissal, = client.get(f"/api/alerts/{second}/history").json()
    assert dismissal["action"] == "FALSA_ALARMA"
    assert dismissal["actor_id"] == operator["id"]
    assert dismissal["acted_at"] == discarded["discarded_at"]
    assert second_session.patch(f"/api/alerts/{second}/validate").status_code == 409
    assert client.get(f"/api/alerts/{second}/history").json() == [dismissal]
    assert client.get("/api/alerts/99999/history").status_code == 404


def test_hu07_decisiones_concurrentes_producen_un_solo_registro(client, login_admin):
    second_admin = login_admin()
    alert = new_alert(client)
    with ThreadPoolExecutor(max_workers=2) as pool:
        validate = pool.submit(client.patch, f"/api/alerts/{alert}/validate")
        discard = pool.submit(second_admin.patch, f"/api/alerts/{alert}/discard")
        responses = [validate.result(), discard.result()]
    assert sorted(item.status_code for item in responses) == [200, 409]
    winner, = client.get(f"/api/alerts/{alert}/history").json()
    assert winner["action"] == client.get(f"/api/alerts/{alert}").json()["status"]


def test_hu07_si_falla_el_historial_tambien_se_revierte_la_validacion(client, monkeypatch):
    alert = new_alert(client)

    def fail(*_args):
        raise sqlite3.OperationalError("fallo de escritura simulado")

    monkeypatch.setattr(alert_repository, "record_action", fail)
    with pytest.raises(sqlite3.OperationalError, match="fallo de escritura simulado"):
        client.patch(f"/api/alerts/{alert}/validate")
    assert client.get(f"/api/alerts/{alert}").json()["status"] == "PENDIENTE"
    assert client.get(f"/api/alerts/{alert}/history").json() == []


def test_hu07_datos_anteriores_son_visibles_sin_inventar_id(client):
    first = new_alert(client)
    with db_connection() as db:
        db.execute("UPDATE alertas SET status = 'VALIDADO', validated_by = ?, validated_at = ? WHERE id = ?",
                   ("Operadora anterior", "2026-10-02T10:10:00+00:00", first))
    legacy, = client.get(f"/api/alerts/{first}/history").json()
    assert legacy == {"id": None, "actor_id": None, "actor_name": "Operadora anterior", "alert_id": first,
                      "action": "VALIDADO", "acted_at": "2026-10-02T10:10:00+00:00"}


def test_hu14_alta_filtros_edicion_e_historial_se_conservan(login_admin):
    firefighter = login_admin("bombero")
    second_session = login_admin("bombero")
    created = firefighter.post("/api/hydrants", json={**HYDRANT, "status": "DISPONIBLE", "demo": False}).json()
    example = firefighter.post("/api/hydrants", json={**HYDRANT, "name": "Grifo DEMO", "sector": "Reñaca"}).json()
    assert created["demo"] is False and example["demo"] is True
    assert created["created_at"] == created["updated_at"]
    assert created["updated_by_id"] == firefighter.get("/api/auth/me").json()["id"]
    assert [item["id"] for item in firefighter.get("/api/hydrants", params={"sector": " cerro   alegre ", "status": "DISPONIBLE"}).json()] == [created["id"]]
    url = f"/api/hydrants/{created['id']}"
    assert second_session.patch(url, json={"status": "FUERA"}).status_code == 422
    assert second_session.patch(url, json={"latitude": -91}).status_code == 422
    assert second_session.patch("/api/hydrants/99999", json={"status": "SIN_AGUA"}).status_code == 404

    changed = second_session.patch(url, json={"status": "SIN_AGUA", "updated_by_id": -1}).json()
    assert changed["demo"] is False
    assert changed["updated_by_id"] == firefighter.get("/api/auth/me").json()["id"]
    renamed = second_session.patch(url, json={"name": "Grifo Avenida Norte"}).json()
    assert renamed["status"] == "SIN_AGUA" and renamed["sector"] == "Cerro Alegre"
    assert second_session.patch(url, json={"name": "Grifo Avenida Norte"}).json() == renamed
    assert firefighter.get("/api/hydrants", params={"status": "SIN_AGUA"}).json() == [renamed]

    history = firefighter.get(url + "/history").json()
    assert [(row["action"], row["previous_status"], row["status"]) for row in history] == [
        ("CREADO", None, "DISPONIBLE"), ("EDITADO", "DISPONIBLE", "SIN_AGUA"), ("EDITADO", "SIN_AGUA", "SIN_AGUA"),
    ]
    assert history[1]["actor_id"] == changed["updated_by_id"]
    assert history[1]["acted_at"] == changed["updated_at"]
    assert history[1]["changed_fields"] == ["status"]
    assert history[2]["changed_fields"] == ["name"]


def test_hu14_migracion_preserva_grifo_historico_y_primer_estado(login_admin):
    with sqlite3.connect(get_db_path()) as old:
        old.execute("""CREATE TABLE grifos_demo (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, latitude REAL NOT NULL,
            longitude REAL NOT NULL, status TEXT NOT NULL, demo INTEGER NOT NULL, created_at TEXT NOT NULL
        )""")
        old.execute("INSERT INTO grifos_demo VALUES (7, 'Grifo histórico', -33, -71, 'EN_REVISION', 1, '2026-10-02T00:00:00Z')")
    admin = login_admin("bombero")
    hydrant, = admin.get("/api/hydrants", params={"sector": ""}).json()
    assert hydrant["id"] == 7 and hydrant["demo"] is True
    assert hydrant["updated_at"] == "2026-10-02T00:00:00Z" and hydrant["updated_by"] is None
    assert admin.patch("/api/hydrants/7", json={"status": "DISPONIBLE", "sector": "Cerro Alegre"}).status_code == 200
    created, changed = admin.get("/api/hydrants/7/history").json()
    assert created["id"] is None and created["actor_id"] is None
    assert created["status"] == changed["previous_status"] == "EN_REVISION"
    assert changed["status"] == "DISPONIBLE"


def test_perfil_operador_conserva_restricciones_de_grifos(client):
    assert client.patch("/api/hydrants/1", json={"status": "SIN_AGUA"}).status_code == 403
    assert client.get("/api/hydrants/1/history").status_code == 403
