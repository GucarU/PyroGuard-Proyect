import { useCallback, useEffect, useState } from 'react'
import AlertMap from './components/AlertMap'
import NeighborhoodReport from './components/NeighborhoodReport'
import SensorPanel from './components/SensorPanel'
import ShelterPanel from './components/ShelterPanel'
import WaterRequestPanel from './components/WaterRequestPanel'

const API = 'http://127.0.0.1:8000'

const DEMO_DETECTION = {
  sensor_id: 'PG-VALPO-01',
  sector: 'Camino La Pólvora',
  smoke_detected: true,
  smoke_level: 82,
  latitude: -33.0757,
  longitude: -71.6136,
}

function App() {
  const [alerts, setAlerts] = useState([])
  const [sensorStatuses, setSensorStatuses] = useState([])
  const [shelters, setShelters] = useState([])
  const [backendOk, setBackendOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/alerts`)
      if (!response.ok) throw new Error('No se pudieron cargar las alertas')
      const data = await response.json()
      setAlerts(data)
      setBackendOk(true)
    } catch {
      setBackendOk(false)
    }
  }, [])

  const loadShelters = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/shelters`)
      if (response.ok) setShelters(await response.json())
    } catch {
      // El mapa sigue disponible aunque el módulo de albergues no responda.
    }
  }, [])

  useEffect(() => {
    loadAlerts()
    loadShelters()
    const timer = setInterval(loadAlerts, 4000)
    const shelterTimer = setInterval(loadShelters, 10000)
    return () => {
      clearInterval(timer)
      clearInterval(shelterTimer)
    }
  }, [loadAlerts, loadShelters])

  async function simulateSmoke() {
    setLoading(true)
    setNotice('')
    try {
      const response = await fetch(`${API}/api/sensors/detections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEMO_DETECTION),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Error al crear la alerta')
      setNotice(data.message)
      await loadAlerts()
    } catch (error) {
      setNotice(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function dispatch(alertId) {
    setNotice('')
    try {
      const response = await fetch(`${API}/api/alerts/${alertId}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit: 'BRAVO-1' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'No fue posible despachar la unidad')
      setNotice(`Unidad BRAVO-1 despachada a la alerta #${alertId}.`)
      await loadAlerts()
    } catch (error) {
      setNotice(`Error: ${error.message}`)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PYROGUARD · INGENIERÍA DE SOFTWARE I</p>
          <h1>Central de Emergencias</h1>
          <p className="subtitle">HU-01 integrada + desarrollo asignado a José Marabolí</p>
        </div>
        <div className={`api-status ${backendOk ? 'online' : 'offline'}`}>
          <span className="dot" />
          {backendOk ? 'API conectada' : 'API desconectada'}
        </div>
      </header>

      <main className="page-stack">
        <section className="hero-card">
          <div>
            <p className="section-label">HU-01 · Flujo base existente</p>
            <h2>Alerta automática por detección de humo</h2>
            <p>
              Simula un sensor en Camino La Pólvora con nivel de humo 82. La API registra
              la alerta y la muestra inmediatamente en el panel del operador.
            </p>
          </div>
          <button onClick={simulateSmoke} disabled={loading}>
            {loading ? 'Enviando...' : 'Simular detección de humo'}
          </button>
        </section>

        {notice && <div className="notice">{notice}</div>}

        <section className="summary-grid">
          <article><span>Alertas registradas</span><strong>{alerts.length}</strong></article>
          <article><span>Pendientes</span><strong>{alerts.filter((alert) => alert.status === 'PENDIENTE').length}</strong></article>
          <article><span>Viento fuerte</span><strong>{sensorStatuses.filter((sensor) => sensor.wind_alert).length}</strong></article>
        </section>

        <SensorPanel onStatusesChange={setSensorStatuses} />

        <AlertMap alerts={alerts} sensorStatuses={sensorStatuses} shelters={shelters} />

        <section className="alerts-section">
          <div className="section-heading">
            <div>
              <p className="section-label">Panel del operador</p>
              <h2>Alertas recientes</h2>
            </div>
            <button className="secondary" onClick={loadAlerts}>Actualizar</button>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state">
              <strong>No hay alertas activas.</strong>
              <span>Usa el simulador para generar una detección de prueba.</span>
            </div>
          ) : (
            <div className="alert-list">
              {alerts.map((alert) => (
                <article className="alert-card" key={alert.id}>
                  <div className="alert-header">
                    <div>
                      <span className={`priority ${alert.priority.toLowerCase()}`}>{alert.priority}</span>
                      <h3>Alerta #{alert.id} · {alert.sector}</h3>
                    </div>
                    <span className={`status ${alert.status === 'PENDIENTE' ? 'pending' : 'dispatched'}`}>
                      {alert.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p>{alert.message}</p>
                  <dl className="alert-data">
                    <div><dt>Sensor</dt><dd>{alert.sensor_id}</dd></div>
                    <div><dt>Nivel de humo</dt><dd>{alert.smoke_level}%</dd></div>
                    <div><dt>Latitud</dt><dd>{alert.latitude}</dd></div>
                    <div><dt>Longitud</dt><dd>{alert.longitude}</dd></div>
                  </dl>
                  <div className="alert-footer">
                    <small>{new Date(alert.detected_at).toLocaleString()}</small>
                    {alert.status === 'PENDIENTE' ? (
                      <button onClick={() => dispatch(alert.id)}>Despachar BRAVO-1</button>
                    ) : (
                      <strong>{alert.dispatched_unit} despachada</strong>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <NeighborhoodReport />
        <ShelterPanel />
        <WaterRequestPanel />
      </main>
    </div>
  )
}

export default App
