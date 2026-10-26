import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const windIcon = L.divIcon({
  className: 'wind-map-icon',
  html: '<span>💨</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

const shelterIcon = L.divIcon({
  className: 'shelter-map-icon',
  html: '<span>🏠</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

export default function AlertMap({ alerts, sensorStatuses = [], shelters = [] }) {
  const validAlerts = alerts.filter(
    (alert) => alert.latitude != null && alert.longitude != null,
  )
  const windSensors = sensorStatuses.filter(
    (sensor) => sensor.wind_alert && sensor.latitude != null && sensor.longitude != null,
  )

  return (
    <section className="map-section alerts-section">
      <div className="section-heading">
        <div>
          <p className="section-label">Mapa operacional</p>
          <h2>Alertas e indicadores de viento</h2>
        </div>
      </div>

      <MapContainer
        center={[-33.0472, -71.6127]}
        zoom={11}
        style={{ height: '380px', width: '100%', borderRadius: '16px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {validAlerts.map((alert) => (
          <CircleMarker key={alert.id} center={[alert.latitude, alert.longitude]} radius={10}>
            <Popup>
              <strong>{alert.sensor_id}</strong><br />
              Sector: {alert.sector}<br />
              Nivel de humo: {alert.smoke_level}%<br />
              Estado: {alert.status}
            </Popup>
          </CircleMarker>
        ))}

        {windSensors.map((sensor) => (
          <Marker
            key={`wind-${sensor.sensor_id}`}
            position={[sensor.latitude, sensor.longitude]}
            icon={windIcon}
          >
            <Popup>
              <strong>Advertencia de viento · {sensor.sensor_id}</strong><br />
              {sensor.sector}<br />
              Velocidad: {sensor.wind_speed_kmh} km/h<br />
              Umbral: {sensor.wind_threshold_kmh} km/h
            </Popup>
          </Marker>
        ))}

        {shelters.filter((shelter) => shelter.latitude != null && shelter.longitude != null).map((shelter) => (
          <Marker
            key={`shelter-${shelter.id}`}
            position={[shelter.latitude, shelter.longitude]}
            icon={shelterIcon}
          >
            <Popup>
              <strong>{shelter.name}</strong><br />
              Estado: {shelter.status}<br />
              Ocupación: {shelter.occupancy}/{shelter.capacity}<br />
              Cupos disponibles: {shelter.available_slots}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  )
}
