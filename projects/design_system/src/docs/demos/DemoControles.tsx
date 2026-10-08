import { useState } from 'react'
import { COLOR, FONT, LAYOUT, RADIUS } from '@/design/tokens'
import { Switch } from '@ds/Switch'
import { ThemeRow, ThemeSwitch } from '@ds/ThemeSwitch'
import { Btn } from '@ds/Btn'
import { FilterModal } from '@/components/FilterModal'
import { Example, DoDont, DoDontCard } from '@docs/blocks/Example'

/**
 * O switch limpo vem primeiro, e o alternador de tema depois, porque é essa a
 * relação entre os dois: o alternador é o switch com um ícone de cada lado.
 *
 * O par de acerto e erro usa o switch limpo nos dois lados de propósito. Antes
 * usava o alternador de tema inteiro, com sol e lua, para dizer "não use switch
 * aqui", e aí o contra-exemplo trazia a decoração do tema para uma linha que
 * não tem nada a ver com tema. A comparação é sobre o momento em que a escolha
 * passa a valer, então os dois lados precisam mostrar a mesma peça.
 *
 * O checkbox não tem palco próprio porque ainda não é componente: ele mora
 * dentro do modal de filtros. Recriá-lo aqui faria a página exibir um segundo
 * checkbox, que é justamente o defeito que ela descreve, então o palco abre o
 * modal verdadeiro.
 */

/** Linha de preferência genérica, para o switch aparecer onde ele vive. */
function Linha({
  rotulo,
  ligado,
  aoTrocar,
}: {
  rotulo: string
  ligado: boolean
  aoTrocar: (v: boolean) => void
}) {
  return (
    <span className="flex items-center gap-3" style={{ fontFamily: FONT, fontSize: 14, color: COLOR.text }}>
      {rotulo}
      <Switch checked={ligado} onChange={aoTrocar} label={rotulo} />
    </span>
  )
}

export function DemoControles() {
  const [filtros, setFiltros] = useState(false)
  const [compacto, setCompacto] = useState(false)
  const [certo, setCerto] = useState(true)
  const [errado, setErrado] = useState(false)

  return (
    <>
      <Example
        title="Switch"
        note="Trilho de 36 × 20 com botão de 16 e 2 de folga. Sem texto dentro, então o rótulo acessível é obrigatório."
        align="center"
      >
        <Switch checked={compacto} onChange={setCompacto} label="Modo compacto" />
      </Example>

      <Example
        title="Alternador de tema"
        note="O mesmo switch com light_mode à esquerda e dark_mode à direita. Clique: o tema desta página vira junto."
        align="center"
      >
        <ThemeSwitch />
      </Example>

      <Example
        title="Na linha de preferência"
        note="A linha carrega o controle na ponta, e por isso ela não é clicável inteira. Botão dentro de botão é HTML inválido."
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
        title="Checkbox"
        note="Não há palco solto porque o checkbox ainda não é componente: ele vive no modal de filtros. Abra para ver o de verdade, 16 × 16, raio 3, marcado na primária."
      >
        <Btn variant="outlined" onClick={() => setFiltros(true)}>
          Abrir filtros
        </Btn>
        {filtros && <FilterModal active={[]} onClose={() => setFiltros(false)} onApply={() => setFiltros(false)} />}
      </Example>

      <DoDont>
        <DoDontCard kind="do" label="Switch quando o efeito é imediato: clicou, a tela mudou.">
          <Linha rotulo="Modo compacto" ligado={certo} aoTrocar={setCerto} />
        </DoDontCard>
        <DoDontCard kind="dont" label="Switch para uma escolha que só vale depois do Aplicar. Esse caso é checkbox.">
          <Linha rotulo="Incluir arquivadas" ligado={errado} aoTrocar={setErrado} />
        </DoDontCard>
      </DoDont>
    </>
  )
}
