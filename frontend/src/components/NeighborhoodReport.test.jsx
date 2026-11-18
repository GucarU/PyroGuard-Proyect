import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import NeighborhoodReport from './NeighborhoodReport'

vi.mock('./ReportLocationMap', () => ({
  default: ({ onPick }) => <button type="button" onClick={() => onPick({ lat: -33.49, lng: -71.66 })}>Marcar manualmente</button>,
}))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function fileWithHeader(name, header) {
  const bytes = Uint8Array.from(header)
  const file = new File([bytes], name)
  file.slice = () => ({ arrayBuffer: async () => bytes.buffer })
  return file
}

function reply(id) {
  return Promise.resolve({ ok: true, status: 201, json: async () => ({ id, status: 'PENDIENTE' }) })
}

it('valida los archivos y permite reemplazarlos o quitarlos', async () => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(file) { return `blob:${file.name}` }
    static revokeObjectURL() {}
  })
  render(<NeighborhoodReport />)
  const camera = screen.getByLabelText('Archivo de cámara')
  const gallery = screen.getByLabelText('Archivo de galería')
  expect(camera).toHaveAttribute('capture', 'environment')
  expect(gallery).not.toHaveAttribute('capture')
  fireEvent.change(gallery, { target: { files: [fileWithHeader('invalida.png', [65, 66, 67])] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos leer esta foto')
  const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.jpg')
  fireEvent.change(gallery, { target: { files: [oversized] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('supera los 5 MB')
  fireEvent.change(camera, { target: { files: [fileWithHeader('camara.jpg', [255, 216, 255])] } })
  const preview = await screen.findByAltText('Vista previa de la foto seleccionada')
  expect(preview).toHaveAttribute('src', 'blob:camara.jpg')
  fireEvent.change(gallery, { target: { files: [fileWithHeader('galeria.png', [137, 80, 78, 71, 13, 10, 26, 10])] } })
  await screen.findByText('galeria.png')
  expect(preview).toHaveAttribute('src', 'blob:galeria.png')
  fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }))
  expect(screen.queryByAltText('Vista previa de la foto seleccionada')).toBeNull()
  expect(screen.getByRole('button', { name: 'Continuar sin foto' })).toBeEnabled()
})

it('usa el GPS y envía la ubicación corregida desde el mapa', async () => {
  const getCurrentPosition = vi.fn(success => success({ coords: { latitude: -33.04, longitude: -71.63 } }))
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  const fetchMock = vi.fn(() => reply(8))
  vi.stubGlobal('fetch', fetchMock)
  render(<NeighborhoodReport />)

  fireEvent.click(screen.getByRole('button', { name: 'Continuar sin foto' }))
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
  expect(screen.getByText(/Usamos tu ubicación/)).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: 'Marcar manualmente' }))
  fireEvent.change(screen.getByLabelText(/Sector o referencia/), { target: { value: 'Cerro Alegre' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByText('Cerro Alegre')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
  expect(await screen.findByRole('heading', { name: 'Recibido, pendiente de revisión' })).toBeInTheDocument()
  expect(screen.getByText('Reporte #8')).toBeInTheDocument()
  const form = fetchMock.mock.calls[0][1].body
  expect(form.get('latitude')).toBe('-33.49')
  expect(form.get('longitude')).toBe('-71.66')
  expect(form.has('photo')).toBe(false)
})

it('permite marcar sin permiso GPS y reintenta sin perder datos ni cambiar el identificador', async () => {
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_success, failure) => failure({ code: 1 }) } })
  let fail
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => { fail = reject }))
    .mockImplementationOnce(() => reply(12))
  vi.stubGlobal('fetch', fetchMock)
  render(<NeighborhoodReport />)

  fireEvent.click(screen.getByRole('button', { name: 'Continuar sin foto' }))
  fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
  expect(screen.getByText(/El navegador no dio permiso/)).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: 'Marcar manualmente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  fireEvent.change(screen.getByLabelText(/¿Qué está pasando\?/), { target: { value: 'Humo cerca de la plaza' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
  expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  await act(async () => fail(new TypeError('Conexión interrumpida')))
  expect(await screen.findByRole('alert')).toHaveTextContent('Tu información sigue aquí')
  expect(screen.getByLabelText(/¿Qué está pasando\?/)).toHaveValue('Humo cerca de la plaza')
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar envío' }))
  expect(await screen.findByText('Reporte #12')).toBeInTheDocument()
  const [first, second] = fetchMock.mock.calls.map(([, options]) => options.body)
  expect(Object.fromEntries(first)).toEqual(Object.fromEntries(second))
  expect(second.get('submission_id')).toMatch(/^[\da-f]{32}$/)
})
