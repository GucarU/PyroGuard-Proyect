import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import MaxiSectorFilter from './MaxiSectorFilter'
import MaxiIncidentActions from './MaxiIncidentActions'
import MaxiSafeCheckin from './MaxiSafeCheckin'
import MaxiHydrants from './MaxiHydrants'

vi.mock('./HydrantMap', () => ({ default: ({ items }) => (
  <div data-testid="hydrant-map">{items.map(item => <span key={item.id}>{item.name} {item.status}</span>)}</div>
) }))

const testHydrant = { id: 1, name: 'Grifo Plaza', sector: 'Cerro Alegre', latitude: -33.04, longitude: -71.6, demo: true, status: 'EN_REVISION' }

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
  it('HU-07 consulta el historial y muestra el identificador del operador', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [
      { id: 10, alert_id: 5, action: 'VALIDADO', actor_id: 23, actor_name: 'Guardia', acted_at: '2026-10-25T22:00:00Z' },
    ] })
    vi.stubGlobal('fetch', fetchMock)
    render(<MaxiIncidentActions alert={{ id: 5, status: 'VALIDADO' }} />)
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }))
    expect(await screen.findByText('Guardia · ID 23')).toBeInTheDocument()
    expect(screen.getByText('Foco validado')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/alerts/5/history')
  })
  it('HU-10 muestra el registro solo después de una respuesta exitosa de API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 2, alias: 'Vecino prueba', sector: 'Cerro', status: 'A_SALVO', reported_at: '2026-10-25T22:00:00Z' }) }))
    render(<MaxiSafeCheckin />)
    fireEvent.change(screen.getByLabelText('Alias'), { target: { value: 'Vecino prueba' } })
    fireEvent.change(screen.getByPlaceholderText('Ej. Cerro Alegre'), { target: { value: 'Cerro' } })
    fireEvent.click(screen.getByRole('button', { name: /^Estoy a salvo$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/Registro #2 guardado/)
  })
  it('HU-14 solo muestra los grifos al personal con un perfil habilitado', () => {
    const props = { items: [testHydrant], filters: { sector: '', status: '' }, visible: true }
    const { rerender } = render(<MaxiHydrants profile="operador" {...props} />)
    expect(screen.getByText(/Capa disponible para los perfiles Bombero y Municipal/i)).toBeInTheDocument()
    expect(screen.queryByTestId('hydrant-map')).not.toBeInTheDocument()
    rerender(<MaxiHydrants profile="bombero" {...props} />)
    expect(screen.getByTestId('hydrant-map')).toHaveTextContent('Grifo Plaza EN_REVISION')
    expect(screen.getByText('DEMO', { exact: true })).toBeInTheDocument()
  })
  it('HU-14 filtra el mapa y actualiza el marcador al editar el estado', async () => {
    const updated = { ...testHydrant, status: 'SIN_AGUA', updated_at: '2026-10-25T22:00:00Z' }
    const fetchMock = vi.fn(async path => ({ ok: true, json: async () => path.endsWith('/history') ? [
      { id: 3, action: 'EDITADO', previous_status: 'EN_REVISION', status: 'SIN_AGUA', changed_fields: ['status'],
        actor_id: 4, actor_name: 'Guardia', acted_at: updated.updated_at },
    ] : updated }))
    vi.stubGlobal('fetch', fetchMock)

    function Harness() {
      const [items, setItems] = useState([testHydrant, { ...testHydrant, id: 2, name: 'Grifo Puerto', sector: 'Puerto' }])
      const [filters, setFilters] = useState({ sector: '', status: '' })
      return <MaxiHydrants profile="bombero" items={items} filters={filters} onFiltersChange={setFilters} visible
        onSaved={saved => setItems(current => current.map(item => item.id === saved.id ? saved : item))} />
    }

    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Sector de grifos'), { target: { value: 'Cerro Alegre' } })
    expect(screen.getByTestId('hydrant-map')).not.toHaveTextContent('Grifo Puerto')
    fireEvent.click(screen.getByRole('button', { name: 'Editar Grifo Plaza' }))
    fireEvent.change(screen.getByLabelText('Estado', { exact: true }), { target: { value: 'SIN_AGUA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Grifo #1 actualizado.')
    expect(screen.getByTestId('hydrant-map')).toHaveTextContent('Grifo Plaza SIN_AGUA')
    const [path, request] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/hydrants/1')
    expect(request.method).toBe('PATCH')
    expect(JSON.parse(request.body)).toEqual({ status: 'SIN_AGUA' })
    fireEvent.click(screen.getByRole('button', { name: 'Historial de Grifo Plaza' }))
    const history = screen.getByRole('region', { name: 'Historial de Grifo Plaza' })
    expect(await within(history).findByText('Guardia · ID 4')).toBeInTheDocument()
    expect(within(history).getByText('En revisión → Sin agua')).toBeInTheDocument()
  })
})
