import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, API calls and audio go to the live server; in production
// the app is served from the same domain as the API, so paths are relative.
const api = process.env.TEFSIRA_API ?? 'https://tefsirasanahi.com'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: api, changeOrigin: true },
      '/storage': { target: api, changeOrigin: true },
    },
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
})