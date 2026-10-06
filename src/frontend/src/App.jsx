import { useCallback, useEffect, useState } from 'react'
import AlertMap from './AlertMap'

const API = 'http://127.0.0.1:8000'

const DEMO_DETECTION = {
  sensor_id: 'PG-VALPO-01',
  sector: 'Camino La Pólvora',
  smoke_detected: true,
  smoke_level: 82,
  latitude: -33.0757,
  longitude: -71.6136,
}

const INITIAL_TEST = {
  sensor_id: 'PG-VALPO-TEST',
  sector: 'Placilla',
  smoke_detected: true,
  smoke_level: 65,
  latitude: -33.118,
  longitude: -71.567,
}

function readableDetail(detail) {
  if (!detail) return 'La API no entregó más detalles.'

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc)
          ? item.loc[item.loc.length - 1]
          : 'campo'
        return `${field}: ${item.msg}`
      })
      .join(' · ')
  }

  return JSON.stringify(detail)
}

function App() {
  const [alerts, setAlerts] = useState([])
  const [backendOk, setBackendOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [apiError, setApiError] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const [testForm, setTestForm] = useState(INITIAL_TEST)
  const [testResult, setTestResult] = useState(null)
  const [dispatchingId, setDispatchingId] = useState(null)

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/alerts`)

      if (!response.ok) {
        throw new Error(`GET /api/alerts respondió HTTP ${response.status}`)
      }

      const data = await response.json()
      setAlerts(data)
      setBackendOk(true)
      setApiError('')
    } catch (error) {
      setBackendOk(false)
      setApiError(
        `No se pudo conectar con la API en ${API}. Verifica que FastAPI esté ejecutándose. ${error.message}`
      )
    }
  }, [])

  useEffect(() => {
    loadAlerts()
    const timer = setInterval(loadAlerts, 4000)
    return () => clearInterval(timer)
  }, [loadAlerts])

  async function sendDetection(payload) {
    const response = await fetch(`${API}/api/sensors/detections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    let data = {}

    try {
      data = await response.json()
    } catch {
      data = { detail: 'La API devolvió una respuesta que no es JSON.' }
    }

    return {
      ok: response.ok,
      status: response.status,
      alertCreated: data.alert_created ?? null,
      message: data.message || readableDetail(data.detail),
      data,
    }
  }

  async function simulateSmoke() {
    setLoading(true)
    setNotice('')

    try {
      const result = await sendDetection(DEMO_DETECTION)

      if (!result.ok) {
        throw new Error(`HTTP ${result.status}: ${result.message}`)
      }

      setNotice(`HTTP ${result.status}: ${result.message}`)
      await loadAlerts()
    } catch (error) {
      setNotice(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function submitTest(event) {
    event.preventDefault()
    setLoading(true)
    setNotice('')
    setTestResult(null)

    const payload = {
      sensor_id: testForm.sensor_id,
      sector: testForm.sector,
      smoke_detected:
        testForm.smoke_detected === true || testForm.smoke_detected === 'true',
      smoke_level: Number(testForm.smoke_level),
      latitude: testForm.latitude === '' ? null : Number(testForm.latitude),
      longitude: testForm.longitude === '' ? null : Number(testForm.longitude),
    }

    try {
      const result = await sendDetection(payload)
      setTestResult(result)

      if (result.ok) {
        if (result.alertCreated) {
          setNotice(
            `HTTP ${result.status}: alerta creada correctamente y registrada como PENDIENTE.`
          )
        } else {
          setNotice(
            `HTTP ${result.status}: detección recibida. No se creó una alerta porque no se detectó humo.`
          )
        }

        await loadAlerts()
      } else {
        setNotice(`HTTP ${result.status}: ${result.message}`)
      }
    } catch (error) {
      setTestResult({
        ok: false,
        status: 0,
        alertCreated: null,
        message: `No se pudo conectar con la API: ${error.message}`,
      })
      setNotice(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function dispatch(alertId) {
    setNotice('')
    setDispatchingId(alertId)

    try {
      const response = await fetch(`${API}/api/alerts/${alertId}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit: 'BRAVO-1' }),
      })

      let data = {}

      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (response.status === 409) {
        throw new Error('Esta alerta ya tiene una unidad despachada.')
      }

      if (response.status === 404) {
        throw new Error('La alerta ya no existe.')
      }

      if (!response.ok) {
        throw new Error(readableDetail(data.detail))
      }

      setNotice(
        `Unidad BRAVO-1 despachada correctamente a la alerta #${alertId}.`
      )

      await loadAlerts()
    } catch (error) {
      setNotice(`Error de despacho: ${error.message}`)
    } finally {
      setDispatchingId(null)
    }
  }

  function presetNoSmoke() {
    setTestForm({
      ...INITIAL_TEST,
      smoke_detected: false,
      smoke_level: 0,
    })
    setTestResult(null)
  }

  function presetInvalid422() {
    setTestForm({
      ...INITIAL_TEST,
      smoke_detected: true,
      smoke_level: 150,
    })
    setTestResult(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PYROGUARD · HU-01 · RF01</p>
          <h1>Central de Emergencias</h1>
          <p className="subtitle">Alerta automática por detección de humo</p>
        </div>

        <div className={`api-status ${backendOk ? 'online' : 'offline'}`}>
          <span className="dot" />
          {backendOk ? 'API conectada' : 'API desconectada'}
        </div>
      </header>

      <main>
        {apiError && <div className="notice error-notice">{apiError}</div>}

        <section className="hero-card">
          <div>
            <p className="section-label">Simulador de detección</p>
            <h2>Probar el flujo completo de la HU-01</h2>
            <p>
              Envía una detección simulada desde Camino La Pólvora con nivel de humo 82.
              La API registra la alerta y la muestra en el panel y en el mapa.
            </p>
          </div>

          <button onClick={simulateSmoke} disabled={loading || !backendOk}>
            {loading ? 'Enviando...' : 'Simular detección de humo'}
          </button>
        </section>

        {notice && <div className="notice">{notice}</div>}

        <section className="summary-grid">
          <article>
            <span>Alertas registradas</span>
            <strong>{alerts.length}</strong>
          </article>

          <article>
            <span>Pendientes</span>
            <strong>
              {alerts.filter((alert) => alert.status === 'PENDIENTE').length}
            </strong>
          </article>

          <article>
            <span>Unidades despachadas</span>
            <strong>
              {
                alerts.filter(
                  (alert) => alert.status === 'UNIDAD_DESPACHADA'
                ).length
              }
            </strong>
          </article>
        </section>

        <AlertMap alerts={alerts} />

        <section className="test-section">
          <button
            className="test-toggle"
            type="button"
            onClick={() => setTestOpen((open) => !open)}
          >
            {testOpen ? 'Ocultar pruebas de detección' : 'Mostrar pruebas de detección'}
          </button>

          {testOpen && (
            <div className="test-content">
              <p className="section-label">CA-01 · CA-02 · CA-03</p>
              <h2>Pruebas de detección simulada</h2>
              <p className="test-description">
                Permite comprobar una detección válida, una lectura sin humo y un caso inválido 422.
              </p>

              <form className="test-form" onSubmit={submitTest}>
                <label>
                  ID del sensor simulado
                  <input
                    value={testForm.sensor_id}
                    onChange={(event) =>
                      setTestForm({ ...testForm, sensor_id: event.target.value })
                    }
                  />
                </label>

                <label>
                  Sector
                  <input
                    value={testForm.sector}
                    onChange={(event) =>
                      setTestForm({ ...testForm, sector: event.target.value })
                    }
                  />
                </label>

                <label>
                  Humo detectado
                  <select
                    value={String(testForm.smoke_detected)}
                    onChange={(event) =>
                      setTestForm({
                        ...testForm,
                        smoke_detected: event.target.value === 'true',
                      })
                    }
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>

                <label>
                  Nivel de humo
                  <input
                    type="number"
                    value={testForm.smoke_level}
                    onChange={(event) =>
                      setTestForm({ ...testForm, smoke_level: event.target.value })
                    }
                  />
                </label>

                <label>
                  Latitud
                  <input
                    type="number"
                    step="any"
                    value={testForm.latitude}
                    onChange={(event) =>
                      setTestForm({ ...testForm, latitude: event.target.value })
                    }
                  />
                </label>

                <label>
                  Longitud
                  <input
                    type="number"
                    step="any"
                    value={testForm.longitude}
                    onChange={(event) =>
                      setTestForm({ ...testForm, longitude: event.target.value })
                    }
                  />
                </label>

                <div className="test-actions">
                  <button type="submit" disabled={loading || !backendOk}>
                    {loading ? 'Enviando...' : 'Enviar prueba'}
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    onClick={presetNoSmoke}
                  >
                    Preparar caso sin humo
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    onClick={presetInvalid422}
                  >
                    Preparar caso 422
                  </button>
                </div>
              </form>

              {testResult && (
                <div className={`test-result ${testResult.ok ? 'success' : 'failure'}`}>
                  <strong>
                    {testResult.status === 0
                      ? 'Sin respuesta de la API'
                      : `HTTP ${testResult.status}`}
                  </strong>
                  <span>{testResult.message}</span>
                  {testResult.alertCreated !== null && (
                    <code>
                      alert_created: {String(testResult.alertCreated)}
                    </code>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="alerts-section">
          <div className="section-heading">
            <div>
              <p className="section-label">Panel del operador</p>
              <h2>Alertas recientes</h2>
            </div>

            <button className="secondary" onClick={loadAlerts}>
              Actualizar
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state">
              <strong>No hay alertas activas.</strong>
              <span>
                Usa el simulador o las pruebas de detección para generar una alerta.
              </span>
            </div>
          ) : (
            <div className="alert-list">
              {alerts.map((alert) => (
                <article className="alert-card" key={alert.id}>
                  <div className="alert-header">
                    <div>
                      <span
                        className={`priority ${String(alert.priority).toLowerCase()}`}
                      >
                        {alert.priority}
                      </span>
                      <h3>
                        Alerta #{alert.id} · {alert.sector}
                      </h3>
                    </div>

                    <span
                      className={`status ${
                        alert.status === 'PENDIENTE'
                          ? 'pending'
                          : 'dispatched'
                      }`}
                    >
                      {String(alert.status).replaceAll('_', ' ')}
                    </span>
                  </div>

                  <p>{alert.message}</p>

                  <dl className="alert-data">
                    <div>
                      <dt>Sensor</dt>
                      <dd>{alert.sensor_id}</dd>
                    </div>
                    <div>
                      <dt>Nivel de humo</dt>
                      <dd>{alert.smoke_level}%</dd>
                    </div>
                    <div>
                      <dt>Latitud</dt>
                      <dd>{alert.latitude}</dd>
                    </div>
                    <div>
                      <dt>Longitud</dt>
                      <dd>{alert.longitude}</dd>
                    </div>
                  </dl>

                  <div className="alert-footer">
                    <small>
                      {alert.detected_at
                        ? new Date(alert.detected_at).toLocaleString()
                        : 'Sin fecha'}
                    </small>

                    {alert.status === 'PENDIENTE' ? (
                      <button
                        onClick={() => dispatch(alert.id)}
                        disabled={dispatchingId === alert.id}
                      >
                        {dispatchingId === alert.id
                          ? 'Despachando...'
                          : 'Despachar BRAVO-1'}
                      </button>
                    ) : (
                      <strong>
                        {alert.dispatched_unit || 'Unidad'} despachada
                      </strong>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
