import { type ReactNode } from 'react'
import { FONT, TABLE, TABLE_CHIP } from '@/design/tokens'
import { useMediaQuery } from '@/design/viewport'

/**
 * Tabela das telas de administração — a espec. `TABLE` de `design/tokens`,
 * que até aqui não tinha consumidor: linha compacta, sem divisória vertical e
 * sem zebra, cabeçalho menor que o corpo porque rótulo de coluna é
 * sinalização, não conteúdo.
 *
 * Por que não a lista do portal (`browser/Items`): lá a linha é um objeto que
 * se abre — pasta, dashboard — e o desenho serve a isso, com o fio quase
 * invisível e nada em volta. Aqui a linha é um REGISTRO, e a tela inteira é a
 * tabela dele. O contorno e o raio de 12 fecham esse bloco contra a folha
 * branca, que é o que diz "isto é uma tabela" antes de qualquer rótulo.
 *
 * As colunas somem por ponto de quebra saindo da GRADE, não com `hidden`:
 * coluna escondida por CSS continua ocupando faixa no `grid-template-columns`
 * e deixa um buraco no meio da linha. Com sete colunas, o buraco somava mais
 * que o conteúdo — por isso a decisão é em JavaScript e a grade é montada com
 * o que sobrou.
 */

export type Column<T> = {
  key: string
  label: string
  /** Faixa da coluna no `grid-template-columns`. */
  width: string
  /**
   * Largura mínima da janela para a coluna existir. Sem isto ela vale sempre.
   * O que some primeiro é o que menos se varre: grupos de contato e validade.
   */
  from?: 'lg' | 'xl' | '2xl'
  align?: 'end'
  cell: (row: T) => ReactNode
}

const HEAD_STYLE = {
  fontFamily: FONT,
  fontSize: TABLE.headerSize,
  fontWeight: TABLE.headerWeight,
  color: TABLE.headerText,
} as const

export const CELL_STYLE = {
  fontFamily: FONT,
  fontSize: TABLE.bodySize,
  fontWeight: TABLE.bodyWeight,
  color: TABLE.text,
} as const

export const MUTED_CELL_STYLE = { ...CELL_STYLE, color: TABLE.labelText } as const

/**
 * Chip de tabela — um só estilo, neutro (espec. `TABLE_CHIP`).
 *
 * Resolve a linha de quatro alturas da tela em produção: lá os papéis vão por
 * extenso e "Visualizador, Desenvolvedor, Administrador, Contato" quebra em
 * quatro linhas, então CADA linha da tabela fica com 100px de altura para
 * caber o caso pior. Aqui aparece o que couber e o resto vira "+2", com a
 * lista inteira no `title`.
 *
 * O corte é por ORÇAMENTO DE CARACTERES, não por um número fixo de chips.
 * Com "mostre dois", ["Visualizador", "Desenvolvedor"] não cabia na coluna e
 * os dois viravam "Visua… Desen…" — dois chips ilegíveis dizem menos que um
 * chip inteiro e um "+3". Com orçamento, os mesmos 22 caracteres rendem dois
 * chips quando os rótulos são curtos ("Visualizador Contato") e um só quando
 * são longos. Quem decide é o conteúdo, que é o que de fato varia aqui — a
 * largura da coluna mal se move entre um cliente e outro.
 */
export function ChipList({
  items,
  budget = 22,
  wrap = false,
}: {
  items: string[]
  budget?: number
  /**
   * Quebra em várias linhas e mostra TODOS os chips. É o modo do celular: ali
   * a linha já é um bloco de altura livre, então o orçamento não tem o que
   * proteger — e esconder papéis atrás de um "+2" que não abre em lugar
   * nenhum seria perder informação de graça.
   */
  wrap?: boolean
}) {
  /* Orçamento fixo, e não um que cresça com a janela: medido, a coluna de
     papéis fica em ~170px em QUALQUER largura — o espaço que a janela ganha
     vai para as colunas que só aparecem acima de 1280 (grupos de contato,
     validade), não para ela. Um orçamento "generoso em tela grande" só
     devolvia os chips cortados que ele tinha vindo resolver. */
  if (!items.length) return <span style={MUTED_CELL_STYLE}>—</span>
  const shown: string[] = []
  let left = budget
  for (const item of items) {
    // O primeiro entra sempre: coluna nenhuma fica vazia por falta de orçamento.
    if (wrap || !shown.length || item.length <= left) {
      shown.push(item)
      left -= item.length
    } else break
  }
  const rest = items.length - shown.length
  return (
    <span
      className={`flex items-center gap-1 min-w-0 ${wrap ? 'flex-wrap' : 'overflow-hidden'}`}
      title={items.join(', ')}
    >
      {shown.map((label) => (
        <Chip key={label} label={label} />
      ))}
      {rest > 0 && <Chip label={`+${rest}`} fixed />}
    </span>
  )
}

/**
 * `fixed` não encolhe. É o contador "+2": o chip de rótulo cede largura e
 * corta com reticências quando a coluna aperta — "Desenvolve…" ainda se lê —,
 * mas o contador não pode ceder nada, porque ele é a única pista de que há
 * mais coisa ali. Antes todos eram `shrink-0` e o excedente era cortado a
 * seco pela célula, no meio da palavra e sem reticência nenhuma.
 */
export function Chip({ label, fixed = false }: { label: string; fixed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md ${
        fixed ? 'shrink-0' : 'min-w-0 max-w-[150px]'
      }`}
      style={{
        height: TABLE_CHIP.height,
        paddingInline: TABLE_CHIP.padX,
        fontFamily: FONT,
        fontSize: TABLE_CHIP.fontSize,
        fontWeight: TABLE_CHIP.fontWeight,
        background: TABLE_CHIP.background,
        color: TABLE_CHIP.color,
      }}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}

/**
 * Ações da linha: aparecem no hover, como no acervo. Sempre visíveis, vinte e
 * seis pares de ícones desenham uma coluna de ruído à direita que compete com
 * o dado — e um deles apaga gente.
 */
export const ROW_ACTIONS =
  'flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity'

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  actions,
  actionsWidth = 76,
  onRowClick,
  card,
  empty = 'Nada por aqui.',
  mobile = false,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string | number
  /** Editar, excluir — reveladas no hover. */
  actions?: (row: T) => ReactNode
  actionsWidth?: number
  onRowClick?: (row: T) => void
  /** Celular: a linha vira bloco, porque sete colunas não cabem em 375px. */
  card?: (row: T) => ReactNode
  empty?: string
  mobile?: boolean
}) {
  const lg = useMediaQuery('(min-width: 1024px)')
  const xl = useMediaQuery('(min-width: 1280px)')
  const xxl = useMediaQuery('(min-width: 1536px)')
  const room = { lg, xl, '2xl': xxl }

  const visible = columns.filter((c) => (c.from ? room[c.from] : true))
  const template = [...visible.map((c) => c.width), ...(actions ? [`${actionsWidth}px`] : [])].join(' ')

  if (mobile && card) {
    return (
      <div
        role="list"
        className="flex flex-col rounded-xl overflow-hidden"
        style={{ border: `1px solid ${TABLE.border}` }}
      >
        {rows.map((row, i) => (
          <div
            key={rowKey(row)}
            role="listitem"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className="group relative flex items-start gap-2 px-4 py-3 active:bg-[var(--wk-list-hover)]"
            style={i > 0 ? { borderTop: `1px solid ${TABLE.border}` } : undefined}
          >
            <div className="flex-1 min-w-0">{card(row)}</div>
            {actions && <div className="flex items-center shrink-0">{actions(row)}</div>}
          </div>
        ))}
        {rows.length === 0 && <Empty label={empty} />}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
    <div className="rounded-xl overflow-hidden min-w-[520px]" style={{ border: `1px solid ${TABLE.border}` }}>
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: template,
          columnGap: 16,
          paddingInline: TABLE.padX,
          height: 40,
          borderBottom: `1px solid ${TABLE.border}`,
        }}
      >
        {visible.map((c) => (
          <span key={c.key} className={`truncate ${c.align === 'end' ? 'text-right' : ''}`} style={HEAD_STYLE}>
            {c.label}
          </span>
        ))}
        {actions && <span />}
      </div>

      <div role="list">
        {rows.map((row, i) => (
          <div
            key={rowKey(row)}
            role="listitem"
            className="group relative grid items-center transition-colors hover:bg-[var(--wk-surface-subtle)]"
            style={{
              gridTemplateColumns: template,
              columnGap: 16,
              paddingInline: TABLE.padX,
              paddingBlock: TABLE.padY,
              minHeight: 52,
              borderTop: i > 0 ? `1px solid var(--wk-row-divider)` : undefined,
            }}
          >
            {onRowClick && (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                tabIndex={-1}
                aria-hidden
                className="absolute inset-0 cursor-pointer outline-none"
              />
            )}
            {visible.map((c) => (
              <div key={c.key} className={`min-w-0 ${c.align === 'end' ? 'flex justify-end' : ''}`}>
                {c.cell(row)}
              </div>
            ))}
            {actions && <div className={ROW_ACTIONS}>{actions(row)}</div>}
          </div>
        ))}
        {rows.length === 0 && <Empty label={empty} />}
      </div>
    </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <p className="px-5 py-8 text-center text-[14px]" style={{ fontFamily: FONT, color: 'var(--wk-text-muted)' }}>
      {label}
    </p>
  )
}
