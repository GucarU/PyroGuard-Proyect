import { useCallback, useEffect, useState } from 'react'
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

const DEMO_DETECTION = {
  sensor_id: 'PG-VALPO-01', sector: 'Camino La Pólvora', smoke_detected: true,
  smoke_level: 82, latitude: -33.0757, longitude: -71.6136,
}
const SECTIONS = [
  ['central', 'Central y mapa'], ['sensores', 'Sensores'],
  ['ciudadania', 'Ciudadanía'], ['logistica', 'Logística'],
]

export default function App() {
  const [section, setSection] = useState('central')
  const [role, setRole] = useState('operador')
  const [actor, setActor] = useState('Operador de prueba')
  const [alerts, setAlerts] = useState([])
  const [sensorStatuses, setSensorStatuses] = useState([])
  const [shelters, setShelters] = useState([])
  const [hydrants, setHydrants] = useState([])
  const [showHydrants, setShowHydrants] = useState(true)
  const [backendOk, setBackendOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedSector, setSelectedSector] = useState('')
  const [notice, setNotice] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const visibleAlerts = filterBySector(alerts, selectedSector)
  const visibleSensors = filterBySector(sensorStatuses, selectedSector)

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api('/api/alerts')
      setAlerts(data); setBackendOk(true); setLastSync(new Date())
    } catch {
      setBackendOk(false)
    }
  }, [])
  const loadSensors = useCallback(async () => {
    try { setSensorStatuses(await api('/api/sensors/status')) } catch { /* sección de sensores sigue siendo independiente */ }
  }, [])
  const loadShelters = useCallback(async () => {
    try { setShelters(await api('/api/shelters')) } catch { /* error independiente del panel */ }
  }, [])
  useEffect(() => {
    loadAlerts(); loadShelters(); loadSensors()
    const t = setInterval(loadAlerts, 6000)
    const s = setInterval(loadShelters, 16000)
    const e = setInterval(loadSensors, 12000)
    return () => { clearInterval(t); clearInterval(s); clearInterval(e) }
  }, [loadAlerts, loadShelters, loadSensors])
  async function simulateSmoke() {
    setBusy(true); setNotice(null)
    try {
      const created = await api('/api/sensors/detections', jsonOptions('POST', DEMO_DETECTION))
      setNotice({ type:'success', text:`Alerta #${created.alert.id} creada y guardada en la base de datos.` })
      await loadAlerts()
    } catch (e) { setNotice({ type:'error', text:e.message }) } finally { setBusy(false) }
  }
  async function changeAlert(alertId, action) {
    setNotice(null)
    if (actor.trim().length < 2) {setNotice({type:'error',text:'Indica el nombre del operador de prueba.'}); throw new Error('Operador requerido')}
    try {
      await api(`/api/alerts/${alertId}/${action === 'VALIDADO' ? 'validate' : 'discard'}`, jsonOptions('PATCH', {actor:actor.trim()}))
      setNotice({type:'success',text:`Alerta #${alertId}: ${action === 'VALIDADO' ? 'foco validado' : 'falsa alarma registrada'}. Cambio guardado.`})
      await loadAlerts()
    } catch (e) { setNotice({type:'error',text:e.message}); throw e }
  }
  async function dispatch(alertId) {
    setBusy(true); setNotice(null)
    try {
      await api(`/api/alerts/${alertId}/dispatch`, jsonOptions('PATCH', {unit:'BRAVO-1'}))
      setNotice({type:'success',text:`Unidad BRAVO-1 asignada a alerta #${alertId}.`}); await loadAlerts()
    } catch(e) {setNotice({type:'error',text:e.message})} finally {setBusy(false)}
  }
  return <div className="app-shell">
    <header className="topbar topbar-modern">
      <div><p className="eyebrow">PYROGUARD · PROTOTIPO ACADÉMICO</p><h1>Centro de coordinación</h1><p className="subtitle">Detección temprana, validación y coordinación de recursos · Hito 2</p></div>
      <span className={`api-status ${backendOk ? 'online' : 'offline'}`} role="status"><span className="dot" />{backendOk ? 'API conectada' : 'API sin conexión'}</span>
    </header>
    <div className="prototype-strip">Entorno de enseñanza y pruebas: <strong>no se conecta con Bomberos, municipalidades ni sistemas reales de emergencia.</strong></div>
    <nav className="app-nav" aria-label="Secciones del sistema">{SECTIONS.map(([id, label]) => <button type="button" key={id} className={section===id?'nav-tab active':'nav-tab'} aria-current={section===id?'page':undefined} onClick={()=>setSection(id)}>{label}</button>)}</nav>
    <div className="control-strip">
      <label>Rol de práctica <select value={role} onChange={e=>{setRole(e.target.value);setHydrants([]);setShowHydrants(false)}}><option value="operador">Operador</option><option value="bombero">Bombero</option><option value="municipal">Municipal</option><option value="vecino">Vecino</option></select></label>
      <label>Responsable de acciones <input value={actor} maxLength="80" onChange={e=>setActor(e.target.value)} aria-label="Responsable de acciones" /></label>
      <span className="muted-text">La elección de rol es simulada; no reemplaza un inicio de sesión seguro.</span>
    </div>
    {!backendOk && <div className="notice error" role="alert">No hay conexión con el backend. Ejecuta <code>python -m uvicorn backend.main:app --reload</code> desde la carpeta principal, luego pulsa Reintentar. <button className="secondary small-button" onClick={loadAlerts}>Reintentar</button></div>}
    {notice && <div role={notice.type==='error'?'alert':'status'} className={`notice ${notice.type}`}>{notice.text}<button className="notice-close" type="button" aria-label="Cerrar aviso" onClick={()=>setNotice(null)}>×</button></div>}
    <main className="page-stack">
      {section==='central' && <>
        <section className="hero-card hero-modern"><div><p className="section-label">HU-01 · Inicio rápido</p><h2>Detectar un foco de prueba</h2><p>Envía una detección simulada de humo a la API. Luego podrás validarla, descartarla y verla en el mapa.</p></div><button onClick={simulateSmoke} disabled={busy || !backendOk}>{busy?'Enviando…':'Simular detección'}</button></section>
        <section className="summary-grid" aria-label="Resumen de alertas"><article><span>Alertas registradas</span><strong>{alerts.length}</strong></article><article><span>Pendientes</span><strong>{alerts.filter(a=>a.status==='PENDIENTE').length}</strong></article><article><span>Validadas</span><strong>{alerts.filter(a=>a.status==='VALIDADO').length}</strong></article><article><span>Falsas alarmas</span><strong>{alerts.filter(a=>a.status==='FALSA_ALARMA').length}</strong></article></section>
        <MaxiSectorFilter alerts={alerts} sensors={sensorStatuses} sector={selectedSector} onChange={setSelectedSector}/>
        <AlertMap alerts={visibleAlerts} sensorStatuses={visibleSensors} shelters={shelters} selectedSector={selectedSector} hydrants={hydrants} showHydrants={showHydrants && (role==='bombero'||role==='municipal')} />
        <section className="alerts-section"><div className="section-heading"><div><p className="section-label">HU-05 y HU-08 · Gestión real de registros de prueba</p><h2>Alertas recientes</h2><p className="muted-text">Las falsas alarmas se conservan en el historial, pero desaparecen del mapa activo.</p></div><button type="button" className="secondary" onClick={loadAlerts}>Actualizar</button></div>
        {!visibleAlerts.length ? <div className="empty-state"><strong>No hay alertas en este sector.</strong><span>Pulsa “Simular detección” para generar una alerta de prueba o cambia el filtro.</span></div> : <div className="alert-list">{visibleAlerts.map(alert=><article className="alert-card" key={alert.id}><div className="alert-header"><div><span className={`priority ${String(alert.priority).toLowerCase()}`}>{alert.priority}</span><h3>#{alert.id} · {alert.sector}</h3></div><span className={`status ${alert.status==='PENDIENTE'?'pending':'dispatched'}`}>{alert.status.replaceAll('_',' ')}</span></div><p>{alert.message}</p><dl className="alert-data"><div><dt>Sensor</dt><dd>{alert.sensor_id}</dd></div><div><dt>Humo</dt><dd>{alert.smoke_level}%</dd></div><div><dt>Latitud</dt><dd>{Number(alert.latitude).toFixed(4)}</dd></div><div><dt>Longitud</dt><dd>{Number(alert.longitude).toFixed(4)}</dd></div></dl><MaxiIncidentActions alert={alert} onAction={changeAlert} disabled={!backendOk || role==='vecino'} /><div className="alert-footer"><small>{new Date(alert.detected_at).toLocaleString('es-CL')}</small>{alert.status==='PENDIENTE' && <button type="button" disabled={busy || !backendOk} onClick={()=>dispatch(alert.id)}>Despachar BRAVO-1</button>}{alert.status==='UNIDAD_DESPACHADA' && <strong>{alert.dispatched_unit} despachada</strong>}</div></article>)}</div>}</section>
        <div className="footer-meta">Última actualización: {lastSync ? lastSync.toLocaleTimeString('es-CL') : 'sin datos'} · Actualización automática cada 6 segundos.</div>
      </>}
      {section==='sensores' && <SensorPanel onStatusesChange={setSensorStatuses} />}
      {section==='ciudadania' && <><MaxiSafeCheckin role={role}/><NeighborhoodReport/></>}
      {section==='logistica' && <><MaxiHydrants role={role} onHydrantsChange={(items, visible) => {setHydrants(items);setShowHydrants(visible)}}/><ShelterPanel/><WaterRequestPanel/></>}
    </main>
  </div>
}
