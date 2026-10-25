/**
 * Tema claro / oscuro.
 *
 * `index.css` ya traía los colores del modo oscuro bajo la clase `.dark`, pero
 * nada la activaba. Esto la prende o la apaga en <html> y recuerda la elección.
 *
 * Lo que se guarda en localStorage es solo "claro" u "oscuro": una preferencia
 * visual, nada sensible (el token de sesión sigue viviendo solo en memoria).
 */

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'clinica_tema'

/** Tema guardado, o el que prefiere el sistema operativo si nunca se eligió. */
export function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'claro' || guardado === 'oscuro') return guardado
  } catch {
    // localStorage puede estar bloqueado (modo privado): se sigue sin guardar.
  }
  const prefiereOscuro =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefiereOscuro ? 'oscuro' : 'claro'
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'oscuro')
  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // Sin storage no se recuerda la elección, pero el tema igual cambia.
  }
}
