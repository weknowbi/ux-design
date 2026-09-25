import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import type { Group, Status } from '@docs/docs/registry'

/**
 * As páginas do grupo aberto, a segunda lista, encostada na borda da folha.
 *
 * Ela é conteúdo da tela, não navegação lateral: é o que permite a barra
 * esquerda ficar com um nível só, como a espec. de layout do produto pede.
 *
 * O item é menor que o da barra (36 contra 40) de propósito. Os dois níveis
 * precisam se distinguir em algum eixo, e altura é o mais barato: cor e peso
 * já estão ocupados marcando o item atual.
 */

export const GROUP_LIST_WIDTH = 192

const ITEM_HEIGHT = 36

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
}: {
  group: Group
  current: string
  onNavigate: (id: string) => void
}) {
  /* A lista aparece mesmo num grupo de uma página só. Escondê-la devolveria a
     coluna ao texto e faria o artigo saltar para a esquerda ao trocar de
     grupo, o preço de um salto de layout é maior que o de uma lista curta. */

  /*
    Devolve o <nav> preso, sem caixa em volta e sem rótulo em cima.

    Sem caixa porque o elemento `sticky` corre dentro do bloco do PAI, e o pai
    precisa ser mais alto que ele, quem tem a altura da linha é o item flex do
    conteúdo, que também dá a largura. Um `<div>` intermediário aqui teria
    altura de conteúdo, o preso não teria para onde ir e o `sticky` viraria
    enfeite: foi o que aconteceu nas duas primeiras tentativas.

    Sem rótulo porque o menu já marca o grupo ativo, um "COMPONENTES" repetido
    a poucos pixels do item destacado é a mesma informação duas vezes. Sem ele,
    a lista começa na altura do título da página.
  */
  return (
    <nav className="sticky" style={{ top: 32 }} aria-label={`Páginas em ${group.label}`}>
      <div className="flex flex-col gap-0.5">
        {group.pages.map((page) => {
          const on = page.id === current
          return (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              title={page.title}
              aria-current={on ? 'page' : undefined}
              className="w-full text-left flex items-center overflow-hidden transition-colors"
              style={{
                height: ITEM_HEIGHT,
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
              <span
                className="shrink-0 flex items-center justify-center"
                style={{ width: 20, height: 20 }}
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
      </div>
      </nav>
  )
}
