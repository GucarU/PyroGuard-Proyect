"""HU-16: verificar que un punto solicitado desde terreno esté disponible para el mapa central."""

def test_solicitud_terreno_se_registra_y_consulta_para_mapa(client):
    request = {
        "requester": "Cuadrilla de prueba",
        "latitude": -33.0487,
        "longitude": -71.6251,
        "description": "Enviar cuadrilla a punto marcado en mapa secundario",
    }
    sent = client.post('/api/water-requests', json=request)
    assert sent.status_code == 201
    created = sent.json()
    assert created['id'] > 0
    assert created['status'] == 'PENDIENTE'
    assert created['latitude'] == request['latitude']
    assert created['longitude'] == request['longitude']

    listed = client.get('/api/water-requests')
    assert listed.status_code == 200
    saved = next(row for row in listed.json() if row['id'] == created['id'])
    assert saved['requester'] == request['requester']
    assert saved['description'] == request['description']
    assert saved['latitude'] == request['latitude']
    assert saved['longitude'] == request['longitude']


def test_solicitud_fuera_de_rango_no_se_acepta(client):
    response = client.post('/api/water-requests', json={
        "requester": "Cuadrilla de prueba",
        "latitude": -100,
        "longitude": -71.61,
        "description": "Punto inválido",
    })
    assert response.status_code == 422
