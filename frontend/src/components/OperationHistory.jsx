import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function operationDate(value) {
  if (!value) return 'Fecha sin registro'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CL', {
    dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Santiago',
  })
}

export default function OperationHistory({ path, title, version, describeAction }) {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setEvents(null)
    setError('')
    api(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setEvents(data)
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message)
    })
    return () => controller.abort()
  }, [path, version])

  return <section className="operation-history" aria-label={title}>
    <h4>{title}</h4>
    {error ? <p role="alert">{error}</p> : events === null ? <p role="status">Cargando historial…</p>
      : events.length === 0 ? <p>Todavía no hay acciones registradas.</p>
      : <ol>{events.map(entry => <li key={entry.id ?? `${entry.action}-${entry.acted_at}`}>
        <strong>{describeAction(entry)}</strong>
        <span>{entry.actor_name || 'Responsable sin registro'}{entry.actor_id != null && ` · ID ${entry.actor_id}`}</span>
        <time dateTime={entry.acted_at || undefined}>{operationDate(entry.acted_at)}</time>
      </li>)}</ol>}
  </section>
}
