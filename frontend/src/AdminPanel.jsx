import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AlertMap from './components/AlertMap'
import NeighborhoodReports from './components/NeighborhoodReports'
import { REPORTS_ENDPOINT, useReportList } from './components/ReportDetails'
import ShelterPanel from './components/ShelterPanel'
import WaterRequestPanel from './components/WaterRequestPanel'
import MaxiIncidentActions from './components/MaxiIncidentActions'
import MaxiSectorFilter from './components/MaxiSectorFilter'
import MaxiSafeCheckin from './components/MaxiSafeCheckin'
import MaxiHydrants from './components/MaxiHydrants'
import HydrantFilters from './components/HydrantFilters'
import { canViewHydrants, filterBySector, filterHydrants } from './lib/maxi'
import { api, jsonOptions } from './lib/api'
import { createRandomDetection } from './lib/demoDetections'
import { mapWaterRequests, waterRequestStatus } from './lib/waterRequests'

const SensorPanel = lazy(() => import('./components/SensorPanel'))

const SECTIONS = [
  ['central', 'Central y mapa'], ['sensores', 'Sensores'],
  ['logistica', 'Logística'], ['reportes', 'Reportes ciudadanos'],
]

const PROFILE_NAMES = { operador: 'Operador', bombero: 'Bombero', municipal: 'Municipal' }

export default function AdminPanel({ user, onLogout, loggingOut, sessionError }) {
  const [section, setSection] = useState('central')
  const canManageHydrants = canViewHydrants(user.profile)
  const [alerts, setAlerts] = useState([])
  const [sensorStatuses, setSensorStatuses] = useState([])
  const [shelters, setShelters] = useState([])
  const [hydrants, setHydrants] = useState([])
  const [hydrantFilters, setHydrantFilters] = useState({ sector: '', status: '' })
  const [hydrantError, setHydrantError] = useState('')
  const hydrantReadVersion = useRef(0)
  const [waterRequests, setWaterRequests] = useState([])
  const [focusedWaterRequestId, setFocusedWaterRequestId] = useState(null)
  const [focusedWaterRequestVersion, setFocusedWaterRequestVersion] = useState(0)
  const reportFeed = useReportList(REPORTS_ENDPOINT)
  const [focusedReportId, setFocusedReportId] = useState(null)
  const focusedReport = reportFeed.reports.find(report => report.id === focusedReportId)
  const [showHydrants, setShowHydrants] = useState(true)
  const [backendOk, setBackendOk] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [busy, setBusy] = useState(false)
  const [selectedSector, setSelectedSector] = useState('')
  const [notice, setNotice] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [latestAlertId, setLatestAlertId] = useState(null)
  const [latestDetection, setLatestDetection] = useState(null)
  const previousSensorRef = useRef(null)

  const visibleAlerts = useMemo(() => filterBySector(alerts, selectedSector), [alerts, selectedSector])
  const visibleSensors = useMemo(() => filterBySector(sensorStatuses, selectedSector), [sensorStatuses, selectedSector])
  const visibleHydrants = useMemo(() => filterHydrants(hydrants, hydrantFilters), [hydrants, hydrantFilters])

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
    setFocusedReportId(null)
    // El backend ya confirmó la creación. También refrescamos para asegurar coherencia.
    loadWaterRequests()
  }

  function handleSectorChange(sector) {
    // El filtro y el mapa de solicitudes son acciones independientes.
    setSelectedSector(sector)
    setFocusedWaterRequestId(null)
    setFocusedWaterRequestVersion(previous => previous + 1)
    setFocusedReportId(null)
  }

  function showWaterRequestOnCentral(requestId) {
    setFocusedWaterRequestId(requestId)
    setFocusedWaterRequestVersion(previous => previous + 1)
    setFocusedReportId(null)
    openCentralMap()
  }

  function showReportOnCentral(report) {
    setFocusedReportId(report.id)
    setFocusedWaterRequestId(null)
    openCentralMap()
  }

  function openCentralMap() {
    setSelectedSector('')
    setSection('central')
    setTimeout(() => document.getElementById('mapa-central')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 90)
  }

  const loadHydrants = useCallback(async () => {
    if (!canManageHydrants) return
    const version = ++hydrantReadVersion.current
    try {
      const items = await api('/api/hydrants')
      if (version === hydrantReadVersion.current) {
        setHydrants(items)
        setHydrantError('')
      }
    } catch (error) {
      if (version === hydrantReadVersion.current) setHydrantError(error.message)
    }
  }, [canManageHydrants])

  function handleHydrantSaved(saved) {
    hydrantReadVersion.current++
    setHydrants(current => [saved, ...current.filter(item => item.id !== saved.id)])
  }

  useEffect(() => {
    const className = theme === 'dark' ? 'dark-theme' : 'light-theme'
    document.body.classList.add(className)
    return () => document.body.classList.remove(className)
  }, [theme])

  useEffect(() => {
    loadAlerts()
    loadShelters()
    loadSensors()
    loadHydrants()
    loadWaterRequests()
    const t = setInterval(loadAlerts, 6000)
    const s = setInterval(loadShelters, 16000)
    const e = setInterval(loadSensors, 12000)
    const h = setInterval(loadHydrants, 15000)
    const w = setInterval(loadWaterRequests, 7000)
    return () => { clearInterval(t); clearInterval(s); clearInterval(e); clearInterval(h); clearInterval(w) }
  }, [loadAlerts, loadHydrants, loadSensors, loadShelters, loadWaterRequests])

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
    try {
      await api(`/api/alerts/${alertId}/${action === 'VALIDADO' ? 'validate' : 'discard'}`, { method: 'PATCH' })
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

  return <div className={`app-shell ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
    <header className="topbar topbar-modern">
      <div>
        <p className="eyebrow">PYROGUARD · PROTOTIPO ACADÉMICO</p>
        <h1>Centro de coordinación</h1>
        <p className="muted-text account-label">{user.name} · {PROFILE_NAMES[user.profile]}</p>
      </div>
      <div className="topbar-actions">
        <button type="button" className="secondary theme-toggle" aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button type="button" className="secondary logout-button" disabled={loggingOut} onClick={onLogout}>Cerrar sesión</button>
        <span className={`api-status ${backendOk ? 'online' : 'offline'}`} role="status"><span className="dot" />{backendOk ? 'API conectada' : 'API sin conexión'}</span>
      </div>
    </header>

    <nav className="app-nav" aria-label="Secciones del sistema">
      {SECTIONS.map(([id, label]) => (
        <button type="button" key={id} className={section === id ? 'nav-tab active' : 'nav-tab'} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}>{label}</button>
      ))}
    </nav>

    {sessionError && <p className="notice error" role="alert">{sessionError}</p>}
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
              <strong>{showHydrants ? visibleHydrants.length : 0}</strong>
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
        {canManageHydrants && showHydrants && <HydrantFilters hydrants={hydrants} filters={hydrantFilters} onChange={setHydrantFilters} />}

        <AlertMap
          alerts={visibleAlerts}
          sensorStatuses={visibleSensors}
          shelters={shelters}
          selectedSector={selectedSector}
          focusAlertId={latestAlertId}
          hydrants={visibleHydrants}
          showHydrants={showHydrants && canManageHydrants}
          waterRequests={waterRequests}
          focusedWaterRequestId={focusedWaterRequestId}
          focusedWaterRequestVersion={focusedWaterRequestVersion}
          focusedReport={focusedReport}
          reports={reportFeed.reports}
          reportsError={reportFeed.error}
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
          {!visibleAlerts.length ? <div className="empty-state"><strong>No hay alertas en este sector.</strong><span>Pulsa “Generar alerta aleatoria” para crear una o cambia el filtro.</span></div> : <div className="alert-list">{visibleAlerts.map(alert => <article className="alert-card" key={alert.id}><div className="alert-header"><div><span className={`priority ${String(alert.priority).toLowerCase()}`}>{alert.priority}</span><h3>#{alert.id} · {alert.sector}</h3></div><span className={`status ${alert.status === 'PENDIENTE' ? 'pending' : 'dispatched'}`}>{alert.status.replaceAll('_', ' ')}</span></div><p>{String(alert.message || "").replaceAll("detectÃ³", "detectó")}</p><dl className="alert-data"><div><dt>Sensor</dt><dd>{alert.sensor_id}</dd></div><div><dt>Humo</dt><dd>{alert.smoke_level}%</dd></div><div><dt>Latitud</dt><dd>{Number(alert.latitude).toFixed(4)}</dd></div><div><dt>Longitud</dt><dd>{Number(alert.longitude).toFixed(4)}</dd></div></dl><MaxiIncidentActions alert={alert} onAction={changeAlert} disabled={!backendOk} /><div className="alert-footer"><small>{new Date(alert.detected_at).toLocaleString('es-CL')}</small>{alert.status === 'PENDIENTE' && <button type="button" disabled={busy || !backendOk} onClick={() => dispatch(alert.id)}>Despachar BRAVO-1</button>}{alert.status === 'UNIDAD_DESPACHADA' && <strong>{alert.dispatched_unit} despachada</strong>}</div></article>)}</div>}
        </section>
        <div className="footer-meta">Última actualización: {lastSync ? lastSync.toLocaleTimeString('es-CL') : 'sin datos'} · Actualización automática cada 6 segundos.</div>
      </>}

      {section === 'sensores' && <Suspense fallback={<p role="status">Cargando sensores…</p>}>
        <SensorPanel onStatusesChange={setSensorStatuses} />
      </Suspense>}
      {section === 'reportes' && <><NeighborhoodReports alerts={alerts} reportFeed={reportFeed} onShowReport={showReportOnCentral} />{canManageHydrants && <MaxiSafeCheckin review />}</>}
      {section === 'logistica' && <>
        <MaxiHydrants profile={user.profile} items={hydrants} filters={hydrantFilters} onFiltersChange={setHydrantFilters}
          visible={showHydrants} onToggle={() => setShowHydrants(value => !value)} onSaved={handleHydrantSaved}
          onRefresh={loadHydrants} loadError={hydrantError} />
        <ShelterPanel />
        <WaterRequestPanel onRequestCreated={handleWaterRequestCreated} onShowInCentral={showWaterRequestOnCentral} />
      </>}
    </main>
  </div>
}
