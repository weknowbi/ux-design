import { useCallback, useSyncExternalStore } from 'react'

/**
 * O dashboard de exemplo. Todo dashboard do portal abre este mesmo painel:
 * o protótipo existe para testar a barra inferior (a navegação entre abas),
 * não o conteúdo. Muda só o nome, que vem do card clicado.
 *
 * As abas contam uma história em sequência, como os consultores montam os
 * painéis de verdade: do panorama ao plano de ação. É esse uso que a lista
 * suspensa da 5.2 quebrou (item do Jira de navegação das abas): com as abas
 * escondidas, o usuário perde o roteiro.
 */

export type Kpi = { label: string; value: string; delta: number; unit?: string }

export type Chart =
  | { kind: 'line'; title: string; categories: string[]; series: { name: string; values: number[] }[] }
  | { kind: 'bar'; title: string; categories: string[]; values: number[] }
  | { kind: 'hbar'; title: string; categories: string[]; values: number[] }
  | { kind: 'donut'; title: string; categories: string[]; values: number[] }

export type DashTab = { id: string; name: string; kpis: Kpi[]; charts: Chart[] }

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const UNITS = ['Ala A', 'Ala B', 'Ala C', 'UTI adulto', 'UTI neonatal', 'Pediatria', 'Maternidade']
const PAYERS = ['Unimed', 'SUS', 'Bradesco Saúde', 'Amil', 'SulAmérica', 'Particular']

/** Números estáveis por aba: a mesma aba mostra os mesmos valores a cada visita. */
function seeded(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function series(seed: number, n: number, base: number, spread: number) {
  const r = seeded(seed)
  let v = base
  return Array.from({ length: n }, () => {
    v = Math.max(base * 0.4, v + (r() - 0.45) * spread)
    return Math.round(v)
  })
}

const ranked = (seed: number, cats: string[], base: number) => {
  const r = seeded(seed)
  return cats
    .map((c) => ({ c, v: Math.round(base * (0.25 + r())) }))
    .sort((a, b) => b.v - a.v)
}

function tab(
  i: number,
  name: string,
  kpis: Kpi[],
  titles: { line: string; bar: string; hbar: string; donut: string },
  donutCats: string[],
): DashTab {
  const h = ranked(i * 7 + 3, titles.hbar.includes('convênio') ? PAYERS : UNITS, 1200)
  const d = ranked(i * 5 + 1, donutCats, 100)
  return {
    id: `aba-${i + 1}`,
    name,
    kpis,
    charts: [
      {
        kind: 'line',
        title: titles.line,
        categories: MONTHS,
        series: [
          { name: '2026', values: series(i * 3 + 1, 12, 900, 140) },
          { name: '2025', values: series(i * 3 + 2, 12, 820, 120) },
        ],
      },
      { kind: 'donut', title: titles.donut, categories: d.map((x) => x.c), values: d.map((x) => x.v) },
      { kind: 'hbar', title: titles.hbar, categories: h.map((x) => x.c), values: h.map((x) => x.v) },
      { kind: 'bar', title: titles.bar, categories: MONTHS.slice(0, 9), values: series(i * 3 + 7, 9, 400, 90) },
    ],
  }
}

export const DASH_TABS: DashTab[] = [
  tab(0, 'Visão geral', [
    { label: 'Taxa de ocupação', value: '87', unit: '%', delta: 3.2 },
    { label: 'Pacientes internados', value: '412', delta: 1.8 },
    { label: 'Permanência média', value: '4,6', unit: 'dias', delta: -0.4 },
    { label: 'Faturamento do mês', value: '18,2', unit: 'mi', delta: 5.1 },
  ], { line: 'Internações por mês', donut: 'Internações por tipo', hbar: 'Pacientes por unidade', bar: 'Altas por mês' },
  ['Clínica', 'Cirúrgica', 'Obstétrica']),
  tab(1, 'Ocupação por unidade', [
    { label: 'Leitos ativos', value: '474', delta: 0 },
    { label: 'Ocupados agora', value: '412', delta: 2.4 },
    { label: 'Bloqueados', value: '11', delta: -1.1 },
    { label: 'Giro de leitos', value: '5,8', delta: 0.6 },
  ], { line: 'Ocupação média por mês', donut: 'Leitos por situação', hbar: 'Ocupação por unidade', bar: 'Bloqueios por mês' },
  ['Ocupados', 'Livres', 'Bloqueados']),
  tab(2, 'Internações', [
    { label: 'Internações no mês', value: '1.238', delta: 4.3 },
    { label: 'Eletivas', value: '61', unit: '%', delta: -2.0 },
    { label: 'Pelo pronto-socorro', value: '39', unit: '%', delta: 2.0 },
    { label: 'Reinternação em 30 dias', value: '6,1', unit: '%', delta: -0.8 },
  ], { line: 'Internações por mês', donut: 'Origem da internação', hbar: 'Internações por convênio', bar: 'Reinternações por mês' },
  ['Eletiva', 'Pronto-socorro', 'Transferência']),
  tab(3, 'Tempo de permanência', [
    { label: 'Permanência média', value: '4,6', unit: 'dias', delta: -0.4 },
    { label: 'Acima de 10 dias', value: '38', delta: -5.0 },
    { label: 'UTI adulto', value: '7,2', unit: 'dias', delta: 0.3 },
    { label: 'Meta', value: '4,5', unit: 'dias', delta: 0 },
  ], { line: 'Permanência média por mês', donut: 'Faixa de permanência', hbar: 'Permanência por unidade', bar: 'Casos acima da meta' },
  ['Até 3 dias', '4 a 10 dias', 'Acima de 10']),
  tab(4, 'Altas e transferências', [
    { label: 'Altas no mês', value: '1.196', delta: 3.7 },
    { label: 'Altas até 11h', value: '42', unit: '%', delta: 6.0 },
    { label: 'Transferências', value: '57', delta: -2.2 },
    { label: 'Óbitos', value: '1,9', unit: '%', delta: -0.1 },
  ], { line: 'Altas por mês', donut: 'Tipo de saída', hbar: 'Altas por convênio', bar: 'Transferências por mês' },
  ['Alta médica', 'Transferência', 'Óbito']),
  tab(5, 'Faturamento', [
    { label: 'Faturado', value: '18,2', unit: 'mi', delta: 5.1 },
    { label: 'Ticket médio', value: '14,7', unit: 'mil', delta: 1.2 },
    { label: 'Contas abertas', value: '326', delta: -4.5 },
    { label: 'Prazo de envio', value: '9', unit: 'dias', delta: -1.0 },
  ], { line: 'Faturamento por mês (R$ mil)', donut: 'Faturamento por tipo', hbar: 'Faturamento por unidade', bar: 'Contas enviadas por mês' },
  ['Diárias', 'Materiais', 'Procedimentos']),
  tab(6, 'Glosas por convênio', [
    { label: 'Glosado', value: '612', unit: 'mil', delta: -3.4 },
    { label: 'Índice de glosa', value: '3,4', unit: '%', delta: -0.2 },
    { label: 'Recursos enviados', value: '184', delta: 8.0 },
    { label: 'Recuperado', value: '58', unit: '%', delta: 4.1 },
  ], { line: 'Glosas por mês (R$ mil)', donut: 'Motivo da glosa', hbar: 'Glosas por convênio', bar: 'Recursos por mês' },
  ['Administrativa', 'Técnica', 'Linear']),
  tab(7, 'Qualidade assistencial', [
    { label: 'Eventos adversos', value: '23', delta: -12.0 },
    { label: 'Quedas', value: '0,9', unit: '‰', delta: -0.2 },
    { label: 'Infecção hospitalar', value: '2,1', unit: '%', delta: -0.3 },
    { label: 'NPS', value: '74', delta: 3.0 },
  ], { line: 'Eventos notificados por mês', donut: 'Gravidade dos eventos', hbar: 'Eventos por unidade', bar: 'Quedas por mês' },
  ['Leve', 'Moderado', 'Grave']),
  tab(8, 'Plano de ação', [
    { label: 'Ações abertas', value: '17', delta: -3.0 },
    { label: 'Concluídas no prazo', value: '82', unit: '%', delta: 5.0 },
    { label: 'Atrasadas', value: '4', delta: -2.0 },
    { label: 'Responsáveis', value: '9', delta: 0 },
  ], { line: 'Ações concluídas por mês', donut: 'Situação das ações', hbar: 'Ações por unidade', bar: 'Ações abertas por mês' },
  ['No prazo', 'Em risco', 'Atrasada']),
]

/**
 * Como as abas aparecem na barra inferior. É propriedade do dashboard, e
 * quem decide é quem desenvolve o painel, não quem o consome:
 *
 *   abas    todas à vista, como até a 5.1. As que não cabem na largura vão
 *           para o botão "+N". É o padrão, para os painéis antigos voltarem
 *           ao que eram sem ninguém precisar abrir um por um
 *   lista   o seletor com "1 de N" da 5.2, para painel com muitas abas
 *           que não seguem uma ordem
 */
export type TabNav = 'abas' | 'lista'
export const TAB_NAVS: TabNav[] = ['abas', 'lista']
export const DEFAULT_TAB_NAV: TabNav = 'abas'

/* Guardado por dashboard no navegador: no produto isto mora no cadastro do
   painel. A escolha feita num dashboard não vaza para os outros. */
const KEY = 'wk-portal-dash-nav'
const listeners = new Set<() => void>()

function readAll(): Record<string, TabNav> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

let cache = readAll()

export function useTabNav(dashboardId: string): [TabNav, (v: TabNav) => void] {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    () => cache[dashboardId],
  )
  const set = useCallback(
    (v: TabNav) => {
      cache = { ...cache, [dashboardId]: v }
      try {
        localStorage.setItem(KEY, JSON.stringify(cache))
      } catch {
        /* sem armazenamento a escolha vale até recarregar */
      }
      listeners.forEach((fn) => fn())
    },
    [dashboardId],
  )
  return [TAB_NAVS.includes(value) ? value : DEFAULT_TAB_NAV, set]
}
