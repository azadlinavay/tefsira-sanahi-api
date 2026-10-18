import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dashboard is a static app: build it and host dist/ anywhere
// (or run `npm run dev` locally). It talks to the API over CORS.
export default defineConfig({
  plugins: [react()],
  base: './',
})