import type { DimId, IndicatorId } from '@/engine/semantic'
import type { SketchBlock } from '@/blocks/DashboardSketch'

/**
 * O catálogo: os metadados que a pessoa pode usar e os dashboards do portal
 * que eles alimentam.
 *
 * Uma análise sempre parte de um dos dois. Do metadado, ela começa dos dados;
 * do dashboard, começa do que o hospital já olha todo dia, com os mesmos
 * números e filtros, e o dashboard em si não muda.
 *
 * Só dois metadados têm dados neste protótipo (21 e 32). Os outros estão na
 * lista para a escolha ter o tamanho de verdade, e dizem que não têm dados
 * aqui em vez de fingir uma análise.
 */

export type Measure = 'rate' | 'den' | 'num'

export type MeasureDef = { label: string; aliases: string[] }

export type FieldType = 'Data' | 'Texto' | 'Número'

export type CatalogField = { name: string; title: string; type: FieldType }

/** Um metadado do Weknow, como aparece na escolha. */
export type CatalogItem = {
  code: string
  name: string
  /** Área de negócio: agrupa a lista, como no Weknow Ask. */
  group: string
  description: string
  fields: CatalogField[]
  /** A última execução falhou: não dá para usar. */
  failed?: boolean
  /** Os que têm dados neste protótipo. */
  ind?: IndicatorId
}

/** O que o motor sabe a mais sobre os metadados que têm dados aqui. */
export type Metadado = CatalogItem & {
  ind: IndicatorId
  measures: Record<Measure, MeasureDef>
  /** Palavras que, num pedido, apontam para este metadado. */
  keywords: string[]
}

export const METADADOS: Metadado[] = [
  {
    ind: 'permanencia',
    code: '21',
    name: 'Internações',
    group: 'Assistencial',
    description: 'Saídas e paciente-dia por mês, setor, faixa etária, tipo de entrada e convênio',
    fields: [
      { name: 'mes', title: 'Mês', type: 'Data' },
      { name: 'setor', title: 'Setor', type: 'Texto' },
      { name: 'faixa', title: 'Faixa etária', type: 'Texto' },
      { name: 'entrada', title: 'Tipo de entrada', type: 'Texto' },
      { name: 'convenio', title: 'Convênio', type: 'Texto' },
      { name: 'saidas', title: 'Saídas', type: 'Número' },
      { name: 'paciente_dias', title: 'Paciente-dia', type: 'Número' },
    ],
    measures: {
      rate: { label: 'Permanência média', aliases: ['permanência', 'permanencia', 'tempo de internação', 'média de dias'] },
      den: { label: 'Saídas', aliases: ['saídas', 'saidas', 'altas', 'internações', 'internacoes', 'volume'] },
      num: { label: 'Paciente-dia', aliases: ['paciente-dia', 'paciente dia', 'diárias', 'dias de internação'] },
    },
    keywords: ['permanência', 'permanencia', 'internação', 'internações', 'internacao', 'leito', 'leitos', 'saídas', 'altas', 'paciente-dia'],
  },
  {
    ind: 'glosa',
    code: '32',
    name: 'Faturamento e glosas',
    group: 'Financeiro',
    description: 'Valor faturado e glosado por mês, convênio, tipo de item e setor',
    fields: [
      { name: 'mes', title: 'Mês', type: 'Data' },
      { name: 'convenio', title: 'Convênio', type: 'Texto' },
      { name: 'item', title: 'Tipo de item', type: 'Texto' },
      { name: 'setor', title: 'Setor', type: 'Texto' },
      { name: 'valor_faturado', title: 'Valor faturado', type: 'Número' },
      { name: 'valor_glosado', title: 'Valor glosado', type: 'Número' },
    ],
    measures: {
      rate: { label: 'Taxa de glosa', aliases: ['taxa de glosa', 'glosa', 'glosas', '% glosado'] },
      den: { label: 'Faturamento', aliases: ['faturamento', 'faturado', 'receita'] },
      num: { label: 'Valor glosado', aliases: ['valor glosado', 'glosado', 'perda'] },
    },
    keywords: ['glosa', 'glosas', 'faturamento', 'faturado', 'operadora', 'conta', 'contas', 'materiais'],
  },
]

const f = (name: string, title: string, type: FieldType): CatalogField => ({ name, title, type })

/** A lista inteira da escolha, na ordem das áreas de negócio. */
export const CATALOG: CatalogItem[] = [
  METADADOS[0],
  {
    code: '22',
    name: 'Atendimentos do pronto-socorro',
    group: 'Assistencial',
    description: 'Atendimentos, tempo de espera e classificação de risco por hora',
    fields: [f('data_hora', 'Data e hora', 'Data'), f('classificacao', 'Classificação de risco', 'Texto'), f('espera_min', 'Espera (min)', 'Número')],
  },
  {
    code: '23',
    name: 'Centro cirúrgico',
    group: 'Assistencial',
    description: 'Cirurgias, tempo de sala, cancelamentos e motivos',
    fields: [f('data', 'Data', 'Data'), f('sala', 'Sala', 'Texto'), f('motivo', 'Motivo do cancelamento', 'Texto'), f('minutos', 'Tempo de sala', 'Número')],
  },
  {
    code: '24',
    name: 'Ocupação de leitos (censo diário)',
    group: 'Assistencial',
    description: 'Leitos ocupados e disponíveis por dia e unidade',
    fields: [f('data', 'Data', 'Data'), f('unidade', 'Unidade', 'Texto'), f('ocupados', 'Leitos ocupados', 'Número'), f('disponiveis', 'Leitos disponíveis', 'Número')],
  },
  METADADOS[1],
  {
    code: '33',
    name: 'Custos por centro de custo',
    group: 'Financeiro',
    description: 'Custo direto e rateado por centro de custo e mês',
    fields: [f('mes', 'Mês', 'Data'), f('centro', 'Centro de custo', 'Texto'), f('custo', 'Custo', 'Número')],
  },
  {
    code: '41',
    name: 'Absenteísmo',
    group: 'Pessoas',
    description: 'Faltas e afastamentos por setor, cargo e motivo',
    fields: [f('mes', 'Mês', 'Data'), f('setor', 'Setor', 'Texto'), f('horas', 'Horas perdidas', 'Número')],
  },
  {
    code: '16',
    name: 'MAPA',
    group: 'ANS',
    description: 'Monitoramento assistencial da ANS',
    fields: [],
    failed: true,
  },
]

export const metadadoOf = (ind: IndicatorId) => METADADOS.find((m) => m.ind === ind)!
export const catalogItem = (code: string) => CATALOG.find((c) => c.code === code)

/* ─────────────────────────────────────────────── dashboards do portal */

/** Um dashboard do portal: a pasta, o metadado que o alimenta e os filtros dele. */
export type SourceDashboard = {
  id: string
  name: string
  /** A pasta do portal onde ele mora, com o nome de lá. */
  folder: string
  code: string
  /** A barra de filtros do dashboard: os cortes que ele já oferece. */
  dims: DimId[]
  /** O croqui do portal: onde fica cada componente e de que tipo ele é. */
  layout: SketchBlock[]
}

/* Arranjos do croqui, os mesmos do portal (data/portal.ts de lá). */
const L: SketchBlock[][] = [
  [[0, 0, 12, 2, 'bar'], [0, 2, 3, 2, 'map'], [3, 2, 4, 2, 'pie'], [7, 2, 2, 2, 'text'], [9, 2, 3, 2, 'bar'], [0, 4, 6, 2, 'line'], [6, 4, 6, 2, 'table']],
  [[0, 0, 8, 2, 'bar'], [8, 0, 4, 2, 'label'], [0, 2, 3, 4, 'map'], [3, 2, 9, 2, 'bar'], [3, 4, 5, 2, 'table'], [8, 4, 4, 2, 'gauge']],
  [[0, 0, 3, 2, 'gauge'], [3, 0, 3, 2, 'gauge'], [6, 0, 3, 2, 'gauge'], [9, 0, 3, 2, 'gauge'], [0, 2, 8, 4, 'line'], [8, 2, 4, 4, 'pie']],
  [[0, 0, 2, 6, 'filter'], [2, 0, 10, 3, 'bar'], [2, 3, 5, 3, 'pie'], [7, 3, 5, 3, 'table']],
  [[0, 0, 4, 2, 'label'], [4, 0, 4, 2, 'label'], [8, 0, 4, 2, 'label'], [0, 2, 12, 4, 'table']],
  [[0, 0, 6, 3, 'line'], [6, 0, 6, 3, 'bar'], [0, 3, 4, 3, 'pie'], [4, 3, 4, 3, 'map'], [8, 3, 4, 3, 'text']],
  [[0, 0, 4, 6, 'image'], [4, 0, 8, 3, 'line'], [4, 3, 4, 3, 'gauge'], [8, 3, 4, 3, 'gauge']],
  [[0, 0, 12, 1, 'filter'], [0, 1, 6, 5, 'map'], [6, 1, 6, 3, 'bar'], [6, 4, 6, 2, 'table']],
]

const INTERNACAO = 'Internação Clínica e Cirúrgica (Alas A, B e C)'
const LEITOS = 'Controle de Leitos e Gestão de Ocupação Hospitalar (Unidades de Internação)'
const FATURAMENTO = 'Faturamento SUS e Convênios'
const CUSTOS = 'Custos'
const PS = 'Atendimento e Triagem PS Adulto e Pediátrico'
const RH = 'RH - Recursos Humanos (Absenteísmo, Turnover e Horas Extras)'

/**
 * Dashboards do portal com o metadado por trás de cada um. Nomes e pastas são
 * os do portal, para a escolha aqui parecer a navegação de lá.
 */
export const DASHBOARDS: SourceDashboard[] = [
  { id: 'perm', name: 'Tempo médio de permanência', folder: INTERNACAO, code: '21', dims: ['setor', 'faixa'], layout: L[2] },
  { id: 'internados', name: 'Pacientes internados por ala, especialidade e médico responsável', folder: INTERNACAO, code: '21', dims: ['setor', 'entrada'], layout: L[3] },
  { id: 'ocupacao', name: 'Ocupação de leitos por unidade, especialidade e convênio (atualização diária)', folder: LEITOS, code: '24', dims: [], layout: L[7] },
  { id: 'giro', name: 'Giro de leitos', folder: LEITOS, code: '21', dims: ['setor', 'convenio'], layout: L[5] },
  { id: 'leitos-esp', name: 'Leitos por especialidade', folder: LEITOS, code: '24', dims: [], layout: L[4] },
  { id: 'fat-conv', name: 'Faturamento por convênio', folder: FATURAMENTO, code: '32', dims: ['convenio'], layout: L[1] },
  { id: 'glosas', name: 'Glosas', folder: FATURAMENTO, code: '32', dims: ['convenio', 'item'], layout: L[0] },
  { id: 'receber', name: 'Contas a receber', folder: FATURAMENTO, code: '32', dims: ['convenio'], layout: L[4] },
  { id: 'custo-pd', name: 'Custo por paciente-dia', folder: CUSTOS, code: '33', dims: [], layout: L[2] },
  { id: 'custo', name: 'Custos por centro de custo', folder: CUSTOS, code: '33', dims: [], layout: L[3] },
  { id: 'espera-ps', name: 'Tempo de espera no PS', folder: PS, code: '22', dims: [], layout: L[6] },
  { id: 'manchester', name: 'Classificação de risco (Protocolo de Manchester)', folder: PS, code: '22', dims: [], layout: L[5] },
  { id: 'absenteismo', name: 'Absenteísmo', folder: RH, code: '41', dims: [], layout: L[1] },
]

export const dashboardsOfCode = (code: string) => DASHBOARDS.filter((d) => d.code === code)
export const dashboardsOf = (ind: IndicatorId) => dashboardsOfCode(metadadoOf(ind).code)

/**
 * Escolhe o metadado de um pedido pelas palavras. No produto é a busca no
 * catálogo; a saída é a mesma: o escolhido e os outros que também serviriam.
 */
export function pickSource(text: string): { chosen: Metadado; score: number }[] {
  const t = text.toLowerCase()
  return METADADOS.map((m) => ({ chosen: m, score: m.keywords.filter((k) => t.includes(k)).length }))
    .sort((a, b) => b.score - a.score)
}
