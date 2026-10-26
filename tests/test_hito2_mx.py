"""Pruebas funcionales de las HU-05, 06, 08, 10 y 14.
No requieren red ni modifican la base de datos del proyecto.
"""
import pytest

DETECTION = {"sensor_id": "PG-VALPO-01", "sector": "Cerro Alegre",
             "smoke_detected": True, "smoke_level": 71,
             "latitude": -33.044, "longitude": -71.629}


def create_alert(client, sector="Cerro Alegre"):
    result = client.post('/api/sensors/detections', json={**DETECTION, 'sector': sector})
    assert result.status_code == 201
    return result.json()['alert']['id']


def test_hu05_valida_con_actor_y_persiste(client):
    aid = create_alert(client)
    response = client.patch(f'/api/alerts/{aid}/validate', json={'actor': 'Maximiliano demo'})
    assert response.status_code == 200
    assert response.json()['status'] == 'VALIDADO'
    assert response.json()['validated_by'] == 'Maximiliano demo'
    assert response.json()['validated_at']
    assert client.get(f'/api/alerts/{aid}').json()['status'] == 'VALIDADO'
    assert client.patch(f'/api/alerts/{aid}/validate', json={'actor':'Otro'}).status_code == 409


def test_hu05_no_permite_actor_vacio_ni_id_inexistente(client):
    aid = create_alert(client)
    assert client.patch(f'/api/alerts/{aid}/validate', json={'actor':''}).status_code == 422
    assert client.patch('/api/alerts/99999/validate', json={'actor':'Operador'}).status_code == 404


def test_hu08_descarta_y_no_permita_despacho(client):
    aid = create_alert(client)
    response = client.patch(f'/api/alerts/{aid}/discard', json={'actor':'Operador demo'})
    assert response.status_code == 200
    assert response.json()['status'] == 'FALSA_ALARMA'
    assert response.json()['discarded_by'] == 'Operador demo'
    assert client.patch(f'/api/alerts/{aid}/dispatch', json={'unit':'BRAVO-1'}).status_code == 409
    assert client.get(f'/api/alerts/{aid}').json()['status'] == 'FALSA_ALARMA'


def test_hu08_no_descarta_alerta_ya_despachada(client):
    aid = create_alert(client)
    assert client.patch(f'/api/alerts/{aid}/dispatch', json={'unit': 'BRAVO-1'}).status_code == 200
    assert client.patch(f'/api/alerts/{aid}/discard', json={'actor':'Operador'}).status_code == 409


def test_hu06_filtro_por_sector(client):
    create_alert(client, 'Cerro Alegre')
    create_alert(client, 'Reñaca')
    results = client.get('/api/alerts', params={'sector': ' cerro alegre '})
    assert results.status_code == 200
    assert len(results.json()) == 1
    assert results.json()[0]['sector'] == 'Cerro Alegre'
    catalog = client.get('/api/sectors').json()
    assert {s['sector'] for s in catalog} >= {'Cerro Alegre', 'Reñaca'}


def test_hu10_persiste_registro_de_prueba(client):
    response = client.post('/api/evacuations/safe', json={'alias':'Vecino Prueba', 'sector':'Cerro Alegre'})
    assert response.status_code == 201
    assert response.json()['status'] == 'A_SALVO'
    assert client.get('/api/evacuations/safe').status_code == 403
    records = client.get('/api/evacuations/safe', headers={'X-Pyroguard-Role':'municipal'})
    assert records.status_code == 200
    assert records.json()[0]['alias'] == 'Vecino Prueba'


def test_hu10_valida_campos(client):
    response = client.post('/api/evacuations/safe', json={'alias':'', 'sector':'Cerro Alegre'})
    assert response.status_code == 422


def test_hu14_control_de_rol_demo_y_puntos(client):
    assert client.get('/api/hydrants').status_code == 403
    assert client.post('/api/hydrants', json={'name':'Grifo DEMO', 'latitude':-33.04, 'longitude':-71.6}).status_code == 403
    headers = {'X-Pyroguard-Role':'bombero'}
    response = client.post('/api/hydrants', headers=headers, json={'name':'Grifo de prueba 1', 'latitude':-33.04, 'longitude':-71.6})
    assert response.status_code == 201
    assert response.json()['demo'] is True
    result = client.get('/api/hydrants', headers=headers)
    assert result.status_code == 200
    assert len(result.json()) == 1
    assert result.json()[0]['latitude'] == -33.04


def test_hu14_rechaza_coordenadas_fuera_de_rango(client):
    response = client.post('/api/hydrants', headers={'X-Pyroguard-Role':'municipal'}, json={'name':'Grifo DEMO 1', 'latitude':-99, 'longitude':-71.6})
    assert response.status_code == 422


def test_compatibilidad_modulos_existentes(client):
    assert client.get('/health').json()['status'] == 'ok'
    assert client.get('/api/water-requests').status_code == 200
    assert client.get('/api/shelters').status_code == 200
    assert client.get('/api/sensors/status').status_code == 200
