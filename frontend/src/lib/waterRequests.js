import { isValidPoint } from './maxi.js'

// Únicamente solicitudes que el backend confirmó, con puntos válidos para Leaflet.
export function mapWaterRequests(requests = []) {
  if (!Array.isArray(requests)) return []
  const seen = new Set()
  return requests.filter((request) => {
    if (!request || !Number.isInteger(Number(request.id)) || !isValidPoint(request)) return false
    if (seen.has(String(request.id))) return false
    seen.add(String(request.id))
    return true
  })
}

export function waterRequestStatus(status) {
  const labels = {
    PENDIENTE: 'Pendiente de atención',
    EN_ATENCION: 'En atención',
    RESUELTA: 'Resuelta',
  }
  return labels[String(status ?? '').toUpperCase()] ?? 'Estado sin especificar'
}
