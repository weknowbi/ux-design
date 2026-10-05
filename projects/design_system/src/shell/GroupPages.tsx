import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import type { Group, Status } from '@docs/docs/registry'
import { NAV_DIVIDER, SIDEBAR_PAD } from '@docs/shell/layout'

/**
 * As páginas do grupo aberto — a segunda coluna, ao lado do menu.
 *
 * Ela está **no canvas**, não dentro da folha: as duas listas são o mesmo
 * sistema de navegação, e um fundo diferente para cada uma dizia que eram
 * coisas de naturezas distintas. Com o mesmo tom, a folha branca começa
 * depois das duas, exatamente onde o conteúdo começa no portal.
 *
 * A largura (240, 200 em janela apertada) mora em `index.css`, na classe
 * `wk-group-col`: ela entra na mesma conta que decide o corte do sumário, e
 * manter os dois números no mesmo arquivo evita que um mude sem o outro.
 *
 * O item tem a altura do item da barra (40) para que as linhas das duas
 * colunas se alinhem. O que distingue os níveis é o ícone (20 contra 24) e o
 * corpo do texto (13,5 contra 14) — altura, aqui, é o que os costura.
 *
 * Com o menu aberto, um fio na borda esquerda separa os dois níveis: mesmo
 * fundo, mesma altura de linha e larguras próximas faziam a segunda lista
 * parecer continuação da primeira. Recolhido ele sai — o trilho de ícones já
 * se anuncia pela forma, e a linha seria uma segunda voz dizendo o mesmo.
 */

/** Bolinha de estado. `pronto` não recebe marca, o normal não se anuncia. */
function StatusDot({ status }: { status: Status }) {
  if (status === 'pronto') return null
  return (
    <span
      title={status === 'rascunho' ? 'Rascunho' : 'Pendente'}
      className="shrink-0 rounded-full"
      style={{
        width: 6,
        height: 6,
        background: status === 'rascunho' ? '#f59e0b' : COLOR.textIcon,
      }}
    />
  )
}

export function GroupPages({
  group,
  current,
  onNavigate,
  divided,
}: {
  group: Group
  current: string
  onNavigate: (id: string) => void
  /** Fio na borda esquerda — só com o menu aberto. */
  divided?: boolean
}) {
  /* A coluna aparece mesmo num grupo de uma página só. Escondê-la devolveria
     a largura à folha e faria a folha saltar de lugar ao trocar de grupo: o
     preço de um salto de layout é maior que o de uma lista curta. */
  return (
    <nav
      className={`wk-group-col shrink-0 h-full overflow-y-auto flex flex-col gap-0.5${
        divided ? ` ${NAV_DIVIDER}` : ''
      }`}
      style={{
        background: COLOR.canvas,
        paddingInline: SIDEBAR_PAD,
        paddingTop: 8,
        paddingBottom: 8,
      }}
      aria-label={`Páginas em ${group.label}`}
    >
      {group.pages.map((page) => {
        const on = page.id === current
        return (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            title={page.title}
            aria-current={on ? 'page' : undefined}
            className="w-full shrink-0 text-left flex items-center overflow-hidden transition-colors"
            style={{
              height: LAYOUT.navItemHeight,
              gap: LAYOUT.navItemGap,
              paddingInline: LAYOUT.navItemPadX,
              borderRadius: LAYOUT.navItemRadius,
              background: on ? COLOR.navActive : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!on) e.currentTarget.style.background = COLOR.navHover
            }}
            onMouseLeave={(e) => {
              if (!on) e.currentTarget.style.background = 'transparent'
            }}
          >
            {/* A caixa continua de 24 para o ícone de 20 cair na mesma coluna
                óptica do menu — o glifo é que encolhe, não a coluna. */}
            <span
              className="shrink-0 flex items-center justify-center"
              style={{ width: LAYOUT.navIconSize, height: LAYOUT.navIconSize }}
            >
              <Icon
                name={page.icon}
                size={20}
                filled={on}
                color={on ? COLOR.navActiveText : COLOR.navLabel}
              />
            </span>
            <span
              className="flex-1 min-w-0 wk-fade-r text-[13.5px] leading-[1.4]"
              style={{
                fontFamily: FONT,
                color: on ? COLOR.navActiveText : COLOR.navText,
              }}
            >
              {page.title}
            </span>
            <StatusDot status={page.status} />
          </button>
        )
      })}
    </nav>
  )
}
