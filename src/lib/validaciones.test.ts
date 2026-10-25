import { describe, expect, it } from 'vitest'

import {
  hayErrores,
  soloConError,
  validarCodigo,
  validarConfirmacion,
  validarDuracion,
  validarEmail,
  validarMatricula,
  validarNoPasado,
  validarNombre,
  validarObligatorio,
  validarPassword,
  validarRangoHorario,
  validarTelefono,
  validarTexto,
} from './validaciones'

describe('validarEmail', () => {
  it.each(['ana@correo.com', ' ana@correo.com ', 'a.b+c@sub.dominio.com.ar'])('acepta %j', (valor) => {
    expect(validarEmail(valor)).toBeUndefined()
  })

  it.each(['', '   ', 'ana', 'ana@', '@correo.com', 'ana@correo', 'ana @correo.com', 'ana@correo.c'])(
    'rechaza %j',
    (valor) => {
      expect(validarEmail(valor)).toBeTypeOf('string')
    },
  )

  it('rechaza un email de más de 254 caracteres', () => {
    expect(validarEmail(`${'a'.repeat(250)}@correo.com`)).toMatch(/largo/)
  })
})

describe('validarNombre', () => {
  it.each(['Ana Pérez', "María O'Brien", 'Jean-Luc', 'Li', 'Ñandú Gómez'])('acepta %j', (valor) => {
    expect(validarNombre(valor)).toBeUndefined()
  })

  it.each(['', '  ', 'A', '123', 'Ana <script>', '-Ana'])('rechaza %j', (valor) => {
    expect(validarNombre(valor)).toBeTypeOf('string')
  })

  it('rechaza más de 100 caracteres', () => {
    expect(validarNombre('a'.repeat(101))).toMatch(/largo/)
  })
})

describe('validarTelefono', () => {
  it('es opcional: vacío es válido', () => {
    expect(validarTelefono('')).toBeUndefined()
    expect(validarTelefono('   ')).toBeUndefined()
  })

  it.each(['11 1234 5678', '+54 9 11 1234-5678', '(0261) 423-4567'])('acepta %j', (valor) => {
    expect(validarTelefono(valor)).toBeUndefined()
  })

  it('rechaza letras', () => {
    expect(validarTelefono('11 abcd 5678')).toMatch(/números/)
  })

  it('rechaza muy pocos o demasiados dígitos', () => {
    expect(validarTelefono('1234567')).toMatch(/entre 8 y 15/)
    expect(validarTelefono('1'.repeat(16))).toMatch(/entre 8 y 15/)
  })
})

describe('validarPassword', () => {
  it('acepta una contraseña razonable', () => {
    expect(validarPassword('Clinica2026!')).toBeUndefined()
    expect(validarPassword('abcdefgh')).toBeUndefined()
  })

  it('exige algo escrito', () => {
    expect(validarPassword('')).toBeTypeOf('string')
  })

  it('exige al menos 8 caracteres', () => {
    expect(validarPassword('abc123')).toMatch(/al menos 8/)
    expect(validarPassword('1234567')).toMatch(/al menos 8/)
  })

  it('rechaza una contraseña solo numérica', () => {
    expect(validarPassword('12345678')).toMatch(/solo números/)
  })

  it('rechaza más de 128 caracteres', () => {
    expect(validarPassword('a'.repeat(129))).toMatch(/larga/)
  })
})

describe('validarConfirmacion', () => {
  it('acepta cuando coinciden', () => {
    expect(validarConfirmacion('secreto123', 'secreto123')).toBeUndefined()
  })

  it('rechaza cuando no coinciden', () => {
    expect(validarConfirmacion('secreto124', 'secreto123')).toMatch(/no coinciden/)
  })

  it('pide repetirla si está vacía', () => {
    expect(validarConfirmacion('', 'secreto123')).toMatch(/Repetí/)
  })
})

describe('validarCodigo', () => {
  it('acepta exactamente 6 dígitos', () => {
    expect(validarCodigo('123456')).toBeUndefined()
  })

  it.each(['', '12345', '1234567', '12345a', '12 456'])('rechaza %j', (valor) => {
    expect(validarCodigo(valor)).toBeTypeOf('string')
  })

  it('respeta un largo distinto', () => {
    expect(validarCodigo('1234', 4)).toBeUndefined()
  })
})

describe('validarTexto / validarObligatorio', () => {
  it('obligatorio por defecto', () => {
    expect(validarTexto('   ', { etiqueta: 'el motivo' })).toBe('Completá el motivo.')
  })

  it('opcional: vacío es válido', () => {
    expect(validarTexto('', { etiqueta: 'el motivo', obligatorio: false })).toBeUndefined()
  })

  it('respeta mínimo y máximo (contando sin espacios en los bordes)', () => {
    const opciones = { etiqueta: 'la consulta', min: 5, max: 10 }
    expect(validarTexto('  hola ', opciones)).toMatch(/al menos 5/)
    expect(validarTexto('hola mundo', opciones)).toBeUndefined()
    expect(validarTexto('hola mundo!!', opciones)).toMatch(/máximo 10/)
  })

  it('validarObligatorio', () => {
    expect(validarObligatorio('', 'Falta')).toBe('Falta')
    expect(validarObligatorio(' x ', 'Falta')).toBeUndefined()
  })
})

describe('validarMatricula', () => {
  it.each(['MP-12345', 'MN 123'.replace(' ', ''), 'A.12/34'])('acepta %j', (valor) => {
    expect(validarMatricula(valor)).toBeUndefined()
  })

  it.each(['', 'ab', 'MP 12345', 'MP#123'])('rechaza %j', (valor) => {
    expect(validarMatricula(valor)).toBeTypeOf('string')
  })
})

describe('validarDuracion', () => {
  it.each(['10', '30', '45', '240'])('acepta %j', (valor) => {
    expect(validarDuracion(valor)).toBeUndefined()
  })

  it.each([
    ['', /Escribí/],
    ['abc', /entero/],
    ['12.5', /entero/],
    ['5', /entre 10 y 240/],
    ['300', /entre 10 y 240/],
    ['33', /múltiplo de 5/],
  ])('rechaza %j', (valor, mensaje) => {
    expect(validarDuracion(valor as string)).toMatch(mensaje as RegExp)
  })
})

describe('validarRangoHorario', () => {
  it('acepta fin posterior al inicio', () => {
    expect(validarRangoHorario('09:00', '13:00')).toBeUndefined()
  })

  it('rechaza fin igual o anterior', () => {
    expect(validarRangoHorario('09:00', '09:00')).toMatch(/posterior/)
    expect(validarRangoHorario('13:00', '09:00')).toMatch(/posterior/)
  })

  it('rechaza horas vacías', () => {
    expect(validarRangoHorario('', '10:00')).toBeTypeOf('string')
  })
})

describe('validarNoPasado', () => {
  const ahora = new Date('2026-06-15T10:00:00')

  it('acepta el futuro', () => {
    expect(validarNoPasado('2026-06-15', '10:30', ahora)).toBeUndefined()
    expect(validarNoPasado('2026-06-16', '08:00', ahora)).toBeUndefined()
  })

  it('tolera hasta un minuto hacia atrás', () => {
    expect(validarNoPasado('2026-06-15', '09:59', ahora)).toBeUndefined()
  })

  it('rechaza el pasado', () => {
    expect(validarNoPasado('2026-06-15', '09:00', ahora)).toMatch(/ya pasó/)
    expect(validarNoPasado('2026-06-14', '23:00', ahora)).toMatch(/ya pasó/)
  })

  it('rechaza fecha vacía o inválida', () => {
    expect(validarNoPasado('', '10:00', ahora)).toMatch(/Elegí una fecha/)
    expect(validarNoPasado('no-es-fecha', '10:00', ahora)).toMatch(/no es válida/)
  })
})

describe('hayErrores / soloConError', () => {
  it('detecta si algún campo tiene error', () => {
    expect(hayErrores({ a: undefined, b: undefined })).toBe(false)
    expect(hayErrores({ a: undefined, b: 'mal' })).toBe(true)
    expect(hayErrores({ a: '' })).toBe(false)
  })

  it('deja solo los campos con error', () => {
    expect(soloConError({ a: undefined, b: 'mal', c: '' })).toEqual({ b: 'mal' })
  })
})
