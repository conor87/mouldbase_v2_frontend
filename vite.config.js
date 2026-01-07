import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname)

export default defineConfig(({ mode }) => {
  // wczyta .env, .env.development, .env.production itd.
  const env = loadEnv(mode, root, '')

  // np. VITE_API_URL=http://localhost:8000
  //const API_TARGET = env.VITE_API_URL || 'http://localhost:8000'
  const API_TARGET = env.VITE_API_URL || 'http://10.10.77.75:8000'

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
