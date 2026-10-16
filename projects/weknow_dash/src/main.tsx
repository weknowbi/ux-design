import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import { initTheme } from '@/design/theme'
import { seedIfEmpty } from '@/lib/store'

// Antes de montar: a primeira pintura já sai no tema certo.
initTheme()
// Primeiro acesso: um dashboard de exemplo na lista.
seedIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
