import { useEffect, useState } from 'react'
import { api, jsonOptions } from '../lib/api'
import { canViewHydrants, EXAMPLE_HYDRANTS } from '../lib/maxi'
import HydrantMap from './HydrantMap'

export default function MaxiHydrants({ profile, onHydrantsChange }) {
  const allowed = canViewHydrants(profile)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [status, setStatus] = useState('EN_REVISION')
  const [visible, setVisible] = useState(true)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const selected = latitude !== '' && longitude !== '' ? { lat: Number(latitude), lng: Number(longitude) } : null

  async function refresh() {
    const list = await api('/api/hydrants')
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
    api('/api/hydrants')
      .then(list => {
        if (active) {
          setItems(list)
          onHydrantsChange(list, visible)
          setError('')
        }
      })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [allowed])

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
      }))
      setName('')
      setLatitude('')
      setLongitude('')
      setMessage(`Grifo de práctica #${next.id} guardado. Ya está visible en el mapa.`)
      await refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <section className="alerts-section" aria-label="Mapa de grifos">
    <div className="section-heading">
      <div><h2>Grifos en el mapa</h2></div>
      {allowed && <button type="button" className="secondary" onClick={toggle}>{visible ? 'Ocultar en central' : 'Mostrar en central'}</button>}
    </div>
    {!allowed && <div className="role-help-panel">
      <p>Capa disponible para los perfiles Bombero y Municipal.</p>
    </div>}

    {allowed && <>
      {!items.length && <button type="button" className="secondary small-button" aria-pressed={preview}
        onClick={() => setPreview(current => !current)}>{preview ? 'Ocultar ejemplos' : 'Ver grifos de ejemplo'}</button>}
      <HydrantMap items={!items.length && preview ? EXAMPLE_HYDRANTS : items} selected={selected} enabled onPick={onPick} />
      <p className="muted-text">{items.length ? `${items.length} grifos guardados.` : 'Todavía no hay grifos guardados.'} {visible ? 'La capa se ve en el mapa de Central.' : 'La capa está oculta en Central.'}</p>
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
