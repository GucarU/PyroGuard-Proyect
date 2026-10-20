import { useState } from 'react'

const API = 'http://127.0.0.1:8000'

export default function NeighborhoodReport() {
  const [photo, setPhoto] = useState(null)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [description, setDescription] = useState('Posible foco observado por un vecino.')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  function getGps() {
    setMessage('')
    if (!navigator.geolocation) {
      setMessage('Este navegador no permite obtener la ubicación GPS.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setMessage('Ubicación GPS obtenida correctamente.')
      },
      (error) => setMessage(`No fue posible obtener GPS: ${error.message}`),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function submit(event) {
    event.preventDefault()
    if (!photo) {
      setMessage('Selecciona o toma una fotografía antes de enviar.')
      return
    }
    setSending(true)
    setMessage('')
    const form = new FormData()
    form.append('photo', photo)
    form.append('latitude', latitude)
    form.append('longitude', longitude)
    form.append('description', description)

    try {
      const response = await fetch(`${API}/api/reports/neighborhood`, { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'No fue posible enviar el reporte')
      setMessage(`Reporte #${data.id} enviado a la central con estado ${data.status}.`)
      setPhoto(null)
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="alerts-section jose-section">
      <div className="section-heading">
        <div>
          <p className="section-label">JOSÉ · HU-12</p>
          <h2>Reporte vecinal rápido</h2>
        </div>
      </div>

      <form className="report-form" onSubmit={submit}>
        <label className="file-field">
          Fotografía del posible foco
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(event) => setPhoto(event.target.files?.[0] || null)}
            required
          />
        </label>

        <div className="form-grid">
          <label>
            Latitud
            <input value={latitude} onChange={(event) => setLatitude(event.target.value)} required />
          </label>
          <label>
            Longitud
            <input value={longitude} onChange={(event) => setLongitude(event.target.value)} required />
          </label>
        </div>

        <label>
          Descripción
          <textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
        </label>

        <div className="button-row">
          <button type="button" className="secondary" onClick={getGps}>Obtener GPS</button>
          <button type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Enviar reporte'}</button>
        </div>
      </form>
      {message && <div className="mini-notice">{message}</div>}
    </section>
  )
}
