import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@docs/App'
import '@docs/index.css'
import { initTheme } from '@/design/theme'

// O tema do produto, com as mesmas regras: escolha explícita manda, `?theme=`
// força, e a primeira pintura já sai certa.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
