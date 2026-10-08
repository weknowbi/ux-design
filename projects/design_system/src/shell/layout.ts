import { useCallback, useState } from 'react'
import { LAYOUT } from '@/design/tokens'

/**
 * Medidas da casca do documento que o produto ainda não exporta como token.
 *
 * O portal e o Ask já dividem a mesma barra lateral (`PortalSidebar` +
 * `SidebarBrand`), mas parte do que ela usa mora em `design/sidebar.ts` do
 * produto, fora do alcance do alias `@` desta documentação. Enquanto o design
 * system não virar pacote, os números ficam aqui: **com os mesmos valores**,
 * para não existir uma segunda espec. por descuido.
 */

/** Curva "emphasized" do Material 3: sai rápido e assenta devagar. */
export const SIDEBAR_TRANSITION = '220ms cubic-bezier(0.2, 0, 0, 1)'

/**
 * Margem lateral do menu: 8, não os 16 de `LAYOUT.sidebarPad`.
 *
 * A caixa de destaque do item fica a 8px da borda, como no produto. O token
 * ainda traz 16 na cópia do ASK que este documento consome; quando ele for
 * atualizado, esta constante sai e o token entra.
 */
export const SIDEBAR_PAD = 8

/**
 * Menu recolhido: só a coluna de ícones. 8 de margem + item de 40 + 8, o
 * item vira quadrado e o ícone fica no mesmo x do menu aberto.
 */
export const SIDEBAR_RAIL_WIDTH = 56

/** Botão do menu, no canto superior esquerdo. */
export const BRAND_BTN = 40

/** 28 × 1,29: altura inteira, mesma proporção do logo. */
export const LOGO_H = 36
export const LOGO_W = (91.95 * LOGO_H) / 28

/**
 * Divisória entre as duas colunas do menu: só com o menu aberto.
 *
 * Abertas, as duas listas têm o mesmo fundo e larguras parecidas, e a segunda
 * parecia continuação da primeira. Recolhido, o trilho já se distingue pela
 * forma, e a linha ali só repetiria o que o desenho diz. A regra mora em
 * `index.css`, junto da largura da coluna que ela acompanha.
 */
export const NAV_DIVIDER = 'wk-nav-divider'

/**
 * Menu lateral aberto ou recolhido em trilho de ícones.
 *
 * Mesma chave do produto (`wk-sidebar`) e mesma regra: aberto é o padrão,
 * recolher é escolha de quem usa. Sem armazenamento, a escolha vale só
 * enquanto a aba está aberta.
 */
const KEY = 'wk-sidebar'

function stored(): boolean {
  try {
    return localStorage.getItem(KEY) === 'rail'
  } catch {
    return false
  }
}

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(stored)

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(KEY, next ? 'rail' : 'open')
      } catch {
        /* sem armazenamento, a escolha vale só enquanto a tela está aberta */
      }
      return next
    })
  }, [])

  return { collapsed, toggle }
}
