import { useEffect, useState } from 'react'
import { api, jsonOptions } from '../lib/api'

export default function ShelterPanel() {
  const [shelters, setShelters] = useState([])
  const [message, setMessage] = useState('')

  async function loadShelters() {
    setShelters(await api('/api/shelters'))
  }

  async function toggleStatus(shelter) {
    const status = shelter.status === 'ABIERTO' ? 'CERRADO' : 'ABIERTO'
    setMessage('')
    try {
      const data = await api(`/api/shelters/${shelter.id}/status`, jsonOptions('PATCH', { status }))
      setMessage(`${data.name}: ${status === 'ABIERTO' ? 'abierto' : 'cerrado'}.`)
      await loadShelters()
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  useEffect(() => {
    loadShelters().catch((error) => setMessage(error.message))
  }, [])

  async function change(id, delta) {
    setMessage('')
    try {
      const data = await api(`/api/shelters/${id}/occupancy`, jsonOptions('PATCH', { delta }))
      setMessage(`${data.name}: ${data.occupancy}/${data.capacity} personas.`)
      await loadShelters()
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <section className="alerts-section jose-section">
      <div className="section-heading">
        <div>
          <h2>Cupos de albergues</h2>
        </div>
        <button className="secondary" onClick={() => loadShelters().catch(error => setMessage(error.message))}>Actualizar</button>
      </div>
      {message && <div className="mini-notice">{message}</div>}
      <div className="shelter-grid">
        {shelters.map((shelter) => (
          <article className={`shelter-card ${shelter.full || shelter.status === 'CERRADO' ? 'shelter-full' : ''}`} key={shelter.id}>
            <div>
              <strong>{shelter.name}</strong>
              <span>{shelter.status === 'CERRADO' ? 'CERRADO' : shelter.full ? 'LLENO' : `${shelter.available_slots} cupos disponibles`}</span>
            </div>
            <div className="occupancy-number">{shelter.occupancy}/{shelter.capacity}</div>
            <div className="button-row">
              <button className="secondary small-button" onClick={() => toggleStatus(shelter)}>
                {shelter.status === 'ABIERTO' ? 'Cerrar albergue' : 'Abrir albergue'}
              </button>
              <button className="secondary small-button" onClick={() => change(shelter.id, -1)}>-1</button>
              <button className="small-button" onClick={() => change(shelter.id, 1)}>+1</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
