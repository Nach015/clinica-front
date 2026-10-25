import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { aInputDate, diaSemanaDe, etiquetaEstadoTurno, formatearRelativo, sumarMinutos, tonoEstadoTurno } from './fechas'

describe('aInputDate', () => {
  it('arma YYYY-MM-DD con ceros', () => {
    expect(aInputDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(aInputDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('usa la fecha local, no la UTC (no corre el día)', () => {
    // 23:30 locales de un día: con toISOString() en UTC-3 saldría el día siguiente.
    expect(aInputDate(new Date(2026, 5, 15, 23, 30))).toBe('2026-06-15')
  })
})

describe('diaSemanaDe', () => {
  it('0 = lunes ... 6 = domingo', () => {
    expect(diaSemanaDe(new Date(2026, 5, 15))).toBe(0) // lunes 15/06/2026
    expect(diaSemanaDe(new Date(2026, 5, 18))).toBe(3) // jueves
    expect(diaSemanaDe(new Date(2026, 5, 21))).toBe(6) // domingo
  })
})

describe('sumarMinutos', () => {
  it('suma minutos y devuelve ISO', () => {
    expect(sumarMinutos('2026-06-15T10:00:00.000Z', 30)).toBe('2026-06-15T10:30:00.000Z')
    expect(sumarMinutos('2026-06-15T23:50:00.000Z', 20)).toBe('2026-06-16T00:10:00.000Z')
  })
})

describe('estados de turno', () => {
  it('tienen etiqueta y tono', () => {
    expect(etiquetaEstadoTurno('no_asistio')).toBe('No asistió')
    expect(tonoEstadoTurno('atendido')).toBe('exito')
    expect(tonoEstadoTurno('cancelado')).toBe('peligro')
  })
})

describe('formatearRelativo', () => {
  const AHORA = new Date('2026-06-15T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
  })
  afterEach(() => vi.useRealTimers())

  const hace = (segundos: number) => new Date(AHORA.getTime() - segundos * 1000).toISOString()

  it('REGRESIÓN: 27 minutos se dice "27 minutos", no "1.628"', () => {
    expect(formatearRelativo(hace(27 * 60))).toMatch(/27 minutos/)
    expect(formatearRelativo(hace(27 * 60))).not.toMatch(/1\.628/)
  })

  it('usa la unidad que corresponde', () => {
    expect(formatearRelativo(hace(30))).toMatch(/30 segundos/)
    expect(formatearRelativo(hace(5 * 60))).toMatch(/5 minutos/)
    expect(formatearRelativo(hace(3 * 3600))).toMatch(/3 horas/)
    expect(formatearRelativo(hace(3 * 86_400))).toMatch(/3 días/)
  })

  it('también funciona hacia el futuro', () => {
    const dentroDe = new Date(AHORA.getTime() + 2 * 3600 * 1000).toISOString()
    expect(formatearRelativo(dentroDe)).toMatch(/2 horas/)
  })

  it('pasado el mes, muestra la fecha', () => {
    expect(formatearRelativo(hace(40 * 86_400))).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
  })
})
