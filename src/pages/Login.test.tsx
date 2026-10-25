import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../context/auth-context'
import { authDePrueba, usuarioDePrueba } from '../test/utils'
import Login from './Login'

const fetchMock = vi.fn()

function respuesta(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })
}

function dibujar(iniciarSesion = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider value={authDePrueba({ iniciarSesion })}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<p>Pantalla principal</p>} />
          <Route path="/cambiar-contrasena" element={<p>Cambiar contraseña</p>} />
          <Route path="/registro" element={<p>Pantalla de registro</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return { iniciarSesion, user: userEvent.setup() }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('Login', () => {
  it('con el formulario vacío muestra los errores y NO llama al servidor', async () => {
    const { user } = dibujar()

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByText('Escribí tu email.')).toBeInTheDocument()
    expect(screen.getByText('Escribí tu contraseña.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rechaza un email mal escrito sin llamar al servidor', async () => {
    const { user } = dibujar()

    await user.type(screen.getByLabelText('Email'), 'ana-sin-arroba')
    await user.type(screen.getByLabelText('Contraseña'), 'Clinica2026!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByText(/no parece válido/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('el error de un campo desaparece apenas el usuario lo corrige', async () => {
    const { user } = dibujar()

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByText('Escribí tu email.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'a')
    expect(screen.queryByText('Escribí tu email.')).not.toBeInTheDocument()
  })

  it('con datos válidos inicia sesión (email recortado) y va al panel', async () => {
    const sesion = { user: usuarioDePrueba(), tokens: { access: 'a', refresh: 'r' } }
    fetchMock.mockResolvedValueOnce(respuesta(200, sesion))
    const { user, iniciarSesion } = dibujar()

    await user.type(screen.getByLabelText('Email'), '  ana@correo.com  ')
    await user.type(screen.getByLabelText('Contraseña'), 'Clinica2026!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('Pantalla principal')).toBeInTheDocument()
    expect(iniciarSesion).toHaveBeenCalledWith(sesion)
    const [url, opciones] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(JSON.parse(opciones.body).email).toBe('ana@correo.com')
  })

  it('si debe cambiar la clave temporal, lo manda a cambiarla', async () => {
    const sesion = {
      user: usuarioDePrueba({ must_change_password: true }),
      tokens: { access: 'a', refresh: 'r' },
    }
    fetchMock.mockResolvedValueOnce(respuesta(200, sesion))
    const { user } = dibujar()

    await user.type(screen.getByLabelText('Email'), 'ana@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Temporal123')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('Cambiar contraseña')).toBeInTheDocument()
  })

  it('muestra el mensaje del servidor cuando las credenciales son incorrectas', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(401, { code: 'invalid_credentials', detail: 'Email o contraseña incorrectos.' }))
    const { user, iniciarSesion } = dibujar()

    await user.type(screen.getByLabelText('Email'), 'ana@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'mala-clave-1')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(iniciarSesion).not.toHaveBeenCalled()
  })

  it('si el servidor no responde, avisa que no hay conexión', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { user } = dibujar()

    await user.type(screen.getByLabelText('Email'), 'ana@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Clinica2026!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo conectar con el servidor/)
  })

  it('el botón se bloquea mientras espera la respuesta (evita doble envío)', async () => {
    let resolver: (r: Response) => void = () => undefined
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (resolver = resolve)))
    const { user } = dibujar()

    await user.type(screen.getByLabelText('Email'), 'ana@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Clinica2026!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByRole('button', { name: /Entrando/ })).toBeDisabled()

    resolver(respuesta(401, { detail: 'No.' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled())
  })
})
