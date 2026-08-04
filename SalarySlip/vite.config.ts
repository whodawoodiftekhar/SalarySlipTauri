import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // the payroll engine the Express API also imports — one implementation
      '@engine': fileURLToPath(new URL('../shared/payroll-engine', import.meta.url)),
    },
  },
  server: {
    fs: {
      // shared/ sits above this project root, so dev must be allowed to serve it
      allow: ['..'],
    },
  },
})
