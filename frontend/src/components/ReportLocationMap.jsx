import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMapEvents } from 'react-leaflet'
import { Crosshair } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const VALPARAISO = { lat: -33.0472, lng: -71.6127 }

function MapActions({ gps, onPick, onCenter }) {
  const lastGps = useRef(gps)
  const map = useMapEvents({
    click: event => onPick(event.latlng.wrap()),
    moveend: () => onCenter(map.getCenter().wrap()),
  })

  useEffect(() => {
    if (gps && lastGps.current !== gps) map.setView(gps, 16, { animate: false })
    lastGps.current = gps
  }, [gps, map])

  return null
}

export default function ReportLocationMap({ point, gps, onPick }) {
  const center = useRef(point || VALPARAISO)
  const [tilesFailed, setTilesFailed] = useState(false)

  return <div className="citizen-map-group">
    <div className="citizen-map-frame" role="group" aria-label="Mapa para elegir el lugar del incendio">
      <MapContainer center={center.current} zoom={point ? 16 : 13} scrollWheelZoom={false} zoomControl={false}
        className="citizen-location-map">
        <ZoomControl position="topleft" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
          eventHandlers={{ tileerror: () => setTilesFailed(true), load: event => {
            const tiles = event.target.getContainer()?.querySelectorAll('.leaflet-tile-loaded')
            if (tiles?.length) setTilesFailed(false)
          } }} />
        <MapActions gps={gps} onPick={onPick} onCenter={value => { center.current = value }} />
        {point && <CircleMarker center={point} radius={9}
          pathOptions={{ color: '#fff', weight: 3, fillColor: '#b82919', fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -8]} permanent>Lugar del incendio</Tooltip>
        </CircleMarker>}
        <span className="citizen-map-crosshair" aria-hidden="true"><Crosshair size={24} /></span>
      </MapContainer>
    </div>
    {tilesFailed && <p className="citizen-help" role="status">Algunas calles del mapa no pudieron cargar. Si estás en el lugar, puedes usar tu ubicación.</p>}
    <button type="button" className="citizen-button citizen-button-secondary" onClick={() => onPick(center.current)}>
      <Crosshair size={18} aria-hidden="true" /> Marcar el centro del mapa
    </button>
  </div>
}
