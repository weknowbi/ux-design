import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR, FONT, RADIUS, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { PAGES } from '@docs/docs/registry'

/**
 * Busca do documento: a pílula de `TOPBAR.search`, com as medidas do
 * produto: 36 de altura, raio 200, pl-16 pr-12, gap 8, texto 16/20.
 *
 * Ela mora na barra de topo, no mesmo lugar em que o portal procura painéis e
 * pastas. Quem usa os dois não precisa aprender dois lugares.
 *
 * Procura em título e resumo, não no corpo. Um índice de texto completo
 * pediria uma etapa de build e um formato próprio; enquanto o documento
 * couber em algumas dezenas de páginas, o resumo resolve, e o `/llms.txt`
 * cobre quem precisa do texto inteiro.
 */
export function DocsSearch({
  onNavigate,
  align = 'left',
}: {
  onNavigate: (id: string) => void
  /** Borda em que o painel de resultados se ancora. */
  align?: 'left' | 'right'
}) {
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

  const S = TOPBAR.search

  return (
    <div ref={root} className="relative">
      <div
        className="flex items-center focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-shadow"
        style={{
          height: S.height,
          background: S.background,
          borderRadius: S.radius,
          paddingLeft: S.padLeft,
          paddingRight: S.padRight,
          gap: S.gap,
        }}
      >
        <Icon name="search" size={TOPBAR.iconSize} color={COLOR.navLabel} className="shrink-0" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar no design system"
          aria-label="Buscar no design system"
          className="flex-1 min-w-0 bg-transparent outline-none"
          style={{
            fontFamily: FONT,
            fontSize: S.fontSize,
            lineHeight: `${S.lineHeight}px`,
            color: COLOR.text,
          }}
        />
      </div>

      {/* O painel acompanha a largura da pílula: ali o resumo cabe inteiro, e
          é o resumo que distingue duas páginas de nome parecido. */}
      {open && hits.length > 0 && (
        <div
          className="absolute z-30 overflow-hidden"
          style={{
            top: S.height + 8,
            [align]: 0,
            minWidth: 340,
            background: COLOR.surface,
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
