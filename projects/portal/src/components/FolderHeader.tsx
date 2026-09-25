import type { ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { useEllipsisTooltip } from '@/components/Tooltip'

/**
 * Cabeçalho da pasta aberta — a linha `.header` do Weknow em produção:
 *
 *   [←] [📁] Nome da pasta ............................ [controles]
 *
 * Dentro de uma pasta o usuário precisa saber onde está e como voltar sem
 * depender do caminho lá na barra de topo, que é pequeno e fica longe do
 * conteúdo. Medidas do app: linha de 32px, 12px entre as partes, seta de
 * 24px e ícone de 28px no cinza de ícone, e 48px de respiro até o conteúdo
 * (32 do bloco + 16).
 *
 * O título usa a mesma letra do cabeçalho recolhido da home (22px/500): as
 * duas coisas são o nome da página, e em 24px o nome da pasta pesava mais que
 * a saudação, como se fosse outro nível.
 */
export function FolderHeader({
  name,
  onBack,
  aside,
}: {
  name: string
  /** Sobe um nível: a pasta de cima, ou a raiz quando já está no primeiro. */
  onBack: () => void
  aside?: ReactNode
}) {
  const tip = useEllipsisTooltip<HTMLHeadingElement>(name)
  return (
    <div className="flex items-center gap-3 mb-4" style={{ height: 32 }} onMouseEnter={tip.show} onMouseLeave={tip.hide}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar um nível"
        title="Voltar"
        className="wk-icon-btn shrink-0 flex items-center justify-center"
        style={{ width: 32, height: 32 }}
      >
        <Icon name="arrow_back" size={24} color={COLOR.navLabel} />
      </button>
      <Icon name="folder" size={28} filled color={COLOR.navLabel} className="shrink-0" />
      <h2
        ref={tip.ref}
        className="flex-1 min-w-0 truncate text-[22px] leading-[30px] font-medium tracking-[-0.3px]"
        style={{ fontFamily: FONT, color: COLOR.text }}
      >
        {name}
      </h2>
      {aside}
      {tip.tooltip}
    </div>
  )
}
