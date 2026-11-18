import { useRef, useState } from 'react'
import { api, jsonOptions } from '../lib/api'
import { canViewHydrants, EXAMPLE_HYDRANTS, filterHydrants, HYDRANT_STATES, isValidPoint } from '../lib/maxi'
import HydrantFilters from './HydrantFilters'
import HydrantMap from './HydrantMap'
import OperationHistory from './OperationHistory'

const EMPTY_DRAFT = { name: '', sector: '', latitude: '', longitude: '', status: 'EN_REVISION', demo: true }
const FIELD_LABELS = { name: 'nombre', sector: 'sector', latitude: 'latitud', longitude: 'longitud', demo: 'marca DEMO' }

function describeChange(entry) {
  const status = HYDRANT_STATES[entry.status].label
  if (entry.action === 'CREADO') return `Creado · ${status}`
  const changes = entry.changed_fields.filter(field => field !== 'status').map(field => FIELD_LABELS[field])
  const action = entry.previous_status !== entry.status
    ? `${HYDRANT_STATES[entry.previous_status].label} → ${status}`
    : 'Datos actualizados'
  return changes.length ? `${action} · ${changes.join(', ')}` : action
}

export default function MaxiHydrants({ profile, items, filters, onFiltersChange, visible, onToggle, onSaved, onRefresh, loadError }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editing, setEditing] = useState(null)
  const [historyId, setHistoryId] = useState(null)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const nameInput = useRef(null)

  if (!canViewHydrants(profile)) return <section className="alerts-section" aria-label="Mapa de grifos">
    <h2>Grifos en el mapa</h2><p>Capa disponible para los perfiles Bombero y Municipal.</p>
  </section>

  const filtered = filterHydrants(items, filters)
  const selected = draft.latitude !== '' && draft.longitude !== '' && isValidPoint(draft)
    ? { lat: Number(draft.latitude), lng: Number(draft.longitude) } : null
  const historyItem = items.find(item => item.id === historyId)

  function updateField(event) {
    const { name, type, value, checked } = event.target
    setDraft(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function pickLocation(point) {
    setDraft(current => ({ ...current, latitude: point.lat.toFixed(6), longitude: point.lng.toFixed(6) }))
    setMessage('Ubicación seleccionada en el mapa.')
  }

  function edit(item) {
    setEditing(item)
    setDraft({ name: item.name, sector: item.sector || '', latitude: String(item.latitude), longitude: String(item.longitude), status: item.status, demo: item.demo })
    setMessage('')
    setError('')
    nameInput.current?.focus()
  }

  function resetForm() {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const path = editing === null ? '/api/hydrants' : `/api/hydrants/${editing.id}`
      const values = { ...draft, name: draft.name.trim(), sector: draft.sector.trim(), latitude: Number(draft.latitude), longitude: Number(draft.longitude) }
      const original = editing && { ...editing, name: editing.name.trim(), sector: (editing.sector || '').trim() }
      const payload = original ? Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== original[key])) : values
      const saved = await api(path, jsonOptions(editing === null ? 'POST' : 'PATCH', payload))
      onSaved(saved)
      setMessage(`Grifo #${saved.id} ${editing === null ? 'creado' : 'actualizado'}.`)
      resetForm()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="alerts-section" aria-label="Mapa de grifos">
    <div className="section-heading">
      <h2>Grifos en el mapa</h2>
      <div className="button-row">
        <button type="button" className="secondary" onClick={onToggle}>{visible ? 'Ocultar en central' : 'Mostrar en central'}</button>
        <button type="button" className="secondary" onClick={onRefresh}>Actualizar grifos</button>
      </div>
    </div>
    {loadError && <p className="notice error" role="alert">{loadError}</p>}
    <HydrantFilters hydrants={items} filters={filters} onChange={onFiltersChange} />
    {!items.length && <button type="button" className="secondary small-button" aria-pressed={preview}
      onClick={() => setPreview(current => !current)}>{preview ? 'Ocultar ejemplos' : 'Ver grifos de ejemplo'}</button>}
    <HydrantMap items={!items.length && preview ? filterHydrants(EXAMPLE_HYDRANTS, filters) : filtered}
      selected={selected} onPick={pickLocation} onEdit={busy ? undefined : edit} />
    <p className="muted-text">{filtered.length} de {items.length} grifos guardados. {visible ? 'La capa se ve en el mapa de Central.' : 'La capa está oculta en Central.'}</p>

    {filtered.length > 0 && <ul className="hydrant-inventory" aria-label="Grifos guardados">{filtered.map(item => {
      const state = HYDRANT_STATES[item.status]
      return <li key={item.id}>
        <div><strong>{item.name}</strong>{item.demo && <strong className="hydrant-demo">DEMO</strong>}
          <small>{item.sector || 'Sin sector'} · <span className="hydrant-status-dot" style={{ backgroundColor: state.color }} aria-hidden="true" /> {state.label}</small></div>
        <div className="button-row">
          <button type="button" className="secondary small-button" disabled={busy} onClick={() => edit(item)}>Editar {item.name}</button>
          <button type="button" className="secondary small-button" aria-expanded={historyId === item.id}
            onClick={() => setHistoryId(current => current === item.id ? null : item.id)}>Historial de {item.name}</button>
        </div>
      </li>
    })}</ul>}
    {historyItem && <OperationHistory path={`/api/hydrants/${historyItem.id}/history`} title={`Historial de ${historyItem.name}`}
      version={historyItem.updated_at} describeAction={describeChange} />}

    <form className="report-form compact-form" onSubmit={submit}>
      <h3>{editing === null ? 'Agregar grifo' : `Editar grifo #${editing.id}`}</h3>
      <p className="muted-text">Selecciona el punto en el mapa o ajusta sus coordenadas.</p>
      <fieldset className="hydrant-edit-fields" disabled={busy}>
        <div className="form-grid">
          <label>Nombre<input ref={nameInput} name="name" required maxLength="120" minLength="3" value={draft.name} onChange={updateField} /></label>
          <label>Sector<input name="sector" maxLength="120" value={draft.sector} onChange={updateField} /></label>
          <label>Latitud<input required name="latitude" type="number" step="any" min="-90" max="90" value={draft.latitude} onChange={updateField} /></label>
          <label>Longitud<input required name="longitude" type="number" step="any" min="-180" max="180" value={draft.longitude} onChange={updateField} /></label>
          <label>Estado<select name="status" aria-label="Estado" value={draft.status} onChange={updateField}>
            {Object.entries(HYDRANT_STATES).map(([status, { label }]) => <option key={status} value={status}>{label}</option>)}
          </select></label>
          <label className="hydrant-demo-field"><input name="demo" type="checkbox" checked={draft.demo} onChange={updateField} /> Marcar como DEMO</label>
        </div>
      </fieldset>
      <div className="button-row">
        <button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing === null ? 'Agregar pin al mapa' : 'Guardar cambios'}</button>
        {editing === null
          ? <button type="button" className="secondary" disabled={busy} onClick={() => setDraft({ ...EMPTY_DRAFT, name: 'Grifo DEMO (ficticio)', latitude: '-33.047', longitude: '-71.612' })}>Rellenar ejemplo</button>
          : <button type="button" className="secondary" disabled={busy} onClick={resetForm}>Cancelar edición</button>}
      </div>
    </form>
    {message && <p className="mini-notice" role="status">{message}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </section>
}
