import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Icon, IconWeknowAsk } from '@/components/icons'
import { Example, Specimen, DoDont, DoDontCard } from '@docs/blocks/Example'

const EM_USO = [
  'home', 'search', 'folder', 'create_new_folder', 'add_comment', 'database',
  'settings', 'help', 'logout', 'palette', 'share', 'more_horiz',
  'open_in_full', 'account_circle', 'library_add', 'mic', 'arrow_upward',
  'close', 'auto_awesome', 'content_copy', 'refresh', 'thumb_up', 'table',
  'info', 'chevron_right', 'keyboard_arrow_down', 'check', 'star',
  'dashboard', 'task_alt', 'light_mode', 'dark_mode',
]

const MOSTRA = ['folder', 'star', 'home', 'dashboard']

export function DemoIcones() {
  return (
    <>
      <Example title="Traçado e preenchido" align="center">
        <Specimen label="traçado, padrão">
          <span className="flex items-center gap-4">
            {MOSTRA.map((n) => (
              <Icon key={n} name={n} size={28} color={COLOR.textSecondary} />
            ))}
          </span>
        </Specimen>
        <span style={{ width: 32 }} />
        <Specimen label="preenchido, item ativo">
          <span className="flex items-center gap-4">
            {MOSTRA.map((n) => (
              <Icon key={n} name={n} size={28} filled color={COLOR.primary} />
            ))}
          </span>
        </Specimen>
      </Example>

      <Example title="Tamanhos">
        <Specimen label="20, linha densa">
          <Icon name="folder" size={20} color={COLOR.textSecondary} />
        </Specimen>
        <Specimen label="24, padrão">
          <Icon name="folder" size={24} color={COLOR.textSecondary} />
        </Specimen>
        <Specimen label="44, miniatura vazia">
          <Icon name="folder" size={44} color={COLOR.textSecondary} />
        </Specimen>
      </Example>

      <Example
        title="Em uso no produto"
        note="O último é SVG próprio: marca não se aproxima por símbolo parecido."
      >
        <div className="flex flex-wrap gap-2">
          {EM_USO.map((n) => (
            <div
              key={n}
              title={n}
              className="flex flex-col items-center justify-center gap-1.5"
              style={{
                width: 92,
                paddingBlock: 12,
                borderRadius: RADIUS.md,
                border: `1px solid ${COLOR.border}`,
              }}
            >
              <Icon name={n} size={24} color={COLOR.textSecondary} />
              <span
                className="text-[10.5px] truncate w-full text-center px-1"
                style={{ fontFamily: 'ui-monospace, monospace', color: COLOR.textMuted }}
              >
                {n}
              </span>
            </div>
          ))}
          <div
            title="IconWeknowAsk"
            className="flex flex-col items-center justify-center gap-1.5"
            style={{
              width: 92,
              paddingBlock: 12,
              borderRadius: RADIUS.md,
              border: `1px solid ${COLOR.primary}`,
              color: COLOR.primary,
            }}
          >
            <IconWeknowAsk size={24} />
            <span
              className="text-[10.5px] truncate w-full text-center px-1"
              style={{ fontFamily: 'ui-monospace, monospace', color: COLOR.primary }}
            >
              ask
            </span>
          </div>
        </div>
      </Example>

      <DoDont>
        <DoDontCard kind="do" label="Ícone sozinho com title e aria-label.">
          <button
            title="Compartilhar conversa"
            aria-label="Compartilhar conversa"
            className="wk-icon-btn w-8 h-8 flex items-center justify-center"
            style={{ color: COLOR.navLabel }}
          >
            <Icon name="share" />
          </button>
        </DoDontCard>
        <DoDontCard kind="dont" label="Eixo wght trocado: parece outra biblioteca ao lado dos demais.">
          <div className="flex items-center gap-6">
            <Icon name="share" size={28} weight={200} color={COLOR.textSecondary} />
            <Icon name="share" size={28} weight={600} color={COLOR.danger} />
          </div>
        </DoDontCard>
      </DoDont>
    </>
  )
}
