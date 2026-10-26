// Todas las peticiones pasan por el proxy de Vite en desarrollo.
// Mensajes legibles y control de errores de red.
export async function api(path, options = {}) {
  let response
  try {
    response = await fetch(path, options)
  } catch {
    throw new Error('No hay conexión con la API. Enciende el backend y vuelve a intentarlo.')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : `Error HTTP ${response.status}`
    throw new Error(detail)
  }
  return data
}
export function jsonOptions(method, payload, extraHeaders = {}) {
  return { method, headers: { 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(payload) }
}
