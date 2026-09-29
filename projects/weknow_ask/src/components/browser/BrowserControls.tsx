import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { Dropdown, MenuOption } from '@/components/browser/Menu'
import { SORT_LABEL, VIEW_ICON, VIEW_LABEL, VIEW_MODES, type BrowserPrefs, type SortKey } from '@/components/browser/prefs'

/**
 * Controles do cabeçalho "Favoritos" do design: ordem (↑ Padrão) e
 * visualização. Baixa prioridade visual — só texto apagado e ícones, sem
 * caixa até o hover.
 *
 * A visualização era um menu de três opções; com a Lista fora, sobraram duas
 * e ela virou uma chave de um toque (ver abaixo).
 */
export function BrowserControls({
  prefs,
  mobile = false,
}: {
  prefs: BrowserPrefs
  /** Celular: só a ordenação. Lá a visualização é sempre Compacto (ver ContentBrowser). */
  mobile?: boolean
}) {
  const { view, setView, sort, setSort, dir, setDir } = prefs
  /** A outra visualização — a que a chave oferece. */
  const other = VIEW_MODES.find((v) => v !== view) ?? view

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

      {/* Com duas visualizações, o menu virou chave: um toque troca, em vez de
          um toque para abrir a lista e outro para escolher a única alternativa.
          O ícone mostra para onde o botão leva, não onde você está — é o que o
          rótulo diz, e é a leitura certa para um botão que age. */}
      {!mobile && (
        <button
          type="button"
          onClick={() => setView(other)}
          aria-label={`Ver em ${VIEW_LABEL[other]}`}
          title={`Ver em ${VIEW_LABEL[other]}`}
          className="wk-icon-btn flex items-center justify-center h-[28px] w-[28px] ml-1"
        >
          <Icon name={VIEW_ICON[other]} size={20} color={COLOR.navLabel} />
        </button>
      )}
    </div>
  )
}
