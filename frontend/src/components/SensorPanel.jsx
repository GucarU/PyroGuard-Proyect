import { useEffect, useState } from 'react'
import TemperatureModal from './TemperatureModal'

const API = '' // Proxy /api de Vite, también compatible con acceso por red local

function batteryLabel(level) {
  if (level <= 15) return 'Crítica'
  if (level <= 35) return 'Baja'
  if (level <= 70) return 'Media'
  return 'Buena'
}

function batteryBars(level) {
  if (level <= 10) return 1
  if (level <= 35) return 2
  if (level <= 70) return 3
  return 4
}

function batteryTone(level) {
  if (level <= 15) return 'danger'
  if (level <= 35) return 'warning'
  return 'ok'
}

function windSummary(speed, threshold, hasAlert) {
  if (hasAlert) return `Viento fuerte: ${speed} km/h. Supera el umbral de ${threshold} km/h.`
  return `Viento dentro de rango: ${speed} km/h.`
}

export default function SensorPanel({ onStatusesChange }) {
  const [sensors, setSensors] = useState([])
  const [selectedSensor, setSelectedSensor] = useState(null)
  const [message, setMessage] = useState('')

  async function loadSensors() {
    const response = await fetch(`${API}/api/sensors/status`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.detail || 'No fue posible cargar sensores')
    setSensors(data)
    onStatusesChange?.(data)
  }

  useEffect(() => {
    loadSensors().catch((error) => setMessage(error.message))
    const timer = setInterval(() => loadSensors().catch(() => {}), 7000)
    return () => clearInterval(timer)
  }, [])

  async function patchSensor(sensorId, endpoint, payload, successMessage) {
    setMessage('')
    try {
      const response = await fetch(`${API}/api/sensors/${sensorId}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'No fue posible actualizar el sensor')
      setMessage(successMessage)
      await loadSensors()
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <>
      <section className="alerts-section jose-section">
        <div className="section-heading">
          <div>
            <p className="section-label">JOSÉ · HU-02 / HU-03 / HU-04</p>
            <h2>Monitoreo amigable de sensores</h2>
            <p className="muted-text">Vista pensada para leer el estado rápidamente: batería, viento y salud general del sensor.</p>
          </div>
          <button className="secondary" onClick={() => loadSensors().catch(error => setMessage(error.message))}>Actualizar</button>
        </div>

        {message && <div className="mini-notice">{message}</div>}

        <div className="sensor-grid">
          {sensors.map((sensor) => {
            const batteryState = batteryLabel(sensor.battery_level)
            const batteryClass = batteryTone(sensor.battery_level)
            const fillBars = batteryBars(sensor.battery_level)
            return (
              <article className={`sensor-card sensor-card-modern ${sensor.battery_alert ? 'battery-low' : ''}`} key={sensor.sensor_id}>
                <div className="sensor-topline">
                  <div>
                    <p className="sensor-caption">Sensor ambiental</p>
                    <strong>{sensor.sensor_id}</strong>
                    <span>{sensor.sector}</span>
                  </div>
                  <span className={`sensor-chip ${sensor.wind_alert ? 'warning' : 'ok'}`}>
                    {sensor.wind_alert ? 'Atención' : 'Estable'}
                  </span>
                </div>

                <div className={`battery-widget ${batteryClass}`} aria-label={`Batería ${sensor.battery_level}%`}>
                  <div className="battery-header">
                    <div>
                      <span className="battery-title">Batería</span>
                      <strong>{sensor.battery_level}%</strong>
                    </div>
                    <span className="battery-state">{batteryState}</span>
                  </div>
                  <div className="battery-shell" aria-hidden="true">
                    <div className="battery-body">
                      {[1, 2, 3, 4].map((bar) => <span key={bar} className={bar <= fillBars ? 'battery-bar active' : 'battery-bar'} />)}
                    </div>
                    <span className="battery-tip" />
                  </div>
                </div>

                <div className="sensor-summary-grid">
                  <div className="sensor-summary-item">
                    <span>Viento</span>
                    <strong className={sensor.wind_alert ? 'warning-text' : ''}>{sensor.wind_speed_kmh} km/h</strong>
                    <small>{windSummary(sensor.wind_speed_kmh, sensor.wind_threshold_kmh, sensor.wind_alert)}</small>
                  </div>
                  <div className="sensor-summary-item">
                    <span>Estado humano</span>
                    <strong>{sensor.battery_alert ? 'Revisar pronto' : 'Todo estable'}</strong>
                    <small>{sensor.battery_alert ? 'La carga está baja y conviene revisar este equipo.' : 'El sensor responde dentro de los rangos esperados.'}</small>
                  </div>
                </div>

                <div className="button-row">
                  <button className="secondary small-button" onClick={() => patchSensor(sensor.sensor_id, 'battery', { battery_level: 14 }, `${sensor.sensor_id}: batería de prueba en 14%.`)}>Batería baja</button>
                  <button className="secondary small-button" onClick={() => patchSensor(sensor.sensor_id, 'battery', { battery_level: 80 }, `${sensor.sensor_id}: batería normalizada.`)}>Batería alta</button>
                  <button className="secondary small-button" onClick={() => setSelectedSensor(sensor)}>Ver temperatura</button>
                  <button className="small-button" onClick={() => patchSensor(sensor.sensor_id, 'wind', { wind_speed_kmh: 55 }, `${sensor.sensor_id}: viento de prueba en 55 km/h.`)}>Simular viento</button>
                </div>

                <small>Última actualización del sensor: {new Date(sensor.updated_at).toLocaleString('es-CL')} · Umbral de viento: {sensor.wind_threshold_kmh} km/h.</small>
              </article>
            )
          })}
        </div>
      </section>

      {selectedSensor && (
        <TemperatureModal sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
      )}
    </>
  )
}
