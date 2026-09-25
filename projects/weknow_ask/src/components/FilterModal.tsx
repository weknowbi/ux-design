import { useEffect, useMemo, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { Icon } from '@/components/icons'
import { FILTER_TREE, type FilterChip } from '@/data/conversation'

/**
 * "Adicione filtros ao prompt" — espec. do nó 11977:5035.
 *   modal    610 × 563, branco, raio 8
 *   header   64px, px-24 py-16, título Inter Medium 20/1.5 em #334155
 *   busca    38px, borda #ced4da, raio 8, pl-17 pr-13, ícone 24 à direita
 *   árvore   359px de altura; linha de 40px, px-8, gap 8, rótulo 14px #2e343a
 *   rodapé   px-24 py-16, ações à direita
 */

const MODAL = { width: 610, height: 563, radius: 8, headerHeight: 64, treeHeight: 359, padX: 24 }
const ROW_H = 40
/** Recuo do campo: dois blocos vazios de 24 e 12 antes da caixa de seleção. */
const FIELD_INDENT = 24 + 12

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-[3px] transition-colors"
      style={{
        width: 16,
        height: 16,
        border: `1.5px solid ${checked ? COLOR.primary : 'var(--wk-field-border)'}`,
        background: checked ? COLOR.primary : 'var(--wk-surface)',
        color: 'var(--wk-btn-on-primary)',
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

export function FilterModal({
  active,
  onClose,
  onApply,
}: {
  /** Filtros já presentes no prompt, para vir pré-marcados. */
  active: FilterChip[]
  onClose: () => void
  onApply: (chips: FilterChip[]) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({ g1: true })
  const [picked, setPicked] = useState<Set<string>>(() => new Set(active.map((c) => c.id)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const term = search.trim().toLowerCase()
  const groups = useMemo(
    () =>
      FILTER_TREE.map((g) => ({
        ...g,
        fields: g.fields.filter((f) => f.label.toLowerCase().includes(term)),
      })).filter((g) => g.fields.length > 0 || g.label.toLowerCase().includes(term)),
    [term],
  )

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const apply = () => {
    const chips = FILTER_TREE.flatMap((g) => g.fields)
      .filter((f) => picked.has(f.id))
      .map((f) => ({ id: f.id, label: f.label, value: f.value }))
    onApply(chips)
    onClose()
  }

  const rowText: React.CSSProperties = { fontFamily: FONT, fontSize: 14, color: 'var(--wk-text)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--wk-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Adicione filtros ao prompt"
    >
      <div
        className="bg-[var(--wk-surface)] flex flex-col overflow-hidden shadow-2xl"
        style={{ width: MODAL.width, maxWidth: '100%', height: MODAL.height, maxHeight: '90vh', borderRadius: MODAL.radius }}
      >
        {/* Cabeçalho */}
        <div
          className="shrink-0 flex items-center gap-2"
          style={{ height: MODAL.headerHeight, paddingInline: MODAL.padX, paddingBlock: 16 }}
        >
          <h2
            className="flex-1 min-w-0 truncate"
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}
          >
            Adicione filtros ao prompt
          </h2>
          <button
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingInline: MODAL.padX, paddingBottom: 16 }}>
          <div style={{ paddingInline: 12, paddingBlock: 8 }}>
            <div
              className="flex items-center bg-[var(--wk-surface)] focus-within:border-[var(--wk-primary)] transition-colors"
              style={{ height: 38, border: '1px solid var(--wk-field-border)', borderRadius: 8, paddingLeft: 17, paddingRight: 13 }}
            >
              <input
                type="text"
                placeholder="Pesquisar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none"
                style={{ fontFamily: FONT, fontSize: 16, color: COLOR.text }}
              />
              <Icon name="search" size={24} color={COLOR.navLabel} />
            </div>
          </div>

          <div className="overflow-y-auto" style={{ height: MODAL.treeHeight }}>
            {groups.map((g) => {
              const isOpen = open[g.id] ?? false
              return (
                <div key={g.id}>
                  <button
                    onClick={() => setOpen((p) => ({ ...p, [g.id]: !isOpen }))}
                    className="w-full flex items-center gap-2 overflow-hidden transition-colors hover:bg-[var(--wk-surface-subtle)]"
                    style={{ height: ROW_H, paddingInline: 8 }}
                  >
                    <span className="flex items-center shrink-0" style={{ color: COLOR.navLabel }}>
                      <Icon
                        name="keyboard_arrow_down"
                        size={24}
                        className={isOpen ? undefined : 'wk-rot-neg90'}
                      />
                      <Icon name="folder" size={24} />
                    </span>
                    <span style={rowText}>{g.label}</span>
                  </button>

                  {isOpen &&
                    g.fields.map((f) => {
                      const checked = picked.has(f.id)
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggle(f.id)}
                          className="w-full flex items-center gap-2 overflow-hidden transition-colors hover:bg-[var(--wk-surface-subtle)]"
                          style={{ height: ROW_H, paddingInline: 8 }}
                        >
                          <span className="shrink-0" style={{ width: FIELD_INDENT }} />
                          <span className="shrink-0 flex items-center justify-center" style={{ width: 24, height: 24 }}>
                            <Checkbox checked={checked} />
                          </span>
                          <span style={rowText}>{f.label}</span>
                        </button>
                      )
                    })}
                </div>
              )
            })}

            {groups.length === 0 && (
              <p className="px-2 py-4 text-[14px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
                Nenhum campo corresponde a “{search}”.
              </p>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div
          className="shrink-0 flex items-center justify-end gap-2"
          style={{ paddingInline: MODAL.padX, paddingBlock: 16 }}
        >
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn variant="primary" onClick={apply}>
            Adicionar filtro
          </Btn>
        </div>
      </div>
    </div>
  )
}
