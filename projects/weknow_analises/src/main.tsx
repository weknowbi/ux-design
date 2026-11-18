import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import { initTheme } from '@/design/theme'

/* O card "Weknow Ask com MCP" do workspace é este mesmo protótipo, aberto
   direto no Weknow Ask (`vite --mode ask`, ver projects/weknow_ask_mcp). */
if (import.meta.env.MODE === 'ask') {
  if (!window.location.hash) window.history.replaceState(null, '', '#/ia')
  document.title = 'Weknow Ask · Weknow'
}

// Antes de montar: a primeira pintura já sai no tema certo.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
