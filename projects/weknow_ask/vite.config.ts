import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    /* `@ds` é a biblioteca do design system, a única cópia dos componentes
       compartilhados. Mora em design_system/src/lib porque é de lá que o site
       de documentação renderiza as peças vivas. */
      '@ds': path.resolve(import.meta.dirname, '../design_system/src/lib'),
    },
    /* A biblioteca mora fora desta raiz e tem node_modules próprio ao lado.
       Sem o dedupe, o build empacota duas cópias do React na mesma página e
       os hooks quebram com "Cannot read properties of null". */
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    // Libera o host do Tailscale (`tailscale funnel`/`serve`). O ponto
    // inicial casa qualquer subdomínio de ts.net, então continua valendo se
    // a máquina ou o tailnet mudarem de nome.
    //
    // Não troque por `true`: o Vite recusa hosts desconhecidos justamente
    // para impedir DNS rebinding — um site qualquer apontar um domínio dele
    // para 127.0.0.1 e ler o seu dev server.
    allowedHosts: ['.ts.net'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4174,
    allowedHosts: ['.ts.net'],
  },
})
