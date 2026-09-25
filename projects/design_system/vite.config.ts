import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * O site de documentação NÃO tem cópia dos componentes.
 *
 * `@` aponta para o código vivo do Weknow ASK, então cada exemplo desta
 * página é o componente de produção sendo renderizado, não um retrato dele.
 * Documentação que copia componente envelhece sozinha; esta quebra junto com
 * o produto, que é o comportamento desejado.
 *
 * `@docs` é o código só da documentação (casca, blocos, registro).
 *
 * Quando o design system virar pacote próprio, inverta: os componentes se
 * mudam para cá, o ASK passa a consumi-los e só o alias muda de lado.
 */
const ASK = path.resolve(import.meta.dirname, '../weknow_ask/src')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@docs': path.resolve(import.meta.dirname, './src'),
      '@': ASK,
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5176,
    allowedHosts: ['.ts.net'],
    // O projeto do ASK vive fora da raiz deste app; sem isso o Vite recusa
    // servir os módulos dele.
    fs: { allow: [path.resolve(import.meta.dirname, '..')] },
  },
  preview: {
    host: '0.0.0.0',
    port: 4176,
    allowedHosts: ['.ts.net'],
  },
})
