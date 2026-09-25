import { FONT, TABLE, TABLE_CHIP } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * Tabela única do projeto — a mesma dentro da conversa e nas telas.
 *
 * Espec. em `TABLE` (design/tokens.ts):
 *   th         12px peso 600 em #475569, px-20 py-12, borda inferior
 *   td         13px peso 400 em #363E49, px-20 py-12
 *   linhas     divisória só entre elas — a última não fecha com risco
 *   sem zebra, sem divisórias verticais
 *
 * A primeira coluna sai num tom mais claro: numa lista ela funciona como
 * rótulo da linha, e o olho precisa distinguir rótulo de valor sem uma
 * segunda pista visual.
 *
 * O texto quebra por padrão. Cortar com reticências deixaria as linhas todas
 * iguais, mas esconderia o dado — numa resposta da IA isso é justamente o que
 * a pessoa veio ler. Colunas que precisam ficar em uma linha pedem `nowrap`.
 *
 * Duas variantes, uma regra: **com moldura quando a tabela está dentro de
 * outro conteúdo, solta quando ela é o conteúdo da tela.**
 *
 *   boxed  borda 1px e raio 12 — na conversa, é a caixa que separa a tabela
 *          do parágrafo em volta
 *   plain  sem moldura; as células das pontas perdem a folga externa, de
 *          modo que texto E divisórias comecem na mesma coluna do título.
 *          (Sangrar a tabela para fora alinharia o texto e desalinharia os
 *          riscos — foi o que essa variante fazia antes.)
 */

export type SortDir = 'asc' | 'desc'

export type Column<T> = {
  /** Chave usada para ordenação e como key de render. */
  key: string
  header: string
  /** Largura fixa em px; sem valor, a coluna ocupa o espaço restante. */
  width?: number
  align?: 'left' | 'right'
  sortable?: boolean
  /** Mantém a célula em uma linha, cortando com reticências o que exceder. */
  nowrap?: boolean
  render?: (row: T) => React.ReactNode
}

/** Marcador dentro de célula — tipo de dado, estado, contagem. */
export function TableChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        height: TABLE_CHIP.height,
        paddingInline: TABLE_CHIP.padX,
        background: TABLE_CHIP.background,
        color: TABLE_CHIP.color,
        fontFamily: FONT,
        fontSize: TABLE_CHIP.fontSize,
        fontWeight: TABLE_CHIP.fontWeight,
      }}
    >
      {children}
    </span>
  )
}

const cellBase: React.CSSProperties = {
  fontFamily: FONT,
  paddingInline: TABLE.padX,
  paddingBlock: TABLE.padY,
}

/** Zera a folga externa das colunas das pontas na variante sem moldura. */
function edgePad(boxed: boolean, index: number, total: number): React.CSSProperties {
  if (boxed) return {}
  return {
    paddingLeft: index === 0 ? 0 : TABLE.padX,
    paddingRight: index === total - 1 ? 0 : TABLE.padX,
  }
}

function SortArrow({ dir }: { dir: SortDir }) {
  return <Icon name="arrow_upward" size={14} className={dir === 'desc' ? 'wk-flip' : undefined} />
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir,
  onSort,
  variant = 'boxed',
  stickyHeader,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  sortKey?: string
  sortDir?: SortDir
  onSort?: (key: string) => void
  variant?: 'boxed' | 'plain'
  /** Prende o cabeçalho ao topo do scroller que contém a tabela. */
  stickyHeader?: boolean
  empty?: React.ReactNode
}) {
  const boxed = variant === 'boxed'

  return (
    <div
      className="bg-[var(--wk-surface)]"
      style={
        boxed
          ? { border: `1px solid ${TABLE.border}`, borderRadius: TABLE.radius, overflow: 'hidden' }
          : undefined
      }
    >
      {/* Sem invólucro de overflow: qualquer ancestral com overflow vira o
          contêiner de rolagem do `sticky`, e o cabeçalho passaria a grudar
          numa caixa que não rola. Com `table-layout: fixed` e largura 100%
          a tabela nunca estoura na horizontal, então não faz falta. */}
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: c.width ? `${c.width}px` : 'auto' }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            {columns.map((c, j) => {
              const active = sortKey === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  style={{
                    ...cellBase,
                    ...edgePad(boxed, j, columns.length),
                    fontSize: TABLE.headerSize,
                    fontWeight: TABLE.headerWeight,
                    color: TABLE.headerText,
                    textAlign: c.align ?? 'left',
                    borderBottom: `1px solid ${TABLE.border}`,
                    position: stickyHeader ? 'sticky' : undefined,
                    top: stickyHeader ? 0 : undefined,
                    background: 'var(--wk-surface)',
                    zIndex: stickyHeader ? 1 : undefined,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.sortable && onSort ? (
                    <button
                      onClick={() => onSort(c.key)}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--wk-primary)]"
                      style={{ color: 'inherit', font: 'inherit' }}
                      title={`Ordenar por ${c.header}`}
                    >
                      {c.header}
                      <span style={{ opacity: active ? 1 : 0.25 }}>
                        <SortArrow dir={active ? (sortDir ?? 'asc') : 'asc'} />
                      </span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className="transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = TABLE.rowHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {columns.map((c, j) => (
                <td
                  key={c.key}
                  style={{
                    ...cellBase,
                    ...edgePad(boxed, j, columns.length),
                    fontSize: TABLE.bodySize,
                    fontWeight: TABLE.bodyWeight,
                    color: j === 0 ? TABLE.labelText : TABLE.text,
                    textAlign: c.align ?? 'left',
                    verticalAlign: 'top',
                    borderTop: i === 0 ? 'none' : `1px solid ${TABLE.border}`,
                    overflow: c.nowrap ? 'hidden' : undefined,
                    textOverflow: c.nowrap ? 'ellipsis' : undefined,
                    whiteSpace: c.nowrap ? 'nowrap' : undefined,
                  }}
                >
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}

          {rows.length === 0 && empty && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ ...cellBase, fontSize: TABLE.bodySize, padding: 40, textAlign: 'center' }}
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
