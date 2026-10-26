import { useEffect, useState } from 'react'

const API = 'http://127.0.0.1:8000'

export default function WaterRequestPanel() {
  const [requester, setRequester] = useState('Bombero en terreno')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [description, setDescription] = useState('')
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadRequests() {
    const response = await fetch(`${API}/api/water-requests`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.detail || 'No fue posible cargar las solicitudes')
    setRequests(data)
  }

  useEffect(() => {
    loadRequests().catch((error) => setMessage(error.message))
  }, [])

  function captureLocation() {
    if (!navigator.geolocation) {
      setMessage('Este navegador no permite obtener GPS. Ingresa las coordenadas manualmente.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6))
        setLongitude(coords.longitude.toFixed(6))
        setMessage('Ubicación GPS cargada.')
      },
      () => setMessage('No se obtuvo el GPS. Revisa el permiso de ubicación o ingresa las coordenadas manualmente.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${API}/api/water-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester,
          latitude: Number(latitude),
          longitude: Number(longitude),
          description,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'No fue posible enviar la solicitud')
      setMessage(`Solicitud de agua #${data.id} enviada a la central.`)
      setDescription('')
      await loadRequests()
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="alerts-section jose-section">
      <div className="section-heading">
        <div>
          <p className="section-label">IVÁN · HU-16</p>
          <h2>Solicitud de agua en terreno</h2>
        </div>
        <button className="secondary" onClick={() => loadRequests().catch((error) => setMessage(error.message))}>Actualizar central</button>
      </div>
      {message && <div className="mini-notice" role="status">{message}</div>}
      <form className="report-form" onSubmit={submit}>
        <div className="form-grid">
          <label>Solicitante
            <input required maxLength="100" value={requester} onChange={(event) => setRequester(event.target.value)} />
          </label>
          <label>Detalle de la necesidad
            <input maxLength="500" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Reabastecimiento para unidad en terreno" />
          </label>
          <label>Latitud
            <input required type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
          </label>
          <label>Longitud
            <input required type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
          </label>
        </div>
        <div className="button-row">
          <button className="secondary" type="button" onClick={captureLocation}>Usar ubicación GPS</button>
          <button type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Pedir agua a la central'}</button>
        </div>
      </form>
      <div className="water-request-list" aria-live="polite">
        {requests.map((request) => (
          <article className="water-request-card" key={request.id}>
            <strong>Solicitud #{request.id} · {request.requester}</strong>
            <span>{request.status} · {request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}</span>
            {request.description && <p>{request.description}</p>}
          </article>
        ))}
        {requests.length === 0 && <p className="empty-state">No hay solicitudes de agua registradas.</p>}
      </div>
    </section>
  )
}
