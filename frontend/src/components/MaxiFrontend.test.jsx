import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MaxiSectorFilter from './MaxiSectorFilter'
import MaxiIncidentActions from './MaxiIncidentActions'
import MaxiSafeCheckin from './MaxiSafeCheckin'
import MaxiHydrants from './MaxiHydrants'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Hito 2 — pruebas React HU de Maximiliano', () => {
  it('HU-06 muestra sectores por propiedades del componente', () => {
    render(<MaxiSectorFilter alerts={[{ id: 1, sector: 'Cerro Alegre' }]} sector="" onChange={() => {}} />)
    expect(screen.getByRole('option', { name: 'Cerro Alegre' })).toBeInTheDocument()
  })
  it('HU-06 envía el sector escogido al hacer una selección', () => {
    const change = vi.fn()
    render(<MaxiSectorFilter alerts={[{ id: 1, sector: 'Cerro Alegre' }]} sector="" onChange={change} />)
    fireEvent.change(screen.getByLabelText('Sector'), { target: { value: 'Cerro Alegre' } })
    expect(change).toHaveBeenCalledWith('Cerro Alegre')
  })
  it('HU-05 pide confirmación antes de solicitar validación al servidor', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    render(<MaxiIncidentActions alert={{ id: 3, status: 'PENDIENTE' }} onAction={action} />)
    fireEvent.click(screen.getByRole('button', { name: /Validar foco/i }))
    expect(action).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    await waitFor(() => expect(action).toHaveBeenCalledWith(3, 'VALIDADO'))
  })
  it('HU-08 descarta tras confirmar y deshabilita el descarte si ya se despachó', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<MaxiIncidentActions alert={{ id: 5, status: 'PENDIENTE' }} onAction={action} />)
    fireEvent.click(screen.getByRole('button', { name: /Descartar falsa alarma/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))
    await waitFor(() => expect(action).toHaveBeenCalledWith(5, 'FALSA_ALARMA'))
    rerender(<MaxiIncidentActions alert={{ id: 5, status: 'UNIDAD_DESPACHADA' }} onAction={action} />)
    expect(screen.getByRole('button', { name: /Descartar falsa alarma/i })).toBeDisabled()
  })
  it('HU-10 muestra el registro solo después de una respuesta exitosa de API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 2, alias: 'Vecino prueba', sector: 'Cerro', status: 'A_SALVO', reported_at: '2026-10-25T22:00:00Z' }) }))
    render(<MaxiSafeCheckin role="vecino" />)
    fireEvent.change(screen.getByPlaceholderText('Ej. Vecino Demo 1'), { target: { value: 'Vecino prueba' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. Cerro Alegre'), { target: { value: 'Cerro' } })
    fireEvent.click(screen.getByRole('button', { name: /^Estoy a salvo$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/Registro #2 guardado/)
  })
  it('HU-14 no muestra grifos para vecino y sí carga los del backend para bombero', async () => {
    const hydrants = [{ id: 1, name: 'Grifo DEMO', latitude: -33.04, longitude: -71.6, demo: true, status: 'EN_REVISION' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => hydrants }))
    const onHydrantsChange = vi.fn()
    const { rerender } = render(<MaxiHydrants role="vecino" onHydrantsChange={onHydrantsChange} />)
    expect(screen.getByText(/Capa disponible para roles de bomberos/i)).toBeInTheDocument()
    rerender(<MaxiHydrants role="bombero" onHydrantsChange={onHydrantsChange} />)
    await waitFor(() => expect(onHydrantsChange).toHaveBeenCalledWith(hydrants, true))
  })
})
