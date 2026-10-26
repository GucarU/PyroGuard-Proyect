import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import { activeMapAlerts, isValidPoint, markerColor } from '../lib/maxi'
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

const hydrantIcon = L.divIcon({
  className: 'hydrant-map-icon',
  html: '<span>💧</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

function FocusSector({ sector, alerts, sensors }) {
  const map = useMap()
  const lastSector = useRef(null)
  useEffect(() => {
    if (!sector) { lastSector.current = null; return }
    if (lastSector.current === sector) return
    const reference = [...alerts, ...sensors].find(isValidPoint)
    if (reference) { map.flyTo([Number(reference.latitude), Number(reference.longitude)], 13, { duration: 0.7 }); lastSector.current = sector }
  }, [sector, alerts, sensors, map])
  return null
}

export default function AlertMap({ alerts, sensorStatuses = [], shelters = [], selectedSector = '', hydrants = [], showHydrants = false }) {
  const validAlerts = activeMapAlerts(alerts)
  const windSensors = sensorStatuses.filter(
    (sensor) => sensor.wind_alert && sensor.latitude != null && sensor.longitude != null,
  )

  return (
    <section className="map-section alerts-section">
      <div className="section-heading">
        <div>
          <p className="section-label">Mapa operacional</p>
          <h2>Focos, viento y albergues · grifos de práctica</h2>
        </div>
      </div>

      <p className="map-legend">🟠 Pendiente · 🔴 Validado · 🏠 Albergue · 💧 Grifo de práctica · Las falsas alarmas se ocultan del mapa, pero siguen en el historial.</p>
      <MapContainer
        center={[-33.0472, -71.6127]}
        zoom={11}
        style={{ height: '380px', width: '100%', borderRadius: '16px' }}
      >
        <FocusSector sector={selectedSector} alerts={alerts} sensors={sensorStatuses} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {validAlerts.map((alert) => (
          <CircleMarker key={alert.id} center={[Number(alert.latitude), Number(alert.longitude)]} radius={10} pathOptions={{ color: markerColor(alert), fillColor: markerColor(alert), fillOpacity: 0.8 }}>
            <Popup>
              <strong>{alert.sensor_id}</strong><br />
              Sector: {alert.sector}<br />
              Nivel de humo: {alert.smoke_level}%<br />
              Estado: {alert.status}<br />
              {alert.validated_by && <span>Validado por: {alert.validated_by}</span>}
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

        {showHydrants && hydrants.filter(isValidPoint).map((hydrant) => (
          <Marker key={`hydrant-${hydrant.id}`} position={[Number(hydrant.latitude), Number(hydrant.longitude)]} icon={hydrantIcon}>
            <Popup><strong>{hydrant.name}</strong><br />Estado de práctica: {hydrant.status}<br /><strong>REGISTRO FICTICIO · NO OPERACIONAL</strong></Popup>
          </Marker>
        ))}

        {shelters.filter(isValidPoint).map((shelter) => (
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
