import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      /* A parte nova da tela (botão, painel e modal de escala) usa os
         componentes do design system, a mesma cópia do portal e do ASK. A
         réplica da tela antiga não: ela é o retrato do que existe hoje. */
      '@ds': path.resolve(import.meta.dirname, '../design_system/src/lib'),
    },
    /* A biblioteca tem node_modules próprio ao lado; sem o dedupe entram
       duas cópias do React e os hooks quebram. */
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '0.0.0.0',
    port: 5183,
    allowedHosts: ['.ts.net'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4183,
    allowedHosts: ['.ts.net'],
  },
})
