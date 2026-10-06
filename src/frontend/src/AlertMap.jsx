import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function isWindAlert(alert) {
  return String(alert.user_story || '').includes('04') || String(alert.message || '').toLowerCase().includes('vientos fuertes');
}

function markerStyle(alert) {
  if (isWindAlert(alert)) return { color: '#a78bfa', fillColor: '#8b5cf6', fillOpacity: 0.9, weight: 3 };
  if (alert.priority === 'ALTA') return { color: '#ff725e', fillColor: '#ef4444', fillOpacity: 0.88, weight: 3 };
  if (alert.priority === 'MEDIA') return { color: '#ffd36a', fillColor: '#f59e0b', fillOpacity: 0.88, weight: 3 };
  return { color: '#75e6b6', fillColor: '#22c55e', fillOpacity: 0.88, weight: 3 };
}

export default function AlertMap({ alerts, onViewTemperature }) {
  const validAlerts = alerts.filter(
    (alert) => Number.isFinite(Number(alert.latitude)) && Number.isFinite(Number(alert.longitude)),
  );

  return (
    <section className="map-section">
      <div className="map-heading">
        <div>
          <p className="section-label">HU-01 · HU-03 · HU-04</p>
          <h2>Mapa de alertas y sensores</h2>
        </div>
        <div className="map-legend" aria-label="Leyenda del mapa">
          <span><i className="legend-dot high" /> Alta</span>
          <span><i className="legend-dot medium" /> Media</span>
          <span><i className="legend-dot low" /> Baja</span>
          <span><i className="legend-dot wind" /> Viento &gt; 40 km/h</span>
        </div>
      </div>

      <MapContainer
        center={[-33.0472, -71.6127]}
        zoom={11}
        style={{ height: '390px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {validAlerts.map((alert) => (
          <CircleMarker
            key={alert.id}
            center={[Number(alert.latitude), Number(alert.longitude)]}
            radius={11}
            pathOptions={markerStyle(alert)}
          >
            <Popup>
              <div className="map-popup">
                <strong>{alert.sensor_id}</strong>
                <span>Sector: {alert.sector}</span>
                <span>Nivel de humo: {alert.smoke_level}%</span>
                <span>Prioridad: {alert.priority}</span>
                <span>Estado: {String(alert.status).replaceAll('_', ' ')}</span>
                {isWindAlert(alert) && <b className="wind-warning">⚠ Viento superior a 40 km/h</b>}
                {alert.sensor_id !== 'APP_VECINAL' && (
                  <button type="button" className="map-popup-button" onClick={() => onViewTemperature?.(alert.sensor_id)}>
                    Ver temperatura
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </section>
  );
}
