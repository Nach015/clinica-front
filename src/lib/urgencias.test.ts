import { describe, expect, it } from 'vitest'

import type { EntradaCola, RespuestaDisponibilidad } from './types'
import {
  MINUTOS_ATENCION,
  MINUTOS_CRITICO,
  PRIORIDAD_NORMAL,
  PRIORIDAD_URGENTE,
  esUrgente,
  formatearEspera,
  minutosDeEspera,
  nivelEspera,
  ordenarUrgencias,
  primerHorarioLibre,
} from './urgencias'

function entrada(parcial: Partial<EntradaCola>): EntradaCola {
  return {
    id: 1,
    paciente: 'Ana',
    paciente_id: 'uuid-1',
    especialidad: 'Clínica',
    especialidad_id: 1,
    medico: null,
    medico_id: null,
    prioridad: PRIORIDAD_URGENTE,
    estado: 'esperando',
    desde: null,
    hasta: null,
    nota: '',
    turno: null,
    creado: '2026-06-15T10:00:00Z',
    ...parcial,
  }
}

describe('esUrgente', () => {
  it('es urgente desde la prioridad de urgencia hacia arriba', () => {
    expect(esUrgente({ prioridad: PRIORIDAD_URGENTE })).toBe(true)
    expect(esUrgente({ prioridad: PRIORIDAD_URGENTE + 5 })).toBe(true)
  })

  it('no es urgente por debajo', () => {
    expect(esUrgente({ prioridad: PRIORIDAD_NORMAL })).toBe(false)
    expect(esUrgente({ prioridad: PRIORIDAD_URGENTE - 1 })).toBe(false)
  })
})

describe('minutosDeEspera', () => {
  const ahora = new Date('2026-06-15T10:30:00Z').getTime()

  it('cuenta minutos completos', () => {
    expect(minutosDeEspera('2026-06-15T10:00:00Z', ahora)).toBe(30)
    expect(minutosDeEspera('2026-06-15T10:29:30Z', ahora)).toBe(0)
  })

  it('nunca da negativo (reloj del servidor adelantado)', () => {
    expect(minutosDeEspera('2026-06-15T11:00:00Z', ahora)).toBe(0)
  })

  it('tolera fechas vacías o inválidas', () => {
    expect(minutosDeEspera(null, ahora)).toBe(0)
    expect(minutosDeEspera('basura', ahora)).toBe(0)
  })
})

describe('nivelEspera', () => {
  it('cambia en los umbrales', () => {
    expect(nivelEspera(0)).toBe('normal')
    expect(nivelEspera(MINUTOS_ATENCION - 1)).toBe('normal')
    expect(nivelEspera(MINUTOS_ATENCION)).toBe('atencion')
    expect(nivelEspera(MINUTOS_CRITICO - 1)).toBe('atencion')
    expect(nivelEspera(MINUTOS_CRITICO)).toBe('critica')
    expect(nivelEspera(500)).toBe('critica')
  })
})

describe('formatearEspera', () => {
  it.each([
    [0, 'menos de 1 min'],
    [1, '1 min'],
    [59, '59 min'],
    [60, '1 h'],
    [70, '1 h 10 min'],
    [120, '2 h'],
  ])('%i minutos → %s', (minutos, esperado) => {
    expect(formatearEspera(minutos)).toBe(esperado)
  })
})

describe('ordenarUrgencias', () => {
  it('pone primero la que más espera', () => {
    const a = entrada({ id: 1, creado: '2026-06-15T10:10:00Z' })
    const b = entrada({ id: 2, creado: '2026-06-15T10:00:00Z' })
    const c = entrada({ id: 3, creado: '2026-06-15T10:05:00Z' })
    expect(ordenarUrgencias([a, b, c]).map((e) => e.id)).toEqual([2, 3, 1])
  })

  it('desempata por id y no modifica el arreglo original', () => {
    const a = entrada({ id: 5, creado: '2026-06-15T10:00:00Z' })
    const b = entrada({ id: 4, creado: '2026-06-15T10:00:00Z' })
    const original = [a, b]
    expect(ordenarUrgencias(original).map((e) => e.id)).toEqual([4, 5])
    expect(original.map((e) => e.id)).toEqual([5, 4])
  })
})

describe('primerHorarioLibre', () => {
  const disponibilidad: RespuestaDisponibilidad = {
    fecha: '2026-06-15',
    medicos: [
      {
        medico_id: 1,
        medico: 'Dr. Gómez',
        especialidad: 'Clínica',
        duracion_minutos: 30,
        horarios: ['2026-06-15T09:00:00Z', '2026-06-15T11:00:00Z'],
      },
      {
        medico_id: 2,
        medico: 'Dra. Ruiz',
        especialidad: 'Clínica',
        duracion_minutos: 30,
        horarios: ['2026-06-15T10:30:00Z'],
      },
    ],
  }

  it('elige el más cercano a partir de ahora, entre todos los médicos', () => {
    expect(primerHorarioLibre(disponibilidad, new Date('2026-06-15T10:00:00Z'))).toBe('2026-06-15T10:30:00Z')
  })

  it('ignora los horarios que ya pasaron', () => {
    expect(primerHorarioLibre(disponibilidad, new Date('2026-06-15T09:30:00Z'))).toBe('2026-06-15T10:30:00Z')
  })

  it('devuelve null si no queda ninguno', () => {
    expect(primerHorarioLibre(disponibilidad, new Date('2026-06-15T12:00:00Z'))).toBeNull()
    expect(primerHorarioLibre(null)).toBeNull()
    expect(primerHorarioLibre({ fecha: '2026-06-15', medicos: [] })).toBeNull()
  })
})
