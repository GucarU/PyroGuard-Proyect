import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API = '' // Proxy /api de Vite, también compatible con acceso por red local
const defaultCenter = [-33.0472, -71.6127]

const requestIcon = L.divIcon({
  className: 'request-map-icon',
  html: '<span>🛠️</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

const historyIcon = L.divIcon({
  className: 'request-history-map-icon',
  html: '<span>📍</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

function LocationPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng)
    },
  })
  return null
}

export default function WaterRequestPanel({ onRequestCreated, onShowInCentral }) {
  const [requester, setRequester] = useState('Bombero en terreno')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [description, setDescription] = useState('')
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastCreated, setLastCreated] = useState(null)

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
      setMessage('Este navegador no permite obtener GPS. Ingresa las coordenadas manualmente o marca el punto en el mapa.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6))
        setLongitude(coords.longitude.toFixed(6))
        setMessage('Ubicación GPS cargada.')
      },
      () => setMessage('No se obtuvo el GPS. Revisa el permiso de ubicación o marca el punto manualmente.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function onPickLocation({ lat, lng }) {
    setLatitude(lat.toFixed(6))
    setLongitude(lng.toFixed(6))
    setMessage('Punto de solicitud marcado en el mapa.')
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
      setMessage(`Solicitud #${data.id} recibida. Ya aparece en el mapa central con un marcador 🚒.`)
      setLastCreated(data)
      onRequestCreated?.(data)
      setDescription('')
      await loadRequests()
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const selectedPoint = useMemo(() => {
    if (latitude === '' || longitude === '') return null
    return [Number(latitude), Number(longitude)]
  }, [latitude, longitude])

  return (
    <section className="alerts-section jose-section">
      <div className="section-heading">
        <div>
          <p className="section-label">IVÁN · HU-16</p>
          <h2>Solicitud de apoyo o cuadrilla en terreno</h2>
          <p className="muted-text">Marca la ubicación en este mapa secundario para pedir apoyo sin usar el mapa principal. El sistema guarda el punto y lo deja visible para la central.</p>
        </div>
        <button className="secondary" onClick={() => loadRequests().catch((error) => setMessage(error.message))}>Actualizar central</button>
      </div>
      {message && <div className="mini-notice" role="status">{message}</div>}
      {lastCreated && <div className="request-success-actions">
        <strong>Solicitud #{lastCreated.id} registrada en la central</strong>
        <button className="secondary" type="button" onClick={() => onShowInCentral?.(lastCreated.id)}>🚒 Ver la solicitud en el mapa central</button>
      </div>}

      <div className="request-panel-grid">
        <form className="report-form request-form-card" onSubmit={submit}>
          <div className="form-grid">
            <label>Solicitante
              <input required maxLength="100" value={requester} onChange={(event) => setRequester(event.target.value)} />
            </label>
            <label>Detalle de la necesidad
              <input maxLength="500" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Solicitar cuadrilla de apoyo o reabastecimiento" />
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
            <button className="secondary" type="button" onClick={() => { setLatitude('-33.047200'); setLongitude('-71.612700'); setDescription('Apoyo logístico de ejemplo') }}>Punto de ejemplo</button>
            <button type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Enviar solicitud'}</button>
          </div>
          <p className="muted-text">Consejo: haz clic directamente sobre el mapa de la derecha para definir el lugar exacto de la solicitud.</p>
        </form>

        <div className="request-map-card">
          <p className="map-legend">🛠️ Punto seleccionado · 📍 Solicitudes enviadas a la central</p>
          <MapContainer center={selectedPoint || defaultCenter} zoom={12} style={{ height: '360px', width: '100%', borderRadius: '16px' }}>
            <LocationPicker onPick={onPickLocation} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {selectedPoint && (
              <Marker position={selectedPoint} icon={requestIcon}>
                <Popup><strong>Punto actual de la solicitud</strong><br />{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</Popup>
              </Marker>
            )}
            {requests.map((request) => (
              <Marker key={request.id} position={[request.latitude, request.longitude]} icon={historyIcon}>
                <Popup>
                  <strong>Solicitud #{request.id}</strong><br />
                  {request.requester}<br />
                  Estado: {request.status}<br />
                  {request.description || 'Sin detalle adicional'}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="water-request-list" aria-live="polite">
        {requests.map((request) => (
          <article className="water-request-card" key={request.id}>
            <strong>Solicitud #{request.id} · {request.requester}</strong>
            <span>{request.status} · {request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}</span>
            {request.description && <p>{request.description}</p>}
          </article>
        ))}
        {requests.length === 0 && <p className="empty-state">No hay solicitudes registradas todavía.</p>}
      </div>
    </section>
  )
}
