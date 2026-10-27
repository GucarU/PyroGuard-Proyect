import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { isValidPoint } from '../lib/maxi'

const center = [-33.0472, -71.6127]
const statusLabel = {
  DISPONIBLE: 'Disponible (simulado)',
  SIN_AGUA: 'Sin agua (simulado)',
  EN_REVISION: 'En revisión (simulado)',
}
const statusColor = { DISPONIBLE: '#38d6a1', SIN_AGUA: '#f36a72', EN_REVISION: '#ffd36a' }
const pointIcon = (status) => L.divIcon({
  className: 'hydrant-pin-container',
  html: `<span class="hydrant-pin" style="--hydrant-color:${statusColor[status] ?? '#8cc9ed'}">💧</span>`,
  iconSize: [40, 44],
  iconAnchor: [20, 40],
})

function LocationClick({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng) } })
  return null
}

function MapRefresh({ pointCount }) {
  const map = useMap()
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(id)
  }, [map, pointCount])
  return null
}

export default function HydrantMap({ items = [], selected = null, onPick, enabled = false }) {
  const displayPoints = enabled ? items.filter(isValidPoint) : []
  return <div className="hydrant-map-wrap">
    <div className="hydrant-map-heading">
      <strong>Mapa de grifos de práctica</strong>
      <span>{enabled ? `${displayPoints.length} puntos visibles` : 'Vista restringida por rol de práctica'}</span>
    </div>
    <p className="map-legend">💧 Los puntos son ficticios, NO indican grifos operativos reales. Haz clic para elegir dónde añadir uno.</p>
    <MapContainer center={center} zoom={12} className="hydrant-leaflet-map" style={{height: '350px', width: '100%', borderRadius: '14px'}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <MapRefresh pointCount={displayPoints.length} />
      {enabled && onPick && <LocationClick onPick={onPick} />}
      {displayPoints.map(point => <Marker key={point.id} position={[Number(point.latitude), Number(point.longitude)]} icon={pointIcon(point.status)}>
        <Popup><strong>{point.name}</strong><br />{statusLabel[point.status] || point.status}<br />Punto de demostración, no verificado.</Popup>
      </Marker>)}
      {enabled && selected && <Marker position={[selected.lat, selected.lng]} icon={pointIcon('EN_REVISION')}>
        <Popup>Punto seleccionado para nuevo grifo de prueba</Popup>
      </Marker>}
    </MapContainer>
    <p className="muted-text hydrant-map-footer">Si el mapa no carga los mosaicos, revisa la conexión a Internet; se utiliza OpenStreetMap. Los puntos se guardan solo en el entorno de prueba.</p>
  </div>
}
