import { useCallback, useState } from 'react'

import { aplicarTema, temaInicial, type Tema } from './tema'

/** Devuelve el tema actual y una función para alternarlo. */
export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() => temaInicial())

  const alternar = useCallback(() => {
    setTema((actual) => {
      const siguiente: Tema = actual === 'oscuro' ? 'claro' : 'oscuro'
      aplicarTema(siguiente)
      return siguiente
    })
  }, [])

  return [tema, alternar]
}
