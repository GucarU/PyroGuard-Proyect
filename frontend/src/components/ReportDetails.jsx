import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

export const REPORTS_ENDPOINT = '/api/reports/neighborhood'
const REPORT_REFRESH_MS = 4000
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
  const pendingRequest = useRef(null)

  const load = useCallback(async (manual = false) => {
    if (pendingRequest.current && !manual) return
    pendingRequest.current?.abort()
    const request = new AbortController()
    pendingRequest.current = request
    if (manual) setLoading(true)
    try {
      const items = await api(endpoint, { signal: request.signal })
      if (!request.signal.aborted) {
        setReports(items)
        setError('')
      }
    } catch (failure) {
      if (!request.signal.aborted) setError(failure.message)
    } finally {
      if (pendingRequest.current === request) {
        pendingRequest.current = null
        setLoading(false)
      }
    }
  }, [endpoint])

  useEffect(() => {
    const sync = () => { if (!document.hidden) void load() }
    void load(true)
    const timer = window.setInterval(sync, REPORT_REFRESH_MS)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    window.addEventListener('online', sync)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      pendingRequest.current?.abort()
      pendingRequest.current = null
    }
  }, [load])

  function refresh() {
    return load(true)
  }

  function updateReport(updated) {
    pendingRequest.current?.abort()
    pendingRequest.current = null
    setLoading(false)
    setReports(items => items.map(item => item.id === updated.id ? updated : item))
  }

  return { reports, updateReport, error, loading, refresh }
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
