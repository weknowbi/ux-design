import { useState } from 'react'
import { AskScreen } from '@/screens/AskScreen'
import { PortalScreen } from '@/screens/PortalScreen'
import type { PortalRoute } from '@/components/PortalSidebar'

/**
 * O Ask abre a partir do portal. O portal existe aqui só para situar esse
 * caminho, o único destino navegável é "Weknow Ask".
 *
 * Com `?embed` na URL o app entra direto no Ask e não oferece volta para o
 * portal. É como ele roda embutido no portfólio, onde o contexto já veio do
 * texto em volta e passar pelo portal só atrasaria quem quer ver a ferramenta.
 * Sem o parâmetro nada muda: o app avulso continua abrindo no portal.
 */
const embedded = new URLSearchParams(window.location.search).has('embed')

export default function App() {
  const [route, setRoute] = useState<PortalRoute>('portal')

  // Sem onNavigate, as duas saídas para o portal somem sozinhas.
  if (embedded) return <AskScreen />

  return route === 'ask' ? (
    <AskScreen onNavigate={setRoute} />
  ) : (
    <PortalScreen onNavigate={setRoute} />
  )
}
