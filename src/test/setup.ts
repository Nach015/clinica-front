/**
 * Preparación común de todas las pruebas.
 *
 * - Agrega los "matchers" de DOM (`toBeInTheDocument`, `toBeDisabled`...).
 * - Después de cada prueba desmonta lo que se dibujó y limpia el localStorage,
 *   para que una prueba no ensucie a la siguiente.
 */

import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
