/*
 * LEARNING NOTE: Vite build and development-server configuration, including the API proxy.
 * Interview tip: explain the user action, state change, API request, and feedback shown on this screen.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
