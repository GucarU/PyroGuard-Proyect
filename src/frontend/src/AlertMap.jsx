import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function priorityColor(priority) {
  if (priority === 'ALTA') return '#dc2626'
  if (priority === 'MEDIA') return '#f59e0b'
  return '#16a34a'
}

export default function AlertMap({ alerts = [] }) {
  const validAlerts = alerts.filter(
    (alert) =>
      alert.latitude !== null &&
      alert.latitude !== undefined &&
      alert.longitude !== null &&
      alert.longitude !== undefined &&
      Number.isFinite(Number(alert.latitude)) &&
      Number.isFinite(Number(alert.longitude))
  )

  return (
    <section className="map-section">
      <div className="section-heading">
        <div>
          <p className="section-label">CA-01 · ubicación geográfica</p>
          <h2>Mapa de alertas</h2>
        </div>
        <span className="map-help">Rojo: alta · Amarillo: media · Verde: baja</span>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={[-33.0472, -71.6127]}
          zoom={11}
          scrollWheelZoom
          className="alert-map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {validAlerts.map((alert) => (
            <CircleMarker
              key={alert.id}
              center={[Number(alert.latitude), Number(alert.longitude)]}
              radius={11}
              pathOptions={{
                color: priorityColor(alert.priority),
                fillColor: priorityColor(alert.priority),
                fillOpacity: 0.85,
                weight: 3,
              }}
            >
              <Popup>
                <strong>Alerta #{alert.id}</strong>
                <br />
                Sensor: {alert.sensor_id}
                <br />
                Sector: {alert.sector}
                <br />
                Nivel de humo: {alert.smoke_level}%
                <br />
                Prioridad: {alert.priority}
                <br />
                Estado: {alert.status}
                <br />
                Latitud: {alert.latitude}
                <br />
                Longitud: {alert.longitude}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {validAlerts.length === 0 && (
        <p className="map-fallback">
          No hay alertas con coordenadas para mostrar. El mapa usa OpenStreetMap y requiere internet para cargar las calles.
        </p>
      )}
    </section>
  )
}
