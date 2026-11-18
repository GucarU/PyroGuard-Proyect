import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowRight, Check, ChevronDown, ClipboardList, Flame, House, ImageOff, LogOut, MapPin, Moon, ShieldCheck, Sun, SunMoon, UserRound } from 'lucide-react'
import CitizenEmergency from './components/CitizenEmergency'
import MaxiSafeCheckin from './components/MaxiSafeCheckin'
import NeighborhoodReport from './components/NeighborhoodReport'
import { REPORTS_ENDPOINT, ReportPhoto, ReportStatus, reportDate, useReportList } from './components/ReportDetails'
import './citizen.css'

const LINKS = [
  { id: 'inicio', label: 'Inicio', icon: House },
  { id: 'historial', label: 'Mis reportes', icon: ClipboardList, text: 'Consulta el estado de tus avisos.' },
  { id: 'seguridad', label: 'Seguridad', card: 'Información de seguridad', icon: ShieldCheck, text: 'Infórmate sobre qué hacer ante un incendio.' },
  { id: 'cuenta', label: 'Mi perfil', icon: UserRound, text: 'Consulta tus datos y cierra sesión.' },
]

const REVIEW_TEXT = {
  PENDIENTE: 'Tu reporte fue recibido y está pendiente de revisión.',
  EN_REVISION: 'El equipo está revisando la información que enviaste.',
  VALIDADO: 'El equipo terminó la revisión y validó tu reporte.',
  DESCARTADO: 'El equipo terminó la revisión y descartó tu reporte.',
}

const APPEARANCES = {
  light: { label: 'Claro', icon: Sun },
  dark: { label: 'Oscuro', icon: Moon },
  auto: { label: 'Automático', icon: SunMoon },
}
const DARK_APPEARANCE = '(prefers-color-scheme: dark)'

function readAppearance(key) {
  try {
    const stored = window.localStorage.getItem(key)
    if (Object.keys(APPEARANCES).includes(stored)) return stored
  } catch {
    // La selección sigue disponible cuando el navegador bloquea el almacenamiento.
  }
  return 'auto'
}

function AppearancePicker({ preference, onChange }) {
  const [open, setOpen] = useState(false)
  const picker = useRef(null)
  const trigger = useRef(null)
  const { icon: Icon, label } = APPEARANCES[preference]

  useEffect(() => {
    if (!open) return
    const dismissOutside = event => { if (!picker.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [open])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  return <div className="citizen-appearance" ref={picker} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={event => {
    if (open && event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }}>
    <button type="button" ref={trigger} className="citizen-button citizen-button-secondary citizen-appearance-trigger"
      aria-label={`Apariencia (${label})`} aria-expanded={open} aria-controls="citizen-appearance-options" onClick={() => setOpen(value => !value)}>
      <Icon size={18} aria-hidden="true" /><span>{label}</span><ChevronDown size={14} aria-hidden="true" />
    </button>
    <div id="citizen-appearance-options" className="citizen-appearance-options" role="group" aria-label="Modo de apariencia" hidden={!open}>
      {Object.entries(APPEARANCES).map(([mode, { label: option, icon: OptionIcon }]) => <button type="button" key={mode}
        aria-pressed={preference === mode} onClick={() => { onChange(mode); close() }}>
        <OptionIcon size={18} aria-hidden="true" /><span>{option}</span>
        {preference === mode && <Check size={16} aria-hidden="true" />}
      </button>)}
    </div>
  </div>
}

function reportMapUrl(report) {
  const { latitude, longitude } = report
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
}

function CitizenHome({ name, onNavigate }) {
  return <>
    <section className="citizen-hero" aria-labelledby="citizen-welcome">
      <div className="citizen-hero-copy">
        <h2 id="citizen-welcome">Hola, {name}</h2>
        <p>¿Ves humo o fuego? Marca el lugar y avisa desde un sitio seguro.</p>
        <button type="button" className="citizen-button citizen-button-primary citizen-hero-action" onClick={() => onNavigate('reportar')}>
          <Flame size={23} aria-hidden="true" /> REPORTAR POSIBLE INCENDIO <ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="citizen-hero-art" aria-hidden="true">
        <span className="citizen-art-pin"><Flame size={44} strokeWidth={1.8} /></span>
      </div>
    </section>
    <div className="citizen-shortcuts" aria-label="Accesos rápidos">
      {LINKS.slice(1).map(({ id, label, card, icon: Icon, text }) => <button type="button" key={id}
        className="citizen-shortcut" onClick={() => onNavigate(id)}>
        <span className="citizen-icon" aria-hidden="true"><Icon size={22} /></span>
        <span><strong>{card || label}</strong><small>{text}</small></span>
        <ArrowDownRight className="citizen-shortcut-arrow" size={19} aria-hidden="true" />
      </button>)}
    </div>
    <CitizenEmergency />
  </>
}

function MyReports({ onReport }) {
  const { reports, error, loading, refresh } = useReportList(`${REPORTS_ENDPOINT}/mine`)

  return <section className="citizen-panel citizen-history" aria-labelledby="my-reports-heading">
    <div className="citizen-section-header">
      <div><h2 id="my-reports-heading">Mis reportes</h2><p>Consulta los avisos que enviaste y su estado de revisión.</p></div>
      <button type="button" className="citizen-button citizen-button-secondary" disabled={loading} onClick={refresh}>Actualizar estados</button>
    </div>
    {error && <p className="citizen-error" role="alert">No pudimos cargar tus reportes. Revisa la conexión y vuelve a intentarlo.</p>}
    {loading && <p role="status">Cargando tus reportes…</p>}
    {!reports.length && !loading && !error && <div className="citizen-history-empty">
      <ClipboardList size={31} aria-hidden="true" />
      <p>Todavía no has enviado reportes.</p>
      <button type="button" className="citizen-button citizen-button-primary" onClick={onReport}>Crear mi primer reporte</button>
    </div>}
    {reports.length > 0 && <ul className="citizen-history-list">{reports.map(report => <li className="citizen-history-item" key={report.id}>
      <div className="citizen-history-top">
        {report.photo_path ? <ReportPhoto report={report} /> : <span className="citizen-no-photo" aria-label="Sin foto" role="img"><ImageOff size={22} /></span>}
        <div>
          <div className="citizen-report-title"><h3>Reporte #{report.id}</h3><ReportStatus status={report.status} /></div>
          <time dateTime={report.created_at}>{reportDate(report.created_at)}</time>
          <a href={reportMapUrl(report)} target="_blank" rel="noreferrer" className="citizen-map-link">
            <MapPin size={16} aria-hidden="true" /> {report.location_label || 'Ver ubicación en el mapa'}
          </a>
        </div>
      </div>
      {report.description && <p className="citizen-report-description">{report.description}</p>}
      <details className="citizen-review-details">
        <summary>Detalles de la revisión <ChevronDown size={16} aria-hidden="true" /></summary>
        <p>{REVIEW_TEXT[report.status]}</p>
        {report.reviewed_at && <p>Última actualización: <time dateTime={report.reviewed_at}>{reportDate(report.reviewed_at)}</time></p>}
      </details>
    </li>)}</ul>}
  </section>
}

export default function CitizenPortal({ user, onLogout, loggingOut, sessionError }) {
  const appearanceKey = `pyroguard.ciudadania.apariencia.${user.id}`
  const [preference, setPreference] = useState(() => readAppearance(appearanceKey))
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.(DARK_APPEARANCE)?.matches ?? false)
  const [section, setSection] = useState('inicio')
  const content = useRef(null)
  const appearance = preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    const query = window.matchMedia?.(DARK_APPEARANCE)
    if (!query) return
    const sync = event => setSystemDark(event.matches)
    sync(query)
    if (query.addEventListener) {
      query.addEventListener('change', sync)
      return () => query.removeEventListener('change', sync)
    }
    query.addListener?.(sync)
    return () => query.removeListener?.(sync)
  }, [])

  function changeAppearance(mode) {
    setPreference(mode)
    try { window.localStorage.setItem(appearanceKey, mode) } catch { /* Aplica el modo durante esta visita. */ }
  }

  useEffect(() => {
    if (section !== 'reportar') content.current?.focus()
  }, [section])

  return <div className="citizen-app" data-theme={appearance}>
    <header className="citizen-site-header">
      <div className="citizen-container citizen-header-inner">
        <div className="citizen-brand">
          <span className="citizen-brand-mark" aria-hidden="true"><Flame size={23} /></span>
          <div><strong>PyroGuard</strong><h1>Portal ciudadano</h1></div>
        </div>
        <AppearancePicker preference={preference} onChange={changeAppearance} />
        <nav className="citizen-site-nav" aria-label="Navegación ciudadana">
          {LINKS.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setSection(id)}
            aria-current={section === id ? 'page' : undefined}><Icon size={18} aria-hidden="true" />{label}</button>)}
        </nav>
      </div>
    </header>
    <main className="citizen-container citizen-content" ref={content} tabIndex={-1}>
      {section === 'inicio' && <CitizenHome name={user.name} onNavigate={setSection} />}
      {section === 'reportar' && <NeighborhoodReport onViewReports={() => setSection('historial')} onHome={() => setSection('inicio')} />}
      {section === 'historial' && <MyReports onReport={() => setSection('reportar')} />}
      {section === 'seguridad' && <div className="citizen-flow">
        <section className="citizen-panel citizen-info" aria-labelledby="safety-heading">
          <span className="citizen-icon" aria-hidden="true"><ShieldCheck size={24} /></span>
          <h2 id="safety-heading">Información de seguridad</h2>
          <ul>
            <li>Toma distancia del fuego y del humo. Ponte a salvo antes de reportar.</li>
            <li>Sigue las indicaciones de evacuación y espera a que las autoridades autoricen el regreso.</li>
            <li>Evita encender fogatas cerca de la vegetación y mantén despejados los alrededores de tu vivienda.</li>
          </ul>
          <a className="citizen-text-link" href="https://senapred.cl/incendios-forestales/" target="_blank" rel="noreferrer">Recomendaciones de SENAPRED</a>
        </section>
        <CitizenEmergency />
        <div className="citizen-safe-checkin"><MaxiSafeCheckin /></div>
      </div>}
      {section === 'cuenta' && <section className="citizen-panel citizen-profile" aria-labelledby="account-heading">
        <span className="citizen-icon" aria-hidden="true"><UserRound size={24} /></span>
        <h2 id="account-heading">Mi perfil</h2>
        <dl className="citizen-account"><div><dt>Nombre</dt><dd>{user.name}</dd></div>
          <div><dt>Correo electrónico</dt><dd>{user.email}</dd></div></dl>
        {sessionError && <p className="citizen-error" role="alert">{sessionError}</p>}
        <button type="button" className="citizen-button citizen-button-secondary" onClick={onLogout} disabled={loggingOut}>
          <LogOut size={18} aria-hidden="true" />{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </section>}
    </main>
  </div>
}
