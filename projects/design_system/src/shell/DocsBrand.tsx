import { COLOR, LAYOUT, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { WeknowLogo } from '@/components/WeknowLogo'
import {
  BRAND_BTN,
  LOGO_H,
  LOGO_W,
  SIDEBAR_PAD,
  SIDEBAR_RAIL_WIDTH,
  SIDEBAR_TRANSITION,
} from '@docs/shell/layout'

/**
 * Canto superior esquerdo, com o botão do menu e a marca: o mesmo bloco do portal e
 * do Ask (`SidebarBrand`), com o rótulo do documento no lugar do caminho.
 *
 * Mora na faixa de topo, não no menu lateral. O menu encolhe por baixo e isto
 * não se move: o logo fica sempre inteiro e o botão sempre no mesmo lugar.
 *
 * O bloco tem exatamente a largura do menu embaixo dele: 255 aberto, 56 no
 * trilho, e acompanha a mesma transição. No trilho o logo não cabe nos 56 e
 * transborda para a direita de propósito: ali embaixo está a coluna do grupo,
 * que começa abaixo da faixa, então o logo fica inteiro sem empurrar nada. O
 * caminho não vem atrás dele: tem lugar fixo, sobre a folha (`DocsShell`).
 */
export function DocsBrand({
  collapsed,
  onToggle,
  onLogoClick,
}: {
  collapsed: boolean
  onToggle: () => void
  onLogoClick: () => void
}) {
  const label = collapsed ? 'Expandir menu' : 'Recolher menu'

  return (
    <div
      className="shrink-0 flex items-center"
      style={{
        width: collapsed ? SIDEBAR_RAIL_WIDTH : LAYOUT.sidebarWidth,
        transition: `width ${SIDEBAR_TRANSITION}`,
        height: TOPBAR.height,
        paddingLeft: SIDEBAR_PAD,
      }}
    >
      <button
        onClick={onToggle}
        title={label}
        aria-label={label}
        aria-expanded={!collapsed}
        className="wk-icon-btn shrink-0 flex items-center justify-center"
        style={{ width: BRAND_BTN, height: BRAND_BTN, color: COLOR.navText }}
      >
        <Icon name="menu" size={24} />
      </button>

      <button
        onClick={onLogoClick}
        title="Início do design system"
        className="wk-icon-btn shrink-0 flex items-center"
        style={{ height: BRAND_BTN, paddingInline: LAYOUT.navItemPadX }}
      >
        <WeknowLogo width={LOGO_W} height={LOGO_H} />
      </button>
    </div>
  )
}
