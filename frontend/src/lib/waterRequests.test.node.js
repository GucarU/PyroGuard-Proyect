import test from 'node:test'
import assert from 'node:assert/strict'
import { mapWaterRequests, waterRequestStatus } from './waterRequests.js'

test('HU-16 muestra solicitudes válidas confirmadas por el servidor', () => {
  const rows = [{ id: 9, latitude: -33.047, longitude: -71.612, status: 'PENDIENTE' }]
  assert.deepEqual(mapWaterRequests(rows), rows)
})

test('HU-16 ignora solicitudes sin coordenadas válidas y duplicados', () => {
  assert.deepEqual(mapWaterRequests([
    { id: 1, latitude: -33, longitude: -71 },
    { id: 1, latitude: -33, longitude: -71 },
    { id: 2, latitude: null, longitude: -71 },
    { id: 3, latitude: -180, longitude: -71 },
  ]).map(x => x.id), [1])
})

test('HU-16 interpreta el estado real guardado por el backend', () => {
  assert.equal(waterRequestStatus('PENDIENTE'), 'Pendiente de atención')
  assert.equal(waterRequestStatus('EN_ATENCION'), 'En atención')
  assert.equal(waterRequestStatus('RESUELTA'), 'Resuelta')
})
