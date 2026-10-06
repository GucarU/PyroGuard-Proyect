from fastapi.testclient import TestClient

from src.backend.main import app

client = TestClient(app)


def clear_alerts():
    client.delete("/api/dev/alerts")


def test_happy_path_creates_alert():
    clear_alerts()
    response = client.post(
        "/api/sensors/detections",
        json={
            "sensor_id": "PG-VALPO-01",
            "sector": "Camino La Pólvora",
            "smoke_detected": True,
            "smoke_level": 82,
            "latitude": -33.0757,
            "longitude": -71.6136,
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["alert_created"] is True
    assert payload["alert"]["user_story"] == "HU-01"
    assert payload["alert"]["requirement"] == "RF01"
    assert payload["alert"]["status"] == "PENDIENTE"


def test_invalid_smoke_level_returns_422():
    response = client.post(
        "/api/sensors/detections",
        json={
            "sensor_id": "PG-VALPO-01",
            "sector": "Camino La Pólvora",
            "smoke_detected": True,
            "smoke_level": 150,
            "latitude": -33.0757,
            "longitude": -71.6136,
        },
    )
    assert response.status_code == 422


def test_missing_coordinates_returns_422():
    response = client.post(
        "/api/sensors/detections",
        json={
            "sensor_id": "PG-VALPO-01",
            "sector": "Camino La Pólvora",
            "smoke_detected": True,
            "smoke_level": 82,
        },
    )
    assert response.status_code == 422


def test_no_smoke_does_not_create_alert():
    clear_alerts()
    response = client.post(
        "/api/sensors/detections",
        json={
            "sensor_id": "PG-VALPO-01",
            "sector": "Camino La Pólvora",
            "smoke_detected": False,
            "smoke_level": 0,
            "latitude": -33.0757,
            "longitude": -71.6136,
        },
    )
    assert response.status_code == 201
    assert response.json()["alert_created"] is False
    assert client.get("/api/alerts").json() == []


def test_dispatch_unit_changes_status():
    clear_alerts()
    create = client.post(
        "/api/sensors/detections",
        json={
            "sensor_id": "PG-VALPO-01",
            "sector": "Camino La Pólvora",
            "smoke_detected": True,
            "smoke_level": 82,
            "latitude": -33.0757,
            "longitude": -71.6136,
        },
    )
    alert_id = create.json()["alert"]["id"]
    response = client.patch(
        f"/api/alerts/{alert_id}/dispatch",
        json={"unit": "BRAVO-1"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "UNIDAD_DESPACHADA"
    assert response.json()["dispatched_unit"] == "BRAVO-1"
