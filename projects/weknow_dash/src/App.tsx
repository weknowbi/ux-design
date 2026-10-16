import { useEffect } from 'react'
import { EditorScreen } from '@/screens/EditorScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { NewScreen } from '@/screens/NewScreen'
import { ViewScreen } from '@/screens/ViewScreen'
import { go, useRoute } from '@/lib/router'
import type { PortalRoute } from '@/components/PortalSidebar'

/**
 * Weknow Dash — gera dashboards a partir de um metadado (ou arquivo) e deixa
 * ajustar a aparência por conversa, sem deixar quebrar filtro nem total.
 *
 * Como o Ask, mora dentro do portal: mesmo menu, mesma barra. Os outros
 * itens do menu são de outros protótipos e não têm tela aqui.
 */
export default function App() {
  const route = useRoute()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  const onRoute = (next: PortalRoute) => {
    if (next === 'dash') go(null)
  }

  switch (route.name) {
    case 'new':
      return <NewScreen onRoute={onRoute} />
    case 'edit':
      return <EditorScreen key={route.id} id={route.id} onRoute={onRoute} />
    case 'view':
      return <ViewScreen id={route.id} />
    default:
      return <HomeScreen onRoute={onRoute} />
  }
}
