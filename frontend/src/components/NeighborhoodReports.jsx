import { useState } from 'react'
import { api, jsonOptions } from '../lib/api'
import { REPORTS_ENDPOINT, REPORT_STATES, ReportPhoto, ReportStatus, reportDate, reportLocation, useReportList } from './ReportDetails'

export default function NeighborhoodReports({ alerts, onShowReport }) {
  const { reports, setReports, error, loading, refresh } = useReportList(REPORTS_ENDPOINT)
  const [filter, setFilter] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  const visibleReports = filter ? reports.filter(report => report.status === filter) : reports

  async function save(id, resource, options) {
    setBusy(true)
    setActionError('')
    setMessage('')
    setConfirmation(null)
    try {
      const updated = await api(`${REPORTS_ENDPOINT}/${id}/${resource}`, options)
      setReports(items => items.map(item => item.id === id ? updated : item))
      const result = resource === 'alert'
        ? `vinculado a la alerta #${updated.alert_id}`
        : REPORT_STATES[updated.status].toLowerCase()
      setMessage(`Reporte #${id} ${result}.`)
    } catch (failure) {
      setActionError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  function review(id, status) {
    return save(id, 'status', jsonOptions('PATCH', { status }))
  }

  function link(event, reportId) {
    event.preventDefault()
    const alertId = Number(new FormData(event.currentTarget).get('alert_id'))
    return save(reportId, 'alert', jsonOptions('PUT', { alert_id: alertId }))
  }

  return <section className="alerts-section" aria-labelledby="report-list-heading">
    <div className="section-heading">
      <h2 id="report-list-heading">Reportes ciudadanos</h2>
      <div className="report-toolbar">
        <label>Estado
          <select value={filter} onChange={event => { setFilter(event.target.value); setConfirmation(null) }}>
            <option value="">Todos</option>
            {Object.entries(REPORT_STATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" className="secondary" disabled={loading || busy} onClick={() => {
          setActionError('')
          setConfirmation(null)
          refresh()
        }}>Actualizar reportes</button>
      </div>
    </div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {actionError && <p className="notice error" role="alert">{actionError}</p>}
    {message && <p className="mini-notice" role="status">{message}</p>}
    {loading && <p role="status">Cargando reportes…</p>}
    {!visibleReports.length && !loading && !error && <p className="muted-text">
      {filter ? 'No hay reportes con ese estado.' : 'Todavía no hay reportes ciudadanos.'}
    </p>}
    {visibleReports.length > 0 && <div className="report-table-scroll" tabIndex={0} role="region" aria-label="Tabla de reportes ciudadanos">
      <table className="report-table">
        <thead><tr>
          <th scope="col">Reporte</th><th scope="col">Descripción</th><th scope="col">Ubicación y fecha</th>
          <th scope="col">Estado</th><th scope="col">Acciones</th>
        </tr></thead>
        <tbody>{visibleReports.map(report => {
          const open = report.status === 'PENDIENTE' || report.status === 'EN_REVISION'
          const confirming = confirmation?.id === report.id
          const disabled = busy || loading
          return <tr key={report.id}>
            <th scope="row"><span>#{report.id}</span>{report.photo_path ? <ReportPhoto report={report} /> : <small className="report-no-photo">Sin foto</small>}</th>
            <td className="report-description">{report.description || 'Sin descripción'}</td>
            <td>
              <button type="button" className="secondary small-button report-map-action" onClick={() => onShowReport(report)}>Ver en mapa</button>
              {report.location_label && <strong className="report-sector-label">{report.location_label}</strong>}
              <span>{reportLocation(report)}</span>
              <time dateTime={report.created_at}>{reportDate(report.created_at)}</time>
            </td>
            <td>
              <ReportStatus status={report.status} />
              {report.reviewed_at && <small>{report.reviewed_by} · {reportDate(report.reviewed_at)}</small>}
            </td>
            <td>
              {open && !confirming && <div className="report-actions">
                {report.status === 'PENDIENTE' && <button type="button" className="secondary small-button" disabled={disabled}
                  onClick={() => review(report.id, 'EN_REVISION')}>Revisar</button>}
                <button type="button" className="secondary small-button" disabled={disabled}
                  onClick={() => setConfirmation({ id: report.id, status: 'VALIDADO' })}>Validar</button>
                <button type="button" className="secondary small-button" disabled={disabled}
                  onClick={() => setConfirmation({ id: report.id, status: 'DESCARTADO' })}>Descartar</button>
              </div>}
              {open && confirming && <div className="report-confirm">
                <strong>¿{confirmation.status === 'VALIDADO' ? 'Validar' : 'Descartar'} el reporte #{report.id}?</strong>
                <div className="report-actions">
                  <button type="button" className="small-button" disabled={disabled} onClick={() => review(report.id, confirmation.status)}>Confirmar</button>
                  <button type="button" className="secondary small-button" onClick={() => setConfirmation(null)}>Cancelar</button>
                </div>
              </div>}
              {report.alert_id != null && <strong>Alerta vinculada #{report.alert_id}</strong>}
              {report.status === 'VALIDADO' && report.alert_id == null && (alerts.length > 0
                ? <form className="report-link-form" onSubmit={event => link(event, report.id)}>
                  <select name="alert_id" aria-label={`Alerta para el reporte ${report.id}`} defaultValue="" required disabled={disabled}>
                    <option value="" disabled>Seleccionar alerta</option>
                    {alerts.map(alert => <option key={alert.id} value={alert.id}>#{alert.id} · {alert.sector}</option>)}
                  </select>
                  <button type="submit" className="secondary small-button" disabled={disabled}>Vincular alerta</button>
                </form>
                : <span className="muted-text">No hay alertas para vincular.</span>)}
              {report.status === 'DESCARTADO' && <span aria-label="Sin acciones disponibles">—</span>}
            </td>
          </tr>
        })}</tbody>
      </table>
    </div>}
  </section>
}
