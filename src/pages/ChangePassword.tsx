import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import AuthLayout from '../components/AuthLayout'
import { Aviso, Campo, Spinner } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'
import { mensajeDeError } from '../lib/errores'
import { ApiError } from '../lib/types'
import {
  hayErrores,
  soloConError,
  validarConfirmacion,
  validarObligatorio,
  validarPassword,
} from '../lib/validaciones'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const encontrados = {
      actual: validarObligatorio(actual, 'Escribí tu contraseña actual.'),
      nueva:
        validarPassword(nueva) ??
        (nueva === actual ? 'La contraseña nueva tiene que ser distinta a la actual.' : undefined),
      nuevaConfirmacion: validarConfirmacion(confirmacion, nueva),
    }
    if (hayErrores(encontrados)) {
      setErrores(soloConError(encontrados))
      return
    }

    setErrores({})
    setCargando(true)
    try {
      await api.post('/api/auth/change-password', {
        current_password: actual,
        new_password: nueva,
        new_password_confirm: confirmacion,
      })
      navigate('/app', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrores({
          actual: err.mensajePorCampo('current_password') ?? '',
          nueva: err.mensajePorCampo('new_password') ?? '',
          nuevaConfirmacion: err.mensajePorCampo('new_password_confirm') ?? '',
        })
      } else {
        setError(mensajeDeError(err, 'No se pudo cambiar la contraseña. Probá de nuevo.'))
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthLayout
      titulo="Cambiar contraseña"
      subtitulo={
        usuario
          ? `Sesión de ${usuario.email}`
          : 'Ingresá tu contraseña actual para elegir una nueva'
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Campo id="actual" label="Contraseña actual" error={errores.actual || undefined}>
          <input
            id="actual"
            type="password"
            className={`field-input ${errores.actual ? 'field-input-error' : ''}`}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </Campo>

        <Campo id="nueva" label="Contraseña nueva" error={errores.nueva || undefined} hint="Mínimo 8 caracteres">
          <input
            id="nueva"
            type="password"
            className={`field-input ${errores.nueva ? 'field-input-error' : ''}`}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Campo>

        <Campo
          id="nuevaConfirmacion"
          label="Repetir contraseña nueva"
          error={errores.nuevaConfirmacion || undefined}
        >
          <input
            id="nuevaConfirmacion"
            type="password"
            className={`field-input ${errores.nuevaConfirmacion ? 'field-input-error' : ''}`}
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Campo>

        {error && <Aviso>{error}</Aviso>}

        <button type="submit" className="btn-primary" disabled={cargando}>
          {cargando && <Spinner size={16} />}
          {cargando ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthLayout>
  )
}
