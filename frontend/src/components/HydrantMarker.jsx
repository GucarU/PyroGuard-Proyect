import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import { HYDRANT_STATES } from '../lib/maxi'
import { operationDate } from './OperationHistory'

const icons = Object.fromEntries(Object.entries(HYDRANT_STATES).map(([status, { color }]) => [status, L.divIcon({
  className: 'hydrant-pin-container',
  html: `<span class="hydrant-pin" style="--hydrant-color:${color}" aria-hidden="true">💧</span>`,
  iconSize: [40, 44],
  iconAnchor: [20, 40],
  popupAnchor: [0, -36],
})]))

export function HydrantLegend() {
  return <span className="hydrant-legend" aria-label="Estados de grifos">
    {Object.entries(HYDRANT_STATES).map(([status, { label, color }]) => <span key={status}>
      <span className="hydrant-status-dot" style={{ backgroundColor: color }} aria-hidden="true" />{label}
    </span>)}
  </span>
}

export default function HydrantMarker({ hydrant, onEdit }) {
  const isDemo = hydrant.demo || hydrant.demo_local
  const status = HYDRANT_STATES[hydrant.status]
  const latitude = Number(hydrant.latitude)
  const longitude = Number(hydrant.longitude)
  const title = `${hydrant.name} · ${status.label}${isDemo ? ' · DEMO' : ''}`

  return <Marker key={title} position={[latitude, longitude]} icon={icons[hydrant.status]} title={title}>
    <Popup>
      <strong>{hydrant.name}</strong>{isDemo && <strong className="hydrant-demo">DEMO</strong>}
      <dl className="hydrant-popup-details">
        <dt>Estado</dt><dd>{status.label}</dd>
        <dt>Sector</dt><dd>{hydrant.sector || 'Sin sector'}</dd>
        <dt>Ubicación</dt><dd>{latitude.toFixed(5)}, {longitude.toFixed(5)}</dd>
        <dt>Actualización</dt><dd>{operationDate(hydrant.updated_at || hydrant.created_at)}</dd>
        {hydrant.updated_by && <><dt>Responsable</dt><dd>{hydrant.updated_by}</dd></>}
      </dl>
      {onEdit && !hydrant.demo_local && <button type="button" className="secondary small-button" onClick={() => onEdit(hydrant)}>Editar grifo</button>}
    </Popup>
  </Marker>
}
