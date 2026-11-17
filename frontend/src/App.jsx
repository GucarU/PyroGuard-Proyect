import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AlertMap from './components/AlertMap'
import NeighborhoodReport from './components/NeighborhoodReport'
import SensorPanel from './components/SensorPanel'
import ShelterPanel from './components/ShelterPanel'
import WaterRequestPanel from './components/WaterRequestPanel'
import MaxiIncidentActions from './components/MaxiIncidentActions'
import MaxiSectorFilter from './components/MaxiSectorFilter'
import MaxiSafeCheckin from './components/MaxiSafeCheckin'
import MaxiHydrants from './components/MaxiHydrants'
import { filterBySector } from './lib/maxi'
import { api, jsonOptions } from './lib/api'
import { createRandomDetection } from './lib/demoDetections'
import { EXAMPLE_HYDRANTS } from './lib/maxi'
import { mapWaterRequests, waterRequestStatus } from './lib/waterRequests'

const SECTIONS = [
  ['central', 'Central y mapa'], ['sensores', 'Sensores'],
  ['ciudadania', 'Ciudadanía'], ['logistica', 'Logística'],
]

export default function App() {
  const [section, setSection] = useState('central')
  const [role, setRole] = useState('bombero')
  const [actor, setActor] = useState('Operador de prueba')
  const [alerts, setAlerts] = useState([])
  const [sensorStatuses, setSensorStatuses] = useState([])
  const [shelters, setShelters] = useState([])
  const [hydrants, setHydrants] = useState([])
  const [waterRequests, setWaterRequests] = useState([])
  const [focusedWaterRequestId, setFocusedWaterRequestId] = useState(null)
  const [focusedWaterRequestVersion, setFocusedWaterRequestVersion] = useState(0)
  const [showHydrants, setShowHydrants] = useState(true)
  const [backendOk, setBackendOk] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pyroguard-auth') === 'admin'
  })
  const [loginUser, setLoginUser] = useState('admin')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedSector, setSelectedSector] = useState('')
  const [notice, setNotice] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [latestAlertId, setLatestAlertId] = useState(null)
  const [latestDetection, setLatestDetection] = useState(null)
  const previousSensorRef = useRef(null)

  const visibleAlerts = useMemo(() => filterBySector(alerts, selectedSector), [alerts, selectedSector])
  const visibleSensors = useMemo(() => filterBySector(sensorStatuses, selectedSector), [sensorStatuses, selectedSector])

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api('/api/alerts')
      setAlerts(data)
      setBackendOk(true)
      setLastSync(new Date())
    } catch {
      setBackendOk(false)
    }
  }, [])

  const loadSensors = useCallback(async () => {
    try {
      setSensorStatuses(await api('/api/sensors/status'))
    } catch {
      /* sección de sensores sigue siendo independiente */
    }
  }, [])

  const loadShelters = useCallback(async () => {
    try {
      setShelters(await api('/api/shelters'))
    } catch {
      /* error independiente del panel */
    }
  }, [])

  const loadWaterRequests = useCallback(async () => {
    try {
      const requests = await api('/api/water-requests')
      setWaterRequests(mapWaterRequests(requests))
    } catch {
      // Si la API está temporalmente desconectada, conservamos los últimos puntos.
    }
  }, [])

  function handleWaterRequestCreated(created) {
    if (!created) return
    setWaterRequests(previous => mapWaterRequests([created, ...previous]))
    setFocusedWaterRequestId(created.id)
    setFocusedWaterRequestVersion(previous => previous + 1)
    // El backend ya confirmó la creación. También refrescamos para asegurar coherencia.
    loadWaterRequests()
  }

  function handleSectorChange(sector) {
    // El filtro y el mapa de solicitudes son acciones independientes.
    setSelectedSector(sector)
    setFocusedWaterRequestId(null)
    setFocusedWaterRequestVersion(previous => previous + 1)
  }

  function showWaterRequestOnCentral(requestId) {
    setFocusedWaterRequestId(requestId)
    setFocusedWaterRequestVersion(previous => previous + 1)
    setSelectedSector('')
    setSection('central')
    setTimeout(() => document.getElementById('mapa-central')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 90)
  }

  const loadHydrants = useCallback(async (currentRole = role) => {
    if (!['bombero', 'municipal'].includes(currentRole)) {
      setHydrants([])
      return
    }
    try {
      const items = await api('/api/hydrants', { headers: { 'X-Pyroguard-Role': currentRole } })
      setHydrants(items.length ? items : EXAMPLE_HYDRANTS)
    } catch {
      setHydrants([])
    }
  }, [role])

  useEffect(() => {
    document.body.classList.remove('dark-theme', 'light-theme')
    document.body.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme')
  }, [theme])

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('pyroguard-auth', 'admin')
    } else {
      localStorage.removeItem('pyroguard-auth')
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadAlerts()
    loadShelters()
    loadSensors()
    loadHydrants(role)
    loadWaterRequests()
    const t = setInterval(loadAlerts, 6000)
    const s = setInterval(loadShelters, 16000)
    const e = setInterval(loadSensors, 12000)
    const h = setInterval(() => loadHydrants(role), 15000)
    const w = setInterval(loadWaterRequests, 7000)
    return () => { clearInterval(t); clearInterval(s); clearInterval(e); clearInterval(h); clearInterval(w) }
  }, [loadAlerts, loadHydrants, loadSensors, loadShelters, loadWaterRequests, role])

  async function simulateSmoke() {
    setBusy(true)
    setNotice(null)
    const detection = createRandomDetection(previousSensorRef.current)
    try {
      const created = await api('/api/sensors/detections', jsonOptions('POST', detection))
      previousSensorRef.current = detection.sensor_id
      setLatestAlertId(created.alert.id)
      setLatestDetection(detection)
      handleSectorChange(detection.sector)
      setNotice({
        type: 'success',
        text: `Alerta DEMO #${created.alert.id}: ${detection.sensor_id} en ${detection.sector}, humo ${detection.smoke_level}%. El mapa se centró en el foco.`,
      })
      await loadAlerts()
      document.getElementById('mapa-central')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) {
      setNotice({ type: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  async function changeAlert(alertId, action) {
    setNotice(null)
    if (actor.trim().length < 2) {
      setNotice({ type: 'error', text: 'Indica el nombre del operador de prueba.' })
      throw new Error('Operador requerido')
    }
    try {
      await api(`/api/alerts/${alertId}/${action === 'VALIDADO' ? 'validate' : 'discard'}`, jsonOptions('PATCH', { actor: actor.trim() }))
      setNotice({
        type: 'success',
        text: `Alerta #${alertId}: ${action === 'VALIDADO' ? 'foco validado' : 'falsa alarma registrada'}. Cambio guardado.`,
      })
      await loadAlerts()
    } catch (e) {
      setNotice({ type: 'error', text: e.message })
      throw e
    }
  }

  async function dispatch(alertId) {
    setBusy(true)
    setNotice(null)
    try {
      await api(`/api/alerts/${alertId}/dispatch`, jsonOptions('PATCH', { unit: 'BRAVO-1' }))
      setNotice({ type: 'success', text: `Unidad BRAVO-1 asignada a alerta #${alertId}.` })
      await loadAlerts()
      document.getElementById('mapa-central')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) {
      setNotice({ type: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  function handleLogin(event) {
    event.preventDefault()
    if (loginUser.trim().toLowerCase() === 'admin' && loginPassword.trim().length >= 1) {
      setIsAuthenticated(true)
      setLoginError('')
      return
    }
    setLoginError('Usuario o contraseña incorrectos. Usa admin con cualquier clave.')
  }

  if (!isAuthenticated) {
    return (
      <div className={`app-shell auth-shell ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
        <div className="login-card">
          <p className="eyebrow">PYROGUARD · PROTOTIPO ACADÉMICO</p>
          <h1>Acceso al panel</h1>
          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Usuario
              <input value={loginUser} onChange={(event) => setLoginUser(event.target.value)} autoComplete="username" />
            </label>
            <label>
              Contraseña
              <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="current-password" />
            </label>
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit">Entrar</button>
          </form>
        </div>
      </div>
    )
  }

  return <div className={`app-shell ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
    <header className="topbar topbar-modern">
      <div>
        <p className="eyebrow">PYROGUARD · PROTOTIPO ACADÉMICO</p>
        <h1>Centro de coordinación</h1>
      </div>
      <div className="topbar-actions">
        <button type="button" className="secondary theme-toggle" aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button type="button" className="secondary logout-button" onClick={() => setIsAuthenticated(false)}>Cerrar sesión</button>
        <span className={`api-status ${backendOk ? 'online' : 'offline'}`} role="status"><span className="dot" />{backendOk ? 'API conectada' : 'API sin conexión'}</span>
      </div>
    </header>

    <nav className="app-nav" aria-label="Secciones del sistema">
      {SECTIONS.map(([id, label]) => (
        <button type="button" key={id} className={section === id ? 'nav-tab active' : 'nav-tab'} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}>{label}</button>
      ))}
    </nav>

    <div className="control-strip">
      <label>Rol de práctica
        <select value={role} onChange={e => { const nextRole = e.target.value; setRole(nextRole); setShowHydrants(true); loadHydrants(nextRole) }}>
          <option value="operador">Operador</option>
          <option value="bombero">Bombero</option>
          <option value="municipal">Municipal</option>
          <option value="vecino">Vecino</option>
        </select>
      </label>
      <label>Responsable de acciones
        <input value={actor} maxLength="80" onChange={e => setActor(e.target.value)} aria-label="Responsable de acciones" />
      </label>
      <span className="muted-text">Selecciona un rol para ver las herramientas disponibles. Si eliges bombero o municipal, el mapa principal cargará también la capa de grifos.</span>
    </div>

    {!backendOk && <div className="notice error" role="alert">No hay conexión con el backend. Ejecuta <code>python -m uvicorn backend.main:app --reload</code> desde la carpeta principal, luego pulsa Reintentar. <button className="secondary small-button" onClick={loadAlerts}>Reintentar</button></div>}
    {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`notice ${notice.type}`}>{notice.text}<button className="notice-close" type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>×</button></div>}

    <main className="page-stack">
      {section === 'central' && <>
        <section className="hero-card hero-modern">
          <div>
            <div className="hero-actions"><button onClick={simulateSmoke} disabled={busy || !backendOk}>{busy ? 'Generando…' : 'Generar alerta aleatoria'}</button><button type="button" className="secondary" onClick={() => document.getElementById('mapa-central')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Ver mapa</button></div>
          </div>
        </section>

        {latestDetection && <div className="latest-alert-banner" role="status">
          <strong>Última detección simulada: {latestDetection.sensor_id}</strong>
          <span>{latestDetection.sector} · Humo {latestDetection.smoke_level}% · Alerta #{latestAlertId}</span>
          <button type="button" className="secondary small-button" onClick={() => handleSectorChange('')}>Ver todos los sectores</button>
        </div>}
        <section className="summary-grid" aria-label="Resumen de alertas">
          <article><span>Alertas registradas</span><strong>{alerts.length}</strong></article>
          <article><span>Pendientes</span><strong>{alerts.filter(a => a.status === 'PENDIENTE').length}</strong></article>
          <article><span>Validadas</span><strong>{alerts.filter(a => a.status === 'VALIDADO').length}</strong></article>
          <article><span>Falsas alarmas</span><strong>{alerts.filter(a => a.status === 'FALSA_ALARMA').length}</strong></article>
        </section>

        <section className="quick-dashboard" aria-label="Dashboard rápido">
          <div className="quick-dashboard-header">
            <h3>Dashboard rápido</h3>
            <span>{lastSync ? `Sincronizado ${lastSync.toLocaleTimeString('es-CL')}` : 'Sincronizando...'}</span>
          </div>
          <div className="quick-dashboard-grid">
            <article>
              <span className="quick-label">Cobertura</span>
              <strong>{sensorStatuses.length || 0}</strong>
              <small>sensores activos</small>
            </article>
            <article>
              <span className="quick-label">Recursos</span>
              <strong>{hydrants.length || 0}</strong>
              <small>grifos visibles</small>
            </article>
            <article>
              <span className="quick-label">Solicitudes</span>
              <strong>{waterRequests.length || 0}</strong>
              <small>en central</small>
            </article>
            <article>
              <span className="quick-label">Servicio</span>
              <strong>{backendOk ? 'OK' : 'OFF'}</strong>
              <small>{backendOk ? 'API conectada' : 'sin conexión'}</small>
            </article>
          </div>
        </section>

        <MaxiSectorFilter alerts={alerts} sensors={sensorStatuses} sector={selectedSector} onChange={handleSectorChange} />

        <AlertMap
          alerts={visibleAlerts}
          sensorStatuses={visibleSensors}
          shelters={shelters}
          selectedSector={selectedSector}
          focusAlertId={latestAlertId}
          hydrants={hydrants}
          showHydrants={showHydrants && (role === 'bombero' || role === 'municipal')}
          waterRequests={waterRequests}
          focusedWaterRequestId={focusedWaterRequestId}
          focusedWaterRequestVersion={focusedWaterRequestVersion}
        />

        <section className="alerts-section" aria-label="Solicitudes de terreno recibidas">
          <div className="section-heading">
            <div>
              <p className="muted-text">Cada solicitud registrada se marca con 🚒 en el mapa central.</p>
            </div>
            <button type="button" className="secondary" onClick={loadWaterRequests}>Actualizar solicitudes</button>
          </div>
          {!waterRequests.length ? <p className="muted-text">Todavía no hay solicitudes registradas. Crea una desde Logística y aquí aparecerá su ubicación.</p> :
            <div className="squad-request-list">
              {waterRequests.map(request => <article className="squad-request-card" key={request.id}>
                <div><strong>🚒 Solicitud #{request.id} · {request.requester}</strong><p>{request.description || 'Solicitud de apoyo / reabastecimiento en terreno'}</p><small>{waterRequestStatus(request.status)}</small></div>
                <button type="button" className="secondary small-button" onClick={() => showWaterRequestOnCentral(request.id)}>Ver en el mapa</button>
              </article>)}
            </div>}
        </section>

        <section className="alerts-section">
          <div className="section-heading">
            <div>
              <p className="muted-text">Historial de alertas.</p>
            </div>
            <button type="button" className="secondary" onClick={loadAlerts}>Actualizar</button>
          </div>
          {!visibleAlerts.length ? <div className="empty-state"><strong>No hay alertas en este sector.</strong><span>Pulsa “Generar alerta aleatoria” para crear una o cambia el filtro.</span></div> : <div className="alert-list">{visibleAlerts.map(alert => <article className="alert-card" key={alert.id}><div className="alert-header"><div><span className={`priority ${String(alert.priority).toLowerCase()}`}>{alert.priority}</span><h3>#{alert.id} · {alert.sector}</h3></div><span className={`status ${alert.status === 'PENDIENTE' ? 'pending' : 'dispatched'}`}>{alert.status.replaceAll('_', ' ')}</span></div><p>{String(alert.message || "").replaceAll("detectÃ³", "detectó")}</p><dl className="alert-data"><div><dt>Sensor</dt><dd>{alert.sensor_id}</dd></div><div><dt>Humo</dt><dd>{alert.smoke_level}%</dd></div><div><dt>Latitud</dt><dd>{Number(alert.latitude).toFixed(4)}</dd></div><div><dt>Longitud</dt><dd>{Number(alert.longitude).toFixed(4)}</dd></div></dl><MaxiIncidentActions alert={alert} onAction={changeAlert} disabled={!backendOk || role === 'vecino'} /><div className="alert-footer"><small>{new Date(alert.detected_at).toLocaleString('es-CL')}</small>{alert.status === 'PENDIENTE' && <button type="button" disabled={busy || !backendOk} onClick={() => dispatch(alert.id)}>Despachar BRAVO-1</button>}{alert.status === 'UNIDAD_DESPACHADA' && <strong>{alert.dispatched_unit} despachada</strong>}</div></article>)}</div>}
        </section>
        <div className="footer-meta">Última actualización: {lastSync ? lastSync.toLocaleTimeString('es-CL') : 'sin datos'} · Actualización automática cada 6 segundos.</div>
      </>}

      {section === 'sensores' && <SensorPanel onStatusesChange={setSensorStatuses} />}
      {section === 'ciudadania' && <><MaxiSafeCheckin role={role} /><NeighborhoodReport /></>}
      {section === 'logistica' && <><MaxiHydrants role={role} onHydrantsChange={(items, visible) => { setHydrants(items.length ? items : EXAMPLE_HYDRANTS); setShowHydrants(visible) }} onChangeRole={setRole} /><ShelterPanel /><WaterRequestPanel onRequestCreated={handleWaterRequestCreated} onShowInCentral={showWaterRequestOnCentral} /></>}
    </main>
  </div>
}
