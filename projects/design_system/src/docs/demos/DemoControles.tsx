import { useState } from 'react'
import { COLOR, FONT, LAYOUT, RADIUS } from '@/design/tokens'
import { ThemeRow, ThemeSwitch } from '@/components/ThemeSwitch'
import { Btn } from '@ds/Btn'
import { FilterModal } from '@/components/FilterModal'
import { Example, DoDont, DoDontCard } from '@docs/blocks/Example'

/**
 * A chave é a de produção, e ela troca o tema desta página de verdade: clicar
 * aqui muda a documentação inteira, que é exatamente o que ela faz no produto.
 *
 * A caixa de seleção não tem demonstração própria porque ainda não é
 * componente: ela mora dentro do modal de filtros. Em vez de recriá-la aqui —
 * o que faria a página mostrar uma segunda caixa de seleção, justamente o
 * defeito que ela descreve — o palco abre o modal verdadeiro.
 */

export function DemoControles() {
  const [filtros, setFiltros] = useState(false)

  return (
    <>
      <Example
        title="Chave"
        note="Trilho de 36 × 20, botão de 16 com 2 de folga. Os ícones dos lados dizem para que lado é cada estado. Clique: o tema desta página vira junto."
        align="center"
      >
        <ThemeSwitch />
      </Example>

      <Example
        title="Na linha de preferência"
        note="A linha carrega o controle na ponta — e por isso ela não é botão. Botão dentro de botão é HTML inválido."
      >
        <div
          style={{
            width: LAYOUT.sidebarWidth,
            paddingInline: 8,
            paddingBlock: 8,
            background: COLOR.canvas,
            borderRadius: RADIUS.md,
          }}
        >
          <ThemeRow />
        </div>
      </Example>

      <Example
        title="Caixa de seleção"
        note="Não há demonstração solta: a caixa ainda não é componente, ela vive no modal de filtros. Abra para ver a de verdade, 16 × 16, raio 3, marcada na primária."
      >
        <Btn variant="outlined" onClick={() => setFiltros(true)}>
          Abrir filtros
        </Btn>
        {filtros && <FilterModal active={[]} onClose={() => setFiltros(false)} onApply={() => setFiltros(false)} />}
      </Example>

      <DoDont>
        <DoDontCard kind="do" label="Chave quando o efeito é imediato: clicou, a tela mudou.">
          <span className="flex items-center gap-3" style={{ fontFamily: FONT, fontSize: 14, color: COLOR.text }}>
            Tema escuro
            <ThemeSwitch />
          </span>
        </DoDontCard>
        <DoDontCard kind="dont" label="Chave para uma escolha que só vale depois do Aplicar. Isso é caixa de seleção.">
          <span className="flex items-center gap-3" style={{ fontFamily: FONT, fontSize: 14, color: COLOR.text }}>
            Incluir arquivadas
            <ThemeSwitch />
          </span>
        </DoDontCard>
      </DoDont>
    </>
  )
}
