import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Camera, Check, CircleCheck, ImagePlus, LocateFixed, MapPin,
  Send, Trash2, LoaderCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import CitizenEmergency from './CitizenEmergency'
import { REPORTS_ENDPOINT } from './ReportDetails'

const ReportLocationMap = lazy(() => import('./ReportLocationMap'))
const STEPS = ['Fotografía', 'Ubicación', 'Enviar']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ACCEPTED_PHOTOS = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

async function verifyImage(file) {
  if (!file.size) throw new Error('La foto está vacía. Elige otra o continúa sin foto.')
  if (file.size > MAX_PHOTO_BYTES) throw new Error('La foto supera los 5 MB. Puedes elegir una más liviana o continuar sin foto.')
  const extension = file.name.split('.').pop().toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) throw new Error('Elige una foto en formato JPG, PNG o WEBP.')

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const signature = (...bytes) => bytes.every((byte, index) => header[index] === byte)
  const jpeg = signature(255, 216, 255)
  const png = signature(137, 80, 78, 71, 13, 10, 26, 10)
  const text = String.fromCharCode(...header)
  const webp = text.startsWith('RIFF') && text.endsWith('WEBP')
  if (!(extension === 'png' ? png : extension === 'webp' ? webp : jpeg)) {
    throw new Error('No pudimos leer esta foto. Elige otra imagen JPG, PNG o WEBP.')
  }
}

function submissionKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function NeighborhoodReport({ onViewReports, onHome }) {
  const [step, setStep] = useState(0)
  const [photo, setPhoto] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [point, setPoint] = useState(null)
  const [gpsPoint, setGpsPoint] = useState(null)
  const [gpsBusy, setGpsBusy] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const camera = useRef(null)
  const gallery = useRef(null)
  const title = useRef(null)
  const photoRequest = useRef(0)
  const locationRequest = useRef(0)
  const pending = useRef(false)
  const submission = useRef(null)

  useEffect(() => { title.current?.focus() }, [step, receipt])
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url) }, [photo])
  useEffect(() => () => { photoRequest.current++; locationRequest.current++ }, [])

  async function selectPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const request = ++photoRequest.current
    setPhotoBusy(true)
    setPhotoError('')
    try {
      await verifyImage(file)
      if (request === photoRequest.current) setPhoto({ file, url: URL.createObjectURL(file) })
    } catch (error) {
      if (request === photoRequest.current) setPhotoError(error.message)
    } finally {
      if (request === photoRequest.current) setPhotoBusy(false)
    }
  }

  function removePhoto() {
    photoRequest.current++
    setPhoto(null)
    setPhotoBusy(false)
    setPhotoError('')
  }

  function pickOnMap(position) {
    locationRequest.current++
    setGpsBusy(false)
    setPoint({ lat: position.lat, lng: position.lng })
    setLocationMessage('Lugar marcado en el mapa.')
  }

  function useLocation() {
    setLocationMessage('')
    if (!navigator.geolocation || window.isSecureContext === false) {
      setLocationMessage('La ubicación automática no está disponible. Marca el lugar directamente en el mapa.')
      return
    }
    const request = ++locationRequest.current
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request !== locationRequest.current) return
        const position = { lat: coords.latitude, lng: coords.longitude }
        setGpsPoint(position)
        setPoint(position)
        setLocationMessage('Usamos tu ubicación. Toca el mapa si el incendio está en otro lugar.')
        setGpsBusy(false)
      },
      error => {
        if (request !== locationRequest.current) return
        setLocationMessage(error.code === 1
          ? 'El navegador no dio permiso. Puedes marcar el lugar en el mapa.'
          : 'No encontramos tu ubicación. Puedes marcar el lugar en el mapa.')
        setGpsBusy(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  function leaveLocation(nextStep) {
    locationRequest.current++
    setGpsBusy(false)
    setStep(nextStep)
  }

  async function sendReport(event) {
    event.preventDefault()
    if (!point || pending.current) return
    pending.current = true
    setSending(true)
    setSendError('')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)
    try {
      submission.current ??= submissionKey()
      const form = new FormData()
      if (photo) form.set('photo', photo.file)
      form.set('latitude', String(point.lat))
      form.set('longitude', String(point.lng))
      form.set('location_label', locationLabel.trim())
      form.set('description', description.trim())
      form.set('submission_id', submission.current)
      const report = await api(REPORTS_ENDPOINT, { method: 'POST', body: form, signal: controller.signal })
      if (!Number.isInteger(report.id)) throw new Error('No se recibió el número de reporte.')
      setReceipt(report)
      removePhoto()
    } catch (error) {
      setSendError(!error.status || error.status >= 500
        ? 'No pudimos confirmar el envío. Tu información sigue aquí. Revisa la conexión y vuelve a intentarlo.'
        : error.status === 422 && error.message === 'Error HTTP 422'
          ? 'Revisa el lugar marcado y los datos del reporte antes de volver a intentar.'
          : error.message)
    } finally {
      clearTimeout(timeout)
      pending.current = false
      setSending(false)
    }
  }

  if (receipt) return <div className="citizen-flow">
    <section className="citizen-panel citizen-receipt" aria-labelledby="receipt-heading">
      <span className="citizen-receipt-icon" aria-hidden="true"><CircleCheck size={34} /></span>
      <span className="citizen-receipt-number">Reporte #{receipt.id}</span>
      <h2 id="receipt-heading" ref={title} tabIndex={-1}>Recibido, pendiente de revisión</h2>
      <p>El equipo de PyroGuard revisará tu reporte. Puedes consultar su estado en Mis reportes.</p>
      <div className="citizen-flow-actions">
        <button type="button" className="citizen-button citizen-button-primary" onClick={onViewReports}>Ver mis reportes <ArrowRight size={18} aria-hidden="true" /></button>
        <button type="button" className="citizen-button citizen-button-secondary" onClick={onHome}>Volver al inicio</button>
      </div>
    </section>
    <CitizenEmergency receipt />
  </div>

  return <div className="citizen-flow">
    <section className="citizen-panel citizen-wizard" aria-labelledby="report-heading">
      <div className="citizen-wizard-header">
        <h2 id="report-heading">Reportar un incendio</h2>
        <ol className="citizen-steps" aria-label="Pasos del reporte">
          {STEPS.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}>
            <span aria-hidden="true">{index < step ? <Check size={15} /> : index + 1}</span>{label}
          </li>)}
        </ol>
      </div>

      {step === 0 && <div className="citizen-step-body">
        <header><h3 ref={title} tabIndex={-1}>Añade una foto <small>Opcional</small></h3>
          <p>Toma una foto solo si es seguro. Puedes continuar sin ella.</p></header>
        <input hidden type="file" aria-label="Archivo de cámara" ref={camera} accept={ACCEPTED_PHOTOS} capture="environment" onChange={selectPhoto} />
        <input hidden type="file" aria-label="Archivo de galería" ref={gallery} accept={ACCEPTED_PHOTOS} onChange={selectPhoto} />
        {photo && <figure className="citizen-preview">
          <img src={photo.url} alt="Vista previa de la foto seleccionada" />
          <figcaption><span>{photo.file.name}</span><button type="button" className="citizen-button citizen-button-secondary" onClick={removePhoto}><Trash2 size={16} aria-hidden="true" /> Quitar foto</button></figcaption>
        </figure>}
        <div className="citizen-photo-options" aria-label={photo ? 'Reemplazar la foto' : 'Añadir una foto'} role="group">
          <button type="button" onClick={() => camera.current.click()}><Camera size={24} aria-hidden="true" /><span>Tomar foto</span></button>
          <button type="button" onClick={() => gallery.current.click()}><ImagePlus size={24} aria-hidden="true" /><span>Elegir de galería</span></button>
        </div>
        <p className="citizen-help">JPG, PNG o WEBP · Máximo 5 MB{photo ? ' · Elige otra imagen para reemplazarla.' : ''}</p>
        {photoBusy && <p role="status" className="citizen-help">Revisando la foto…</p>}
        {photoError && <p role="alert" className="citizen-error">{photoError}</p>}
        <div className="citizen-flow-actions">
          {photo && <button type="button" className="citizen-button citizen-button-primary" disabled={photoBusy} onClick={() => setStep(1)}>Continuar <ArrowRight size={18} aria-hidden="true" /></button>}
          <button type="button" className={`citizen-button ${photo ? 'citizen-button-secondary' : 'citizen-button-primary'}`} onClick={() => {
            removePhoto()
            setStep(1)
          }}>Continuar sin foto {!photo && <ArrowRight size={18} aria-hidden="true" />}</button>
        </div>
      </div>}

      {step === 1 && <div className="citizen-step-body">
        <header><h3 ref={title} tabIndex={-1}>¿Dónde está el incendio?</h3>
          <p>Usa tu ubicación si estás en el lugar. También puedes tocar el mapa para marcar el punto exacto.</p></header>
        <button type="button" className="citizen-button citizen-button-secondary citizen-locate" disabled={gpsBusy} onClick={useLocation}>
          {gpsBusy ? <LoaderCircle className="citizen-spinner" size={20} aria-hidden="true" /> : <LocateFixed size={20} aria-hidden="true" />}
          {gpsBusy ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
        </button>
        <p className="citizen-location-message" role="status">{locationMessage || 'El mapa empieza en Valparaíso. Puedes moverlo a otro lugar.'}</p>
        <Suspense fallback={<p role="status">Cargando el mapa…</p>}>
          <ReportLocationMap point={point} gps={gpsPoint} onPick={pickOnMap} />
        </Suspense>
        <label className="citizen-field">Sector o referencia <small>Opcional</small>
          <input value={locationLabel} maxLength={120} placeholder="Ej. Cerro Alegre, cerca de la plaza" onChange={event => setLocationLabel(event.target.value)} />
        </label>
        <div className="citizen-flow-actions">
          <button type="button" className="citizen-button citizen-button-secondary" onClick={() => leaveLocation(0)}><ArrowLeft size={18} aria-hidden="true" /> Atrás</button>
          <button type="button" className="citizen-button citizen-button-primary" disabled={!point} onClick={() => leaveLocation(2)}>Continuar <ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </div>}

      {step === 2 && <form className="citizen-step-body" onSubmit={sendReport} aria-busy={sending}>
        <header><h3 ref={title} tabIndex={-1}>Revisa y envía tu reporte</h3></header>
        <label className="citizen-field">¿Qué está pasando? <small>Opcional</small>
          <textarea rows={3} maxLength={500} value={description} disabled={sending} placeholder="Veo humo cerca de los árboles" onChange={event => setDescription(event.target.value)} />
        </label>
        <div className="citizen-summary" aria-label="Resumen del reporte">
          <div>{photo ? <img src={photo.url} alt="Foto del reporte" /> : <Camera size={20} aria-hidden="true" />}<span><strong>Fotografía</strong><span>{photo ? photo.file.name : 'Sin foto'}</span></span></div>
          <div><MapPin size={20} aria-hidden="true" /><span><strong>Ubicación</strong><span>{locationLabel.trim() || 'Punto marcado en el mapa'}</span></span></div>
          <div><span><strong>Descripción</strong><span>{description.trim() || 'Sin descripción'}</span></span></div>
        </div>
        {sendError && <p role="alert" className="citizen-error">{sendError}</p>}
        {sending && <p className="citizen-help" role="status">Enviando tu reporte…</p>}
        <div className="citizen-flow-actions">
          <button type="button" className="citizen-button citizen-button-secondary" disabled={sending} onClick={() => setStep(1)}><ArrowLeft size={18} aria-hidden="true" /> Atrás</button>
          <button type="submit" className="citizen-button citizen-button-primary" disabled={sending}>
            {sending ? <><LoaderCircle className="citizen-spinner" size={18} aria-hidden="true" /> Enviando…</>
              : <>{sendError ? 'Reintentar envío' : 'Enviar reporte'} <Send size={18} aria-hidden="true" /></>}
          </button>
        </div>
      </form>}
    </section>
    <CitizenEmergency />
  </div>
}
