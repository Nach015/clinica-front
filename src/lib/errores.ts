/**
 * Manejo central de errores.
 *
 * Antes cada pantalla repetía `e instanceof ApiError ? e.message : '...'`, y con
 * eso se perdía algo importante: un error propio del formulario (por ejemplo
 * "Elegí un paciente de la lista") caía en el texto genérico porque no es un
 * `ApiError`. Ahora hay UNA función que decide qué se le muestra al usuario.
 */

import { ApiError } from './types'

/**
 * Error que lanza el propio front cuando algo del formulario está mal.
 * Su mensaje SÍ se le muestra al usuario (a diferencia de un error inesperado,
 * que puede traer texto técnico).
 */
export class ErrorDeFormulario extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorDeFormulario'
  }
}

/** Texto seguro para mostrar al usuario a partir de cualquier error. */
export function mensajeDeError(
  error: unknown,
  porDefecto = 'No se pudo completar la operación.',
): string {
  if (error instanceof ApiError || error instanceof ErrorDeFormulario) return error.message
  return porDefecto
}

/** `true` si el error es de conexión (el back no respondió). */
export function esErrorDeRed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0
}
