import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

vi.mock('./components/AlertMap', () => ({ default: () => <div aria-label="Mapa de operaciones" /> }))
vi.mock('./components/ReportLocationMap', () => ({ default: () => <div aria-label="Mapa para elegir el lugar del incendio" /> }))

const admin = { id: 1, name: 'Personal PyroGuard', email: 'operador@example.com', role: 'ADMIN', profile: 'operador' }
const citizen = { id: 2, name: 'Ana Pérez', email: 'ana@example.com', role: 'CIUDADANO', profile: null }
const password = 'Una frase privada 123'
const report = {
  id: 4, status: 'VALIDADO', description: 'Humo cerca del cerro', latitude: -33.04, longitude: -71.63,
  created_at: '2026-11-17T20:00:00Z', photo_path: '/api/reports/neighborhood/mine/4/photo',
}

function reply(status, data) {
  return Promise.resolve({ status, ok: status >= 200 && status < 300, json: async () => data })
}

function simulateApi({ session = null, accounts = [admin, citizen], reports = [] } = {}) {
  const fetchMock = vi.fn((path, options) => {
    if (path === '/api/auth/me') return session ? reply(200, session) : reply(401, { detail: 'Inicia sesión.' })
    if (path === '/api/auth/login') {
      const fields = JSON.parse(options.body)
      const account = accounts.find(user => user.email === fields.email)
      if (!account || fields.password !== password) return reply(401, { detail: 'Correo o contraseña incorrectos.' })
      session = account
      return reply(200, account)
    }
    if (path === '/api/auth/register') {
      session = citizen
      return reply(201, citizen)
    }
    if (path === '/api/auth/logout') {
      session = null
      return reply(204)
    }
    if (path === '/api/reports/neighborhood/mine' && session?.role === 'CIUDADANO') return reply(200, reports)
    return session ? reply(200, []) : reply(401, { detail: 'Tu sesión expiró.' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, expire: () => { session = null } }
}

function enterCredentials(email, secret = password) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: secret } })
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

function simulateSystemAppearance(dark) {
  const listeners = new Set()
  const media = {
    matches: dark,
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => media)
  return matches => act(() => {
    media.matches = matches
    for (const listener of listeners) listener(media)
  })
}

function selectAppearance(mode) {
  fireEvent.click(screen.getByRole('button', { name: /^Apariencia/ }))
  fireEvent.click(within(screen.getByRole('group', { name: 'Modo de apariencia' })).getByRole('button', { name: mode }))
}

beforeEach(() => window.history.replaceState(null, '', '/'))
afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

describe('Acceso a PyroGuard', () => {
  it('redirige la navegación anónima a la pantalla inicial e ignora la clave de demo', async () => {
    window.history.replaceState(null, '', '/admin')
    window.localStorage.setItem('pyroguard-auth', 'admin')
    const { fetchMock } = simulateApi()
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PyroGuard' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/auth/me'])
  })

  it('muestra credenciales rechazadas y dirige a una cuenta administrativa a /admin', async () => {
    simulateApi()
    render(<App />)
    await screen.findByRole('button', { name: 'Ingresar' })
    enterCredentials(admin.email, 'incorrecta')
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
    expect(window.location.pathname).toBe('/')
    enterCredentials(admin.email)
    expect(await screen.findByRole('heading', { name: 'Centro de coordinación' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/admin')
    expect(screen.getByText('Personal PyroGuard · Operador')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Reportar un incendio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Apariencia/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar a modo claro' })).toBeInTheDocument()
  })

  it('dirige el inicio de sesión ciudadano a /ciudadania sin cargar el panel', async () => {
    const { fetchMock } = simulateApi()
    render(<App />)
    await screen.findByRole('button', { name: 'Ingresar' })
    enterCredentials(citizen.email)
    await screen.findByRole('heading', { name: 'Portal ciudadano' })
    expect(window.location.pathname).toBe('/ciudadania')
    fireEvent.click(screen.getByRole('button', { name: 'REPORTAR POSIBLE INCENDIO' }))
    expect(screen.getByRole('heading', { name: 'Reportar un incendio' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.every(([path]) => path.startsWith('/api/auth/'))).toBe(true)
  })

  it('corrige la ruta administrativa escrita a mano por una cuenta ciudadana', async () => {
    window.history.replaceState(null, '', '/admin')
    const { fetchMock } = simulateApi({ session: citizen })
    render(<App />)
    await screen.findByRole('heading', { name: 'Portal ciudadano' })
    expect(window.location.pathname).toBe('/ciudadania')
    expect(screen.queryByRole('heading', { name: 'Centro de coordinación' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const citizenNav = within(screen.getByRole('navigation', { name: 'Navegación ciudadana' }))
    for (const name of ['Central y mapa', 'Sensores', 'Logística', 'Reportes ciudadanos']) {
      expect(citizenNav.queryByRole('button', { name })).not.toBeInTheDocument()
    }

    window.history.pushState(null, '', '/admin/alertas')
    fireEvent(window, new PopStateEvent('popstate'))
    expect(window.location.pathname).toBe('/ciudadania')
  })

  it('restaura una sesión administrativa desde el servidor y corrige la ruta ciudadana', async () => {
    window.history.replaceState(null, '', '/ciudadania')
    simulateApi({ session: admin })
    render(<App />)
    await screen.findByRole('heading', { name: 'Centro de coordinación' })
    expect(window.location.pathname).toBe('/admin')
    expect(screen.queryByRole('heading', { name: 'Portal ciudadano' })).not.toBeInTheDocument()
  })

  it('registra a una persona y vuelve a la pantalla inicial al cerrar la sesión', async () => {
    const { fetchMock } = simulateApi()
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registro ciudadano' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: citizen.name } })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: citizen.email } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await screen.findByRole('heading', { name: 'Portal ciudadano' })
    const [, options] = fetchMock.mock.calls.find(([path]) => path === '/api/auth/register')
    expect(JSON.parse(options.body)).toEqual({ name: citizen.name, email: citizen.email, password })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Navegación ciudadana' })).getByRole('button', { name: 'Mi perfil' }))
    expect(screen.getByText(citizen.email)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Sesión cerrada.')
    expect(window.location.pathname).toBe('/')
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    expect(window.localStorage.length).toBe(0)
  })

  it('consulta únicamente el historial ciudadano y conserva el registro de seguridad', async () => {
    const { fetchMock } = simulateApi({ session: citizen, reports: [report] })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mis reportes' }))
    expect(await screen.findByText(report.description)).toBeInTheDocument()
    expect(screen.getByText('Validado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver fotografía del reporte 4' })).toHaveAttribute('href', report.photo_path)
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/auth/me', '/api/reports/neighborhood/mine'])

    fireEvent.click(screen.getByRole('button', { name: 'Seguridad' }))
    expect(screen.getByRole('heading', { name: 'Confirmar que estoy a salvo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver registros de evacuación' })).not.toBeInTheDocument()
  })

  it('informa al ciudadano que su sesión expiró al verificarla de nuevo', async () => {
    const { expire } = simulateApi({ session: citizen })
    render(<App />)
    await screen.findByRole('heading', { name: 'Portal ciudadano' })
    expire()
    fireEvent(window, new Event('focus'))
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Tu sesión expiró o se cerró.')
      expect(window.location.pathname).toBe('/')
    })
    expect(screen.queryByRole('heading', { name: 'Portal ciudadano' })).not.toBeInTheDocument()
  })

  it('sigue el tema del dispositivo y conserva la elección manual al volver al portal', async () => {
    const changeSystem = simulateSystemAppearance(true)
    simulateApi({ session: citizen })
    const view = render(<App />)
    const heading = await screen.findByRole('heading', { name: 'Portal ciudadano' })
    const portal = heading.closest('.citizen-app')
    expect(portal).toHaveAttribute('data-theme', 'dark')
    changeSystem(false)
    expect(portal).toHaveAttribute('data-theme', 'light')

    selectAppearance('Claro')
    changeSystem(true)
    expect(portal).toHaveAttribute('data-theme', 'light')
    view.unmount()
    render(<App />)
    const restored = (await screen.findByRole('heading', { name: 'Portal ciudadano' })).closest('.citizen-app')
    expect(restored).toHaveAttribute('data-theme', 'light')
    selectAppearance('Automático')
    expect(restored).toHaveAttribute('data-theme', 'dark')
  })

  it('cambia de apariencia sin salir del paso de ubicación ni perder los datos', async () => {
    simulateSystemAppearance(false)
    simulateApi({ session: citizen })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'REPORTAR POSIBLE INCENDIO' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sin foto' }))
    const location = screen.getByLabelText(/Sector o referencia/)
    fireEvent.change(location, { target: { value: 'Cerro Alegre' } })
    selectAppearance('Oscuro')
    expect(location.closest('.citizen-app')).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByLabelText(/Sector o referencia/)).toBe(location)
    expect(location).toHaveValue('Cerro Alegre')
    expect(screen.getByRole('button', { name: 'Apariencia (Oscuro)' })).toHaveFocus()
    expect(window.location.pathname).toBe('/ciudadania')
  })
})
