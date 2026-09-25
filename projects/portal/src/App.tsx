import { PortalScreen } from '@/screens/PortalScreen'

/**
 * Projeto avulso do Portal (WP-832) — nasceu para iterar a navegação de
 * pastas isolado do resto do app. "Weknow Ask" e "SQL AI" continuam no
 * menu lateral (mesma espec. do design), mas não têm tela aqui: são os
 * apps avulsos, fora deste projeto.
 */
export default function App() {
  return <PortalScreen />
}
