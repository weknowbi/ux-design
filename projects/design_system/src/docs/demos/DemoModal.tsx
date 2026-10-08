import { useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Btn } from '@ds/Btn'
import { PromptModal } from '@/components/PromptModal'
import { FilterModal } from '@/components/FilterModal'
import { Example } from '@docs/blocks/Example'

/**
 * Os dois modais de produção, abertos de verdade: inclusive o véu sobre a
 * página inteira, que é parte do componente e não do palco.
 *
 * Abrir para valer é o único jeito de mostrar o que a espec. não diz: o foco
 * que cai no campo com o texto já selecionado, o `Escape` que fecha, o
 * primário que fica desabilitado enquanto o campo está vazio.
 */

function Eco({ texto }: { texto?: string }) {
  if (!texto) return null
  return (
    <span className="text-[13px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
      {texto}
    </span>
  )
}

export function DemoModal() {
  const [prompt, setPrompt] = useState(false)
  const [filtros, setFiltros] = useState(false)
  const [eco, setEco] = useState<string>()

  return (
    <>
      <Example
        title="Um campo só (420)"
        note="Cabeçalho de 64, campo do design system e rodapé com fantasma + primário. O primário só habilita com o campo preenchido."
      >
        <Btn onClick={() => setPrompt(true)}>Criar pasta</Btn>
        <Eco texto={eco} />
        {prompt && (
          <PromptModal
            title="Criar pasta"
            label="Nome da pasta"
            placeholder="Faturamento e glosas"
            confirmLabel="Criar pasta"
            onConfirm={(v) => setEco(`criou "${v}"`)}
            onClose={() => setPrompt(false)}
          />
        )}
      </Example>

      <Example
        title="Escolha em lista (610)"
        note="A mesma moldura, mais larga, com busca e árvore. É aqui que a caixa de seleção aparece no produto."
      >
        <Btn variant="outlined" onClick={() => setFiltros(true)}>
          Adicionar filtros
        </Btn>
        {filtros && (
          <FilterModal
            active={[]}
            onClose={() => setFiltros(false)}
            onApply={(chips) => setEco(`${chips.length} filtro(s)`)}
          />
        )}
      </Example>
    </>
  )
}
