// Datos únicamente para simulaciones del Hito 2. No son sensores operativos.
export const DEMO_SENSORS = Object.freeze([
  { sensor_id: 'PG-VALPO-01', sector: 'Camino La Pólvora', latitude: -33.0757, longitude: -71.6136 },
  { sensor_id: 'PG-VALPO-02', sector: 'Playa Ancha', latitude: -33.0246, longitude: -71.6407 },
  { sensor_id: 'PG-VALPO-03', sector: 'Rodelillo', latitude: -33.0669, longitude: -71.5798 },
  { sensor_id: 'PG-VINA-01', sector: 'Achupallas', latitude: -33.0394, longitude: -71.5164 },
  { sensor_id: 'PG-VINA-02', sector: 'Reñaca Alto', latitude: -32.9966, longitude: -71.5259 },
])

/** Genera una detección nueva y evita repetir el sensor de la última alerta de prueba. */
export function createRandomDetection(previousSensorId = null, rng = Math.random) {
  const choices = DEMO_SENSORS.filter(item => item.sensor_id !== previousSensorId)
  const sensor = choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))]
  const smokeLevel = 35 + Math.floor(rng() * 61)
  const drift = () => (rng() - 0.5) * 0.006
  return {
    ...sensor,
    smoke_detected: true,
    smoke_level: smokeLevel,
    latitude: Number((sensor.latitude + drift()).toFixed(6)),
    longitude: Number((sensor.longitude + drift()).toFixed(6)),
  }
}
