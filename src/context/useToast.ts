import { useContext } from 'react'

import { ToastContext } from './toast-context'

/**
 * Avisos flotantes ("Turno agendado"). Uso:
 *
 *   const toast = useToast()
 *   toast.mostrar('exito', 'Guardado.')
 */
export function useToast() {
  const contexto = useContext(ToastContext)
  if (!contexto) throw new Error('useToast tiene que usarse dentro de <ToastProvider>.')
  return contexto
}
