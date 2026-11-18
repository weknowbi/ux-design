import { PortalScreen } from '@/screens/PortalScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { SettingsPageScreen } from '@/screens/SettingsPageScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { BoardScreen } from '@/screens/BoardScreen'
import { NewScreen } from '@/screens/NewScreen'
import { IaScreen } from '@/screens/IaScreen'
import { InsightScreen } from '@/screens/InsightScreen'
import { DemoPrompts } from '@/components/DemoPrompts'
import { go, useRoute } from '@/lib/router'
import { useStore } from '@/lib/store'
import type { PortalRoute } from '@/components/PortalSidebar'

/**
 * O portal com a criação de dashboards nova. "Criar dashboard", na home,
 * leva para escolher a fonte (um metadado ou um dashboard que já existe, com
 * os mesmos dados dele) e daí para o editor, onde o dashboard se ajusta por
 * conversa e por clique. Publicado, ele entra na pasta escolhida.
 *
 * O Weknow Ask é a IA do Weknow (`#/ia`): pergunta, analisa um momento de
 * dashboard e faz. O SQL AI fica no menu como no produto, sem tela aqui.
 */
export default function App() {
  const route = useRoute()
  const { analyses } = useStore()

  const onRoute = (next: PortalRoute) => {
    if (next === 'configuracoes') go('/configuracoes')
    else if (next === 'portal') go(null)
    else if (next === 'ia') go('/ia')
  }

  return (
    <>
      {screen()}
      <DemoPrompts />
    </>
  )

  function screen() {
    if (route.name === 'ia') return <IaScreen id={route.id} onRoute={onRoute} />
    if (route.name === 'settings') return <SettingsScreen onRoute={onRoute} />
    if (route.name === 'settings-page') return <SettingsPageScreen pageId={route.page} onRoute={onRoute} />
    if (route.name === 'new') return <NewScreen dashboard={route.dashboard} onRoute={onRoute} />
    if (route.name === 'dashboard') {
      /* O criado aqui abre no editor; o do acervo, na moldura de sempre. */
      if (analyses.some((a) => a.board.id === route.id)) return <BoardScreen id={route.id} onRoute={onRoute} />
      return <DashboardScreen dashboardId={route.id} tab={route.tab} onRoute={onRoute} />
    }
    if (route.name === 'insight') return <InsightScreen id={route.id} onRoute={onRoute} />

    return <PortalScreen onRoute={onRoute} />
  }
}
