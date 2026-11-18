import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export const REPORTS_ENDPOINT = '/api/reports/neighborhood'
export const REPORT_STATES = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  VALIDADO: 'Validado',
  DESCARTADO: 'Descartado',
}

export function useReportList(endpoint) {
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api(endpoint, { signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setReports(items) })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [endpoint, revision])

  function refresh() {
    setLoading(true)
    setError('')
    setRevision(current => current + 1)
  }

  return { reports, setReports, error, loading, refresh }
}

export function ReportStatus({ status }) {
  return <span className={`report-status report-status-${status.toLowerCase()}`}>{REPORT_STATES[status]}</span>
}

export function ReportPhoto({ report }) {
  if (!report.photo_path) return null
  return <a className="report-photo" href={report.photo_path} target="_blank" rel="noreferrer"
    aria-label={`Ver fotografía del reporte ${report.id}`}>
    <img src={report.photo_path} alt={`Fotografía del reporte ${report.id}`} loading="lazy" />
  </a>
}

export function reportDate(value) {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' })
}

export function reportLocation(report) {
  return `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
}
