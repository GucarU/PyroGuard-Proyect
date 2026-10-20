import { useEffect, useState } from 'react'

const API = 'http://127.0.0.1:8000'

export default function ShelterPanel() {
  const [shelters, setShelters] = useState([])
  const [message, setMessage] = useState('')

  async function loadShelters() {
    const response = await fetch(`${API}/api/shelters`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.detail || 'No fue posible cargar los albergues')
    setShelters(data)
  }

  useEffect(() => {
    loadShelters().catch((error) => setMessage(error.message))
  }, [])

  async function change(id, delta) {
    setMessage('')
    try {
      const response = await fetch(`${API}/api/shelters/${id}/occupancy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'No fue posible actualizar los cupos')
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
          <p className="section-label">JOSÉ · HU-15</p>
          <h2>Cupos de albergues</h2>
        </div>
        <button className="secondary" onClick={loadShelters}>Actualizar</button>
      </div>
      {message && <div className="mini-notice">{message}</div>}
      <div className="shelter-grid">
        {shelters.map((shelter) => (
          <article className={`shelter-card ${shelter.full ? 'shelter-full' : ''}`} key={shelter.id}>
            <div>
              <strong>{shelter.name}</strong>
              <span>{shelter.full ? 'LLENO' : `${shelter.available_slots} cupos disponibles`}</span>
            </div>
            <div className="occupancy-number">{shelter.occupancy}/{shelter.capacity}</div>
            <div className="button-row">
              <button className="secondary small-button" onClick={() => change(shelter.id, -1)}>-1</button>
              <button className="small-button" onClick={() => change(shelter.id, 1)}>+1</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
