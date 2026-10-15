import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const pagina = (arquivo) => fileURLToPath(new URL(arquivo, import.meta.url));

export default defineConfig(({ command }) => ({
  // Build com caminhos relativos: no workspace publicado o site fica em
  // /ux-design/p/<slug>/, entao nada pode apontar pra raiz do dominio.
  base: command === 'build' ? './' : '/',
  server: {
    port: 5182,
    open: false,
    host: true,
    // O ponto inicial libera qualquer maquina do Tailscale (*.ts.net).
    allowedHosts: ['.ts.net'],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: pagina('./index.html'),
        cases: pagina('./cases.html'),
      },
    },
  },
}));
