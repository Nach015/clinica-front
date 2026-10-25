/**
 * Gestión de urgencias (admin y recepción).
 *
 * Una urgencia es una entrada de la cola de espera con prioridad alta. Esta
 * pantalla la saca de la cola común y la pone a la vista, con lo que recepción
 * necesita en una urgencia: quién es, hace cuánto espera, y tres acciones
 * rápidas (asignar horario, bajar a normal, descartar).
 *
 * Qué hace esta pantalla:
 * 1. Lista las urgencias esperando, la que más espera primero.
 * 2. Marca en rojo las que esperan demasiado (ver `urgencias.ts`).
 * 3. Se actualiza sola cada 30 segundos, porque se deja abierta todo el día.
 * 4. Permite registrar una urgencia nueva para un paciente.
 *
 * Todo lo que "decide" (si algo es urgente, qué nivel de espera tiene, cuál es el
 * primer horario libre) está en `lib/urgencias.ts` como funciones puras. Acá solo
 * se dibuja y se llama a la API.
 */

import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { Siren } from 'lucide-react'

import BuscadorPacientes from '../components/BuscadorPacientes'
import { Aviso, Badge, BotonChico, Campo, Card, Cargando, Metrica, Vacio } from '../components/ui'
import { useToast } from '../context/useToast'
import { clinica } from '../lib/api'
import { ErrorDeFormulario } from '../lib/errores'
import { aInputDate, formatearHora, formatearRelativo } from '../lib/fechas'
import type { EntradaCola, Especialidad, PacienteBusqueda, ResumenPanel } from '../lib/types'
import { useAccion, useCarga } from '../lib/useCarga'
import { useAutoRecarga } from '../lib/useAutoRecarga'
import { useConfirmacion } from '../lib/usePanel'
import {
  PRIORIDAD_NORMAL,
  esUrgente,
  formatearEspera,
  minutosDeEspera,
  nivelEspera,
  ordenarUrgencias,
  primerHorarioLibre,
  type NivelEspera,
} from '../lib/urgencias'
import { hayErrores, soloConError, validarObligatorio, validarTexto } from '../lib/validaciones'

const INTERVALO_ACTUALIZACION_MS = 30_000

const ROTULO_ESPERA: Record<NivelEspera, string> = {
  normal: 'Espera',
  atencion: 'Espera larga',
  critica: 'Espera crítica',
}

const TONO_ESPERA: Record<NivelEspera, 'neutro' | 'info' | 'peligro'> = {
  normal: 'neutro',
  atencion: 'info',
  critica: 'peligro',
}

export function SeccionUrgencias() {
  const toast = useToast()

  const { datos, cargando, error, recargar } = useCarga<EntradaCola[]>(
    () => clinica.cola('esperando'),
    [],
  )
  const { datos: resumen } = useCarga<ResumenPanel>(() => clinica.resumen(), [])

  // Cada 30 s vuelve a pedir la lista; `ahora` hace avanzar los contadores.
  const ahora = useAutoRecarga(() => recargar(), { intervaloMs: INTERVALO_ACTUALIZACION_MS })

  const { dialogo, pedirConfirmacion } = useConfirmacion()

  const urgentes = useMemo(() => ordenarUrgencias((datos ?? []).filter(esUrgente)), [datos])
  const enColaNormal = (datos ?? []).length - urgentes.length

  const espera = urgentes.map((u) => minutosDeEspera(u.creado, ahora))
  const esperaMaxima = espera.length ? Math.max(...espera) : 0
  const criticas = espera.filter((m) => nivelEspera(m) === 'critica').length

  // --- Acciones -----------------------------------------------------------

  /**
   * Busca el primer horario libre de hoy (o, si hoy no queda, de mañana) y se lo
   * agenda. Se mira `/api/disponibilidad` en vez de mandar "ahora mismo" porque
   * los turnos caen en la grilla de la agenda del médico: un turno a las 10:07
   * no existe, y el back lo rechazaría.
   */
  const [atender, atendiendo, errorAtender] = useAccion(async (entrada: EntradaCola) => {
    const desde = new Date()
    const manana = new Date(desde.getTime() + 86_400_000)
    let horario: string | null = null

    for (const dia of [desde, manana]) {
      const disponibilidad = await clinica.disponibilidad({
        fecha: aInputDate(dia),
        especialidad: entrada.especialidad_id,
        medico: entrada.medico_id ?? undefined,
      })
      horario = primerHorarioLibre(disponibilidad, desde)
      if (horario) break
    }

    if (!horario) {
      throw new ErrorDeFormulario(
        'No hay horarios libres hoy ni mañana para esa especialidad. Agendalo a mano desde la sección Cola.',
      )
    }

    const { turno } = await clinica.agendarDesdeCola(entrada.id, horario)
    toast.mostrar(
      'exito',
      `Turno asignado a ${entrada.paciente} con ${turno.medico_nombre} a las ${formatearHora(turno.inicio)}.`,
    )
    await recargar()
  })

  const [bajar, bajando, errorBajar] = useAccion(async (entrada: EntradaCola) => {
    await clinica.cambiarPrioridad(entrada.id, PRIORIDAD_NORMAL)
    toast.mostrar('info', `${entrada.paciente} pasó a la cola normal.`)
    await recargar()
  })

  const [descartar, descartando, errorDescartar] = useAccion(async (entrada: EntradaCola) => {
    await clinica.salirDeCola(entrada.id)
    toast.mostrar('info', `Se descartó la urgencia de ${entrada.paciente}.`)
    await recargar()
  })

  // Cuál fila está buscando horario, para que el texto "Buscando..." aparezca
  // solo en el botón que se apretó y no en todos.
  const [enProceso, setEnProceso] = useState<number | null>(null)
  async function asignar(entrada: EntradaCola) {
    setEnProceso(entrada.id)
    try {
      await atender(entrada)
    } finally {
      setEnProceso(null)
    }
  }

  const ocupado = atendiendo || bajando || descartando
  const errorAccion = errorAtender ?? errorBajar ?? errorDescartar

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metrica
          valor={urgentes.length}
          etiqueta="Urgencias esperando"
          tono={urgentes.length > 0 ? 'alerta' : 'neutro'}
        />
        <Metrica
          valor={urgentes.length ? formatearEspera(esperaMaxima) : '—'}
          etiqueta="Espera más larga"
          tono={nivelEspera(esperaMaxima) === 'critica' && urgentes.length > 0 ? 'alerta' : 'neutro'}
        />
        <Metrica valor={resumen?.medicos_libres ?? '—'} etiqueta="Profesionales libres" tono="acento" />
        <Metrica valor={enColaNormal} etiqueta="En cola normal" />
      </div>

      {criticas > 0 && (
        <Aviso>
          {criticas === 1
            ? 'Hay 1 urgencia con espera crítica: asignale un horario cuanto antes.'
            : `Hay ${criticas} urgencias con espera crítica: asignales un horario cuanto antes.`}
        </Aviso>
      )}
      {error && <Aviso>{error}</Aviso>}
      {errorAccion && <Aviso>{errorAccion}</Aviso>}

      <Card
        titulo="Urgencias en espera"
        descripcion="La que más espera va primero. Se actualiza sola cada 30 segundos."
        acciones={<BotonChico onClick={() => void recargar(true)}>Actualizar</BotonChico>}
      >
        {cargando ? (
          <Cargando filas={3} />
        ) : urgentes.length === 0 ? (
          <Vacio
            titulo="No hay urgencias esperando"
            descripcion="Cuando se registre una urgencia aparece acá, arriba de todo."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {urgentes.map((entrada) => {
              const minutos = minutosDeEspera(entrada.creado, ahora)
              const nivel = nivelEspera(minutos)
              return (
                <li
                  key={entrada.id}
                  className={`rounded-lg border p-3 ${nivel === 'critica' ? 'card-urgente-critica' : 'card-urgente'}`}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{entrada.paciente}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {entrada.especialidad}
                        {entrada.medico ? ` · ${entrada.medico}` : ' · sin profesional asignado'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tono="peligro">Urgente</Badge>
                      <Badge tono={TONO_ESPERA[nivel]}>
                        {ROTULO_ESPERA[nivel]}: {formatearEspera(minutos)}
                      </Badge>
                    </div>
                  </div>

                  {entrada.nota && <p className="mt-1.5 text-sm whitespace-pre-wrap">{entrada.nota}</p>}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Registrada {formatearRelativo(entrada.creado)}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      <BotonChico
                        tono="exito"
                        disabled={ocupado}
                        title="Busca el primer horario libre y agenda el turno"
                        onClick={() => void asignar(entrada)}
                      >
                        {atendiendo && enProceso === entrada.id ? 'Buscando horario...' : 'Asignar primer horario'}
                      </BotonChico>
                      <BotonChico
                        disabled={ocupado}
                        onClick={() =>
                          pedirConfirmacion(
                            `¿Bajar a ${entrada.paciente} a la cola normal? Deja de figurar como urgencia.`,
                            () => void bajar(entrada),
                          )
                        }
                      >
                        Bajar a normal
                      </BotonChico>
                      <BotonChico
                        tono="peligro"
                        disabled={ocupado}
                        onClick={() =>
                          pedirConfirmacion(
                            `¿Descartar la urgencia de ${entrada.paciente}? Queda registrado que estuvo esperando.`,
                            () => void descartar(entrada),
                          )
                        }
                      >
                        Descartar
                      </BotonChico>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <FormRegistrarUrgencia alRegistrar={() => recargar()} />
      {dialogo}
    </>
  )
}

// ---------------------------------------------------------------------------
// Alta de una urgencia
// ---------------------------------------------------------------------------

function FormRegistrarUrgencia({ alRegistrar }: { alRegistrar: () => Promise<void> }) {
  const toast = useToast()

  const [busqueda, setBusqueda] = useState('')
  const [paciente, setPaciente] = useState<PacienteBusqueda | null>(null)
  const [especialidadId, setEspecialidadId] = useState('')
  const [nota, setNota] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})

  const { datos: especialidades } = useCarga<Especialidad[]>(() => clinica.especialidades(), [])

  const [registrar, registrando, errorServidor] = useAccion(
    async (elegido: PacienteBusqueda, especialidad: number, motivo: string) => {
      await clinica.registrarUrgencia({
        paciente: elegido.id,
        especialidad,
        nota: motivo.trim(),
      })
      toast.mostrar('exito', `Urgencia registrada para ${elegido.nombre}. Figura primera en la lista.`)
      setPaciente(null)
      setBusqueda('')
      setEspecialidadId('')
      setNota('')
      await alRegistrar()
    },
  )

  async function enviar(e: FormEvent) {
    e.preventDefault()

    const encontrados = {
      paciente: paciente ? undefined : 'Elegí un paciente de la lista.',
      especialidad: validarObligatorio(especialidadId, 'Elegí la especialidad.'),
      nota: validarTexto(nota, { etiqueta: 'el motivo de la urgencia', min: 5, max: 200 }),
    }
    if (hayErrores(encontrados) || !paciente) {
      setErrores(soloConError(encontrados))
      return
    }

    setErrores({})
    await registrar(paciente, Number(especialidadId), nota)
  }

  return (
    <Card
      titulo="Registrar una urgencia"
      descripcion="Entra a la cola con prioridad alta y aparece primera en la lista de arriba."
    >
      <form onSubmit={enviar} className="flex flex-col gap-3" noValidate>
        <div>
          <label className="field-label" htmlFor="urg-paciente">
            Paciente
          </label>

          {paciente ? (
            <div
              className="flex items-center justify-between rounded-md border px-3 py-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="text-sm font-medium">{paciente.nombre}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {paciente.email}
                </div>
              </div>
              <BotonChico onClick={() => setPaciente(null)}>Cambiar</BotonChico>
            </div>
          ) : (
            <>
              <input
                id="urg-paciente"
                className={`field-input ${errores.paciente ? 'field-input-error' : ''}`}
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setErrores((previos) => ({ ...previos, paciente: '' }))
                }}
                placeholder="Nombre o email del paciente"
                autoComplete="off"
              />
              <BuscadorPacientes texto={busqueda} alElegir={setPaciente} />
            </>
          )}
          {errores.paciente && (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
              {errores.paciente}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
          <Campo id="urg-esp" label="Especialidad" error={errores.especialidad || undefined}>
            <select
              id="urg-esp"
              className={`field-input ${errores.especialidad ? 'field-input-error' : ''}`}
              value={especialidadId}
              onChange={(e) => {
                setEspecialidadId(e.target.value)
                setErrores((previos) => ({ ...previos, especialidad: '' }))
              }}
            >
              <option value="">Elegir...</option>
              {(especialidades ?? [])
                .filter((e) => e.activa)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
            </select>
          </Campo>

          <Campo
            id="urg-nota"
            label="Motivo de la urgencia"
            error={errores.nota || undefined}
            hint={`${nota.trim().length}/200 · Lo ve el profesional que atiende.`}
          >
            <input
              id="urg-nota"
              className={`field-input ${errores.nota ? 'field-input-error' : ''}`}
              value={nota}
              maxLength={200}
              onChange={(e) => {
                setNota(e.target.value)
                setErrores((previos) => ({ ...previos, nota: '' }))
              }}
              placeholder="Ej.: dolor de pecho desde hace 30 minutos"
            />
          </Campo>
        </div>

        {errorServidor && <Aviso>{errorServidor}</Aviso>}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary btn-auto" disabled={registrando}>
            <Siren size={16} aria-hidden="true" />
            {registrando ? 'Registrando...' : 'Registrar urgencia'}
          </button>
        </div>
      </form>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Aviso en el resumen
// ---------------------------------------------------------------------------

/**
 * Franja roja para el resumen de admin y recepción: si hay urgencias esperando,
 * se ve apenas se entra, sin tener que abrir la pestaña. No muestra nada si no
 * hay (o si la carga falla: un aviso que falla en silencio no debe romper el
 * resumen).
 */
export function AlertaUrgencias() {
  const { datos } = useCarga<EntradaCola[]>(() => clinica.cola('esperando'), [])
  const cantidad = (datos ?? []).filter(esUrgente).length

  if (cantidad === 0) return null

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
      style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
    >
      <span className="flex items-center gap-2">
        <Siren size={16} className="shrink-0" aria-hidden="true" />
        {cantidad === 1 ? 'Hay 1 urgencia esperando atención.' : `Hay ${cantidad} urgencias esperando atención.`}
      </span>
      <Link to={{ search: '?sec=urgencias' }} className="font-medium underline">
        Ver urgencias
      </Link>
    </div>
  )
}
