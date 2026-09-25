import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT, RADIUS, SHADOW } from '@/design/tokens'
import { IconArrowUp, IconAttach, IconMic } from '@/components/icons'
import { FilterChipEditable } from '@/components/FilterChipTag'
import { FilterModal } from '@/components/FilterModal'
import { FilterValueModal } from '@/components/FilterValueModal'
import { ModelPicker } from '@/components/ModelPicker'
import type { FilterChip } from '@/data/conversation'

export function Composer({
  chips,
  onRemoveChip,
  onAddFilters,
  onUpdateChip,
  onSend,
  provider,
  onProviderChange,
  disabled,
  inline,
}: {
  chips: FilterChip[]
  onRemoveChip: (id: string) => void
  onAddFilters: (chips: FilterChip[]) => void
  onUpdateChip: (id: string, value: string) => void
  onSend: (text: string) => void
  /** Modelo de IA da conversa — visível e trocável sem sair do prompt. */
  provider: string
  onProviderChange: (id: string) => void
  disabled: boolean
  /** Dentro do bloco de saudação — sem o recuo de rodapé. */
  inline?: boolean
}) {
  const [value, setValue] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [editing, setEditing] = useState<FilterChip | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow do textarea, limitado a ~6 linhas.
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [value])

  const canSend = value.trim().length > 0 && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  const addFilterBtn = (
    <button
      onClick={() => setFiltersOpen(true)}
      title="Adicionar filtros ao prompt"
      aria-label="Adicionar filtros ao prompt"
      className="wk-icon-btn shrink-0 flex items-center justify-center"
      style={{ width: 24, height: 24, color: COLOR.navLabel }}
    >
      <IconAttach size={24} />
    </button>
  )

  const micBtn = (
    <button
      title="Ditar pergunta"
      aria-label="Ditar pergunta"
      className="wk-icon-btn shrink-0 flex items-center justify-center"
      style={{ width: 24, height: 24, color: COLOR.navLabel }}
    >
      <IconMic size={24} />
    </button>
  )

  const sendBtn = (
    <button
      onClick={submit}
      disabled={!canSend}
      title="Enviar"
      aria-label="Enviar"
      className="shrink-0 flex items-center justify-center rounded-full transition-colors"
      style={{
        width: 30,
        height: 30,
        background: COLOR.hoverStrong,
        color: canSend ? COLOR.textSecondary : COLOR.textIcon,
        cursor: canSend ? 'pointer' : 'not-allowed',
      }}
    >
      <IconArrowUp size={18} />
    </button>
  )

  const field = (
    <textarea
      ref={areaRef}
      rows={1}
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          submit()
        }
      }}
      placeholder="Pergunte ao Weknow Ask"
      className="block w-full resize-none bg-transparent outline-none wk-ph-prompt"
      style={{ fontFamily: FONT, fontSize: 16, lineHeight: '20px', color: COLOR.text }}
    />
  )

  return (
    <div
      className="shrink-0 px-6"
      style={{
        background: COLOR.surface,
        paddingTop: inline ? 0 : 8,
        paddingBottom: inline ? 0 : 24,
      }}
    >
      <div className="mx-auto" style={{ maxWidth: LAYOUT.threadMaxWidth + 80 }}>
        {/* Caixa única, em duas linhas — texto em cima, ações embaixo. Fica
            assim mesmo sem filtro: o modelo de IA precisa estar sempre à
            vista, e a caixa mudar de forma a cada filtro adicionado fazia o
            prompt "pular" no meio da escrita. */}
        <div
          className="bg-[var(--wk-surface)] transition-[border-color,box-shadow]"
          style={{
            borderRadius: RADIUS.composer,
            border: `1px solid ${COLOR.border}`,
            boxShadow: SHADOW.composer,
          }}
        >
          <div className="px-5 pt-4 pb-1">{field}</div>

          <div className="flex items-end gap-4 px-3 pb-3 pt-1">
            {addFilterBtn}
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {chips.map((chip) => (
                <FilterChipEditable
                  key={chip.id}
                  chip={chip}
                  onRemove={() => onRemoveChip(chip.id)}
                  onOpen={() => setEditing(chip)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ModelPicker value={provider} onChange={onProviderChange} />
              {micBtn}
              {sendBtn}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <FilterValueModal
          chip={editing}
          onClose={() => setEditing(null)}
          onApply={(value) => onUpdateChip(editing.id, value)}
        />
      )}

      {filtersOpen && (
        <FilterModal
          active={chips}
          onClose={() => setFiltersOpen(false)}
          onApply={onAddFilters}
        />
      )}
    </div>
  )
}
