import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR, FONT, RADIUS, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { PAGES } from '@docs/docs/registry'

/**
 * Busca do documento, a pílula do design system (`TOPBAR.search`), só que
 * ocupando a largura da coluna em vez dos 328 fixos da barra do produto.
 *
 * Ela mora no menu, e não numa barra de topo: uma barra inteira de 56px para
 * carregar um campo de busca é moldura demais para o que entrega. Este é o
 * lugar onde documentação costuma pôr a busca, e é o que libera a coluna de
 * conteúdo para começar no alto da janela.
 *
 * Procura em título e resumo, não no corpo. Um índice de texto completo
 * pediria uma etapa de build e um formato próprio; enquanto o documento
 * couber em algumas dezenas de páginas, o resumo resolve, e o `/llms.txt`
 * cobre quem precisa do texto inteiro.
 */
export function DocsSearch({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  const hits = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return PAGES.filter(
      (p) => p.title.toLowerCase().includes(term) || p.summary.toLowerCase().includes(term),
    ).slice(0, 8)
  }, [q])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div ref={root} className="relative">
      <div
        className="flex items-center"
        style={{
          height: TOPBAR.search.height,
          background: TOPBAR.search.background,
          borderRadius: TOPBAR.search.radius,
          paddingLeft: 12,
          paddingRight: TOPBAR.search.padRight,
          gap: TOPBAR.search.gap,
        }}
      >
        <Icon name="search" size={20} color={COLOR.textMuted} className="shrink-0" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar"
          aria-label="Buscar no design system"
          className="flex-1 min-w-0 bg-transparent outline-none"
          style={{ fontFamily: FONT, fontSize: 14, color: COLOR.text }}
        />
      </div>

      {/*
        O painel é mais largo que a coluna e transborda sobre o conteúdo. Numa
        coluna de 255 o resumo caberia em três palavras, e é o resumo que
        distingue duas páginas de nome parecido.
      */}
      {open && hits.length > 0 && (
        <div
          className="absolute left-0 z-30 overflow-hidden"
          style={{
            top: TOPBAR.search.height + 8,
            width: 340,
            background: 'var(--wk-surface)',
            border: `1px solid ${COLOR.border}`,
            borderRadius: RADIUS.md,
            boxShadow: 'var(--wk-shadow-menu)',
            padding: 4,
          }}
        >
          {hits.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onNavigate(p.id)
                setOpen(false)
                setQ('')
              }}
              className="w-full text-left px-3 py-2 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
            >
              <span className="flex items-center gap-2">
                <Icon name={p.icon} size={16} color={COLOR.textIcon} />
                <span className="text-[14px]" style={{ fontFamily: FONT, color: COLOR.text }}>
                  {p.title}
                </span>
              </span>
              <span
                className="block text-[12px] truncate"
                style={{ fontFamily: FONT, color: COLOR.textMuted, paddingLeft: 24 }}
              >
                {p.summary}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
