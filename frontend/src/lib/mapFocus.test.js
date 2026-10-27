import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveMapFocus } from './mapFocus.js'

const alerts = [{ id: 1, sector: 'Cerro Alegre', latitude: -33.041, longitude: -71.628 }]
const waterRequests = [{ id: 8, latitude: -33.080, longitude: -71.520 }]

test('seleccionar cerro manda el mapa al foco de incendios y NO a la solicitud previa', () => {
  const result = resolveMapFocus({ sector: 'Cerro Alegre', alerts, waterRequests, focusedWaterRequestId: 8 })
  assert.deepEqual(result.point, [-33.041, -71.628])
  assert.equal(result.kind, 'sector')
})

test('la solicitud recibe foco solamente cuando no hay filtro sectorial activo', () => {
  const result = resolveMapFocus({ alerts, waterRequests, focusedWaterRequestId: 8 })
  assert.deepEqual(result.point, [-33.080, -71.520])
  assert.equal(result.kind, 'solicitud')
})

test('filtro a un cerro sin alertas mantiene el mapa y no abre solicitudes', () => {
  const result = resolveMapFocus({ sector: 'Cerro Nuevo', alerts: [], sensors: [], waterRequests, focusedWaterRequestId: 8 })
  assert.equal(result, null)
})

test('al quitar el filtro no se vuelve a seleccionar ninguna solicitud automáticamente', () => {
  const result = resolveMapFocus({ alerts, waterRequests })
  assert.equal(result, null)
})

test('una alerta reciente se centra normalmente si el usuario no pide una solicitud', () => {
  const result = resolveMapFocus({ alerts, focusAlertId: 1, waterRequests })
  assert.equal(result.kind, 'alerta')
  assert.deepEqual(result.point, [-33.041, -71.628])
})
