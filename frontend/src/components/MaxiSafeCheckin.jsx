import { useState } from 'react'
import { api, jsonOptions } from '../lib/api'

export default function MaxiSafeCheckin({ role }) {
  const [alias, setAlias] = useState('')
  const [sector, setSector] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState('')
  const [records, setRecords] = useState([])
  const [viewing, setViewing] = useState(false)
  const authorized = role === 'municipal' || role === 'bombero'
  async function submit() {
    setBusy(true); setError('')
    try {
      const item = await api('/api/evacuations/safe', jsonOptions('POST', { alias: alias.trim(), sector: sector.trim() }))
      setSaved(item); setConfirming(false)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function view() {
    try {
      const list = await api('/api/evacuations/safe', { headers: { 'X-Pyroguard-Role': role } })
      setRecords(list); setViewing(true); setError('')
    } catch (e) { setError(e.message) }
  }
  return <section className="alerts-section" aria-label="HU-10 estoy a salvo">
    <p className="section-label">HU-10 · Registro ciudadano de prueba</p>
    <h2>Confirmar que estoy a salvo</h2>
    <p className="muted-text">Este es un prototipo académico, no un canal oficial de evacuación. Usa un alias de prueba, nunca datos personales reales.</p>
    <div className="form-grid">
      <label>Alias de prueba<input value={alias} maxLength="80" onChange={e => setAlias(e.target.value)} placeholder="Ej. Vecino Demo 1" /></label>
      <label>Cerro o sector<input value={sector} maxLength="120" onChange={e => setSector(e.target.value)} placeholder="Ej. Cerro Alegre" /></label>
    </div>
    <div className="button-row space-top">
      <button type="button" disabled={alias.trim().length < 2 || sector.trim().length < 2 || busy} onClick={() => setConfirming(true)}>Estoy a salvo</button>
      {authorized && <button type="button" className="secondary" onClick={view}>Ver registros municipales</button>}
    </div>
    {confirming && <div className="maxi-confirm space-top"><strong>¿Guardar este reporte de prueba?</strong><p>Se registrará en el servidor de PyroGuard, no en servicios de emergencia.</p>
      <div className="button-row"><button type="button" disabled={busy} onClick={submit}>{busy ? 'Guardando…' : 'Confirmar registro'}</button><button type="button" className="secondary" onClick={() => setConfirming(false)}>Cancelar</button></div>
    </div>}
    {saved && <p className="mini-notice" role="status">Registro #{saved.id} guardado: A SALVO ({saved.alias}) · {new Date(saved.reported_at).toLocaleString('es-CL')}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {viewing && authorized && <div className="compact-list"><h3>Registros de prueba ({records.length})</h3>{records.length ? records.map(r => <p key={r.id}>#{r.id} · {r.alias} · {r.sector} · {new Date(r.reported_at).toLocaleString('es-CL')}</p>) : <p>Sin registros todavía.</p>}</div>}
  </section>
}
