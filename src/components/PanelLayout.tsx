/**
 * Cascaron de los paneles: barra superior, navegacion por rol y logout.
 *
 * Un solo layout para los cuatro paneles. La navegacion se arma a partir del rol
 * y no al revés: cada panel declara que puede mostrar, y el cascaron dibuja los
 * tabs. Si el menu estuviera hardcodeado por pantalla, cada alta de un panel
 * obligaria a tocar el cascaron.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CalendarDays,
  ClipboardList,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Siren,
  Stethoscope,
  Users,
} from 'lucide-react'

import { useAuth } from '../context/useAuth'
import type { Rol } from '../lib/types'
import BotonTema from './BotonTema'

interface Seccion {
  id: string
  label: string
  icono: typeof LayoutDashboard
}

/**
 * Que ve cada rol.
 *
 * Es una lista, no una condicion por tab, para que agregar una pantalla sea
 * agregar una linea. El backend igual es la autoridad: esto solo evita mostrar
 * tabs que devolverian 403.
 */
const SECCIONES: Record<Rol, Seccion[]> = {
  admin: [
    { id: 'resumen', label: 'Resumen', icono: LayoutDashboard },
    { id: 'urgencias', label: 'Urgencias', icono: Siren },
    { id: 'especialidades', label: 'Especialidades', icono: ClipboardList },
    { id: 'profesionales', label: 'Profesionales', icono: Users },
    { id: 'agenda', label: 'Agenda', icono: CalendarDays },
    { id: 'consultas', label: 'Consultas', icono: ListChecks },
    { id: 'cola', label: 'Cola', icono: ClipboardList },
  ],
  recepcion: [
    { id: 'resumen', label: 'Resumen', icono: LayoutDashboard },
    { id: 'urgencias', label: 'Urgencias', icono: Siren },
    { id: 'agenda', label: 'Agenda', icono: CalendarDays },
    { id: 'disponibles', label: 'Disponibles', icono: Stethoscope },
    { id: 'consultas', label: 'Consultas', icono: ListChecks },
    { id: 'cola', label: 'Cola', icono: ClipboardList },
  ],
  medico: [
    { id: 'agenda', label: 'Mi agenda', icono: CalendarDays },
    { id: 'estado', label: 'Mi estado', icono: Stethoscope },
  ],
  paciente: [
    { id: 'turnos', label: 'Mis turnos', icono: CalendarDays },
    { id: 'pedir', label: 'Pedir turno', icono: Stethoscope },
    { id: 'ficha', label: 'Ficha médica', icono: HeartPulse },
    { id: 'consultas', label: 'Consultas', icono: ListChecks },
  ],
}

export default function PanelLayout({
  children,
  seccion,
  onSeccion,
}: {
  children: React.ReactNode
  seccion: string
  onSeccion: (id: string) => void
}) {
  const { usuario, cerrarSesion } = useAuth()
  const navegar = useNavigate()
  const [saliendo, setSaliendo] = useState(false)

  const secciones = usuario ? (SECCIONES[usuario.rol] ?? []) : []
  const etiquetaActual = secciones.find((s) => s.id === seccion)?.label

  // El título de la pestaña del navegador dice dónde estás ("Clínica · Urgencias").
  // Sirve cuando hay varias pestañas abiertas y para el historial.
  useEffect(() => {
    document.title = etiquetaActual ? `Clínica · ${etiquetaActual}` : 'Clínica'
  }, [etiquetaActual])

  if (!usuario) return null

  async function handleLogout() {
    if (saliendo) return
    setSaliendo(true)
    try {
      await cerrarSesion()
      navegar('/login', { replace: true })
    } finally {
      setSaliendo(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Para quien navega con teclado: salta el menú y va directo al contenido. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:rounded-md focus:px-3 focus:py-1.5 focus:text-sm"
        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-heading)' }}
      >
        Saltar al contenido
      </a>
      <header
        className="sticky top-0 z-10 border-b"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Clínica</div>
            <div className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {usuario.nombre || usuario.email} · {usuario.rol_display}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <BotonTema />
            <button
              type="button"
              onClick={() => navegar('/cambiar-contrasena')}
              className="btn-ghost flex items-center gap-1.5"
              title="Cambiar contraseña"
            >
              <KeyRound size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Contraseña</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={saliendo}
              className="btn-ghost flex items-center gap-1.5"
            >
              <LogOut size={15} aria-hidden="true" />
              {saliendo ? 'Saliendo...' : 'Salir'}
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-2 pb-1" aria-label="Secciones del panel">
          <ul className="flex gap-1 overflow-x-auto">
            {secciones.map((s) => {
              const Icono = s.icono
              const activo = seccion === s.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSeccion(s.id)}
                    aria-current={activo ? 'page' : undefined}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={{
                      color: activo ? 'var(--color-surface)' : 'var(--color-text-muted)',
                      backgroundColor: activo ? 'var(--color-accent)' : 'transparent',
                    }}
                  >
                    <Icono size={14} aria-hidden="true" />
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main id="contenido" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-5 outline-none">
        <div className="page-enter flex flex-col gap-4">{children}</div>
      </main>
    </div>
  )
}