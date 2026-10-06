import { useCallback, useEffect, useMemo, useState } from 'react';
import AlertMap from './AlertMap';
import TemperatureModal from './TemperatureModal';

const API = import.meta.env.VITE_API_URL || '';

const DEMO_DETECTION = {
  sensor_id: 'PG-VALPO-01',
  sector: 'Camino La Pólvora',
  smoke_detected: true,
  smoke_level: 82,
  latitude: -33.0757,
  longitude: -71.6136,
  battery_level: 78,
  temperature: 31.5,
  wind_speed: 12,
};

const EMPTY_REPORT = {
  name: '',
  phone: '',
  sector: '',
  latitude: '',
  longitude: '',
  description: '',
};

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-CL');
}

function isWindAlert(alert) {
  return String(alert.user_story || '').includes('04') || String(alert.message || '').toLowerCase().includes('vientos fuertes');
}

function App() {
  const [alerts, setAlerts] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [backendOk, setBackendOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info');
  const [sensorError, setSensorError] = useState('');
  const [temperatureSensor, setTemperatureSensor] = useState('');
  const [temperatureReadings, setTemperatureReadings] = useState([]);
  const [temperatureLoading, setTemperatureLoading] = useState(false);
  const [temperatureError, setTemperatureError] = useState('');
  const [report, setReport] = useState(EMPTY_REPORT);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPhotoName, setReportPhotoName] = useState('');

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/alerts`);
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || 'No se pudieron cargar las alertas.');
      setAlerts(Array.isArray(data) ? data : []);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    }
  }, []);

  const loadSensors = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/sensors/status`);
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || 'No se pudo obtener el estado de los sensores.');
      setSensors(Array.isArray(data) ? data : []);
      setSensorError('');
      setBackendOk(true);
    } catch (error) {
      setSensorError(error.message || 'No se pudo conectar con los sensores.');
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    loadSensors();
    const alertTimer = setInterval(loadAlerts, 4000);
    const sensorTimer = setInterval(loadSensors, 5000);
    return () => {
      clearInterval(alertTimer);
      clearInterval(sensorTimer);
    };
  }, [loadAlerts, loadSensors]);

  const windAlerts = useMemo(() => alerts.filter(isWindAlert), [alerts]);

  async function simulateSmoke() {
    setLoading(true);
    setNotice('');
    try {
      const response = await fetch(`${API}/api/sensors/detections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEMO_DETECTION),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || 'Error al crear la alerta.');
      setBackendOk(true);
      setNoticeType('success');
      setNotice(data.message || 'Alerta registrada correctamente.');
      await Promise.all([loadAlerts(), loadSensors()]);
    } catch (error) {
      setBackendOk(false);
      setNoticeType('error');
      setNotice(`Error: ${error.message || 'No se pudo conectar con la API.'}`);
    } finally {
      setLoading(false);
    }
  }

  async function simulateWind() {
    setLoading(true);
    setNotice('');
    try {
      const response = await fetch(`${API}/api/sensors/detections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...DEMO_DETECTION,
          sensor_id: 'PG-VALPO-02',
          sector: 'Placilla',
          smoke_detected: false,
          smoke_level: 0,
          latitude: -33.1184,
          longitude: -71.5668,
          battery_level: 64,
          temperature: 27.8,
          wind_speed: 55,
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || 'No fue posible simular el viento.');
      setNoticeType('success');
      setNotice('HU-04: se registró una lectura de viento de 55 km/h.');
      await Promise.all([loadAlerts(), loadSensors()]);
    } catch (error) {
      setNoticeType('error');
      setNotice(`Error: ${error.message || 'No se pudo completar la simulación.'}`);
    } finally {
      setLoading(false);
    }
  }

  async function dispatch(alertId) {
    setNotice('');
    try {
      const response = await fetch(`${API}/api/alerts/${alertId}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit: 'BRAVO-1' }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || 'No fue posible despachar la unidad.');
      setNoticeType('success');
      setNotice(`Unidad BRAVO-1 despachada a la alerta #${alertId}.`);
      await loadAlerts();
    } catch (error) {
      setNoticeType('error');
      setNotice(`Error: ${error.message || 'No se pudo completar el despacho.'}`);
    }
  }

  async function openTemperature(sensorId) {
    setTemperatureSensor(sensorId);
    setTemperatureReadings([]);
    setTemperatureError('');
    setTemperatureLoading(true);
    try {
      const response = await fetch(`${API}/api/sensors/${encodeURIComponent(sensorId)}/temperature`);
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || 'No se pudo cargar la temperatura.');
      setTemperatureReadings(Array.isArray(data) ? data : []);
    } catch (error) {
      setTemperatureError(error.message || 'No fue posible obtener las lecturas del sensor.');
    } finally {
      setTemperatureLoading(false);
    }
  }

  function updateReport(field, value) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function useCurrentLocation() {
    setNotice('');
    if (!navigator.geolocation) {
      setNoticeType('error');
      setNotice('Este navegador no permite obtener la ubicación automáticamente.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReport((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setNoticeType('success');
        setNotice('Ubicación cargada en el reporte ciudadano.');
      },
      () => {
        setNoticeType('error');
        setNotice('No fue posible obtener la ubicación. Puedes escribir las coordenadas manualmente.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submitNeighborReport(event) {
    event.preventDefault();
    setReportLoading(true);
    setNotice('');
    try {
      const payload = {
        ...report,
        latitude: Number(report.latitude),
        longitude: Number(report.longitude),
      };
      const response = await fetch(`${API}/api/reports/neighbors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson(response);
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(' · ')
          : data.detail;
        throw new Error(detail || 'No fue posible enviar el reporte.');
      }
      setNoticeType('success');
      setNotice(data.message || 'Reporte ciudadano enviado correctamente.');
      setReport(EMPTY_REPORT);
      setReportPhotoName('');
      await loadAlerts();
    } catch (error) {
      setNoticeType('error');
      setNotice(`Error: ${error.message || 'No se pudo enviar el reporte ciudadano.'}`);
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PYROGUARD · PANEL INTEGRADO</p>
          <h1>Central de Emergencias</h1>
          <p className="subtitle">Detección temprana, monitoreo de sensores y reportes ciudadanos</p>
        </div>
        <div className={`api-status ${backendOk ? 'online' : 'offline'}`}>
          <span className="dot" />
          {backendOk ? 'API conectada' : 'API desconectada'}
        </div>
      </header>

      <main>
        <section className="hero-card">
          <div>
            <p className="section-label">HU-01 · Detección temprana</p>
            <h2>Simular detección de humo</h2>
            <p>Envía una lectura de prueba desde PG-VALPO-01 y actualiza el panel automáticamente.</p>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={simulateSmoke} disabled={loading}>{loading ? 'Enviando...' : 'Simular humo'}</button>
            <button type="button" className="secondary" onClick={simulateWind} disabled={loading}>Simular viento 55 km/h</button>
          </div>
        </section>

        {notice && <div className={`notice ${noticeType}`} role="status" aria-live="polite">{notice}</div>}

        <section className="summary-grid" aria-label="Resumen de alertas">
          <article><span>Alertas registradas</span><strong>{alerts.length}</strong></article>
          <article><span>Pendientes</span><strong>{alerts.filter((alert) => alert.status === 'PENDIENTE').length}</strong></article>
          <article><span>Advertencias de viento</span><strong>{windAlerts.length}</strong></article>
        </section>

        <AlertMap alerts={alerts} onViewTemperature={openTemperature} />

        <section className="sensor-section">
          <div className="section-heading">
            <div>
              <p className="section-label">HU-02 · Monitoreo IoT</p>
              <h2>Estado de sensores</h2>
              <p className="section-description">Actualización automática cada 5 segundos. Batería crítica: 15% o menos.</p>
            </div>
            <button className="secondary" type="button" onClick={loadSensors}>Actualizar sensores</button>
          </div>

          {sensorError && <div className="notice error">{sensorError}</div>}
          {!sensorError && sensors.length === 0 ? (
            <div className="empty-state"><strong>Aún no hay mediciones.</strong><span>Simula humo o viento para registrar el primer sensor.</span></div>
          ) : (
            <div className="sensor-grid">
              {sensors.map((sensor) => {
                const critical = Number(sensor.battery_level) <= 15;
                return (
                  <article className={`sensor-card ${critical ? 'critical' : ''}`} key={sensor.sensor_id}>
                    <div className="sensor-card-heading">
                      <div>
                        <span className={`sensor-dot ${critical ? 'critical' : ''}`} />
                        <strong>{sensor.sensor_id}</strong>
                      </div>
                      <span className={`battery-pill ${critical ? 'critical' : ''}`}>{sensor.battery_level}%</span>
                    </div>
                    <div className="battery-track"><span style={{ width: `${Math.max(0, Math.min(100, Number(sensor.battery_level)))}%` }} /></div>
                    <p>Última actualización: {formatDate(sensor.last_update)}</p>
                    <p className="api-limitation">Señal: no disponible en el endpoint actual.</p>
                    <button type="button" className="secondary sensor-button" onClick={() => openTemperature(sensor.sensor_id)}>Ver temperatura</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="alerts-section">
          <div className="section-heading">
            <div><p className="section-label">Panel del operador</p><h2>Alertas recientes</h2></div>
            <button className="secondary" type="button" onClick={loadAlerts}>Actualizar</button>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-state"><strong>No hay alertas activas.</strong><span>Usa un simulador o envía un reporte ciudadano.</span></div>
          ) : (
            <div className="alert-list">
              {alerts.map((alert) => (
                <article className={`alert-card ${isWindAlert(alert) ? 'wind-card' : ''}`} key={alert.id}>
                  <div className="alert-header">
                    <div>
                      <div className="tag-row">
                        <span className={`priority ${String(alert.priority).toLowerCase()}`}>{alert.priority}</span>
                        {isWindAlert(alert) && <span className="wind-badge">⚠ VIENTO FUERTE</span>}
                        {alert.user_story === 'HU-12' && <span className="citizen-badge">REPORTE CIUDADANO</span>}
                      </div>
                      <h3>Alerta #{alert.id} · {alert.sector}</h3>
                    </div>
                    <span className={`status ${alert.status === 'PENDIENTE' ? 'pending' : 'dispatched'}`}>{String(alert.status).replaceAll('_', ' ')}</span>
                  </div>
                  <p>{alert.message}</p>
                  <dl className="alert-data">
                    <div><dt>Origen</dt><dd>{alert.sensor_id}</dd></div>
                    <div><dt>Nivel de humo</dt><dd>{alert.smoke_level}%</dd></div>
                    <div><dt>Latitud</dt><dd>{alert.latitude}</dd></div>
                    <div><dt>Longitud</dt><dd>{alert.longitude}</dd></div>
                  </dl>
                  <div className="alert-footer">
                    <small>{formatDate(alert.detected_at)}</small>
                    <div className="alert-actions">
                      {alert.sensor_id !== 'APP_VECINAL' && <button type="button" className="secondary" onClick={() => openTemperature(alert.sensor_id)}>Temperatura</button>}
                      {alert.status === 'PENDIENTE' ? <button type="button" onClick={() => dispatch(alert.id)}>Despachar BRAVO-1</button> : <strong>{alert.dispatched_unit} despachada</strong>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="citizen-section">
          <div className="section-heading">
            <div>
              <p className="section-label">HU-12 · Reporte ciudadano</p>
              <h2>Reportar humo o fuego</h2>
              <p className="section-description">Envía ubicación y descripción al panel de Bomberos.</p>
            </div>
          </div>

          <form className="report-form" onSubmit={submitNeighborReport}>
            <label>Nombre<input required minLength="2" value={report.name} onChange={(e) => updateReport('name', e.target.value)} placeholder="Nombre del vecino" /></label>
            <label>Teléfono<input required minLength="8" value={report.phone} onChange={(e) => updateReport('phone', e.target.value)} placeholder="+56 9..." /></label>
            <label>Sector<input required value={report.sector} onChange={(e) => updateReport('sector', e.target.value)} placeholder="Ej. Placilla" /></label>
            <label>Latitud<input required type="number" step="any" min="-90" max="90" value={report.latitude} onChange={(e) => updateReport('latitude', e.target.value)} placeholder="-33.0472" /></label>
            <label>Longitud<input required type="number" step="any" min="-180" max="180" value={report.longitude} onChange={(e) => updateReport('longitude', e.target.value)} placeholder="-71.6127" /></label>
            <label className="full-field">Descripción<textarea required minLength="5" maxLength="300" value={report.description} onChange={(e) => updateReport('description', e.target.value)} placeholder="Describe lo que estás viendo..." /></label>
            <label className="full-field photo-field">Foto del lugar<input type="file" accept="image/*" capture="environment" onChange={(e) => setReportPhotoName(e.target.files?.[0]?.name || '')} /><small>{reportPhotoName ? `Foto seleccionada: ${reportPhotoName}. ` : ''}La API actual todavía no dispone de un campo para almacenar la fotografía; por ahora se envían los datos del reporte.</small></label>
            <div className="form-actions full-field">
              <button type="button" className="secondary" onClick={useCurrentLocation}>Usar mi ubicación</button>
              <button type="submit" disabled={reportLoading}>{reportLoading ? 'Enviando...' : 'Enviar reporte a Bomberos'}</button>
            </div>
          </form>
        </section>
      </main>

      <TemperatureModal
        sensorId={temperatureSensor}
        readings={temperatureReadings}
        loading={temperatureLoading}
        error={temperatureError}
        onClose={() => setTemperatureSensor('')}
      />
    </div>
  );
}

export default App;
