/**
 * A camada semântica: o que o Weknow sabe sobre cada indicador antes de a IA
 * abrir a boca.
 *
 * É aqui que está o diferencial em relação a uma IA genérica. Um modelo que
 * recebe uma planilha não sabe que permanência média é paciente-dia ÷ saídas
 * (e não a média das médias de cada setor), nem que faz sentido abri-la por
 * setor, faixa etária e tipo de entrada, nem que o metadado não traz o motivo
 * de o paciente continuar internado. Tudo isso é dado, escrito uma vez, e vale
 * para toda pergunta.
 *
 * Todo indicador daqui é uma razão (numerador ÷ denominador). É isso que
 * permite a decomposição em mix × taxa: a variação de uma razão sempre se
 * divide, exatamente, em "mudou a composição do denominador" e "mudou a razão
 * dentro de cada parte".
 */

export type DimId = 'setor' | 'faixa' | 'entrada' | 'convenio' | 'item'

export type Dimension = {
  id: DimId
  /** "setor", minúsculo, como entra no meio da frase. */
  label: string
  plural: string
  /** Como a pessoa se refere ao corte num pedido. */
  aliases: string[]
}

export const DIMENSIONS: Record<DimId, Dimension> = {
  setor: { id: 'setor', label: 'setor', plural: 'setores', aliases: ['setor', 'setores', 'unidade', 'ala', 'especialidade'] },
  faixa: { id: 'faixa', label: 'faixa etária', plural: 'faixas etárias', aliases: ['faixa', 'idade', 'etária', 'etaria', 'idosos', 'anos'] },
  entrada: { id: 'entrada', label: 'tipo de entrada', plural: 'tipos de entrada', aliases: ['entrada', 'urgência', 'urgencia', 'eletiva', 'pronto-socorro', 'ps'] },
  convenio: { id: 'convenio', label: 'convênio', plural: 'convênios', aliases: ['convênio', 'convenio', 'convênios', 'convenios', 'operadora', 'plano'] },
  item: { id: 'item', label: 'tipo de item', plural: 'tipos de item', aliases: ['item', 'itens', 'materiais', 'medicamentos', 'diárias', 'honorários'] },
}

export type IndicatorId = 'permanencia' | 'glosa'

export type Indicator = {
  id: IndicatorId
  name: string
  /** Como entra no meio da frase: "a permanência média". */
  article: string
  unit: 'dias' | '%'
  /** Casas decimais do valor. */
  digits: number
  /** Para que lado é melhor. Decide o tom da variação, nunca a cor sozinha. */
  better: 'down' | 'up'
  num: { field: string; label: string }
  den: { field: string; label: string; unit: string }
  /** O que a razão mede em cada parte, no meio da frase. */
  rateNoun: string
  definition: string
  metadado: { code: string; name: string }
  dims: DimId[]
  /** O que a pergunta pode pedir e o metadado não traz. Vira "pergunta em aberto". */
  missing: { what: string; why: string }[]
  aliases: string[]
}

export const INDICATORS: Record<IndicatorId, Indicator> = {
  permanencia: {
    id: 'permanencia',
    name: 'Permanência média',
    article: 'a permanência média',
    unit: 'dias',
    digits: 1,
    better: 'down',
    num: { field: 'paciente_dias', label: 'paciente-dia' },
    den: { field: 'saidas', label: 'saídas', unit: 'saídas' },
    rateNoun: 'permanência',
    definition: 'soma de paciente-dia ÷ soma de saídas (altas, óbitos e transferências externas) no mês',
    metadado: { code: '21', name: 'Internações' },
    dims: ['setor', 'faixa', 'entrada', 'convenio'],
    missing: [
      {
        what: 'o motivo de o paciente continuar internado depois da alta clínica',
        why: 'aguardar vaga de retaguarda, home care ou exame aparece como dia de internação igual a qualquer outro',
      },
      {
        what: 'o diagnóstico principal (CID) da internação',
        why: 'sem ele não dá para saber se o aumento de idosos veio de uma doença específica',
      },
    ],
    aliases: ['permanência', 'permanencia', 'tempo de internação', 'internação', 'internacao', 'leito', 'dias internado'],
  },
  glosa: {
    id: 'glosa',
    name: 'Taxa de glosa',
    article: 'a taxa de glosa',
    unit: '%',
    digits: 1,
    better: 'down',
    num: { field: 'valor_glosado', label: 'valor glosado' },
    den: { field: 'valor_faturado', label: 'faturamento', unit: 'faturado' },
    rateNoun: 'taxa de glosa',
    definition: 'valor glosado ÷ valor faturado das contas enviadas no mês',
    metadado: { code: '32', name: 'Faturamento e glosas' },
    dims: ['convenio', 'item', 'setor'],
    missing: [
      {
        what: 'o motivo da glosa informado pelo convênio',
        why: 'falta de autorização, código incompatível e divergência de preço pedem correções diferentes',
      },
    ],
    aliases: ['glosa', 'glosas', 'faturamento', 'conta', 'contas'],
  },
}

/**
 * A pauta da reunião de indicadores: o que o hospital acompanha todo mês.
 * Os dois primeiros saem do motor; os outros três ficam com o número do mês,
 * porque o protótipo não monta metadado para eles.
 */
export type AgendaItem = {
  name: string
  indicator?: IndicatorId
  /** Só para os que não têm motor por trás. */
  fixed?: { prev: string; cur: string; delta: string; usual: string }
}

export const AGENDA: AgendaItem[] = [
  { name: 'Permanência média', indicator: 'permanencia' },
  { name: 'Taxa de glosa', indicator: 'glosa' },
  { name: 'Taxa de ocupação', fixed: { prev: '83,4%', cur: '84,1%', delta: '+0,7 p.p.', usual: '±1,8 p.p.' } },
  { name: 'Tempo médio de espera no PS', fixed: { prev: '38 min', cur: '36 min', delta: '−2 min', usual: '±5 min' } },
  { name: 'Reinternação em 30 dias', fixed: { prev: '6,1%', cur: '6,3%', delta: '+0,2 p.p.', usual: '±0,6 p.p.' } },
]
