import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Custom domain serves this site from /. Dev server is http://localhost:5173/
export default defineConfig({
  base: '/',
  plugins: [react()],
})
