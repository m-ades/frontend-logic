import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    // Default Vite dev server host (localhost). For ad‑hoc device testing,
    // run: npm run dev -- --host
  },
})

