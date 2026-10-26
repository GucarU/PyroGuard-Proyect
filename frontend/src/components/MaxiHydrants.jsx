import { useEffect, useState } from 'react'
import { api, jsonOptions } from '../lib/api'
import { canViewHydrants } from '../lib/maxi'

export default function MaxiHydrants({ role, onHydrantsChange }) {
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

  async function refresh() {
    const list = await api('/api/hydrants', { headers: { 'X-Pyroguard-Role': role } })
    setItems(list); onHydrantsChange(list, visible); setError('')
  }
  useEffect(() => {
    if (!allowed) { setItems([]); onHydrantsChange([], false); setError(''); return }
    let active = true
    api('/api/hydrants', { headers: { 'X-Pyroguard-Role': role } })
      .then(list => { if (active) { setItems(list); onHydrantsChange(list, visible) } })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [role])
  function toggle() {
    const next = !visible
    setVisible(next)
    onHydrantsChange(items, next)
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('')
    try {
      const next = await api('/api/hydrants', jsonOptions('POST', {
        name: name.trim(), latitude: Number(latitude), longitude: Number(longitude), status,
      }, { 'X-Pyroguard-Role': role }))
      setName(''); setLatitude(''); setLongitude('')
      setMessage(`Grifo de prueba #${next.id} guardado en la API.`)
      await refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  if (!allowed) return <section className="alerts-section"><p className="section-label">HU-14 · Mapa logístico</p><h2>Grifos</h2><p className="muted-text">Capa disponible para roles de bomberos y municipalidad. El selector de rol de esta demo NO es un inicio de sesión real.</p></section>
  return <section className="alerts-section" aria-label="HU-14 mapa de grifos">
    <div className="section-heading"><div><p className="section-label">HU-14 · Registros exclusivamente de prueba</p><h2>Grifos en el mapa</h2></div><button type="button" className="secondary" onClick={toggle}>{visible ? 'Ocultar capa' : 'Mostrar capa'}</button></div>
    <p className="muted-text">No tenemos un catastro verificado de grifos. Los puntos que agregues son ficticios y sirven solo para demostrar la funcionalidad. El rol es simulado, no es control de acceso seguro.</p>
    <form className="report-form compact-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Nombre del grifo (DEMO)<input required maxLength="120" minLength="3" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Grifo DEMO sector 1" /></label>
        <label>Estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="EN_REVISION">En revisión</option><option value="DISPONIBLE">Disponible (prueba)</option><option value="SIN_AGUA">Sin agua (prueba)</option></select></label>
        <label>Latitud<input required type="number" step="any" min="-90" max="90" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-33.047" /></label>
        <label>Longitud<input required type="number" step="any" min="-180" max="180" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-71.612" /></label>
      </div>
      <div className="button-row"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Agregar grifo de práctica'}</button><button type="button" className="secondary" onClick={() => {setName('Grifo DEMO (ficticio)'); setLatitude('-33.047'); setLongitude('-71.612'); setStatus('EN_REVISION')}}>Rellenar ejemplo ficticio</button></div>
    </form>
    {message && <p className="mini-notice" role="status">{message}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <p className="muted-text">{items.length} registros de práctica guardados. {visible ? 'Visibles en el mapa de Central.' : 'Capa oculta.'}</p>
    <button type="button" className="secondary small-button" onClick={() => refresh().catch(e => setError(e.message))}>Actualizar grifos</button>
  </section>
}
