import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Table, TableChip, type Column, type SortDir } from '@/components/Table'
import { Icon, IconDatabase, IconSearch } from '@/components/icons'
import { DATASET, type MetaField } from '@/data/conversation'

/** Largura da coluna "Tipo". */
const TYPE_COL = 140

/**
 * `name` vem do contexto escolhido na conversa — o chip de metadado leva
 * para cá, então o título precisa ser o mesmo que o chip mostra. Sem
 * contexto, cai no nome do conjunto de exemplo.
 */
export function MetadataTab({ name }: { name?: string }) {
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [docAberta, setDocAberta] = useState(false)
  const [docEstoura, setDocEstoura] = useState(false)
  const docRef = useRef<HTMLParagraphElement>(null)

  /* "Mostrar mais" só aparece se o texto realmente passar de duas linhas.
     Medir é o único jeito honesto: contar caracteres erra assim que a coluna
     muda de largura. Refaz a conta quando a janela é redimensionada. */
  useEffect(() => {
    const medir = () => {
      const el = docRef.current
      if (el) setDocEstoura(el.scrollHeight > el.clientHeight + 1)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase()
    const filtered = DATASET.fields.filter(
      (f) =>
        f.title.toLowerCase().includes(term) ||
        f.name.toLowerCase().includes(term) ||
        f.type.toLowerCase().includes(term),
    )
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const key = sortKey as keyof MetaField
      return String(a[key]).localeCompare(String(b[key]), 'pt-BR') * dir
    })
  }, [filter, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const columns: Column<MetaField>[] = [
    { key: 'title', header: 'Título', sortable: true },
    { key: 'name', header: 'Nome', sortable: true },
    {
      key: 'type',
      header: 'Tipo',
      width: TYPE_COL,
      sortable: true,
      render: (row) => <TableChip>{row.type}</TableChip>,
    },
  ]

  const total = DATASET.fields.length

  const column = { maxWidth: LAYOUT.threadMaxWidth + 80 }

  return (
    /* Uma única região rolável, e ela é a tabela. Identificação e filtro ficam
       parados: são o contexto do que está sendo lido e o controle que muda a
       lista — sair da tela ao rolar é justamente o que não se quer deles. */
    <div className="flex-1 flex flex-col min-h-0 px-6 pt-6">
      <div className="mx-auto w-full shrink-0" style={column}>
        {/* Identificação do conjunto de dados — mesmo título das outras
            telas: Inter Regular 26/36. */}
        <div className="flex items-center gap-3 mb-1">
          <IconDatabase size={24} color={COLOR.navLabel} />
          <h1
            style={{
              fontFamily: FONT,
              fontSize: 26,
              lineHeight: '36px',
              fontWeight: 400,
              color: COLOR.text,
            }}
          >
            {name ?? DATASET.name}
          </h1>
          <TableChip>
            {total} {total === 1 ? 'campo' : 'campos'}
          </TableChip>
        </div>

        {/* Documentação cortada em duas linhas. O corte é por altura, não por
            número de caracteres — assim vale em qualquer largura de tela. */}
        {DATASET.documentation && (
          <div className="mt-2">
            <p
              ref={docRef}
              className="text-[13px]"
              style={{
                fontFamily: FONT,
                color: COLOR.textSecondary,
                lineHeight: 1.6,
                display: docAberta ? undefined : '-webkit-box',
                WebkitLineClamp: docAberta ? undefined : 2,
                WebkitBoxOrient: docAberta ? undefined : 'vertical',
                overflow: docAberta ? undefined : 'hidden',
              }}
            >
              {DATASET.documentation}
            </p>
            {(docEstoura || docAberta) && (
              <button
                onClick={() => setDocAberta((v) => !v)}
                className="mt-1 text-[13px] transition-colors hover:underline"
                style={{ fontFamily: FONT, color: COLOR.primary }}
              >
                {docAberta ? 'Mostrar menos' : 'Mostrar mais'}
              </button>
            )}
          </div>
        )}

        {/* Ocupa a largura da tabela. O respiro é assimétrico — 32 acima e 12
            abaixo — porque o filtro pertence à tabela, não ao título. */}
        <div
          className="flex items-center gap-2 rounded-full px-3 h-[36px] w-full focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-shadow"
          style={{
            background: COLOR.searchPillLight,
            marginTop: 32,
            marginBottom: 12,
          }}
        >
          <IconSearch size={24} color={COLOR.navLabel} />
          <input
            type="text"
            placeholder="Filtrar campos"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[14px] outline-none"
            style={{ fontFamily: FONT, color: COLOR.text }}
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              title="Limpar filtro"
              aria-label="Limpar filtro"
              className="wk-icon-btn shrink-0 flex items-center justify-center"
              style={{ width: 20, height: 20 }}
            >
              <Icon name="close" size={18} color={COLOR.navLabel} />
            </button>
          )}
        </div>
      </div>

      {/* Sem FadeScroll aqui: a máscara do topo apagaria justamente o
          cabeçalho preso. Quem marca a borda superior é ele. */}
      {/* O scroller tem a largura da coluna: a barra encosta na tabela em vez
          de ficar na borda da folha. */}
      <div className="flex-1 min-h-0 overflow-y-auto mx-auto w-full" style={column}>
        <div className="pb-8">
          <Table
            variant="plain"
            stickyHeader
            columns={columns}
            rows={rows}
            rowKey={(row, i) => `${row.name}-${i}`}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            empty={
              <span style={{ fontFamily: FONT, color: COLOR.textMuted }}>
                Nenhum campo corresponde a “{filter}”.
              </span>
            }
          />

          {filter && (
            <p className="mt-3 text-[12px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
              {rows.length} de {total} campos
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
