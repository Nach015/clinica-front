/**
 * Red de seguridad de toda la app.
 *
 * En React, si un componente tira un error mientras se dibuja (por ejemplo, un
 * dato que llegó `null` y nadie lo esperaba), sin esto la pantalla queda
 * COMPLETAMENTE en blanco y el usuario no sabe qué pasó. Esto atrapa el error y
 * muestra un mensaje con un botón para reintentar.
 *
 * Tiene que ser una clase: React todavía no ofrece una forma con funciones
 * para atrapar errores de render.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface Estado {
  fallo: boolean
}

export default class ErrorBoundary extends Component<Props, Estado> {
  state: Estado = { fallo: false }

  static getDerivedStateFromError(): Estado {
    return { fallo: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Queda en la consola del navegador para poder diagnosticarlo.
    console.error('Error de render capturado:', error, info.componentStack)
  }

  render() {
    if (!this.state.fallo) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div
          role="alert"
          className="w-full max-w-sm rounded-2xl border p-6 text-center"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <AlertTriangle size={28} className="mx-auto" style={{ color: 'var(--color-danger)' }} aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Algo salió mal</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            La pantalla tuvo un error inesperado. Tus datos guardados no se perdieron.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Recargar la página
            </button>
            <a href="/" className="btn-ghost">
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }
}
