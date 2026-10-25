/**
 * Reglas de las urgencias.
 *
 * Una urgencia es una entrada de la cola de espera con prioridad alta. El back
 * ya ordena la cola con las urgentes primero (`/api/cola`), así que el front no
 * inventa un sistema nuevo: reutiliza el campo `prioridad` y le da una pantalla
 * propia, con los tiempos de espera a la vista.
 *
 * Las funciones de este archivo son puras (no llaman a la API ni al DOM), por
 * eso se pueden probar fácil: ver `urgencias.test.ts`.
 */

import type { EntradaCola, RespuestaDisponibilidad } from './types'

/** Prioridad que el back guarda para una urgencia. Cualquier valor >= esto cuenta. */
export const PRIORIDAD_URGENTE = 10
export const PRIORIDAD_NORMAL = 0

/** Minutos de espera a partir de los cuales una urgencia pide atención. */
export const MINUTOS_ATENCION = 10
/** Minutos de espera a partir de los cuales una urgencia es crítica. */
export const MINUTOS_CRITICO = 20

export type NivelEspera = 'normal' | 'atencion' | 'critica'

export function esUrgente(entrada: Pick<EntradaCola, 'prioridad'>): boolean {
  return entrada.prioridad >= PRIORIDAD_URGENTE
}

/** Minutos que lleva esperando una entrada (nunca negativo). */
export function minutosDeEspera(creado: string | null, ahora: number = Date.now()): number {
  if (!creado) return 0
  const inicio = new Date(creado).getTime()
  if (Number.isNaN(inicio)) return 0
  return Math.max(0, Math.floor((ahora - inicio) / 60_000))
}

export function nivelEspera(minutos: number): NivelEspera {
  if (minutos >= MINUTOS_CRITICO) return 'critica'
  if (minutos >= MINUTOS_ATENCION) return 'atencion'
  return 'normal'
}

/** `5 min`, `1 h 10 min`, `2 h`. */
export function formatearEspera(minutos: number): string {
  if (minutos < 1) return 'menos de 1 min'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

/** La urgencia que más espera va primero. No modifica el arreglo original. */
export function ordenarUrgencias(entradas: EntradaCola[]): EntradaCola[] {
  return [...entradas].sort((a, b) => {
    const diferencia = new Date(a.creado).getTime() - new Date(b.creado).getTime()
    return diferencia !== 0 ? diferencia : a.id - b.id
  })
}

/**
 * Primer horario libre desde `desde`, mirando lo que devolvió `/api/disponibilidad`.
 * Devuelve el ISO del horario, o `null` si no queda ninguno.
 */
export function primerHorarioLibre(
  disponibilidad: RespuestaDisponibilidad | null | undefined,
  desde: Date = new Date(),
): string | null {
  const candidatos = (disponibilidad?.medicos ?? [])
    .flatMap((medico) => medico.horarios)
    .map((iso) => ({ iso, tiempo: new Date(iso).getTime() }))
    .filter((c) => !Number.isNaN(c.tiempo) && c.tiempo >= desde.getTime())
    .sort((a, b) => a.tiempo - b.tiempo)

  return candidatos[0]?.iso ?? null
}
