import { beforeEach, describe, expect, it } from 'vitest'

import { aplicarTema, temaInicial } from './tema'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('tema', () => {
  it('aplicar oscuro pone la clase .dark y lo recuerda', () => {
    aplicarTema('oscuro')
    expect(document.documentElement).toHaveClass('dark')
    expect(temaInicial()).toBe('oscuro')
  })

  it('aplicar claro la saca y lo recuerda', () => {
    aplicarTema('oscuro')
    aplicarTema('claro')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(temaInicial()).toBe('claro')
  })

  it('sin elección guardada, y sin matchMedia, arranca en claro', () => {
    expect(temaInicial()).toBe('claro')
  })

  it('ignora un valor guardado inválido', () => {
    localStorage.setItem('clinica_tema', 'violeta')
    expect(temaInicial()).toBe('claro')
  })
})
