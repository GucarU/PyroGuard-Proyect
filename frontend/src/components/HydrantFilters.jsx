import { getSectors, HYDRANT_STATES, NO_HYDRANT_SECTOR } from '../lib/maxi'

export default function HydrantFilters({ hydrants, filters, onChange }) {
  const sectors = getSectors(hydrants)
  if (filters.sector && filters.sector !== NO_HYDRANT_SECTOR && !sectors.includes(filters.sector)) sectors.push(filters.sector)
  const hasNoSector = filters.sector === NO_HYDRANT_SECTOR || hydrants.some(item => !item.sector?.trim())

  return <fieldset className="hydrant-filters">
    <legend>Filtros de grifos</legend>
    <label>Sector de grifos
      <select aria-label="Sector de grifos" value={filters.sector} onChange={event => onChange({ ...filters, sector: event.target.value })}>
        <option value="">Todos los sectores</option>
        {sectors.map(sector => <option key={sector} value={sector}>{sector}</option>)}
        {hasNoSector && <option value={NO_HYDRANT_SECTOR}>Sin sector</option>}
      </select>
    </label>
    <label>Estado de grifos
      <select aria-label="Estado de grifos" value={filters.status} onChange={event => onChange({ ...filters, status: event.target.value })}>
        <option value="">Todos los estados</option>
        {Object.entries(HYDRANT_STATES).map(([status, { label }]) => <option key={status} value={status}>{label}</option>)}
      </select>
    </label>
  </fieldset>
}
