// Reglas de presentación de HU-05, HU-06, HU-08 y HU-14.
// NO realizan operaciones contra base de datos.
export function normalizeSector(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CL')
}
export function getSectors(alerts = [], sensors = []) {
  const names = new Map()
  for (const item of [...alerts, ...sensors]) {
    const name = String(item.sector ?? '').trim().replace(/\s+/g, ' ')
    if (name && !names.has(normalizeSector(name))) names.set(normalizeSector(name), name)
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'es-CL'))
}
export function filterBySector(items = [], sector = '') {
  if (!sector) return items
  return items.filter((item) => normalizeSector(item.sector) === normalizeSector(sector))
}
export function isInactiveIncident(alert) {
  return ['FALSA_ALARMA', 'DESCARTADA', 'DESCARTADO', 'INACTIVO'].includes(String(alert?.status ?? '').toUpperCase())
}
export function isValidPoint(item) {
  if (item?.latitude == null || item?.longitude == null) return false
  const lat = Number(item.latitude)
  const lon = Number(item.longitude)
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}
export function canViewHydrants(role) {
  return ['bombero', 'bomberos', 'municipal', 'municipalidad', 'oficial_bomberos'].includes(String(role ?? '').trim().toLowerCase())
}
export function markerColor(alert) {
  if (isInactiveIncident(alert)) return '#77838a'
  if (['VALIDADO', 'CONFIRMADO'].includes(String(alert?.status ?? '').toUpperCase())) return '#ed4040'
  return '#ff9d49'
}
export function overlayLocalDecisions(alerts, decisions = {}) {
  return alerts.map((alert) => {
    const change = decisions[String(alert.id)]
    return change ? { ...alert, status: change.status, demo_local: true, demo_actor: change.actor, demo_at: change.at } : alert
  })
}
export function activeMapAlerts(alerts) {
  return alerts.filter((alert) => !isInactiveIncident(alert) && isValidPoint(alert))
}
export const EXAMPLE_HYDRANTS = [
  // Coordenadas inventadas exclusivamente para demostrar la capa en el taller.
  { id: 'demo-grifo-a', name: 'Grifo DEMO A (ficticio)', latitude: -33.048, longitude: -71.611, status: 'DISPONIBLE', demo_local: true },
  { id: 'demo-grifo-b', name: 'Grifo DEMO B (ficticio)', latitude: -33.053, longitude: -71.607, status: 'EN_REVISION', demo_local: true },
  { id: 'demo-grifo-c', name: 'Grifo DEMO C (ficticio)', latitude: -33.045, longitude: -71.625, status: 'DISPONIBLE', demo_local: true },
]
