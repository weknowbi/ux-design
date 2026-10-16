import { COLOR, FONT, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'

/* Chip e busca da home do Portal (components/Hero.tsx de lá), sem alteração. */

export function FilterChip({
  icon,
  label,
  active,
  onSelect,
  compact = false,
}: {
  icon: string
  label: string
  active?: boolean
  onSelect?: () => void
  /** Versão da barra recolhida: cabe na vaga que era da saudação. */
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      // .home-tab: 36px, respiro 8/16, raio total, gap 8. O hover só vale fora do ativo.
      className={`inline-flex items-center whitespace-nowrap rounded-full transition-colors ${
        compact ? 'px-3 h-[32px] text-[13px]' : 'gap-2 px-4 h-[36px] text-[14px]'
      } ${
        active ? 'bg-[var(--wk-chip-active-bg)]' : 'bg-[var(--wk-chip-bg)] hover:bg-[var(--wk-chip-bg-hover)]'
      }`}
      style={{ fontFamily: FONT, color: active ? 'var(--wk-chip-active-text)' : COLOR.textSecondary }}
    >
      {/* Na barra recolhida o chip vai sem ícone: com ele os três passavam de
          340px e invadiam a busca centralizada em telas de 1280. */}
      {!compact && (
        <Icon name={icon} size={24} color={active ? 'var(--wk-chip-active-text)' : COLOR.textSecondary} />
      )}
      {label}
    </button>
  )
}

/**
 * Busca "pesquisar home" (nó 4454:7055): pílula de 48px, fundo #edf0f3.
 *
 * `compact` é o mesmo campo encolhido, não outro componente: cai para a altura
 * da pílula da barra de topo, e a transição leva o campo de um estado ao outro
 * à vista do usuário, em vez de trocar uma busca por outra. O fundo não muda —
 * trocar a cor faria parecer outro campo.
 *
 * Ícone, letra e recuos são os da busca da barra de topo (`TOPBAR.search`) nos
 * dois estados: recolhida, ela tinha ícone de 20 e letra de 14, e a tela
 * mostrava três buscas de medidas diferentes. Agora só a altura muda.
 */
export function SearchField({
  query,
  onQuery,
  placeholder = 'Pesquise em Pastas',
  compact = false,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder?: string
  compact?: boolean
}) {
  return (
    <div
      className="flex items-center rounded-full w-full focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-[height,box-shadow] duration-[400ms] ease-[cubic-bezier(0.4,0,0,1)]"
      style={{
        height: compact ? TOPBAR.search.height : 48,
        gap: TOPBAR.search.gap,
        paddingLeft: TOPBAR.search.padLeft,
        paddingRight: TOPBAR.search.padRight,
        background: COLOR.searchPillLight,
      }}
    >
      <Icon name="search" size={TOPBAR.iconSize} color={COLOR.navLabel} className="shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onQuery('')}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none"
        style={{
          fontFamily: FONT,
          fontSize: TOPBAR.search.fontSize,
          lineHeight: `${TOPBAR.search.lineHeight}px`,
          color: COLOR.text,
        }}
      />
      {query && (
        <button
          type="button"
          onClick={() => onQuery('')}
          aria-label="Limpar busca"
          title="Limpar busca"
          className="wk-icon-btn shrink-0 flex items-center justify-center"
          style={{ width: 24, height: 24 }}
        >
          <Icon name="close" size={20} color={COLOR.navLabel} />
        </button>
      )}
    </div>
  )
}
