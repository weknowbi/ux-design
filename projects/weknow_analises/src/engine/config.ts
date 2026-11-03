import type { CatalogItem } from '@/engine/catalog'

/**
 * A configuração padrão de cada metadado: como os dados são lidos e o que um
 * dashboard feito dele deve mostrar. No produto, quem cadastra o metadado a
 * escreve uma vez, e é ela que a IA segue ao montar qualquer dashboard dele.
 * Quem cria um dashboard pode escrever outra, só para aquele dashboard, sem
 * mexer na do metadado.
 *
 * A estrutura é a do prompt que gerou o raio-x de faturamento que serviu de
 * referência (contexto, objetivo, indicadores, gráficos, interpretação,
 * filtros, formato). A parte de visual e tecnologia de lá não entra: aqui o
 * desenho é o do Weknow, e a configuração só diz o que mostrar e como ler.
 */
const BY_CODE: Record<string, string> = {
  '32': `CONTEXTO
Contas hospitalares enviadas às operadoras, por mês de competência: convênio, tipo de item, setor, valor faturado e valor glosado. Um registro por item de conta.

OBJETIVO
Um raio-x do faturamento e das glosas para a diretoria financeira: quanto foi faturado, quanto ficou retido e onde a glosa se concentra.

INDICADORES PRINCIPAIS (no topo)
• Taxa de glosa: valor glosado ÷ valor faturado
• Faturamento
• Valor glosado
• Cada um com a variação contra o mês anterior (seta e valor) e a linha dos últimos 12 meses

GRÁFICOS
• Taxa de glosa mês a mês, com o mês atual marcado
• Taxa de glosa por convênio
• Todo gráfico com título e uma frase curta com o que ele mostra

INTERPRETAÇÃO
• A glosa sobe por dois caminhos: mais faturamento nos convênios que glosam muito (mix) ou mais glosa dentro do mesmo convênio (taxa). Ao explicar, separe os dois.
• Variação menor que 0,2 p.p. é estabilidade, não alta nem queda.

FILTROS
Período, convênio, tipo de item e setor.

FORMATO
Reais no padrão brasileiro (R$ 1.234.567,89); taxas com uma casa decimal.`,

  '21': `CONTEXTO
Internações por mês de saída: setor, faixa etária, tipo de entrada, convênio, saídas (altas, óbitos e transferências externas) e paciente-dia.

OBJETIVO
Mostrar à gestão assistencial quanto tempo os pacientes ficam internados e o que explica a mudança: volume, perfil dos pacientes ou permanência dentro de cada setor.

INDICADORES PRINCIPAIS (no topo)
• Permanência média: paciente-dia ÷ saídas
• Saídas
• Paciente-dia
• Cada um com a variação contra o mês anterior e a linha dos últimos 12 meses

GRÁFICOS
• Permanência média mês a mês, com o mês atual marcado
• Permanência média por setor
• Todo gráfico com título e uma frase curta com o que ele mostra

INTERPRETAÇÃO
• Menos é melhor. A média sobe quando mais pacientes vão para setores de permanência longa (mix) ou quando o mesmo setor segura mais (taxa). Ao explicar, separe os dois.
• Variação menor que 0,1 dia é estabilidade.

FILTROS
Período, setor, faixa etária, tipo de entrada e convênio.

FORMATO
Dias com uma casa decimal; contagens sem casas, com ponto de milhar.`,
}

/** Metadado sem configuração escrita: a padrão sai dos campos. */
function generic(m: CatalogItem): string {
  const fields = m.fields.map((f) => f.title).join(', ')
  return `CONTEXTO
${m.description}.

OBJETIVO
Acompanhar os números do metadado ${m.code} - ${m.name} mês a mês.

CAMPOS
${fields || 'Sem campos lidos ainda.'}`
}

export function defaultConfig(m: CatalogItem): string {
  return BY_CODE[m.code] ?? generic(m)
}

/**
 * O modelo de pedido do raio-x, já com as medidas do metadado: é o exemplo
 * que o dashboard vazio oferece. Vem do prompt de referência, sem a parte de
 * visual e de tecnologia, que aqui são do produto.
 */
export function modelPrompt(m: { name: string; measures: Record<'rate' | 'den' | 'num', { label: string }> }, cuts: string[]): string {
  const k = m.measures
  return `Crie uma análise completa de ${m.name.toLowerCase()} para a diretoria.

KPIs no topo: ${k.rate.label}, ${k.den.label} e ${k.num.label}, cada um com a variação contra o mês anterior (seta e %).

Gráficos: escolha os melhores para mostrar a evolução mês a mês e onde o resultado se concentra (${cuts.join(', ')}).

Todo gráfico com título e um insight curto embaixo. Valores no padrão brasileiro.`
}
