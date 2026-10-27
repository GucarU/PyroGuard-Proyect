import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import { activeMapAlerts, isValidPoint, markerColor } from '../lib/maxi'
import { mapWaterRequests, waterRequestStatus } from '../lib/waterRequests'
import { resolveMapFocus } from '../lib/mapFocus'
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

const squadRequestIcon = L.divIcon({
  className: 'squad-request-map-icon',
  html: '<span>🚒</span>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
})

const hydrantIcon = L.divIcon({
  className: 'hydrant-map-icon',
  html: '<span>💧</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

function WaterRequestMarker({ request, focused, focusVersion }) {
  const markerRef = useRef(null)
  useEffect(() => {
    if (focused) markerRef.current?.openPopup()
    else markerRef.current?.closePopup()
  }, [focused, focusVersion])
  return (
    <Marker ref={markerRef} position={[Number(request.latitude), Number(request.longitude)]} icon={squadRequestIcon}>
      <Popup>
        <strong>🚒 Solicitud de apoyo #{request.id}</strong><br />
        Solicitante: {request.requester}<br />
        Estado: {waterRequestStatus(request.status)}<br />
        Detalle: {request.description || 'Reabastecimiento o apoyo en terreno'}<br />
        Ubicación: {Number(request.latitude).toFixed(5)}, {Number(request.longitude).toFixed(5)}<br />
        <small>Solicitud registrada · No implica despacho real de cuadrilla.</small>
      </Popup>
    </Marker>
  )
}

function FocusSector({ sector, alerts, sensors, focusAlertId, waterRequests, focusedWaterRequestId, focusedWaterRequestVersion }) {
  const map = useMap()
  const lastFocus = useRef(null)
  useEffect(() => {
    // React-Leaflet puede medirse antes de recibir sus dimensiones definitivas.
    const timer = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(timer)
  }, [map])
  useEffect(() => {
    const key = `${sector || 'todo'}:${focusAlertId ?? 'ninguno'}:${focusedWaterRequestId ?? 'ninguna'}:${focusedWaterRequestVersion}`
    if (key === lastFocus.current) return
    const target = resolveMapFocus({
      sector, alerts, sensors, focusAlertId, waterRequests, focusedWaterRequestId,
    })
    if (target) {
      map.flyTo(target.point, target.zoom, { duration: 0.65 })
      lastFocus.current = key
    } else if (!sector && focusedWaterRequestId == null && focusAlertId == null) {
      // Quitar el filtro no implica navegar a una solicitud anterior.
      lastFocus.current = key
    }
  }, [sector, focusAlertId, focusedWaterRequestId, focusedWaterRequestVersion, waterRequests, alerts, sensors, map])
  return null
}

export default function AlertMap({ alerts, sensorStatuses = [], shelters = [], selectedSector = '', focusAlertId = null, hydrants = [], showHydrants = false, waterRequests = [], focusedWaterRequestId = null, focusedWaterRequestVersion = 0 }) {
  const validAlerts = activeMapAlerts(alerts)
  const validWaterRequests = mapWaterRequests(waterRequests)
  const windSensors = sensorStatuses.filter(
    (sensor) => sensor.wind_alert && sensor.latitude != null && sensor.longitude != null,
  )

  return (
    <section id="mapa-central" className="map-section alerts-section">
      <div className="section-heading">
        <div>
          <p className="section-label">Mapa operacional</p>
          <h2>Mapa de alertas y recursos</h2>
          <p className="muted-text">{validWaterRequests.length} solicitudes de apoyo marcadas en la central</p>
        </div>
      </div>

      <p className="map-legend">🟠 Alerta pendiente · 🔴 Incendio validado · 🏠 Albergue · 💧 Grifo de práctica · 🚒 Solicitud de apoyo recibida. Los marcadores de solicitud son independientes del filtro por cerro.</p>
      <MapContainer
        center={[-33.0472, -71.6127]}
        zoom={11}
        style={{ height: '420px', width: '100%', borderRadius: '16px' }}
      >
        <FocusSector sector={selectedSector} focusAlertId={focusAlertId} alerts={validAlerts} sensors={sensorStatuses} waterRequests={validWaterRequests} focusedWaterRequestId={focusedWaterRequestId} focusedWaterRequestVersion={focusedWaterRequestVersion} />
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

        {validWaterRequests.map((request) => (
          <WaterRequestMarker key={`request-${request.id}`} request={request} focused={request.id === focusedWaterRequestId} focusVersion={focusedWaterRequestVersion} />
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
      <p className="muted-text" style={{marginBottom:0, fontSize:'.83rem'}}>Si el mapa no muestra calles, comprueba Internet: las imágenes cartográficas se cargan desde OpenStreetMap. Puedes ampliar o arrastrar el mapa.</p>
    </section>
  )
}
