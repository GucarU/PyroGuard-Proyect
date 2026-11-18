import { isValidPoint } from './maxi.js'

// El sector seleccionado prevalece sobre otros puntos seleccionados previamente.
export function resolveMapFocus({
  sector = '', alerts = [], sensors = [], waterRequests = [],
  focusedWaterRequestId = null, focusAlertId = null, focusedReport = null,
} = {}) {
  if (sector) {
    const match = [...alerts, ...sensors].find(isValidPoint)
    return match ? { point: [Number(match.latitude), Number(match.longitude)], zoom: 13, kind: 'sector' } : null
  }
  if (isValidPoint(focusedReport)) {
    return { point: [Number(focusedReport.latitude), Number(focusedReport.longitude)], zoom: 15, kind: 'reporte' }
  }
  if (focusedWaterRequestId != null) {
    const match = waterRequests.find(item => String(item.id) === String(focusedWaterRequestId) && isValidPoint(item))
    return match ? { point: [Number(match.latitude), Number(match.longitude)], zoom: 15, kind: 'solicitud' } : null
  }
  if (focusAlertId != null) {
    const match = alerts.find(item => String(item.id) === String(focusAlertId) && isValidPoint(item))
    return match ? { point: [Number(match.latitude), Number(match.longitude)], zoom: 13, kind: 'alerta' } : null
  }
  return null
}
