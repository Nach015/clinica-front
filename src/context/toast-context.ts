import { createContext } from 'react'

export type TipoToast = 'exito' | 'error' | 'info'

export interface ToastContextValue {
  /** Muestra un aviso que se cierra solo a los pocos segundos. */
  mostrar: (tipo: TipoToast, texto: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
