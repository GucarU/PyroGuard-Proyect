import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { isValidPoint } from '../lib/maxi'
import HydrantMarker, { HydrantLegend } from './HydrantMarker'

const center = [-33.0472, -71.6127]
function LocationClick({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.wrap()) } })
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

export default function HydrantMap({ items, selected, onPick, onEdit }) {
  const displayPoints = items.filter(isValidPoint)
  return <div className="hydrant-map-wrap">
    <div className="hydrant-map-heading">
      <strong>Grifos</strong>
      <span>{displayPoints.length} puntos visibles</span>
    </div>
    <p className="map-legend"><HydrantLegend /> · Selecciona el mapa para ubicar un grifo.</p>
    <MapContainer center={center} zoom={12} className="hydrant-leaflet-map" style={{height: '350px', width: '100%', borderRadius: '14px'}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <MapRefresh pointCount={displayPoints.length} />
      <LocationClick onPick={onPick} />
      {displayPoints.map(point => <HydrantMarker key={point.id} hydrant={point} onEdit={onEdit} />)}
      {selected && <CircleMarker center={[selected.lat, selected.lng]} radius={7} pathOptions={{ color: '#12628d', fillColor: '#8cc9ed', fillOpacity: .9 }}>
        <Popup>Punto seleccionado</Popup>
      </CircleMarker>}
    </MapContainer>
    <p className="muted-text hydrant-map-footer">Si el mapa no carga los mosaicos, revisa la conexión a Internet.</p>
  </div>
}
