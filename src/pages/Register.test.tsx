import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Register from './Register'

const fetchMock = vi.fn()

function respuesta(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })
}

function dibujar() {
  render(
    <MemoryRouter initialEntries={['/registro']}>
      <Routes>
        <Route path="/registro" element={<Register />} />
        <Route path="/verificar" element={<p>Pantalla de verificación</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

async function completarBien(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre y apellido'), 'Ana Pérez')
  await user.type(screen.getByLabelText('Email'), 'ana@correo.com')
  await user.type(screen.getByLabelText('Contraseña', { selector: '#password' }), 'Clinica2026!')
  await user.type(screen.getByLabelText('Repetir contraseña'), 'Clinica2026!')
  await user.type(screen.getByLabelText('Alergias'), 'Ninguna')
  await user.type(screen.getByLabelText('Enfermedades crónicas'), 'Ninguna')
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('Register', () => {
  it('con todo vacío muestra TODOS los errores juntos y no llama al servidor', async () => {
    const user = dibujar()

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByText('Escribí tu nombre y apellido.')).toBeInTheDocument()
    expect(screen.getByText('Escribí tu email.')).toBeInTheDocument()
    expect(screen.getByText('Escribí una contraseña.')).toBeInTheDocument()
    expect(screen.getByText('Repetí la contraseña.')).toBeInTheDocument()
    expect(screen.getByText(/Completá las alergias/)).toBeInTheDocument()
    expect(screen.getByText(/Completá las enfermedades crónicas/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('avisa si las contraseñas no coinciden', async () => {
    const user = dibujar()
    await completarBien(user)
    await user.clear(screen.getByLabelText('Repetir contraseña'))
    await user.type(screen.getByLabelText('Repetir contraseña'), 'Otra-clave-99')

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rechaza una contraseña corta y un teléfono con letras', async () => {
    const user = dibujar()
    await completarBien(user)
    await user.clear(screen.getByLabelText('Contraseña', { selector: '#password' }))
    await user.type(screen.getByLabelText('Contraseña', { selector: '#password' }), 'abc12')
    await user.clear(screen.getByLabelText('Repetir contraseña'))
    await user.type(screen.getByLabelText('Repetir contraseña'), 'abc12')
    await user.type(screen.getByLabelText(/Teléfono/), 'llamame')

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByText(/al menos 8 caracteres/)).toBeInTheDocument()
    expect(screen.getByText(/solo puede tener números/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('con datos válidos crea la cuenta y pasa a verificar el email', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(201, { user: { email: 'ana@correo.com' }, message: 'ok', dev_code: '123456' }),
    )
    const user = dibujar()
    await completarBien(user)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Pantalla de verificación')).toBeInTheDocument()
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(cuerpo).toMatchObject({
      nombre: 'Ana Pérez',
      email: 'ana@correo.com',
      ficha_alergias: 'Ninguna',
      ficha_enfermedades_cronicas: 'Ninguna',
    })
  })

  it('pinta el error que devuelve el servidor debajo del campo que corresponde', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(400, { code: 'invalid', errors: { email: ['Ya existe una cuenta con ese email.'] } }),
    )
    const user = dibujar()
    await completarBien(user)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const mensajes = await screen.findAllByText('Ya existe una cuenta con ese email.')
    expect(mensajes.length).toBeGreaterThanOrEqual(1)
  })
})
