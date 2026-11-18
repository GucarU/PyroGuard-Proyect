import { Phone } from 'lucide-react'

export default function CitizenEmergency({ receipt = false }) {
  return <aside className="citizen-emergency" aria-label="Teléfonos de emergencia en Chile">
    <span className="citizen-icon" aria-hidden="true"><Phone size={20} /></span>
    <div>
      <strong>¿Hay peligro inmediato?</strong>
      <p>{receipt ? 'El reporte queda para revisión y no activa un despacho automático. Llama desde un lugar seguro.' : 'Aléjate del fuego y llama desde un lugar seguro.'}</p>
    </div>
    <div className="citizen-phone-links"><a href="tel:130">CONAF 130</a><a href="tel:132">Bomberos 132</a></div>
  </aside>
}
