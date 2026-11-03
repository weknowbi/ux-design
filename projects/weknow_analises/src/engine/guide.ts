/**
 * A diretriz visual: como o dashboard criado com IA deve parecer. A padrão é
 * a do Weknow, e é ela que faz todo dashboard sair com a mesma cara dos do
 * portal. O cliente pode trocar por uma dele, escrita ali ou enviada em
 * arquivo, quando quiser um resultado diferente.
 *
 * A configuração do metadado (`engine/config.ts`) diz o que mostrar e como
 * ler os dados; a diretriz diz como mostrar. As duas são prompt: texto que a
 * IA segue.
 */
export const WEKNOW_GUIDE_NAME = 'Padrão Weknow'

export const WEKNOW_GUIDE = `ESTRUTURA
• Painel executivo de uma página: cabeçalho com o recorte e o período, e uma barra com período (6 meses, 12 meses ou o período completo), filtro no corte principal e exportar CSV.
• Essa barra fica presa no topo ao rolar, sem fio embaixo: o fundo dela é translúcido e desfocado, e o conteúdo passa por trás.
• No topo, os indicadores principais em cartões, cada um com a variação contra o período anterior (seta e %) e a linha dos últimos meses.
• Logo abaixo, a medida principal mês a mês contra o mesmo mês do ano anterior, com os insights do recorte ao lado.
• Depois, o volume por mês, a medida por corte principal, a composição e a tabela de desempenho.
• Notas de método no rodapé.

VISUAL
• Abre no tema do Weknow de quem cria, com o botão para trocar o tema no topo.
• Paleta azul do Weknow. Vermelho, laranja e amarelo só para piora e alerta.
• Densidade confortável, cantos arredondados e linhas curvas nos gráficos.
• Fonte Inter, com números tabulares.

TEXTO
• Todo gráfico com título e um insight curto embaixo, em linguagem simples.
• Valores no padrão brasileiro.`

/** Os arquivos que se pode enviar: texto, em Markdown ou .txt, de até 100 KB. */
export const GUIDE_ACCEPT = '.md,.txt,text/plain,text/markdown'
export const GUIDE_MAX_BYTES = 100 * 1024

/**
 * O exemplo do "Ver um exemplo": uma diretriz própria curta, com o que a IA
 * aplica no visual. Sem a palavra "insights" depois do "sem" da tabela, que
 * esconderia os insights também.
 */
export const EXAMPLE_GUIDE_NAME = 'Diretriz de exemplo'

export const EXAMPLE_GUIDE = `VISUAL
• Tema claro ao abrir, com o botão para o escuro.
• Cor principal #0F766E, a do hospital.
• Densidade compacta e cantos retos nos cartões.
• Linhas retas nos gráficos.
• Sem a tabela de desempenho.

TEXTO
• Frases curtas e diretas nos textos dos gráficos.`
