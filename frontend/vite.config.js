import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = { target: 'http://127.0.0.1:8000', changeOrigin: false }
const proxy = { '/api': backend, '/uploads': backend }

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
