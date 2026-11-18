import { useState } from 'react'
import { api, jsonOptions } from '../lib/api'

export default function AuthScreen({ message, onAuthenticated }) {
  const [registering, setRegistering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const fields = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    try {
      const endpoint = registering ? 'register' : 'login'
      onAuthenticated(await api(`/api/auth/${endpoint}`, jsonOptions('POST', fields)))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return <main className="app-shell auth-shell">
    <section className="login-card" aria-labelledby="auth-heading">
      <h1 id="auth-heading">PyroGuard</h1>
      <div className="auth-tabs" role="group" aria-label="Opciones de acceso">
        <button type="button" className={registering ? 'secondary' : undefined} disabled={busy}
          aria-pressed={!registering} onClick={() => { setRegistering(false); setError('') }}>Iniciar sesión</button>
        <button type="button" className={registering ? undefined : 'secondary'} disabled={busy}
          aria-pressed={registering} onClick={() => { setRegistering(true); setError('') }}>Registro ciudadano</button>
      </div>
      {message && <p className="mini-notice" role="status">{message}</p>}
      <form key={registering ? 'register' : 'login'} className="login-form" onSubmit={submit}>
        {registering && <label>
          Nombre
          <input name="name" minLength={2} maxLength={80} autoComplete="name" required />
        </label>}
        <label>
          Correo electrónico
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'}
            minLength={registering ? 12 : undefined} maxLength={128} required
            aria-describedby={registering ? 'password-length' : undefined} />
        </label>
        {registering && <small className="muted-text" id="password-length">Entre 12 y 128 caracteres.</small>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Comprobando…' : registering ? 'Crear cuenta' : 'Ingresar'}</button>
      </form>
    </section>
  </main>
}
