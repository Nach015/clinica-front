import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ErrorBoundary from './ErrorBoundary'

function Roto(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('muestra los hijos cuando todo anda bien', () => {
    render(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Todo bien')).toBeInTheDocument()
  })

  it('si un componente se rompe, muestra un mensaje en vez de dejar la pantalla en blanco', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <Roto />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal')
    expect(screen.getByRole('button', { name: 'Recargar la página' })).toBeInTheDocument()
    expect(consola).toHaveBeenCalled()
  })
})
