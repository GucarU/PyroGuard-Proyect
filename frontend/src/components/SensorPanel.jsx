import { useEffect, useState } from 'react'
import TemperatureModal from './TemperatureModal'

const API = 'http://127.0.0.1:8000'

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
            <h2>Monitoreo de sensores</h2>
          </div>
          <button className="secondary" onClick={loadSensors}>Actualizar</button>
        </div>

        {message && <div className="mini-notice">{message}</div>}

        <div className="sensor-grid">
          {sensors.map((sensor) => (
            <article className={`sensor-card ${sensor.battery_alert ? 'battery-low' : ''}`} key={sensor.sensor_id}>
              <div className="sensor-title-row">
                <div>
                  <strong>{sensor.sensor_id}</strong>
                  <span>{sensor.sector}</span>
                </div>
                <span className={`sensor-dot ${sensor.battery_alert ? 'danger' : 'ok'}`} />
              </div>

              <dl className="sensor-data">
                <div>
                  <dt>Batería</dt>
                  <dd className={sensor.battery_alert ? 'danger-text' : ''}>
                    {sensor.battery_level}% {sensor.battery_alert ? '· BAJA' : ''}
                  </dd>
                </div>
                <div>
                  <dt>Viento</dt>
                  <dd className={sensor.wind_alert ? 'warning-text' : ''}>
                    {sensor.wind_speed_kmh} km/h {sensor.wind_alert ? '· ALERTA' : ''}
                  </dd>
                </div>
              </dl>

              <div className="button-row">
                <button className="secondary small-button" onClick={() => patchSensor(sensor.sensor_id, 'battery', { battery_level: 14 }, `${sensor.sensor_id}: batería de prueba en 14%.`)}>Batería 14%</button>
                <button className="secondary small-button" onClick={() => patchSensor(sensor.sensor_id, 'battery', { battery_level: 80 }, `${sensor.sensor_id}: batería normalizada.`)}>Batería 80%</button>
                <button className="secondary small-button" onClick={() => setSelectedSensor(sensor)}>Ver temperatura</button>
                <button className="small-button" onClick={() => patchSensor(sensor.sensor_id, 'wind', { wind_speed_kmh: 55 }, `${sensor.sensor_id}: viento de prueba en 55 km/h.`)}>Simular viento</button>
              </div>

              <small>Umbral viento configurado: {sensor.wind_threshold_kmh} km/h.</small>
            </article>
          ))}
        </div>
      </section>

      {selectedSensor && (
        <TemperatureModal sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
      )}
    </>
  )
}
