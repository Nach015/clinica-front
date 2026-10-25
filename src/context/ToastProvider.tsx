/**
 * Avisos flotantes.
 *
 * Un mensaje de éxito dentro de la página (el `Aviso` verde) se pierde si el
 * usuario está mirando otra parte de la pantalla, y queda ahí hasta que
 * recarga. El toast aparece en una esquina fija, se lee con lectores de
 * pantalla (`aria-live`) y se va solo.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

import { ToastContext, type TipoToast, type ToastContextValue } from './toast-context'

interface Toast {
  id: number
  tipo: TipoToast
  texto: string
}

const DURACION_MS = 5000
const MAXIMO_VISIBLES = 4

const COLOR: Record<TipoToast, string> = {
  exito: 'var(--color-success)',
  error: 'var(--color-danger)',
  info: 'var(--color-accent)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const siguienteId = useRef(1)

  const cerrar = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback(
    (tipo: TipoToast, texto: string) => {
      const id = siguienteId.current++
      // Si hay muchos juntos se descartan los más viejos: una pila de diez
      // avisos tapa la pantalla.
      setToasts((actuales) => [...actuales, { id, tipo, texto }].slice(-MAXIMO_VISIBLES))
      setTimeout(() => cerrar(id), DURACION_MS)
    },
    [cerrar],
  )

  const valor = useMemo<ToastContextValue>(() => ({ mostrar }), [mostrar])

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-30 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icono = toast.tipo === 'exito' ? CheckCircle2 : toast.tipo === 'error' ? AlertCircle : Info
          return (
            <div
              key={toast.id}
              className="toast-enter pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderLeft: `4px solid ${COLOR[toast.tipo]}`,
              }}
            >
              <Icono size={16} className="mt-0.5 shrink-0" style={{ color: COLOR[toast.tipo] }} aria-hidden="true" />
              <span className="flex-1">{toast.texto}</span>
              <button
                type="button"
                onClick={() => cerrar(toast.id)}
                aria-label="Cerrar aviso"
                className="shrink-0 rounded p-0.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
