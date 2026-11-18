import { filterBySector, getSectors } from '../lib/maxi'

export default function MaxiSectorFilter({ alerts = [], sensors = [], sector = '', onChange }) {
  const sectors = getSectors(alerts, sensors)
  const matches = filterBySector(alerts, sector).length
  return (
    <section className="alerts-section maxi-panel" aria-label="Filtro por sector">
      <div className="section-heading">
        <div>
          <h2>Filtrar mapa por sector</h2>
        </div>
        <label className="maxi-control-label" htmlFor="sector-select">
          Sector
          <select id="sector-select" value={sector} onChange={(e) => onChange(e.target.value)}>
            <option value="">Todos los sectores</option>
            {sectors.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <p className="maxi-helper" aria-live="polite">
        {sector ? `${matches} alerta(s) registradas para ${sector}; el mapa se centra en sus coordenadas cuando las hay.` : `${alerts.length} alerta(s) en todos los sectores.`}
        {' '}Filtro local con sectores existentes; la consulta filtrada y catálogo de cerros requieren soporte del backend.
      </p>
    </section>
  )
}
