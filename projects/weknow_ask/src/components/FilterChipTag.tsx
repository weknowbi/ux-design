import { FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import type { FilterChip } from '@/data/conversation'

/**
 * Chip de filtro — geometria dos nós 12006:3621 (composer) e 12143:1994
 * (mensagem enviada). Os dois são o mesmo desenho; muda só a ação da direita.
 *
 *   altura 48 = 3 (topo) + 24 (linha 1) + 18 (linha 2) + 3 (base)
 *   recuos   esquerda 8, direita 4
 *   linha 1  rótulo 14/21 em #2e343a + ícone 24×24, com 4 de intervalo
 *   linha 2  valor 14 em #8c98a8, com 18 de altura e alinhado à base
 *
 * `editable` — no prompt: ícone `close`, remove; o corpo abre o editor.
 * `static`   — na mensagem já enviada: ícone `filter_alt`, sem interação.
 */

const BOX: React.CSSProperties = {
  height: 48,
  background: 'var(--wk-hover-strong)',
  borderRadius: 8,
  paddingLeft: 8,
  paddingRight: 4,
  paddingTop: 3,
  paddingBottom: 3,
  fontFamily: FONT,
}

const LABEL: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '21px',
  color: 'var(--wk-text)',
  whiteSpace: 'nowrap',
}

const VALUE: React.CSSProperties = {
  fontSize: 14,
  lineHeight: '18px',
  color: 'var(--wk-nav-label)',
  whiteSpace: 'nowrap',
}

/** Chip somente leitura, usado abaixo da pergunta já enviada. */
export function FilterChipTag({ chip }: { chip: FilterChip }) {
  return (
    <span className="inline-flex flex-col shrink-0" style={BOX}>
      <span className="flex items-center" style={{ height: 24, gap: 4 }}>
        <span style={LABEL}>{chip.label}</span>
        <Icon name="filter_alt" size={24} color="#8c98a8" />
      </span>
      <span className="flex items-end" style={{ height: 18 }}>
        <span style={VALUE}>{chip.value}</span>
      </span>
    </span>
  )
}

/** Chip do prompt: o corpo abre o editor de valor, o ícone remove. */
export function FilterChipEditable({
  chip,
  onRemove,
  onOpen,
}: {
  chip: FilterChip
  onRemove: () => void
  onOpen: () => void
}) {
  return (
    <span className="relative inline-flex flex-col shrink-0" style={BOX}>
      {/* Área clicável do chip inteiro — abre o editor de valor. */}
      <button
        onClick={onOpen}
        title={`Editar filtro ${chip.label}`}
        aria-label={`Editar filtro ${chip.label}`}
        className="absolute inset-0 transition-colors hover:bg-[var(--wk-filter-hover)]"
        style={{ borderRadius: 8 }}
      />
      <span className="relative flex items-center pointer-events-none" style={{ height: 24, gap: 4 }}>
        <span style={LABEL}>{chip.label}</span>
        <button
          onClick={onRemove}
          title={`Remover filtro ${chip.label}`}
          aria-label={`Remover filtro ${chip.label}`}
          className="wk-icon-btn pointer-events-auto shrink-0 flex items-center justify-center"
          style={{ width: 24, height: 24, color: 'var(--wk-nav-label)' }}
        >
          <Icon name="close" size={24} />
        </button>
      </span>
      <span className="relative flex items-end pointer-events-none" style={{ height: 18 }}>
        <span style={VALUE}>{chip.value}</span>
      </span>
    </span>
  )
}
