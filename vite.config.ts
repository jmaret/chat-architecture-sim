import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages project site. Dev server is http://localhost:5173/chat-architecture-sim/
export default defineConfig({
  base: '/chat-architecture-sim/',
  plugins: [react()],
})
