import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAutoRecarga } from './useAutoRecarga'

function ocultarPestana(oculta: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: oculta })
}

beforeEach(() => {
  vi.useFakeTimers()
  ocultarPestana(false)
})

afterEach(() => {
  vi.useRealTimers()
  ocultarPestana(false)
})

describe('useAutoRecarga', () => {
  it('vuelve a pedir los datos en cada intervalo', async () => {
    const recargar = vi.fn().mockResolvedValue(undefined)
    renderHook(() => useAutoRecarga(recargar, { intervaloMs: 30_000 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(recargar).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(recargar).toHaveBeenCalledTimes(3)
  })

  it('no pide nada con la pestaña en segundo plano', async () => {
    const recargar = vi.fn().mockResolvedValue(undefined)
    ocultarPestana(true)
    renderHook(() => useAutoRecarga(recargar, { intervaloMs: 1000 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(recargar).not.toHaveBeenCalled()
  })

  it('actualiza apenas el usuario vuelve a la pestaña', async () => {
    const recargar = vi.fn().mockResolvedValue(undefined)
    renderHook(() => useAutoRecarga(recargar, { intervaloMs: 60_000 }))

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it('con activo=false no hace nada, y al desmontar limpia el intervalo', async () => {
    const recargar = vi.fn().mockResolvedValue(undefined)
    renderHook(() => useAutoRecarga(recargar, { intervaloMs: 1000, activo: false }))
    const { unmount } = renderHook(() => useAutoRecarga(recargar, { intervaloMs: 1000 }))
    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(recargar).not.toHaveBeenCalled()
  })
})
