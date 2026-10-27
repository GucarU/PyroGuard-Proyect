import { isValidPoint } from './maxi.js'

// La elección explícita de sector SIEMPRE prevalece sobre solicitudes de apoyo
// que se hayan visualizado anteriormente. Nunca mezclamos ambos focos.
export function resolveMapFocus({
  sector = '', alerts = [], sensors = [], waterRequests = [],
  focusedWaterRequestId = null, focusAlertId = null,
} = {}) {
  if (sector) {
    const match = [...alerts, ...sensors].find(isValidPoint)
    return match ? { point: [Number(match.latitude), Number(match.longitude)], zoom: 13, kind: 'sector' } : null
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
