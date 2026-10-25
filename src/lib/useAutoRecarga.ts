/**
 * Recarga automática de una pantalla que se deja abierta todo el día.
 *
 * La pantalla de urgencias no puede esperar a que alguien apriete "Actualizar":
 * si entra una urgencia nueva, recepción tiene que verla sola. Por eso cada
 * `intervaloMs` se vuelve a pedir la lista.
 *
 * Detalles que importan:
 * - Si la pestaña está en segundo plano no se pide nada (gasta batería y datos
 *   para nadie), y se actualiza apenas el usuario vuelve a mirarla.
 * - Devuelve `ahora`, que se renueva en cada vuelta: sirve para que los
 *   contadores de "espera de X min" avancen aunque no cambie ningún dato.
 */

import { useEffect, useRef, useState } from 'react'

export function useAutoRecarga(
  recargar: () => Promise<void>,
  { intervaloMs = 30_000, activo = true }: { intervaloMs?: number; activo?: boolean } = {},
): number {
  const [ahora, setAhora] = useState(() => Date.now())

  // Se guarda en un ref para que el intervalo no se reinicie cada vez que el
  // componente pasa una función nueva. El ref se actualiza en un efecto (no
  // durante el render) para que React no se queje.
  const fnRef = useRef(recargar)
  useEffect(() => {
    fnRef.current = recargar
  })

  useEffect(() => {
    if (!activo) return

    async function actualizar() {
      if (document.hidden) return
      await fnRef.current()
      setAhora(Date.now())
    }

    const id = setInterval(() => void actualizar(), intervaloMs)
    const alVolver = () => {
      if (!document.hidden) void actualizar()
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [intervaloMs, activo])

  return ahora
}
