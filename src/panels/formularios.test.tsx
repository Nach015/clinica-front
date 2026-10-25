/**
 * Validaciones de los formularios de los paneles.
 * La idea de cada prueba: con datos malos se ve el error y NO se llama al
 * servidor; con datos buenos se llama con lo que corresponde.
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { aInputDate } from '../lib/fechas'
import { renderConApp } from '../test/utils'
import PanelAdmin from './PanelAdmin'
import PanelPaciente from './PanelPaciente'
import PanelRecepcion from './PanelRecepcion'

const clinica = vi.hoisted(() => ({
  especialidades: vi.fn(),
  crearEspecialidad: vi.fn(),
  actualizarEspecialidad: vi.fn(),
  medicos: vi.fn(),
  crearMedico: vi.fn(),
  agenda: vi.fn(),
  bloqueos: vi.fn(),
  miFicha: vi.fn(),
  editarFicha: vi.fn(),
  consultas: vi.fn(),
  crearConsulta: vi.fn(),
  responderConsulta: vi.fn(),
  crearTurno: vi.fn(),
  turnos: vi.fn(),
  resumen: vi.fn(),
  cola: vi.fn(),
  usuarios: vi.fn(),
}))

vi.mock('../lib/api', () => ({ clinica }))

beforeEach(() => {
  Object.values(clinica).forEach((f) => f.mockReset())
  clinica.especialidades.mockResolvedValue([])
  clinica.medicos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
  clinica.consultas.mockResolvedValue([])
  clinica.turnos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
  clinica.resumen.mockResolvedValue({ rol: 'admin' })
  clinica.cola.mockResolvedValue([])
  clinica.usuarios.mockResolvedValue([])
})

describe('Admin — nueva especialidad', () => {
  it('rechaza nombre corto y duración que no es múltiplo de 5', async () => {
    const user = userEvent.setup()
    renderConApp(<PanelAdmin seccion="especialidades" />)

    await user.type(await screen.findByLabelText('Nombre'), 'ab')
    await user.clear(screen.getByLabelText('Duración (min)'))
    await user.type(screen.getByLabelText('Duración (min)'), '33')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(screen.getByText(/al menos 3 caracteres/)).toBeInTheDocument()
    expect(screen.getByText(/múltiplo de 5/)).toBeInTheDocument()
    expect(clinica.crearEspecialidad).not.toHaveBeenCalled()
  })

  it('con datos válidos la crea', async () => {
    clinica.crearEspecialidad.mockResolvedValue({})
    const user = userEvent.setup()
    renderConApp(<PanelAdmin seccion="especialidades" />)

    await user.type(await screen.findByLabelText('Nombre'), ' Cardiología ')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    await waitFor(() =>
      expect(clinica.crearEspecialidad).toHaveBeenCalledWith({
        nombre: 'Cardiología',
        descripcion: '',
        duracion_turno_minutos: 30,
      }),
    )
  })
})

describe('Admin — alta de profesional', () => {
  it('valida email, matrícula y especialidad antes de enviar', async () => {
    const user = userEvent.setup()
    renderConApp(<PanelAdmin seccion="profesionales" />)

    await user.type(await screen.findByLabelText('Email de una cuenta existente'), 'no-es-email')
    await user.type(screen.getByLabelText('Matrícula'), 'a#')
    await user.click(screen.getByRole('button', { name: 'Dar de alta' }))

    expect(screen.getByText(/no parece válido/)).toBeInTheDocument()
    expect(screen.getByText(/La matrícula es demasiado corta|solo puede tener/)).toBeInTheDocument()
    expect(screen.getByText('Elegí una especialidad.')).toBeInTheDocument()
    expect(clinica.crearMedico).not.toHaveBeenCalled()
  })
})

describe('Paciente — consulta', () => {
  it('no deja enviar una consulta de menos de 5 caracteres', async () => {
    const user = userEvent.setup()
    renderConApp(<PanelPaciente seccion="consultas" />)

    await user.type(await screen.findByLabelText('Consulta'), 'hola')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(screen.getByText(/al menos 5 caracteres/)).toBeInTheDocument()
    expect(clinica.crearConsulta).not.toHaveBeenCalled()
  })

  it('envía una consulta válida', async () => {
    clinica.crearConsulta.mockResolvedValue({})
    const user = userEvent.setup()
    renderConApp(<PanelPaciente seccion="consultas" />)

    await user.type(await screen.findByLabelText('Consulta'), '¿Atienden los sábados?')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(clinica.crearConsulta).toHaveBeenCalledWith('¿Atienden los sábados?'))
  })
})

describe('Paciente — ficha médica', () => {
  const ficha = {
    id: 1,
    alergias: 'Penicilina',
    enfermedades_cronicas: 'Ninguna',
    medicacion: '',
    observaciones: '',
    verificada: false,
    verificada_por: null,
    verificada_en: null,
    creado: '',
    actualizado: '',
  }

  it('no deja guardar si se borra un campo obligatorio', async () => {
    clinica.miFicha.mockResolvedValue(ficha)
    const user = userEvent.setup()
    renderConApp(<PanelPaciente seccion="ficha" />)

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByLabelText(/Alergias/))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText(/Completá las alergias/)).toBeInTheDocument()
    expect(clinica.editarFicha).not.toHaveBeenCalled()
  })

  it('si el servidor falla al guardar, el usuario ve el error (antes no pasaba nada)', async () => {
    clinica.miFicha.mockResolvedValue(ficha)
    const { ApiError } = await import('../lib/types')
    clinica.editarFicha.mockRejectedValue(new ApiError(500, 'error', 'El servidor tuvo un problema.'))
    const user = userEvent.setup()
    renderConApp(<PanelPaciente seccion="ficha" />)

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('El servidor tuvo un problema.')).toBeInTheDocument()
  })
})

describe('Recepción — asignar turno', () => {
  it('valida paciente y profesional, y no permite una fecha pasada', async () => {
    const user = userEvent.setup()
    renderConApp(<PanelRecepcion seccion="agenda" />)

    const fecha = await screen.findByLabelText('Fecha', { selector: '#turno-fecha' })
    expect(fecha).toHaveAttribute('min', aInputDate())

    await user.click(screen.getByRole('button', { name: 'Agendar turno' }))

    expect(screen.getByText('Elegí un paciente de la lista.')).toBeInTheDocument()
    expect(screen.getByText('Elegí un profesional.')).toBeInTheDocument()
    expect(clinica.crearTurno).not.toHaveBeenCalled()
  })
})
