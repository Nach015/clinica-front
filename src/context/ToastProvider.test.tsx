import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function Boton({ texto = 'Guardado' }: { texto?: string }) {
  const toast = useToast()
  return <button onClick={() => toast.mostrar('exito', texto)}>Mostrar</button>
}

afterEach(() => vi.useRealTimers())

describe('ToastProvider', () => {
  it('muestra el aviso y se cierra con la X', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Boton />
      </ToastProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(screen.getByText('Guardado')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
  })

  it('se cierra solo a los 5 segundos', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Boton />
      </ToastProvider>,
    )

    act(() => screen.getByRole('button', { name: 'Mostrar' }).click())
    expect(screen.getByText('Guardado')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
  })

  it('no apila más de 4 avisos', () => {
    render(
      <ToastProvider>
        <Boton texto="Aviso" />
      </ToastProvider>,
    )
    const boton = screen.getByRole('button', { name: 'Mostrar' })
    for (let i = 0; i < 6; i++) act(() => boton.click())

    expect(screen.getAllByText('Aviso')).toHaveLength(4)
  })

  it('useToast fuera del provider da un error claro', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Boton />)).toThrow(/ToastProvider/)
    consola.mockRestore()
  })
})
