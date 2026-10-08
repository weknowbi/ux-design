import { useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Dropdown, MenuAction, MenuOption } from '@/components/browser/Menu'
import { Icon } from '@/components/icons'
import { Btn } from '@ds/Btn'
import { Example } from '@docs/blocks/Example'

/**
 * O menu de produção, não um desenho dele: o `Dropdown` daqui é o mesmo que
 * abre no card do portal, com a mesma conta de espaço — por isso perto do
 * fim da página ele vira para cima sozinho.
 *
 * Os palcos ganham altura emprestada: solto numa página que rola, o menu
 * sempre acharia espaço embaixo e nunca mostraria a virada.
 */

/** Gatilho de reticências, o mesmo desenho que as linhas de lista usam. */
function Reticencias({ open, toggle }: { open: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ações"
      className="wk-icon-btn flex items-center justify-center"
      style={{ width: 28, height: 28, background: open ? 'var(--wk-icon-hover)' : undefined }}
    >
      <Icon name="more_horiz" size={24} color={COLOR.navLabel} />
    </button>
  )
}

export function DemoMenu() {
  const [visao, setVisao] = useState('grade')
  const [ultima, setUltima] = useState<string>()

  return (
    <>
      <Example
        title="Ações de um item"
        note="O que as reticências de uma linha ou de um cartão abrem: separador antes do destrutivo, e o menu fecha ao escolher. Repare que o Excluir NÃO está em vermelho — o MenuAction ainda não tem a variante, e a página explica por quê."
      >
        <div style={{ paddingBottom: 150 }}>
          <Dropdown trigger={Reticencias} align="left">
            {(close) => (
              <>
                <MenuAction icon="edit" label="Renomear" onSelect={() => { setUltima('Renomear'); close() }} />
                <MenuAction icon="content_copy" label="Duplicar" onSelect={() => { setUltima('Duplicar'); close() }} />
                <MenuAction icon="share" label="Compartilhar" onSelect={() => { setUltima('Compartilhar'); close() }} />
                <div style={{ height: 1, background: COLOR.border, margin: '4px 0' }} />
                <MenuAction icon="delete" label="Excluir" onSelect={() => { setUltima('Excluir'); close() }} />
              </>
            )}
          </Dropdown>
          {ultima && (
            <span className="ml-3 text-[13px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
              escolheu: {ultima}
            </span>
          )}
        </div>
      </Example>

      <Example
        title="Escolha única"
        note="Com uma opção marcada, o check fica à esquerda e o item é role=menuitemradio. É o seletor de visualização do portal."
      >
        <div style={{ paddingBottom: 130 }}>
          <Dropdown
            trigger={({ open, toggle }) => (
              <Btn variant="outlined" size="sm" onClick={toggle} iconRight={<Icon name="keyboard_arrow_down" size={20} className={open ? 'wk-flip' : undefined} />}>
                Visualização
              </Btn>
            )}
            align="left"
          >
            {(close) => (
              <>
                {['Lista', 'Grade', 'Miniaturas'].map((label) => {
                  const id = label.toLowerCase()
                  return (
                    <MenuOption
                      key={id}
                      label={label}
                      checked={visao === id}
                      onSelect={() => { setVisao(id); close() }}
                    />
                  )
                })}
              </>
            )}
          </Dropdown>
        </div>
      </Example>

      <Example
        title="Ele vira quando não cabe"
        note="O mesmo menu com pouco espaço embaixo: abre para cima, sem o componente ser avisado. Role a página até o gatilho ficar perto da base e abra."
      >
        <div className="w-full overflow-y-auto" style={{ height: 180 }}>
          <div className="flex items-end justify-center" style={{ height: 320 }}>
            <Dropdown trigger={Reticencias}>
              {(close) => (
                <>
                  <MenuAction icon="edit" label="Renomear" onSelect={close} />
                  <MenuAction icon="content_copy" label="Duplicar" onSelect={close} />
                  <MenuAction icon="delete" label="Excluir" onSelect={close} />
                </>
              )}
            </Dropdown>
          </div>
        </div>
      </Example>
    </>
  )
}
