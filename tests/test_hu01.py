from contextlib import contextmanager
import sqlite3

import pytest

from src.backend import main


DETECTION = {
    "sensor_id": "PG-VALPO-01",
    "sector": "Camino La Pólvora",
    "smoke_detected": True,
    "smoke_level": 82,
    "latitude": -33.0757,
    "longitude": -71.6136,
}


def test_p1_deteccion_valida_crea_alerta_pendiente(client):
    response = client.post("/api/sensors/detections", json=DETECTION)
    assert response.status_code == 201
    payload = response.json()
    assert payload["alert_created"] is True
    assert payload["alert"]["user_story"] == "HU-01"
    assert payload["alert"]["requirement"] == "RF01"
    assert payload["alert"]["status"] == "PENDIENTE"


def test_p2_nivel_sobre_100_devuelve_422(client):
    response = client.post(
        "/api/sensors/detections", json={**DETECTION, "smoke_level": 150}
    )
    assert response.status_code == 422
    assert client.get("/api/alerts").json() == []


@pytest.mark.parametrize("field", ["latitude", "longitude"])
def test_p4_falta_una_coordenada_devuelve_422_y_no_guarda(client, field):
    detection = {key: value for key, value in DETECTION.items() if key != field}
    response = client.post("/api/sensors/detections", json=detection)
    assert response.status_code == 422
    assert client.get("/api/alerts").json() == []


@pytest.mark.parametrize("level", [-1, 101])
def test_p5_nivel_humo_fuera_de_rango_devuelve_422(client, level):
    response = client.post(
        "/api/sensors/detections", json={**DETECTION, "smoke_level": level}
    )
    assert response.status_code == 422
    assert client.get("/api/alerts").json() == []


def test_p3_lectura_sin_humo_no_crea_alerta(client):
    response = client.post(
        "/api/sensors/detections",
        json={**DETECTION, "smoke_detected": False, "smoke_level": 0},
    )
    assert response.status_code == 201
    assert response.json()["alert_created"] is False
    assert client.get("/api/alerts").json() == []


@pytest.mark.parametrize(
    ("level", "expected"), [(39, "BAJA"), (40, "MEDIA"), (69, "MEDIA"), (70, "ALTA")]
)
def test_prioridad_en_los_limites_de_negocio(client, level, expected):
    response = client.post(
        "/api/sensors/detections", json={**DETECTION, "smoke_level": level}
    )
    assert response.status_code == 201
    assert response.json()["alert"]["priority"] == expected


def test_p6_alerta_persiste_y_se_lee_desde_otra_conexion(client):
    created = client.post("/api/sensors/detections", json=DETECTION).json()["alert"]
    with main.db_connection() as connection:
        row = connection.execute(
            "SELECT id, status FROM alertas WHERE id = ?", (created["id"],)
        ).fetchone()
    assert row["id"] == created["id"]
    assert row["status"] == "PENDIENTE"
    assert client.get(f"/api/alerts/{created['id']}").json()["id"] == created["id"]


def test_alerta_inexistente_devuelve_404(client):
    assert client.get("/api/alerts/987654321").status_code == 404


def test_despacho_repetido_devuelve_409(client):
    created = client.post("/api/sensors/detections", json=DETECTION).json()["alert"]
    path = f"/api/alerts/{created['id']}/dispatch"
    assert client.patch(path, json={"unit": "BRAVO-1"}).status_code == 200
    assert client.patch(path, json={"unit": "BRAVO-1"}).status_code == 409


def test_despachar_alerta_inexistente_devuelve_404(client):
    response = client.patch("/api/alerts/987654321/dispatch", json={"unit": "BRAVO-1"})
    assert response.status_code == 404


def test_p8_falla_sqlite_devuelve_500_sin_confirmar_creacion(client, monkeypatch):
    @contextmanager
    def failing_connection():
        raise sqlite3.OperationalError("fallo simulado de persistencia")
        yield  # Hace que la función sea un context manager.

    monkeypatch.setattr(main, "db_connection", failing_connection)
    response = client.post("/api/sensors/detections", json=DETECTION)
    assert response.status_code == 500
    assert response.json().get("alert_created") is not True
