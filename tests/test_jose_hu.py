from pathlib import Path


def test_hu02_bateria_bajo_15_activa_estado_rojo(client):
    sensors = client.get("/api/sensors/status")
    assert sensors.status_code == 200
    sensor_id = sensors.json()[0]["sensor_id"]

    response = client.patch(
        f"/api/sensors/{sensor_id}/battery", json={"battery_level": 14}
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["battery_level"] == 14
    assert payload["battery_alert"] is True


def test_hu02_bateria_15_no_activa_alerta(client):
    sensor_id = client.get("/api/sensors/status").json()[0]["sensor_id"]
    response = client.patch(
        f"/api/sensors/{sensor_id}/battery", json={"battery_level": 15}
    )
    assert response.status_code == 200
    assert response.json()["battery_alert"] is False


def test_hu03_registra_y_recupera_temperatura(client):
    sensor_id = client.get("/api/sensors/status").json()[0]["sensor_id"]
    created = client.post(
        f"/api/sensors/{sensor_id}/temperature", json={"temperature_c": 31.5}
    )
    assert created.status_code == 201
    assert created.json()["temperature_c"] == 31.5

    history = client.get(f"/api/sensors/{sensor_id}/temperature-history")
    assert history.status_code == 200
    assert any(item["temperature_c"] == 31.5 for item in history.json())


def test_hu04_viento_sobre_umbral_activa_advertencia(client, monkeypatch):
    monkeypatch.setenv("WIND_ALERT_THRESHOLD_KMH", "40")
    sensor_id = client.get("/api/sensors/status").json()[0]["sensor_id"]
    response = client.patch(
        f"/api/sensors/{sensor_id}/wind", json={"wind_speed_kmh": 55}
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["wind_alert"] is True
    assert payload["wind_threshold_kmh"] == 40
    assert payload["latitude"] is not None
    assert payload["longitude"] is not None


def test_hu12_reporte_vecinal_guarda_foto_y_gps(client, tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    monkeypatch.setenv("PYROGUARD_UPLOAD_DIR", str(upload_dir))
    response = client.post(
        "/api/reports/neighborhood",
        data={
            "latitude": "-33.0472",
            "longitude": "-71.6127",
            "description": "Humo visible desde el cerro",
        },
        files={"photo": ("foco.jpg", b"foto-de-prueba", "image/jpeg")},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["status"] == "PENDIENTE"
    assert payload["latitude"] == -33.0472
    assert payload["longitude"] == -71.6127
    assert payload["photo_path"].startswith("/uploads/")
    stored_name = payload["photo_path"].split("/")[-1]
    assert (upload_dir / stored_name).exists()

    listed = client.get("/api/reports/neighborhood")
    assert listed.status_code == 200
    assert listed.json()[0]["id"] == payload["id"]


def test_hu12_rechaza_extension_no_permitida(client):
    response = client.post(
        "/api/reports/neighborhood",
        data={"latitude": "-33", "longitude": "-71", "description": "prueba"},
        files={"photo": ("archivo.txt", b"x", "text/plain")},
    )
    assert response.status_code == 422


def test_hu15_contador_actualiza_cupos(client):
    shelters = client.get("/api/shelters")
    assert shelters.status_code == 200
    shelter = next(item for item in shelters.json() if not item["full"])
    before = shelter["occupancy"]

    response = client.patch(
        f"/api/shelters/{shelter['id']}/occupancy", json={"delta": 1}
    )
    assert response.status_code == 200
    assert response.json()["occupancy"] == before + 1


def test_hu15_no_permite_superar_capacidad(client):
    shelters = client.get("/api/shelters").json()
    full = next(item for item in shelters if item["full"])
    response = client.patch(
        f"/api/shelters/{full['id']}/occupancy", json={"delta": 1}
    )
    assert response.status_code == 422
