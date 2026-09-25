import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import './index.css'

/*
 * O `initTheme()` do design system sai daqui por ora — ele seguiria o
 * `prefers-color-scheme` e abriria a tela no escuro em quem usa o Windows
 * assim. Sem ele, nada escreve `data-theme` e a tela é sempre clara.
 */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
