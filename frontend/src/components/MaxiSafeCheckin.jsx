import { useState } from 'react'
import { api, jsonOptions } from '../lib/api'

export default function MaxiSafeCheckin({ review = false }) {
  const [alias, setAlias] = useState('')
  const [sector, setSector] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState('')
  const [records, setRecords] = useState([])
  const [viewing, setViewing] = useState(false)
  async function submit() {
    setBusy(true); setError('')
    try {
      const item = await api('/api/evacuations/safe', jsonOptions('POST', { alias: alias.trim(), sector: sector.trim() }))
      setSaved(item); setConfirming(false)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function view() {
    try {
      const list = await api('/api/evacuations/safe')
      setRecords(list); setViewing(true); setError('')
    } catch (e) { setError(e.message) }
  }

  if (review) return <section className="alerts-section" aria-label="Registros de evacuación">
    <h2>Registros de evacuación</h2>
    <button type="button" className="secondary" onClick={view}>Ver registros de evacuación</button>
    {error && <p className="notice error" role="alert">{error}</p>}
    {viewing && <div className="compact-list"><h3>Registros ({records.length})</h3>{records.length ? records.map(r => <p key={r.id}>#{r.id} · {r.alias} · {r.sector} · {new Date(r.reported_at).toLocaleString('es-CL')}</p>) : <p>Sin registros todavía.</p>}</div>}
  </section>

  return <section className="alerts-section" aria-label="Confirmar que estoy a salvo">
    <h2>Confirmar que estoy a salvo</h2>
    <p className="muted-text">Registro de seguridad local.</p>
    <div className="form-grid">
      <label>Alias<input value={alias} maxLength="80" onChange={e => setAlias(e.target.value)} placeholder="Ej. Vecino 1" /></label>
      <label>Cerro o sector<input value={sector} maxLength="120" onChange={e => setSector(e.target.value)} placeholder="Ej. Cerro Alegre" /></label>
    </div>
    <div className="button-row space-top">
      <button type="button" disabled={alias.trim().length < 2 || sector.trim().length < 2 || busy} onClick={() => setConfirming(true)}>Estoy a salvo</button>
    </div>
    {confirming && <div className="maxi-confirm space-top"><strong>¿Guardar este registro?</strong><p>Se registrará en el servidor de PyroGuard.</p>
      <div className="button-row"><button type="button" disabled={busy} onClick={submit}>{busy ? 'Guardando…' : 'Confirmar registro'}</button><button type="button" className="secondary" onClick={() => setConfirming(false)}>Cancelar</button></div>
    </div>}
    {saved && <p className="mini-notice" role="status">Registro #{saved.id} guardado: A SALVO ({saved.alias}) · {new Date(saved.reported_at).toLocaleString('es-CL')}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </section>
}
