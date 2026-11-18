import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, jsonOptions } from '../lib/api'

export default function TemperatureModal({ sensor, onClose }) {
  const [history, setHistory] = useState([])
  const [temperature, setTemperature] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace('Z', '+00:00')
    const data = await api(`/api/sensors/${sensor.sensor_id}/temperature-history?limit=1000&since=${encodeURIComponent(since)}`)
    setHistory(
      data.filter(item => Date.parse(item.recorded_at) >= Date.now() - 60 * 60 * 1000).map((item, index) => ({
        ...item,
        point: index + 1,
        label: new Date(item.recorded_at).toLocaleTimeString(),
      })),
    )
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message))
  }, [sensor.sensor_id])

  async function addReading(event) {
    event.preventDefault()
    setMessage('')
    try {
      const value = Number(temperature)
      const data = await api(`/api/sensors/${sensor.sensor_id}/temperature`, jsonOptions('POST', { temperature_c: value }))
      setTemperature('')
      setMessage(`Lectura ${data.temperature_c} °C registrada.`)
      await load()
    } catch (error) { setMessage(`Error: ${error.message}`) }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <div>
            <h2>{sensor.sensor_id} · {sensor.sector}</h2>
          </div>
          <button className="secondary" onClick={onClose}>Cerrar</button>
        </div>

        <div className="chart-box">
          {history.length === 0 ? (
            <div className="empty-state">Sin lecturas de temperatura durante la última hora.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#284047" />
                <XAxis dataKey="label" stroke="#9fb2ba" />
                <YAxis unit="°C" stroke="#9fb2ba" domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#101c21', border: '1px solid #33484f' }}
                  labelFormatter={(value, payload) => payload?.[0]?.payload?.label || `Lectura ${value}`}
                />
                <Line type="monotone" dataKey="temperature_c" stroke="#ff7b54" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <form className="inline-form" onSubmit={addReading}>
          <label>
            Nueva temperatura
            <input
              type="number"
              step="0.1"
              min="-50"
              max="100"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              placeholder="Ej: 31.5"
              required
            />
          </label>
          <button type="submit">Agregar lectura</button>
        </form>
        {message && <p className="mini-notice">{message}</p>}
      </section>
    </div>
  )
}
