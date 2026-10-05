import { PortalScreen } from '@/screens/PortalScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { SettingsPageScreen } from '@/screens/SettingsPageScreen'
import { go, useRoute } from '@/lib/router'
import type { PortalRoute } from '@/components/PortalSidebar'

/**
 * Projeto avulso do Portal (WP-832) — nasceu para iterar a navegação de
 * pastas isolado do resto do app. "Weknow Ask" e "SQL AI" continuam no
 * menu lateral (mesma espec. do design), mas não têm tela aqui: são os
 * apps avulsos, fora deste projeto.
 *
 * Configurações tem, e por isso o hash virou rota: as telas de administração
 * são do portal, não de outro aplicativo, e precisam do mesmo menu, da mesma
 * barra e do mesmo caminho na barra de topo.
 */
export default function App() {
  const route = useRoute()

  /** O menu lateral fala em rotas; só duas delas têm tela por aqui. */
  const onRoute = (next: PortalRoute) => {
    if (next === 'configuracoes') go('/configuracoes')
    else if (next === 'portal') go(null)
  }

  if (route.name === 'settings') return <SettingsScreen onRoute={onRoute} />
  if (route.name === 'settings-page') return <SettingsPageScreen pageId={route.page} onRoute={onRoute} />
  return <PortalScreen onRoute={onRoute} />
}
