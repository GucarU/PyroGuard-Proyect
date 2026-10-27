"""La API debe aceptar y guardar focos de distintos sensores de práctica."""


def test_hu01_recibe_focos_de_distintos_sensores(client):
    lecturas = [
        ("PG-VALPO-02", "Playa Ancha", -33.0246, -71.6407, 57),
        ("PG-VINA-01", "Achupallas", -33.0394, -71.5164, 91),
    ]
    ids = []
    for sensor, sector, latitud, longitud, humo in lecturas:
        respuesta = client.post('/api/sensors/detections', json={
            'sensor_id': sensor, 'sector': sector, 'smoke_detected': True,
            'smoke_level': humo, 'latitude': latitud, 'longitude': longitud,
        })
        assert respuesta.status_code == 201
        alerta = respuesta.json()['alert']
        assert alerta['sensor_id'] == sensor
        assert alerta['sector'] == sector
        assert alerta['smoke_level'] == humo
        assert 'detectó humo' in alerta['message']
        ids.append(alerta['id'])

    assert ids[0] != ids[1]
    guardadas = client.get('/api/alerts').json()
    assert {alerta['sensor_id'] for alerta in guardadas} == {'PG-VALPO-02', 'PG-VINA-01'}
