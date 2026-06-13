import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the FastAPI backend so CORS isn't an issue in dev
    proxy: {
      '/analyze':    'http://localhost:8000',
      '/broker':     'http://localhost:8000',
      '/demo':       'http://localhost:8000',
      '/health':     'http://localhost:8000',
    },
  },
})
