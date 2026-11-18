import { lazy, Suspense, useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import CitizenPortal from './CitizenPortal'
import { api, SESSION_INVALID_EVENT } from './lib/api'

const AdminPanel = lazy(() => import('./AdminPanel'))

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [checkFailed, setCheckFailed] = useState('')
  const [checkAttempt, setCheckAttempt] = useState(0)
  const [sessionMessage, setSessionMessage] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const signedIn = Boolean(user)
  const home = user?.role === 'ADMIN' ? '/admin' : signedIn ? '/ciudadania' : '/'

  useEffect(() => {
    const controller = new AbortController()
    api('/api/auth/me', { signal: controller.signal })
      .then(account => { if (!controller.signal.aborted) setUser(account) })
      .catch(error => {
        if (controller.signal.aborted) return
        if (error.status !== 401) setCheckFailed(error.message)
        else if (window.location.pathname !== '/') setSessionMessage(error.message)
      })
      .finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [checkAttempt])

  useEffect(() => {
    if (checking || checkFailed) return
    function syncLocation() {
      if (window.location.pathname !== home) window.history.replaceState(null, '', home)
    }
    syncLocation()
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [checking, checkFailed, home])

  useEffect(() => {
    if (!signedIn || loggingOut) return
    const controller = new AbortController()
    let pending = false
    async function recheck() {
      if (pending) return
      pending = true
      try {
        const account = await api('/api/auth/me', { signal: controller.signal })
        if (!controller.signal.aborted) setUser(account)
      } catch (error) {
        if (!controller.signal.aborted && error.status === 401) {
          setSessionMessage('Tu sesión expiró o se cerró. Vuelve a iniciar sesión.')
          setUser(null)
        }
      } finally {
        pending = false
      }
    }
    window.addEventListener(SESSION_INVALID_EVENT, recheck)
    window.addEventListener('focus', recheck)
    const timer = setInterval(recheck, 30000)
    return () => {
      controller.abort()
      window.removeEventListener(SESSION_INVALID_EVENT, recheck)
      window.removeEventListener('focus', recheck)
      clearInterval(timer)
    }
  }, [signedIn, loggingOut])

  async function logout() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await api('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setSessionMessage('Sesión cerrada.')
    } catch (error) {
      setLogoutError(`No se pudo cerrar la sesión. ${error.message}`)
    } finally {
      setLoggingOut(false)
    }
  }

  if (checking || checkFailed) return <main className="app-shell auth-shell">
    <div className="login-card">
      <h1>PyroGuard</h1>
      {checking ? <p role="status">Comprobando la sesión…</p> : <>
        <p className="login-error" role="alert">{checkFailed}</p>
        <button type="button" onClick={() => {
          setChecking(true)
          setCheckFailed('')
          setCheckAttempt(attempt => attempt + 1)
        }}>Reintentar</button>
      </>}
    </div>
  </main>

  if (!user) return <AuthScreen message={sessionMessage} onAuthenticated={account => {
    setSessionMessage('')
    setLogoutError('')
    setUser(account)
  }} />

  const Portal = user.role === 'ADMIN' ? AdminPanel : CitizenPortal
  return <Suspense fallback={<main className="app-shell auth-shell" role="status">Cargando el panel…</main>}>
    <Portal key={`${user.role}-${user.id}-${user.profile}`} user={user} onLogout={logout}
      loggingOut={loggingOut} sessionError={logoutError} />
  </Suspense>
}
