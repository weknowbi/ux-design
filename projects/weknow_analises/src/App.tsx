import { PortalScreen } from '@/screens/PortalScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { SettingsPageScreen } from '@/screens/SettingsPageScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { BoardScreen } from '@/screens/BoardScreen'
import { NewScreen } from '@/screens/NewScreen'
import { go, useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import type { PortalRoute } from '@/components/PortalSidebar'

/**
 * O portal com a criação de dashboards nova. "Criar dashboard", na home,
 * leva para escolher a fonte (um metadado ou um dashboard que já existe, com
 * os mesmos dados dele) e daí para o editor, onde o dashboard se ajusta por
 * conversa e por clique. Publicado, ele entra na pasta escolhida.
 *
 * Weknow Ask e SQL AI ficam no menu como no produto, mas não têm tela aqui.
 */
export default function App() {
  const route = useRoute()
  const { analyses } = useStore()

  const onRoute = (next: PortalRoute) => {
    if (next === 'configuracoes') go('/configuracoes')
    else if (next === 'portal') go(null)
  }

  if (route.name === 'settings') return <SettingsScreen onRoute={onRoute} />
  if (route.name === 'settings-page') return <SettingsPageScreen pageId={route.page} onRoute={onRoute} />
  if (route.name === 'new') return <NewScreen dashboard={route.dashboard} onRoute={onRoute} />
  if (route.name === 'dashboard') {
    /* O criado aqui abre no editor; o do acervo, na moldura de sempre. */
    if (analyses.some((a) => a.board.id === route.id)) return <BoardScreen id={route.id} onRoute={onRoute} />
    return <DashboardScreen dashboardId={route.id} onRoute={onRoute} />
  }
  return <PortalScreen onRoute={onRoute} />
}
