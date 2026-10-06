function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function TemperatureChart({ readings }) {
  if (!readings.length) {
    return <div className="empty-state"><strong>Sin datos de temperatura.</strong></div>;
  }

  const ordered = [...readings].reverse();
  const values = ordered.map((item) => Number(item.temperature));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const width = 760;
  const height = 260;
  const padding = 34;

  const points = ordered.map((item, index) => {
    const x = ordered.length === 1
      ? width / 2
      : padding + (index / (ordered.length - 1)) * (width - padding * 2);
    const y = height - padding - ((Number(item.temperature) - min) / span) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="temperature-chart-wrap">
      <svg className="temperature-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de temperatura de la última hora">
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} className="chart-axis" />
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} className="chart-axis" />
        <polyline points={points} className="chart-line" fill="none" />
        {ordered.map((item, index) => {
          const [x, y] = points.split(' ')[index].split(',').map(Number);
          return <circle key={`${item.timestamp}-${index}`} cx={x} cy={y} r="5" className="chart-point" />;
        })}
      </svg>
      <div className="chart-meta">
        <span>Mínima: <strong>{min.toFixed(1)} °C</strong></span>
        <span>Máxima: <strong>{max.toFixed(1)} °C</strong></span>
        <span>Última lectura: <strong>{values[values.length - 1].toFixed(1)} °C</strong></span>
      </div>
      <div className="temperature-table" role="table" aria-label="Lecturas de temperatura">
        {ordered.slice(-8).reverse().map((item, index) => (
          <div className="temperature-row" role="row" key={`${item.timestamp}-${index}`}>
            <span>{formatTime(item.timestamp)}</span>
            <strong>{Number(item.temperature).toFixed(1)} °C</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TemperatureModal({ sensorId, readings, loading, error, onClose }) {
  if (!sensorId) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="temperature-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="section-label">HU-03 · Historial del sensor</p>
            <h2 id="temperature-title">Temperatura · {sensorId}</h2>
          </div>
          <button className="secondary" type="button" onClick={onClose}>Cerrar</button>
        </div>
        {loading && <div className="notice">Cargando lecturas...</div>}
        {error && <div className="notice error">{error}</div>}
        {!loading && !error && <TemperatureChart readings={readings} />}
      </section>
    </div>
  );
}
