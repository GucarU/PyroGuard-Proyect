import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import { activeMapAlerts, isValidPoint, markerColor } from '../lib/maxi'
import { mapWaterRequests, waterRequestStatus } from '../lib/waterRequests'
import { resolveMapFocus } from '../lib/mapFocus'
import { ReportStatus } from './ReportDetails'
import HydrantMarker, { HydrantLegend } from './HydrantMarker'
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

function FocusSector({ sector, alerts, sensors, focusAlertId, waterRequests, focusedWaterRequestId, focusedWaterRequestVersion, focusedReport }) {
  const map = useMap()
  const lastFocus = useRef(null)
  useEffect(() => {
    // React-Leaflet puede medirse antes de recibir sus dimensiones definitivas.
    const timer = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(timer)
  }, [map])
  useEffect(() => {
    const key = `${sector}:${focusAlertId}:${focusedWaterRequestId}:${focusedWaterRequestVersion}:${focusedReport?.id}`
    if (key === lastFocus.current) return
    const target = resolveMapFocus({
      sector, alerts, sensors, focusAlertId, waterRequests, focusedWaterRequestId, focusedReport,
    })
    if (target) {
      map.flyTo(target.point, target.zoom, { duration: 0.65 })
      lastFocus.current = key
    } else if (!sector && focusedWaterRequestId == null && focusAlertId == null && !focusedReport) {
      // Quitar el filtro no implica navegar a una solicitud anterior.
      lastFocus.current = key
    }
  }, [sector, focusAlertId, focusedWaterRequestId, focusedWaterRequestVersion, focusedReport, waterRequests, alerts, sensors, map])
  return null
}

const reportMarkerStyle = { color: '#5c318d', fillColor: '#a980e7', fillOpacity: .9 }

function ReportMarker({ report, focused }) {
  const marker = useRef(null)
  useEffect(() => {
    if (focused) marker.current?.openPopup()
  }, [focused])
  return <CircleMarker ref={marker} center={[report.latitude, report.longitude]} radius={9} className="citizen-report-marker"
    pathOptions={reportMarkerStyle}>
    <Popup autoPan={false}>
      <strong>Reporte ciudadano #{report.id}</strong><br />
      {report.location_label && <>{report.location_label}<br /></>}
      <ReportStatus status={report.status} />
    </Popup>
  </CircleMarker>
}

export default function AlertMap({ alerts, sensorStatuses = [], shelters = [], selectedSector = '', focusAlertId = null, hydrants = [], showHydrants = false, waterRequests = [], focusedWaterRequestId = null, focusedWaterRequestVersion = 0, focusedReport = null, reports = [], reportsError = '' }) {
  const validAlerts = activeMapAlerts(alerts)
  const validWaterRequests = mapWaterRequests(waterRequests)
  const validSensors = sensorStatuses.filter(isValidPoint)
  const windSensors = validSensors.filter(sensor => sensor.wind_alert)
  const validReports = reports.filter(isValidPoint)

  return (
    <section id="mapa-central" className="map-section alerts-section">
      <div className="section-heading">
        <div>
          <h2>Mapa</h2>
          <p className="muted-text">{validWaterRequests.length} solicitudes de apoyo marcadas en la central</p>
        </div>
      </div>

      <p className="map-legend">🟠 Alerta pendiente · 🔴 Incendio validado · 🟢 Sensor · 🏠 Albergue · 🚒 Solicitud de apoyo · 🟣 Reporte ciudadano</p>
      {reportsError && <p className="muted-text" role="status">No se pudieron actualizar los reportes ciudadanos.</p>}
      {showHydrants && <p className="map-legend">Grifos <HydrantLegend /></p>}
      <MapContainer
        center={[-33.0472, -71.6127]}
        zoom={11}
        style={{ height: '420px', width: '100%', borderRadius: '16px' }}
      >
        <FocusSector sector={selectedSector} focusAlertId={focusAlertId} alerts={validAlerts} sensors={validSensors} waterRequests={validWaterRequests} focusedWaterRequestId={focusedWaterRequestId} focusedWaterRequestVersion={focusedWaterRequestVersion} focusedReport={focusedReport} />
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

        {validSensors.filter(sensor => !sensor.wind_alert).map(sensor => (
          <CircleMarker key={`sensor-${sensor.sensor_id}`} center={[sensor.latitude, sensor.longitude]} radius={5}
            pathOptions={{ color: '#157d64', fillColor: '#68d7ba', fillOpacity: 1 }}>
            <Popup><strong>{sensor.sensor_id}</strong><br />{sensor.sector}<br />Batería: {sensor.battery_level}%</Popup>
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

        {showHydrants && hydrants.filter(isValidPoint).map(hydrant => (
          <HydrantMarker key={`hydrant-${hydrant.id}`} hydrant={hydrant} />
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
        {validReports.map(report => (
          <ReportMarker key={report.id} report={report} focused={report.id === focusedReport?.id} />
        ))}
      </MapContainer>
      <p className="muted-text" style={{marginBottom:0, fontSize:'.83rem'}}>Si el mapa no muestra calles, comprueba Internet: las imágenes cartográficas se cargan desde OpenStreetMap. Puedes ampliar o arrastrar el mapa.</p>
    </section>
  )
}
