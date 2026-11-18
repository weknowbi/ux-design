import { DASH_TABS, type DashTab } from '@/data/dashboard'
import * as F from '@/engine/format'
import { call, type Step } from '@/engine/tools'

/**
 * A Análise inteligente pelo Weknow Ask: a IA lê um *momento* de um dashboard
 * (a aba aberta, os filtros e a hora em que foi registrado) e escreve a
 * análise em texto, como a análise automática da fase 1. Depois responde
 * perguntas sobre esse mesmo momento, na conversa.
 *
 * O momento é o que dá sentido à análise: os números de amanhã serão outros,
 * e a análise continua falando do que se viu naquela hora.
 *
 * Simulado por regras, como o resto da IA do protótipo.
 */

export type Moment = {
  /** O dashboard do portal. */
  dashboard: string
  dashboardName: string
  /** A aba aberta quando o momento foi registrado. */
  tab: number
  tabName: string
  /** Quando foi registrado. */
  at: number
  /** Os filtros aplicados, como o dashboard mostra. */
  filters: string[]
}

export const momentTab = (m: Moment): DashTab => DASH_TABS[m.tab] ?? DASH_TABS[0]

export function captureMoment(dashboard: string, dashboardName: string, tab: number): Moment {
  const t = DASH_TABS[tab] ?? DASH_TABS[0]
  return { dashboard, dashboardName, tab, tabName: t.name, at: Date.now(), filters: [`Data: hoje (${t.todayDate})`, 'Unidade: todas'] }
}

/** "23/09 às 15:00": o dia e a hora de corte dos números, que é o que o momento congela. */
export const momentWhen = (m: Moment) => {
  const t = momentTab(m)
  return `${t.todayDate} até ${t.cutoff}`
}

const pct = (a: number, b: number) => ((a - b) / b) * 100
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${F.num(Math.abs(v), 0)}%`

function figures(t: DashTab) {
  const today = t.today.adult + t.today.child
  const yesterday = t.yesterday.adult + t.yesterday.child
  const convTotal = t.convenios.reduce((a, [, n]) => a + n, 0)
  const [topName, topN] = t.convenios[0]
  const hours = t.hourly.map((v, h) => [h, v] as const).filter(([, v]) => v > 0)
  const [peakH, peakV] = hours.reduce((a, b) => (b[1] > a[1] ? b : a))
  const [lowH, lowV] = hours.reduce((a, b) => (b[1] < a[1] ? b : a))
  return {
    today,
    yesterday,
    change: pct(today, yesterday),
    adult: pct(t.today.adult, t.yesterday.adult),
    child: pct(t.today.child, t.yesterday.child),
    convTotal,
    topName,
    topN,
    topShare: (topN / convTotal) * 100,
    peakH,
    peakV,
    lowH,
    lowV,
  }
}

const hour = (h: number) => `${String(h).padStart(2, '0')}h`

/** As chamadas que a IA faz para ler o momento: o dashboard e os números de cada gráfico. */
export function readMomentSteps(m: Moment): Step[] {
  const t = momentTab(m)
  const f = figures(t)
  return [
    call('ler_dashboard', `Lendo o dashboard ${m.dashboardName}`, { dashboard: m.dashboardName, aba: m.tabName }, [
      '4 gráficos: atendimentos de hoje, comparativo com ontem, por convênio e por hora',
      'Fonte: o metadado de atendimentos do pronto-socorro',
    ]),
    call('consultar_dados', `Lendo os números de ${momentWhen(m)}`, { fonte: 'Atendimentos do PS', aba: m.tabName, filtros: m.filters.join('; ') }, [
      `${f.today} atendimentos hoje, ${f.yesterday} ontem no mesmo horário`,
      `${f.convTotal} atendimentos no período, por convênio`,
    ]),
  ]
}

/** A análise do momento, em markdown, no formato da análise automática: observações, hipótese, próximos passos. */
export function analyzeMoment(m: Moment): { title: string; text: string } {
  const t = momentTab(m)
  const f = figures(t)
  const dropChild = f.child < -15
  const mainDrop = Math.abs(f.child) > Math.abs(f.adult) ? 'infantil' : 'adulto'
  const title = f.change < -5 ? `Queda de atendimentos ${dropChild ? 'no infantil' : 'hoje'}` : f.change > 5 ? 'Alta de atendimentos hoje' : 'Atendimentos estáveis hoje'
  const text = [
    '**Principais observações**',
    '',
    `- **${f.today} atendimentos** até as ${t.cutoff}, contra ${f.yesterday} ontem no mesmo horário (${signed(f.change)}).`,
    `- A variação vem mais do **${mainDrop}**: o infantil foi de ${t.yesterday.child} para ${t.today.child} (${signed(f.child)}), o adulto de ${t.yesterday.adult} para ${t.today.adult} (${signed(f.adult)}).`,
    `- O **${f.topName}** concentra ${F.num(f.topShare, 0)}% dos atendimentos do período (${f.topN} de ${f.convTotal}).`,
    `- O pico foi às **${hour(f.peakH)}**, com ${f.peakV} entradas; o horário mais calmo, às ${hour(f.lowH)}, com ${f.lowV}.`,
    '',
    '**Hipótese**',
    '',
    dropChild
      ? 'O infantil pela metade em um dia útil costuma ser escala ou sazonalidade, e não demanda que sumiu: vale conferir a escala da pediatria e o mesmo dia da semana nas últimas semanas.'
      : 'A variação está dentro do que um pronto-socorro oscila de um dia para o outro; antes de agir, vale comparar com o mesmo dia da semana nas últimas semanas.',
    '',
    '**Próximos passos sugeridos**',
    '',
    `- Comparar ${t.todayDate} com as quatro semanas anteriores, no mesmo horário.`,
    `- Reforçar a equipe entre ${hour(f.peakH - 1)} e ${hour(f.peakH + 1)}, quando entra o maior volume.`,
    dropChild ? '- Confirmar com a coordenação da pediatria se houve mudança de escala ou de fluxo hoje.' : '- Acompanhar o fim do dia: os números ainda vão até as 15:00.',
  ].join('\n')
  return { title, text }
}

/**
 * Uma pergunta sobre o momento da conversa. Devolve `null` quando a pergunta
 * não é sobre ele, e aí quem responde é o resto da IA (que escolhe outro
 * metadado, cria um dashboard, um alerta...).
 */
export function answerMoment(m: Moment, raw: string): { text: string; steps: Step[] } | null {
  const q = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const t = momentTab(m)
  const f = figures(t)
  const read = (what: string, result: string[]) => [call('consultar_dados', `Lendo ${what} do momento`, { fonte: 'Atendimentos do PS', aba: m.tabName }, result)]
  if (/infantil|crianca|pediatr/.test(q)) {
    return {
      steps: read('o infantil', [`Infantil: ${t.today.child} hoje, ${t.yesterday.child} ontem`]),
      text: `No momento registrado (${momentWhen(m)}), o infantil teve **${t.today.child} atendimentos**, contra ${t.yesterday.child} ontem no mesmo horário (${signed(f.child)}). É ${F.num((t.today.child / f.today) * 100, 0)}% do total de hoje; ontem era ${F.num((t.yesterday.child / f.yesterday) * 100, 0)}%.\n\nO dashboard não mostra o motivo. Para saber se é escala, eu precisaria do metadado de escala da pediatria, que não está neste dashboard.`,
    }
  }
  if (/adulto/.test(q)) {
    return {
      steps: read('o adulto', [`Adulto: ${t.today.adult} hoje, ${t.yesterday.adult} ontem`]),
      text: `O adulto teve **${t.today.adult} atendimentos** até as ${t.cutoff}, contra ${t.yesterday.adult} ontem (${signed(f.adult)}). É a maior parte do pronto-socorro: ${F.num((t.today.adult / f.today) * 100, 0)}% de hoje.`,
    }
  }
  if (/convenio|sus|unimed|bradesco/.test(q)) {
    const lines = t.convenios.map(([n, v]) => `- ${n}: ${v} (${F.num((v / f.convTotal) * 100, 0)}%)`)
    return {
      steps: read('os convênios', t.convenios.map(([n, v]) => `${n}: ${v}`)),
      text: `Por convênio, no período do momento:\n\n${lines.join('\n')}\n\nO ${f.topName} sozinho é ${F.num(f.topShare, 0)}% do volume.`,
    }
  }
  if (/hora|pico|horario|movimento|manha|tarde/.test(q)) {
    return {
      steps: read('as entradas por hora', [`Pico: ${hour(f.peakH)} com ${f.peakV}`, `Mais calmo: ${hour(f.lowH)} com ${f.lowV}`]),
      text: `O maior movimento foi às **${hour(f.peakH)}**, com ${f.peakV} entradas, e o menor às ${hour(f.lowH)}, com ${f.lowV}. Depois das ${t.cutoff} o dashboard ainda não tinha dados quando o momento foi registrado.`,
    }
  }
  if (/ontem|compar|caiu|subiu|queda|aument|diminu|por que|porque/.test(q)) {
    return {
      steps: read('o comparativo com ontem', [`Hoje: ${f.today}`, `Ontem: ${f.yesterday}`]),
      text: `Até as ${t.cutoff} foram **${f.today}** atendimentos, contra ${f.yesterday} ontem no mesmo horário (${signed(f.change)}). Quem mais puxou foi o ${Math.abs(f.child) > Math.abs(f.adult) ? `infantil (${signed(f.child)})` : `adulto (${signed(f.adult)})`}.\n\nO dashboard mostra o quanto mudou, mas não o porquê: para isso eu cruzaria com a escala ou com o tempo de espera, se você quiser.`,
    }
  }
  return null
}
