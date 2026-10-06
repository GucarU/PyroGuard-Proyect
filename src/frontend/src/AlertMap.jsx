import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function AlertMap({ alerts }) {
  const validAlerts = alerts.filter(
    (alert) => alert.latitude != null && alert.longitude != null
  )

  return (
    <section className="map-section">
      <h2>Mapa de alertas</h2>

      <MapContainer
        center={[-33.0472, -71.6127]}
        zoom={11}
        style={{ height: '350px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {validAlerts.map((alert) => (
          <CircleMarker
            key={alert.id}
            center={[alert.latitude, alert.longitude]}
            radius={10}
          >
            <Popup>
              <strong>{alert.sensor_id}</strong>
              <br />
              Sector: {alert.sector}
              <br />
              Nivel de humo: {alert.smoke_level}
              <br />
              Estado: {alert.status}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </section>
  )
}
