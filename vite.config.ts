import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// El front habla con el back en /api, y Vite lo reenvía al Django en el 8000.
// Así el navegador ve todo same-origin y no hay ni CORS ni preflight: la cookie
// HttpOnly del refresh viaja sin SameSite=None ni HTTPS, que en desarrollo es un
// quilombo. En producción se saca el proxy y VITE_API_URL apunta al dominio real.
//
// Puerto y destino salen del .env (copiar .env.example) para no tenerlos
// quemados acá. Si VITE_PORT está ocupado Vite prueba el siguiente libre solo.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT || 5173)
  const target = env.VITE_API_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    // Pruebas automáticas (`pnpm test`). jsdom simula un navegador dentro de Node.
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
    },
    server: {
      port,
      strictPort: false,
      proxy: {
        '/api': { target, changeOrigin: true },
        // Para que el chequeo de vida se pueda probar desde el front sin CORS.
        '/health': { target, changeOrigin: true },
      },
    },
  }
})