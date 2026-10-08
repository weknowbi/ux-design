import { Fragment } from 'react'
import { BREADCRUMB, COLOR, FONT, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { DocsSearch } from '@docs/shell/DocsSearch'

/**
 * Barra de topo do documento: a mesma do produto (`Header`): 56 de altura,
 * px-16 py-8, gap 12, sobre o canvas, com o caminho à esquerda e a pílula de
 * busca de 328 à direita.
 *
 * A busca saiu do menu e veio para cá quando a casca passou a ser a do portal.
 * Ela estava no menu porque antes não havia barra nenhuma; agora que há, um
 * segundo lugar para buscar seria inventar um padrão só para esta página.
 *
 * O que a barra do produto tem e esta não: avatar, "…" e expandir. Nada disso
 * tem sentido num documento sem conta nem tela cheia: a barra fica com o par
 * caminho + busca, que é o que ela entrega aqui.
 */

export type Crumb = { label: string; onClick?: () => void }

function Breadcrumb({ trail }: { trail: Crumb[] }) {
  /* A caixa de hover do item clicável tem folga própria, que somaria ao gap
     da espec. A margem negativa devolve exatamente o mesmo tanto. */
  const HOVER_PAD_X = 6

  return (
    <nav className="flex items-center min-w-0" style={{ gap: BREADCRUMB.gap }} aria-label="Caminho">
      {trail.map((crumb, i) => {
        const last = i === trail.length - 1
        const text = (
          <span
            className="truncate"
            style={{
              fontFamily: FONT,
              fontSize: BREADCRUMB.fontSize,
              lineHeight: BREADCRUMB.lineHeight,
              color: BREADCRUMB.color,
              fontWeight: last ? BREADCRUMB.currentWeight : BREADCRUMB.weight,
            }}
          >
            {crumb.label}
          </span>
        )

        return (
          <Fragment key={crumb.label}>
            {i > 0 && (
              <Icon
                name="chevron_right"
                size={BREADCRUMB.iconSize}
                color={BREADCRUMB.iconColor}
                className="shrink-0"
              />
            )}
            {crumb.onClick && !last ? (
              <button
                onClick={crumb.onClick}
                title={`Ir para ${crumb.label}`}
                className="wk-icon-btn flex items-center py-1 min-w-0"
                style={{ paddingInline: HOVER_PAD_X, marginInline: -HOVER_PAD_X }}
              >
                {text}
              </button>
            ) : (
              <span className="flex items-center min-w-0" aria-current={last ? 'page' : undefined}>
                {text}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}

export function DocsTopbar({
  trail,
  onNavigate,
}: {
  trail: Crumb[]
  onNavigate: (id: string) => void
}) {
  return (
    <header
      className="shrink-0 flex items-center"
      style={{
        height: TOPBAR.height,
        gap: TOPBAR.gap,
        paddingInline: TOPBAR.padX,
        paddingBlock: TOPBAR.padY,
        background: COLOR.canvas,
      }}
    >
      <Breadcrumb trail={trail} />

      <div className="flex-1" />

      {/* Abaixo de `md` a pílula sai: 328px numa janela estreita comem o
          caminho inteiro, e o menu continua levando a qualquer página. */}
      <div className="hidden md:block shrink-0" style={{ width: TOPBAR.search.width }}>
        <DocsSearch onNavigate={onNavigate} align="right" />
      </div>
    </header>
  )
}
