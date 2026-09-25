import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { Dropdown, MenuOption } from '@/components/browser/Menu'
import { SORT_LABEL, VIEW_ICON, VIEW_LABEL, VIEW_MODES, type BrowserPrefs, type SortKey } from '@/components/browser/prefs'

/**
 * Controles do cabeçalho "Favoritos" do design (↑ Padrão · ícone de
 * visualização ▾). Baixa prioridade visual: só texto apagado e ícones, sem
 * caixa até o hover.
 */
export function BrowserControls({ prefs }: { prefs: BrowserPrefs }) {
  const { view, setView, sort, setSort, dir, setDir } = prefs

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}
        aria-label={dir === 'asc' ? 'Ordem crescente — inverter' : 'Ordem decrescente — inverter'}
        title={dir === 'asc' ? 'Crescente' : 'Decrescente'}
        className="wk-icon-btn flex items-center justify-center"
        style={{ width: 28, height: 28 }}
      >
        <Icon name="arrow_upward" size={20} color={COLOR.navLabel} className={dir === 'desc' ? 'wk-flip' : ''} />
      </button>

      <Dropdown
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            title="Ordenar por"
            className="wk-icon-btn flex items-center h-[28px] px-1.5"
            style={{ background: open ? 'var(--wk-icon-hover)' : undefined }}
          >
            <span className="text-[14px] leading-[20px]" style={{ fontFamily: FONT, color: 'var(--wk-control-label)' }}>
              {SORT_LABEL[sort]}
            </span>
          </button>
        )}
      >
        {(close) =>
          (['default', 'name', 'updated'] as SortKey[]).map((k) => (
            <MenuOption
              key={k}
              checked={sort === k}
              label={SORT_LABEL[k]}
              onSelect={() => {
                setSort(k)
                setDir(k === 'updated' ? 'desc' : 'asc')
                close()
              }}
            />
          ))
        }
      </Dropdown>

      <Dropdown
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Visualização: ${VIEW_LABEL[view]}`}
            title="Visualização"
            className="wk-icon-btn flex items-center h-[28px] pl-1 pr-0.5 ml-1"
            style={{ background: open ? 'var(--wk-icon-hover)' : undefined }}
          >
            <Icon name={VIEW_ICON[view]} size={20} color={COLOR.navLabel} />
            <Icon name="keyboard_arrow_down" size={20} color={COLOR.navLabel} />
          </button>
        )}
      >
        {(close) =>
          VIEW_MODES.map((v) => (
            <MenuOption
              key={v}
              checked={view === v}
              label={VIEW_LABEL[v]}
              onSelect={() => {
                setView(v)
                close()
              }}
            />
          ))
        }
      </Dropdown>
    </div>
  )
}
