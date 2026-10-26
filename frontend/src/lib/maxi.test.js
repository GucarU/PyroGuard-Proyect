import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSector, getSectors, filterBySector, isInactiveIncident, markerColor,
  canViewHydrants, isValidPoint, activeMapAlerts, overlayLocalDecisions, EXAMPLE_HYDRANTS,
} from './maxi.js'

test('HU-06: normaliza nombres de cerros', () => assert.equal(normalizeSector('  Cerro   Alegre '), 'cerro alegre'))
test('HU-06: genera sectores sin duplicados', () => assert.deepEqual(getSectors([{ sector: 'Cerro Alegre' }, { sector: ' cerro  alegre' }], [{ sector: 'Reñaca' }]), ['Cerro Alegre', 'Reñaca']))
test('HU-06: filtra alertas ignorando mayúsculas', () => assert.equal(filterBySector([{ sector: 'Cerro Alegre' }, { sector: 'Reñaca' }], 'CERRO ALEGRE').length, 1))
test('HU-06: deja pasar todas las alertas si no hay filtro', () => assert.equal(filterBySector([{ sector: 'A' }, { sector: 'B' }], '').length, 2))
test('HU-08: identifica una falsa alarma', () => assert.equal(isInactiveIncident({ status: 'FALSA_ALARMA' }), true))
test('HU-05: un foco validado se marca rojo', () => assert.equal(markerColor({ status: 'VALIDADO' }), '#ed4040'))
test('HU-05: un foco pendiente no se marca rojo', () => assert.notEqual(markerColor({ status: 'PENDIENTE' }), '#ed4040'))
test('HU-14: filtra acceso visual por rol en demo', () => { assert.equal(canViewHydrants('municipal'), true); assert.equal(canViewHydrants('bombero'), true); assert.equal(canViewHydrants('vecino'), false) })
test('HU-14: rechaza coordenadas no válidas', () => { assert.equal(isValidPoint({ latitude: -33, longitude: -71 }), true); assert.equal(isValidPoint({ latitude: null, longitude: -71 }), false) })
test('HU-14: los grifos de demostración se identifican como ficticios', () => assert.ok(EXAMPLE_HYDRANTS.every((item) => item.demo_local && item.name.includes('DEMO'))))
test('HU-08: oculta falsa alarma del mapa, no del listado histórico', () => assert.deepEqual(activeMapAlerts([{id:1, status:'FALSA_ALARMA', latitude:-33,longitude:-71},{id:2,status:'PENDIENTE',latitude:-33,longitude:-71}]).map(x=>x.id), [2]))
test('HU-05: sobreescribir estado solo para presentación no cambia objeto original', () => {
  const original = [{ id: 1, status: 'PENDIENTE' }]
  const annotated = overlayLocalDecisions(original, { 1: { status: 'VALIDADO', actor: 'Demo', at: '2026-10-25' } })
  assert.equal(original[0].status, 'PENDIENTE')
  assert.equal(annotated[0].status, 'VALIDADO')
  assert.equal(annotated[0].demo_local, true)
})
