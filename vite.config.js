import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DEFAULT_API_BASE } from './src/config/api.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname)

export default defineConfig(({ mode }) => {
  // wczyta .env, .env.development, .env.production itd.
  const env = loadEnv(mode, root, '')

  // np. VITE_API_BASE=http://localhost:8000
  const API_TARGET = env.VITE_API_BASE || env.VITE_API_URL || DEFAULT_API_BASE

  const proxy = {
    // PASUJE DO TWOJEGO KODU: fetch(`${API_BASE}/auth/token`) oraz /auth/{username}
    '/auth': {
      target: API_TARGET,
      changeOrigin: true,
      secure: false,
    },

    // opcjonalnie, jeśli chcesz w apce wołać /api/auth/... zamiast /auth/...
    '/api': {
      target: API_TARGET,
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  }

  return {
    plugins: [
      react({
        babel: { plugins: [['babel-plugin-react-compiler']] },
      }),
      tailwindcss(),
    ],

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy,
    },

    preview: {
      host: true,
      port: 4173,
      strictPort: true,
      proxy,
    },
  }
})
