/**
 * Validaciones de formularios.
 *
 * Cada función recibe un valor y devuelve un mensaje de error en español, o
 * `undefined` si el valor está bien. Ese contrato es el mismo que espera el
 * componente `Campo` (prop `error`), así que el uso típico es:
 *
 *   const errores = { email: validarEmail(email), password: validarPassword(password) }
 *   if (hayErrores(errores)) { setErrores(errores); return }
 *
 * IMPORTANTE: validar en el front es para ayudar al usuario (avisarle antes de
 * mandar el formulario), NO para proteger el sistema. La validación que cuenta
 * es la del back, que vuelve a revisar todo. Por eso estas reglas nunca deben
 * ser más estrictas que las del back: si el front rechaza algo que el back
 * acepta, el usuario queda bloqueado sin motivo.
 */

export type Errores = Record<string, string | undefined>

/** `true` si algún campo tiene mensaje de error. */
export function hayErrores(errores: Errores): boolean {
  return Object.values(errores).some(Boolean)
}

/** Deja solo los campos que tienen error (para guardarlos en el estado). */
export function soloConError(errores: Errores): Record<string, string> {
  const resultado: Record<string, string> = {}
  for (const [campo, mensaje] of Object.entries(errores)) {
    if (mensaje) resultado[campo] = mensaje
  }
  return resultado
}

export function validarObligatorio(valor: string, mensaje: string): string | undefined {
  return valor.trim() ? undefined : mensaje
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validarEmail(valor: string): string | undefined {
  const email = valor.trim()
  if (!email) return 'Escribí tu email.'
  if (email.length > 254) return 'El email es demasiado largo.'
  if (!REGEX_EMAIL.test(email)) return 'El email no parece válido. Ejemplo: ana@correo.com'
  return undefined
}

/** Nombre y apellido: letras, espacios, apóstrofe, punto y guion. */
export function validarNombre(valor: string): string | undefined {
  const nombre = valor.trim()
  if (!nombre) return 'Escribí tu nombre y apellido.'
  if (nombre.length < 2) return 'El nombre es demasiado corto.'
  if (nombre.length > 100) return 'El nombre es demasiado largo (máximo 100 caracteres).'
  if (!/^\p{L}[\p{L}\s'.-]*$/u.test(nombre)) {
    return 'El nombre solo puede tener letras, espacios, apóstrofes, puntos y guiones.'
  }
  return undefined
}

/** Teléfono opcional: si se escribe, tiene que tener entre 8 y 15 dígitos. */
export function validarTelefono(valor: string): string | undefined {
  const telefono = valor.trim()
  if (!telefono) return undefined
  if (!/^[+\d\s()-]+$/.test(telefono)) {
    return 'El teléfono solo puede tener números, espacios, +, - y paréntesis.'
  }
  const digitos = telefono.replace(/\D/g, '').length
  if (digitos < 8 || digitos > 15) return 'El teléfono tiene que tener entre 8 y 15 dígitos.'
  return undefined
}

export const LARGO_MINIMO_PASSWORD = 8

export function validarPassword(valor: string): string | undefined {
  if (!valor) return 'Escribí una contraseña.'
  if (valor.length < LARGO_MINIMO_PASSWORD) {
    return `La contraseña tiene que tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`
  }
  if (valor.length > 128) return 'La contraseña es demasiado larga (máximo 128 caracteres).'
  if (/^\d+$/.test(valor)) return 'La contraseña no puede ser solo números.'
  return undefined
}

export function validarConfirmacion(valor: string, original: string): string | undefined {
  if (!valor) return 'Repetí la contraseña.'
  if (valor !== original) return 'Las contraseñas no coinciden.'
  return undefined
}

/** Código de verificación: exactamente `largo` dígitos. */
export function validarCodigo(valor: string, largo = 6): string | undefined {
  if (!new RegExp(`^\\d{${largo}}$`).test(valor)) return `El código tiene ${largo} dígitos.`
  return undefined
}

interface OpcionesLargo {
  etiqueta: string
  min?: number
  max?: number
  obligatorio?: boolean
}

/** Largo de un texto libre (motivo, consulta, nota...). */
export function validarTexto(
  valor: string,
  { etiqueta, min = 0, max = Infinity, obligatorio = true }: OpcionesLargo,
): string | undefined {
  const texto = valor.trim()
  if (!texto) return obligatorio ? `Completá ${etiqueta}.` : undefined
  if (texto.length < min) return `${capitalizar(etiqueta)} es muy corto: escribí al menos ${min} caracteres.`
  if (texto.length > max) return `${capitalizar(etiqueta)} es muy largo: máximo ${max} caracteres.`
  return undefined
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Matrícula profesional: letras, números, punto, barra y guion. */
export function validarMatricula(valor: string): string | undefined {
  const matricula = valor.trim()
  if (!matricula) return 'Escribí la matrícula.'
  if (matricula.length < 3) return 'La matrícula es demasiado corta.'
  if (matricula.length > 64) return 'La matrícula es demasiado larga (máximo 64 caracteres).'
  if (!/^[A-Za-z0-9./-]+$/.test(matricula)) {
    return 'La matrícula solo puede tener letras, números, punto, barra y guion.'
  }
  return undefined
}

/** Duración de un turno en minutos: entero, entre 10 y 240, de a 5. */
export function validarDuracion(valor: string): string | undefined {
  if (!valor.trim()) return 'Escribí la duración en minutos.'
  const minutos = Number(valor)
  if (!Number.isInteger(minutos)) return 'La duración tiene que ser un número entero.'
  if (minutos < 10 || minutos > 240) return 'La duración tiene que estar entre 10 y 240 minutos.'
  if (minutos % 5 !== 0) return 'La duración tiene que ser múltiplo de 5 minutos.'
  return undefined
}

/** Que la hora de fin sea posterior a la de inicio (`HH:MM`). */
export function validarRangoHorario(desde: string, hasta: string): string | undefined {
  if (!desde || !hasta) return 'Elegí la hora de inicio y la de fin.'
  if (desde >= hasta) return 'La hora de fin tiene que ser posterior a la de inicio.'
  return undefined
}

/**
 * Fecha (`YYYY-MM-DD`) y hora (`HH:MM`) que no estén en el pasado.
 *
 * Se tolera 1 minuto hacia atrás: entre que el usuario elige "ahora" y aprieta
 * el botón pasan segundos, y rechazarlo sería molesto.
 */
export function validarNoPasado(fecha: string, hora = '00:00', ahora: Date = new Date()): string | undefined {
  if (!fecha) return 'Elegí una fecha.'
  const elegido = new Date(`${fecha}T${hora || '00:00'}`)
  if (Number.isNaN(elegido.getTime())) return 'La fecha u hora no es válida.'
  if (elegido.getTime() < ahora.getTime() - 60_000) return 'No se puede elegir una fecha u hora que ya pasó.'
  return undefined
}
