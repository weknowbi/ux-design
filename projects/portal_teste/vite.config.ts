import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  /* Armazenamento próprio no navegador (ver storageKey em @ds/prefs): no
     GitHub Pages este portal divide o endereço com o portal principal, e sem
     o prefixo as edições de pasta e a visão escolhida de um apareceriam no
     outro. Fica aqui, e não num .env, porque o .gitignore da raiz ignora .env. */
  define: {
    'import.meta.env.VITE_WK_STORAGE_PREFIX': JSON.stringify('teste:'),
  },
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
    port: 5179,
    allowedHosts: ['.ts.net'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4179,
    allowedHosts: ['.ts.net'],
  },
})
