import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../lib/types'
import { entradaDePrueba, haceMinutos, renderConApp } from '../test/utils'
import { AlertaUrgencias, SeccionUrgencias } from './SeccionUrgencias'

const clinica = vi.hoisted(() => ({
  cola: vi.fn(),
  resumen: vi.fn(),
  especialidades: vi.fn(),
  disponibilidad: vi.fn(),
  agendarDesdeCola: vi.fn(),
  cambiarPrioridad: vi.fn(),
  salirDeCola: vi.fn(),
  registrarUrgencia: vi.fn(),
  buscarPacientes: vi.fn(),
}))

vi.mock('../lib/api', () => ({ clinica }))

beforeEach(() => {
  Object.values(clinica).forEach((f) => f.mockReset())
  clinica.resumen.mockResolvedValue({ rol: 'recepcion', medicos_libres: 3 })
  clinica.especialidades.mockResolvedValue([
    { id: 1, nombre: 'Clínica médica', descripcion: '', activa: true, duracion_turno_minutos: 20, medicos_disponibles: 2 },
  ])
})

const colaMixta = () => [
  entradaDePrueba({ id: 1, paciente: 'Reciente', creado: haceMinutos(2), nota: 'mareos' }),
  entradaDePrueba({ id: 2, paciente: 'Antigua', creado: haceMinutos(25) }),
  entradaDePrueba({ id: 3, paciente: 'Normal', prioridad: 0, creado: haceMinutos(60) }),
]

describe('SeccionUrgencias — lista', () => {
  it('muestra solo las urgentes, la que más espera primero', async () => {
    clinica.cola.mockResolvedValue(colaMixta())
    renderConApp(<SeccionUrgencias />)

    await screen.findByText('Antigua')
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Antigua')
    expect(items[1]).toHaveTextContent('Reciente')
    expect(screen.queryByText('Normal')).not.toBeInTheDocument()
  })

  it('marca la espera crítica con texto (no solo color) y avisa arriba', async () => {
    clinica.cola.mockResolvedValue(colaMixta())
    renderConApp(<SeccionUrgencias />)

    expect(await screen.findByText(/Espera crítica: 25 min/)).toBeInTheDocument()
    expect(screen.getByText(/1 urgencia con espera crítica/)).toBeInTheDocument()
  })

  it('muestra métricas: urgencias, cola normal y profesionales libres', async () => {
    clinica.cola.mockResolvedValue(colaMixta())
    renderConApp(<SeccionUrgencias />)

    await screen.findByText('Antigua')
    expect(screen.getByText('Urgencias esperando').previousSibling).toHaveTextContent('2')
    expect(screen.getByText('En cola normal').previousSibling).toHaveTextContent('1')
    expect(screen.getByText('Profesionales libres').previousSibling).toHaveTextContent('3')
  })

  it('estado vacío cuando no hay urgencias', async () => {
    clinica.cola.mockResolvedValue([entradaDePrueba({ prioridad: 0 })])
    renderConApp(<SeccionUrgencias />)

    expect(await screen.findByText('No hay urgencias esperando')).toBeInTheDocument()
  })

  it('si falla la carga, muestra el error', async () => {
    clinica.cola.mockRejectedValue(new ApiError(0, 'network_error', 'No se pudo conectar con el servidor.'))
    renderConApp(<SeccionUrgencias />)

    expect(await screen.findByText(/No se pudo conectar/)).toBeInTheDocument()
  })
})

describe('SeccionUrgencias — acciones', () => {
  it('"Asignar primer horario" elige el horario libre más cercano y agenda', async () => {
    const futuro1 = new Date(Date.now() + 60 * 60_000).toISOString()
    const futuro2 = new Date(Date.now() + 30 * 60_000).toISOString()
    clinica.cola.mockResolvedValue([entradaDePrueba({ id: 7, paciente: 'Marta', especialidad_id: 4 })])
    clinica.disponibilidad.mockResolvedValue({
      fecha: 'hoy',
      medicos: [{ medico_id: 1, medico: 'Dr. X', especialidad: 'Clínica', duracion_minutos: 20, horarios: [futuro1, futuro2] }],
    })
    clinica.agendarDesdeCola.mockResolvedValue({
      entrada: entradaDePrueba(),
      turno: { medico_nombre: 'Dr. X', inicio: futuro2 },
    })
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.click(await screen.findByRole('button', { name: 'Asignar primer horario' }))

    await waitFor(() => expect(clinica.agendarDesdeCola).toHaveBeenCalledWith(7, futuro2))
    expect(clinica.disponibilidad).toHaveBeenCalledWith(expect.objectContaining({ especialidad: 4 }))
    expect(await screen.findByText(/Turno asignado a Marta con Dr. X/)).toBeInTheDocument()
  })

  it('si no hay horarios hoy ni mañana, lo explica y NO agenda', async () => {
    clinica.cola.mockResolvedValue([entradaDePrueba({ id: 7 })])
    clinica.disponibilidad.mockResolvedValue({ fecha: 'x', medicos: [] })
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.click(await screen.findByRole('button', { name: 'Asignar primer horario' }))

    expect(await screen.findByText(/No hay horarios libres hoy ni mañana/)).toBeInTheDocument()
    expect(clinica.disponibilidad).toHaveBeenCalledTimes(2)
    expect(clinica.agendarDesdeCola).not.toHaveBeenCalled()
  })

  it('si el servidor rechaza el turno, muestra su mensaje', async () => {
    const futuro = new Date(Date.now() + 60 * 60_000).toISOString()
    clinica.cola.mockResolvedValue([entradaDePrueba({ id: 7 })])
    clinica.disponibilidad.mockResolvedValue({
      fecha: 'x',
      medicos: [{ medico_id: 1, medico: 'Dr. X', especialidad: 'C', duracion_minutos: 20, horarios: [futuro] }],
    })
    clinica.agendarDesdeCola.mockRejectedValue(new ApiError(409, 'conflict', 'Ese horario ya fue tomado.'))
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.click(await screen.findByRole('button', { name: 'Asignar primer horario' }))

    expect(await screen.findByText('Ese horario ya fue tomado.')).toBeInTheDocument()
  })

  it('"Bajar a normal" pide confirmación y recién entonces cambia la prioridad', async () => {
    clinica.cola.mockResolvedValue([entradaDePrueba({ id: 5, paciente: 'Luis' })])
    clinica.cambiarPrioridad.mockResolvedValue(entradaDePrueba())
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.click(await screen.findByRole('button', { name: 'Bajar a normal' }))
    expect(clinica.cambiarPrioridad).not.toHaveBeenCalled()

    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveTextContent('Luis')
    await user.click(within(dialogo).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(clinica.cambiarPrioridad).toHaveBeenCalledWith(5, 0))
  })

  it('"Descartar" no hace nada si se aprieta Volver', async () => {
    clinica.cola.mockResolvedValue([entradaDePrueba({ id: 5 })])
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.click(await screen.findByRole('button', { name: 'Descartar' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Volver' }))

    expect(clinica.salirDeCola).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Descartar" confirmado saca la urgencia', async () => {
    clinica.cola.mockResolvedValue([entradaDePrueba({ id: 5 })])
    clinica.salirDeCola.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.click(await screen.findByRole('button', { name: 'Descartar' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(clinica.salirDeCola).toHaveBeenCalledWith(5))
  })
})

describe('SeccionUrgencias — registrar una urgencia', () => {
  it('con el formulario vacío muestra los errores y no llama al servidor', async () => {
    clinica.cola.mockResolvedValue([])
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.click(await screen.findByRole('button', { name: /Registrar urgencia/ }))

    expect(screen.getByText('Elegí un paciente de la lista.')).toBeInTheDocument()
    expect(screen.getByText('Elegí la especialidad.')).toBeInTheDocument()
    expect(screen.getByText(/Completá el motivo de la urgencia/)).toBeInTheDocument()
    expect(clinica.registrarUrgencia).not.toHaveBeenCalled()
  })

  it('exige un motivo de al menos 5 caracteres', async () => {
    clinica.cola.mockResolvedValue([])
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.type(await screen.findByLabelText('Motivo de la urgencia'), 'abc')
    await user.click(screen.getByRole('button', { name: /Registrar urgencia/ }))

    expect(screen.getByText(/al menos 5 caracteres/)).toBeInTheDocument()
  })

  it('flujo completo: busca paciente, completa y registra', async () => {
    clinica.cola.mockResolvedValue([])
    clinica.buscarPacientes.mockResolvedValue([
      { id: 'uuid-9', nombre: 'Julia Díaz', email: 'julia@correo.com', email_verificado: true },
    ])
    clinica.registrarUrgencia.mockResolvedValue(entradaDePrueba())
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.type(await screen.findByPlaceholderText('Nombre o email del paciente'), 'julia')
    await user.click(await screen.findByRole('button', { name: /Julia Díaz/ }, { timeout: 2000 }))
    await user.selectOptions(screen.getByLabelText('Especialidad'), '1')
    await user.type(screen.getByLabelText('Motivo de la urgencia'), '  dolor de pecho intenso  ')
    await user.click(screen.getByRole('button', { name: /Registrar urgencia/ }))

    await waitFor(() =>
      expect(clinica.registrarUrgencia).toHaveBeenCalledWith({
        paciente: 'uuid-9',
        especialidad: 1,
        nota: 'dolor de pecho intenso',
      }),
    )
    expect(await screen.findByText(/Urgencia registrada para Julia Díaz/)).toBeInTheDocument()
  })

  it('muestra el error del servidor si no acepta la urgencia', async () => {
    clinica.cola.mockResolvedValue([])
    clinica.buscarPacientes.mockResolvedValue([
      { id: 'uuid-9', nombre: 'Julia Díaz', email: 'julia@correo.com', email_verificado: true },
    ])
    clinica.registrarUrgencia.mockRejectedValue(new ApiError(403, 'forbidden', 'No tenés permiso para hacer esto.'))
    const user = userEvent.setup()
    renderConApp(<SeccionUrgencias />)

    await user.type(await screen.findByPlaceholderText('Nombre o email del paciente'), 'julia')
    await user.click(await screen.findByRole('button', { name: /Julia Díaz/ }, { timeout: 2000 }))
    await user.selectOptions(screen.getByLabelText('Especialidad'), '1')
    await user.type(screen.getByLabelText('Motivo de la urgencia'), 'fiebre muy alta')
    await user.click(screen.getByRole('button', { name: /Registrar urgencia/ }))

    expect(await screen.findByText('No tenés permiso para hacer esto.')).toBeInTheDocument()
  })
})

describe('AlertaUrgencias', () => {
  it('no muestra nada si no hay urgencias', async () => {
    clinica.cola.mockResolvedValue([entradaDePrueba({ prioridad: 0 })])
    renderConApp(<AlertaUrgencias />)

    await waitFor(() => expect(clinica.cola).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cuenta las urgencias y enlaza a la pestaña', async () => {
    clinica.cola.mockResolvedValue(colaMixta())
    renderConApp(<AlertaUrgencias />)

    expect(await screen.findByText('Hay 2 urgencias esperando atención.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver urgencias' })).toHaveAttribute('href', '/?sec=urgencias')
  })
})
