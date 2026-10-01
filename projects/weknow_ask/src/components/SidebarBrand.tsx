import { COLOR, LAYOUT, TOPBAR } from '@/design/tokens'
import { SIDEBAR_TRANSITION } from '@/design/sidebar'
import { Icon } from '@/components/icons'
import { WeknowLogo } from '@/components/WeknowLogo'
import { useSidebarPad } from '@/components/SidebarPadCompare' // TEMPORÁRIO: comparação 8 × 16

/**
 * Canto superior esquerdo: botão do menu e marca. Comum ao portal e ao Ask.
 *
 * Mora na faixa de topo, não no menu lateral — o padrão do Gmail e do
 * YouTube. O menu encolhe por baixo e isto aqui não se move: o logo fica
 * sempre inteiro e o botão fica sempre no mesmo lugar, colado nele.
 *
 * O ícone do botão cai na coluna dos ícones do menu (8 de margem + 8 de
 * recuo), então no menu recolhido ele encabeça essa coluna.
 *
 * Medido contra o Gmail: a posição já batia (ícone em 24–48, logo em 64);
 * o que destoava era o peso. Lá o símbolo tem a altura do ícone do menu e
 * os dois se leem como uma peça só. Aqui, no tamanho de 28, o logo tinha
 * 12,6px de desenho para 19px de vão até o ícone — o vão pesava mais que a
 * marca, e o logo parecia solto à direita. Em 36 o desenho vai a ~16px e o
 * vão volta a ser menor que a marca. O ícone sobe para o tom de texto do
 * menu: no cinza de ícone, fino ao lado de um logo cheio, ele sumia.
 *
 * Aberto, o bloco tem a largura do menu, e o caminho da barra de topo começa
 * alinhado com a borda da folha. Recolhido, a folha anda para a esquerda e o
 * caminho ficaria parado no meio do nada, sem se alinhar com a marca nem com
 * o conteúdo. Por isso o bloco encolhe até o próprio conteúdo, no mesmo
 * tempo do menu, e o caminho desliza até encostar no logo — marca e local
 * lidos juntos, como o nome do documento ao lado do ícone no Google Docs.
 */

const BTN = 40

/** 28 × 1,29 — altura inteira, mesma proporção do logo. */
const LOGO_H = 36
const LOGO_W = (91.95 * LOGO_H) / 28

/**
 * Recolhido: margem + botão + logo com o recuo dele, sem margem à direita.
 * Com os 16 do cabeçalho, o caminho fica a 24px da ponta do logo.
 */
const collapsedW = (pad: number) => pad + BTN + LOGO_W + 2 * LAYOUT.navItemPadX

export function SidebarBrand({
  collapsed,
  onToggle,
  onLogoClick,
}: {
  collapsed: boolean
  onToggle: () => void
  /** Sem ele o logo é só marca, sem afordância de clique. */
  onLogoClick?: () => void
}) {
  const { pad } = useSidebarPad()
  const label = collapsed ? 'Expandir menu' : 'Recolher menu'
  const logoBox = { height: BTN, paddingInline: LAYOUT.navItemPadX }

  return (
    <div
      className="shrink-0 flex items-center"
      style={{
        width: collapsed ? collapsedW(pad) : LAYOUT.sidebarWidth,
        transition: `width ${SIDEBAR_TRANSITION}`,
        height: TOPBAR.height,
        paddingLeft: pad,
      }}
    >
      <button
        onClick={onToggle}
        title={label}
        aria-label={label}
        aria-expanded={!collapsed}
        className="wk-icon-btn shrink-0 flex items-center justify-center"
        style={{ width: BTN, height: BTN, color: COLOR.navText }}
      >
        <Icon name="menu" size={24} />
      </button>

      {onLogoClick ? (
        <button
          onClick={onLogoClick}
          title="Voltar ao portal"
          className="wk-icon-btn flex items-center"
          style={logoBox}
        >
          <WeknowLogo width={LOGO_W} height={LOGO_H} />
        </button>
      ) : (
        <div className="flex items-center" style={logoBox}>
          <WeknowLogo width={LOGO_W} height={LOGO_H} />
        </div>
      )}
    </div>
  )
}
