import test from 'node:test'
import assert from 'node:assert/strict'
import { createRandomDetection, DEMO_SENSORS } from './demoDetections.js'

test('la alerta contiene un sensor conocido y coordenadas válidas', () => {
  const detection = createRandomDetection(null, () => 0.2)
  assert.equal(detection.smoke_detected, true)
  assert.ok(DEMO_SENSORS.some(s => s.sensor_id === detection.sensor_id))
  assert.ok(detection.latitude >= -90 && detection.latitude <= 90)
  assert.ok(detection.longitude >= -180 && detection.longitude <= 180)
})

test('dos alertas seguidas nunca repiten el mismo sensor', () => {
  for (const value of [0, 0.1, 0.5, 0.999999]) {
    const first = createRandomDetection(null, () => value)
    const second = createRandomDetection(first.sensor_id, () => value)
    assert.notEqual(first.sensor_id, second.sensor_id)
  }
})

test('la intensidad de humo permanece entre 35 y 95', () => {
  for (const value of [0, 0.2, 0.9, 0.9999]) {
    const alert = createRandomDetection(null, () => value)
    assert.ok(alert.smoke_level >= 35 && alert.smoke_level <= 95)
  }
})
