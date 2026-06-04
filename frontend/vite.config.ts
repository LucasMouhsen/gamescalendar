import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const base = process.env.BASE_PATH || env.BASE_PATH || "/"

  return {
    base,
    plugins: [react()],
    server: {
      proxy: {
        '/api': 'http://localhost:8787',
      },
    },
  }
})
