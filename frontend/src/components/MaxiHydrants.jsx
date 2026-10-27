import { useEffect, useState } from 'react'
import { api, jsonOptions } from '../lib/api'
import { canViewHydrants, EXAMPLE_HYDRANTS } from '../lib/maxi'
import HydrantMap from './HydrantMap'

export default function MaxiHydrants({ role, onHydrantsChange, onChangeRole }) {
  const allowed = canViewHydrants(role)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [status, setStatus] = useState('EN_REVISION')
  const [visible, setVisible] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const displayItems = items.length ? items : EXAMPLE_HYDRANTS
  const selected = latitude !== '' && longitude !== '' ? { lat: Number(latitude), lng: Number(longitude) } : null

  async function refresh() {
    const list = await api('/api/hydrants', { headers: { 'X-Pyroguard-Role': role } })
    setItems(list)
    onHydrantsChange(list, visible)
    setError('')
  }
  useEffect(() => {
    if (!allowed) {
      setItems([])
      onHydrantsChange([], false)
      setError('')
      return
    }
    let active = true
    api('/api/hydrants', { headers: { 'X-Pyroguard-Role': role } })
      .then(list => {
        if (active) {
          setItems(list)
          onHydrantsChange(list, visible)
          setError('')
        }
      })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [role])

  function toggle() {
    const next = !visible
    setVisible(next)
    onHydrantsChange(items, next)
  }

  function onPick(point) {
    setLatitude(point.lat.toFixed(6))
    setLongitude(point.lng.toFixed(6))
    setMessage('Ubicación seleccionada en el mapa. Completa el nombre y guarda el grifo de práctica.')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const next = await api('/api/hydrants', jsonOptions('POST', {
        name: name.trim(), latitude: Number(latitude), longitude: Number(longitude), status,
      }, { 'X-Pyroguard-Role': role }))
      setName('')
      setLatitude('')
      setLongitude('')
      setMessage(`Grifo de práctica #${next.id} guardado. Ya está visible en el mapa.`)
      await refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <section className="alerts-section" aria-label="HU-14 mapa de grifos">
    <div className="section-heading">
      <div><p className="section-label">HU-14 · Recursos georreferenciados · Solo demo</p><h2>Grifos en el mapa</h2></div>
      {allowed && <button type="button" className="secondary" onClick={toggle}>{visible ? 'Ocultar en central' : 'Mostrar en central'}</button>}
    </div>
    <p className="muted-text">Grifos de práctica sobre OpenStreetMap. No se está usando un catastro oficial ni un inicio de sesión real.</p>

    {!allowed && <div className="role-help-panel">
      <strong>Estás viendo el rol «{role}»</strong>
      <p>Capa disponible para roles de bomberos y municipalidad. Para ver y colocar pines de grifos, usa el rol Bombero o Municipal. El cambio aquí es solo para practicar la interfaz.</p>
      <button type="button" onClick={() => onChangeRole?.('bombero')}>Ver mapa como Bombero (demo)</button>
    </div>}

    <HydrantMap items={displayItems} selected={selected} enabled={allowed} onPick={onPick} />

    {allowed && <>
      <p className="muted-text">{items.length ? `${items.length} grifos de prueba guardados en SQLite.` : 'Se muestran tres ejemplos ficticios para que puedas probar los pines. Todavía no hay registros guardados.'} {visible ? 'La capa también se ve en el mapa de Central.' : 'La capa está oculta en Central.'}</p>
      <form className="report-form compact-form" onSubmit={submit}>
        <h3>Agregar un grifo de prueba</h3>
        <p className="muted-text">Haz clic en el mapa superior para completar la ubicación automáticamente.</p>
        <div className="form-grid">
          <label>Nombre del grifo (DEMO)<input required maxLength="120" minLength="3" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Grifo DEMO sector 1" /></label>
          <label>Estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="EN_REVISION">En revisión</option><option value="DISPONIBLE">Disponible (prueba)</option><option value="SIN_AGUA">Sin agua (prueba)</option></select></label>
          <label>Latitud<input required type="number" step="any" min="-90" max="90" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-33.047" /></label>
          <label>Longitud<input required type="number" step="any" min="-180" max="180" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-71.612" /></label>
        </div>
        <div className="button-row"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Agregar pin al mapa'}</button><button type="button" className="secondary" onClick={() => { setName('Grifo DEMO (ficticio)'); setLatitude('-33.047'); setLongitude('-71.612'); setStatus('EN_REVISION') }}>Rellenar ejemplo</button><button type="button" className="secondary small-button" onClick={() => refresh().catch(e => setError(e.message))}>Actualizar</button></div>
      </form>
    </>}
    {message && <p className="mini-notice" role="status">{message}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </section>
}
