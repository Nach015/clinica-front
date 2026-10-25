import { Moon, Sun } from 'lucide-react'

import { useTema } from '../lib/useTema'

/** Botón para pasar de modo claro a oscuro. */
export default function BotonTema() {
  const [tema, alternar] = useTema()
  const oscuro = tema === 'oscuro'

  return (
    <button
      type="button"
      onClick={alternar}
      className="btn-ghost flex items-center gap-1.5"
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      {oscuro ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
    </button>
  )
}
