import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/session': {
        target: 'http://localhost:8000',
        ws: true
      },
      '/transcript': 'http://localhost:8000',
      '/qa': 'http://localhost:8000',
    }
  }
})
