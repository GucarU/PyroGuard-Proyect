// Todas las peticiones pasan por el proxy de Vite en desarrollo.
// Mensajes legibles y control de errores de red.
export const SESSION_INVALID_EVENT = 'pyroguard-session-invalid'

export async function api(path, options = {}) {
  let response
  try {
    response = await fetch(path, { credentials: 'same-origin', ...options })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('No hay conexión con la API. Enciende el backend y vuelve a intentarlo.')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event(SESSION_INVALID_EVENT))
    }
    const detail = typeof data.detail === 'string' ? data.detail : `Error HTTP ${response.status}`
    throw Object.assign(new Error(detail), { status: response.status })
  }
  return data
}
export function jsonOptions(method, payload) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
}
