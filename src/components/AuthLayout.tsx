/** Contenedor compartido de acceso, registro y recuperación de cuenta. */

import { CalendarDays, HeartPulse, MessagesSquare, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import BotonTema from './BotonTema'

const beneficios = [
  { texto: 'Tus turnos y próximos controles', Icono: CalendarDays },
  { texto: 'Tu información de salud en un solo lugar', Icono: HeartPulse },
  { texto: 'Comunicación directa con recepción', Icono: MessagesSquare },
]

export default function AuthLayout({
  titulo,
  subtitulo,
  children,
  pie,
}: {
  titulo: string
  subtitulo?: string
  children: ReactNode
  pie?: ReactNode
}) {
  return (
    <div className="auth-shell">
      <section className="auth-brand-panel" aria-label="Portal de atención de Clínica">
        <Link to="/" className="clinic-brand">
          <span className="clinic-brand-mark">
            <HeartPulse size={22} aria-hidden="true" />
          </span>
          <span>
            <span className="clinic-brand-name">Clínica</span>
            <span className="clinic-brand-caption">Portal de atención</span>
          </span>
        </Link>

        <div className="auth-brand-copy">
          <p className="auth-eyebrow">Cuidado conectado</p>
          <h2>Tu salud, con seguimiento y claridad.</h2>
          <p className="auth-brand-description">
            Gestioná tus turnos, consultá tu ficha y mantené a mano la información que necesitás para tu atención.
          </p>
          <ul className="auth-feature-list">
            {beneficios.map(({ texto, Icono }) => (
              <li key={texto} className="auth-feature">
                <span className="auth-feature-icon">
                  <Icono size={17} aria-hidden="true" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-brand-footer">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Acceso personal a tu portal de atención</span>
        </div>
      </section>

      <main className="auth-main">
        <BotonTema className="auth-theme-toggle" />
        <div className="auth-main-inner">
          <Link to="/" className="clinic-brand auth-mobile-brand">
            <span className="clinic-brand-mark">
              <HeartPulse size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="clinic-brand-name">Clínica</span>
              <span className="clinic-brand-caption">Portal de atención</span>
            </span>
          </Link>

          <section className="auth-card">
            <header className="auth-card-heading">
              <p className="auth-card-kicker">Portal de atención</p>
              <h1>{titulo}</h1>
              {subtitulo && <p className="auth-card-subtitle">{subtitulo}</p>}
            </header>
            {children}
          </section>

          {pie && <p className="auth-card-footer">{pie}</p>}
        </div>
      </main>
    </div>
  )
}