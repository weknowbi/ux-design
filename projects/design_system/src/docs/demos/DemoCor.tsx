import { useEffect, useState } from 'react'
import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Example } from '@docs/blocks/Example'

/**
 * As amostras leem o valor **computado** da variável, não uma lista digitada
 * aqui. Assim a página não tem como discordar do CSS: se a paleta mudar, a
 * amostra muda no mesmo instante, e o valor mostrado troca sozinho ao virar
 * o tema, que é o que uma tabela estática nunca consegue provar.
 */
function useVars(names: string[]) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement)
      setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()])))
    }
    read()
    /* O tema troca mexendo em `data-theme` no elemento raiz, é esse atributo
       que o observador espera. */
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [names.join()])

  return values
}

/**
 * Uma linha por cor: amostra, papel, onde aparece, valor.
 *
 * Em grade, uma faixa de quatro cores quebrava em 3+1 e a de três em 3, duas
 * formas diferentes para a mesma coisa. Em linha, qualquer quantidade cai
 * igual, e a frase de uso ganha a largura de que precisa.
 *
 * Os usos foram levantados no código, não inventados: cada um existe.
 */
function Swatch({
  name,
  role,
  uso,
  value,
  first,
}: {
  name: string
  role: string
  uso: string
  value?: string
  /** A primeira linha não abre com risco, divisória separa, não emoldura. */
  first?: boolean
}) {
  return (
    <div
      className="w-full flex items-center gap-4"
      style={{
        paddingBlock: 10,
        borderTop: first ? undefined : `1px solid ${COLOR.border}`,
      }}
    >
      <span
        className="shrink-0"
        style={{
          width: 64,
          height: 36,
          borderRadius: RADIUS.md,
          background: `var(${name})`,
          border: `1px solid ${COLOR.border}`,
        }}
      />
      <span
        className="shrink-0 text-[13.5px]"
        style={{ fontFamily: FONT, color: COLOR.text, width: 148 }}
      >
        {role}
      </span>
      <span
        className="flex-1 min-w-0 text-[13px]"
        style={{ fontFamily: FONT, color: COLOR.textSecondary }}
      >
        {uso}
      </span>
      <span
        className="shrink-0 text-[11.5px] text-right"
        style={{ fontFamily: 'ui-monospace, monospace', color: COLOR.textIcon, width: 72 }}
      >
        {value || '...'}
      </span>
    </div>
  )
}

type Amostra = { token: string; role: string; uso: string }

const GRUPOS: { titulo: string; nota: string; amostras: Amostra[] }[] = [
  {
    titulo: 'Ação',
    nota: 'Tudo que responde a clique ou está selecionado agora: botão, link, item de menu aberto, filtro ligado, aba atual. O que não é clicável e não está selecionado não usa azul.',
    amostras: [
      { token: '--wk-primary', role: 'Primária', uso: 'Botão primário, link, item de menu ativo' },
      { token: '--wk-tint', role: 'Secundária', uso: 'Fundo do botão secundário' },
    ],
  },
  {
    titulo: 'Texto',
    /* Três níveis, não quatro. Os ícones não têm cor própria: usam a
       terciária, nos dois temas. */
    nota: 'Todo texto lido na tela, em três níveis de importância. A primária é o que a pessoa veio ler, a secundária situa e apoia, a terciária é o que só se lê quando procurado.',
    amostras: [
      { token: '--wk-text', role: 'Primária', uso: 'Corpo, título, rótulo de campo' },
      { token: '--wk-text-secondary', role: 'Secundária', uso: 'Caminho, rótulo de coluna, texto de segunda linha' },
      { token: '--wk-text-muted', role: 'Terciária', uso: 'Auxílio de campo, rótulo de grupo no menu, e todos os ícones' },
    ],
  },
  {
    titulo: 'Superfície',
    nota: 'Os planos onde o conteúdo se apoia: o fundo da janela, a folha que recebe o conteúdo e os painéis que flutuam sobre ela. Quanto mais perto da pessoa, mais o plano se separa do fundo.',
    amostras: [
      { token: '--wk-canvas', role: 'Fundo da página', uso: 'Fundo da janela e do menu lateral' },
      { token: '--wk-surface', role: 'Superfície', uso: 'Folha de conteúdo, menu flutuante, modal' },
      /* Em produção o card usa o mesmo tom do fundo da página, nos dois temas.
         Não é engano: o card se separa por contorno e por hover, não por
         tom. */
      { token: '--wk-card-bg', role: 'Card', uso: 'Fundo do card, o mesmo tom do fundo da página' },
    ],
  },
  {
    titulo: 'Linha e estado',
    nota: 'As linhas que delimitam e as cores que sinalizam: contorno de bloco agrupa conteúdo, contorno de controle diz que algo é manipulável, vermelho aparece só quando algo falhou ou vai ser destruído, e o fundo de item ativo marca onde a pessoa está.',
    amostras: [
      { token: '--wk-border', role: 'Contorno de bloco', uso: 'Menu, tabela, painel, prompt' },
      { token: '--wk-field-border', role: 'Contorno de controle', uso: 'Campo de texto, caixa de seleção' },
      { token: '--wk-danger', role: 'Erro e destruição', uso: 'Borda e mensagem de erro, ação de excluir' },
      { token: '--wk-nav-active', role: 'Item ativo', uso: 'Fundo do item de menu selecionado' },
    ],
  },
]

export function DemoCor() {
  const names = GRUPOS.flatMap((g) => g.amostras.map((a) => a.token))
  const values = useVars(names)

  return (
    <>
      {GRUPOS.map((g) => (
        <Example key={g.titulo} title={g.titulo} note={g.nota}>
          {/*
            Divisória só entre linhas, como na tabela do sistema, e no tom de
            contorno de bloco.

            Antes era o `divide-y` do Tailwind com `borderColor` no pai, que
            não funciona: `border-color` não é herdada, então cada risco caía
            em `currentColor`, a cor do texto. Daí as linhas pretas.
          */}
          <div className="w-full flex flex-col">
            {g.amostras.map((a, i) => (
              <Swatch
                key={a.token}
                name={a.token}
                role={a.role}
                uso={a.uso}
                value={values[a.token]}
                first={i === 0}
              />
            ))}
          </div>
        </Example>
      ))}
    </>
  )
}
