import { useState } from 'react'
import { isInactiveIncident } from '../lib/maxi'
import OperationHistory, { operationDate } from './OperationHistory'

const ACTION_LABELS = { UNIDAD_DESPACHADA: 'Unidad despachada', VALIDADO: 'Foco validado', FALSA_ALARMA: 'Descartado como falsa alarma' }

export default function MaxiIncidentActions({ alert, onAction, disabled = false }) {
  const [pending, setPending] = useState('')
  const [busy, setBusy] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const inactive = isInactiveIncident(alert)
  const validated = alert.status === 'VALIDADO'
  const canValidate = !disabled && !inactive && !validated
  const canDiscard = !disabled && alert.status === 'PENDIENTE'

  async function confirm() {
    setBusy(true)
    try {
      await onAction(alert.id, pending)
      setPending('')
    } catch {
      // El padre muestra el error. Mantenemos el diálogo para poder reintentar.
    } finally { setBusy(false) }
  }
  return (
    <div className="maxi-actions" aria-label={`Acciones para alerta ${alert.id}`}>
      {alert.validated_by && <p className="muted-text">Validado por {alert.validated_by} · {operationDate(alert.validated_at)}</p>}
      {alert.discarded_by && <p className="muted-text">Descartado por {alert.discarded_by} · {operationDate(alert.discarded_at)}</p>}
      <div className="button-row">
        <button type="button" className="small-button" disabled={!canValidate || busy} onClick={() => setPending('VALIDADO')}>✓ Validar foco</button>
        <button type="button" className="secondary small-button" disabled={!canDiscard || busy} onClick={() => setPending('FALSA_ALARMA')}>Descartar falsa alarma</button>
        <button type="button" className="secondary small-button" aria-expanded={historyOpen}
          onClick={() => setHistoryOpen(value => !value)}>{historyOpen ? 'Ocultar historial' : 'Ver historial'}</button>
      </div>
      {pending && <div className="maxi-confirm" role="group" aria-label="Confirmación de incidente">
        <p><strong>{pending === 'VALIDADO' ? '¿Confirmar este foco como incendio validado?' : '¿Descartar este foco como falsa alarma?'}</strong></p>
        <p className="maxi-helper">El cambio se guardará en la base de datos y se reflejará en el mapa.</p>
        <div className="button-row">
          <button type="button" disabled={busy} onClick={confirm}>{busy ? 'Guardando…' : 'Sí, confirmar'}</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => setPending('')}>Cancelar</button>
        </div>
      </div>}
      {historyOpen && <OperationHistory path={`/api/alerts/${alert.id}/history`} title={`Historial de alerta #${alert.id}`}
        version={alert.status} describeAction={entry => ACTION_LABELS[entry.action]} />}
    </div>
  )
}
