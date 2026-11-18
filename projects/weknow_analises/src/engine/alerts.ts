import { CURRENT, DATA, type Cell } from '@/engine/data'
import * as F from '@/engine/format'
import { catalogItem } from '@/engine/catalog'
import { CURRENT_USER } from '@/data/account'
import { USERS, type User } from '@/data/settings'
import { call, label, readCall, type Step } from '@/engine/tools'

/**
 * Alertas: "me avisa no WhatsApp quando a glosa da Bradesco passar de 8%".
 * Em vez de a pessoa ir atrás do número, o número vai até ela, e até quem
 * mais precisa saber.
 *
 * O alerta é uma tarefa do Weknow, como os envios agendados que já existem:
 * confere o indicador a cada execução do metadado e manda a mensagem quando
 * ele cruza o limite. Como manda mensagem para outras pessoas, ele espera
 * confirmação, como mudar um cadastro.
 *
 * Simulado por regras, como o resto do `mcp.ts`.
 */

export type Recipient = { name: string; via: 'WhatsApp' | 'E-mail'; address: string; you?: boolean }

export type AlertSpec = {
  /** O nome da tarefa em Tarefas. */
  title: string
  code: string
  /** "Taxa de glosa da Bradesco Saúde". */
  subject: string
  condition: string
  /** O valor de agora, já formatado, e se ele já passou do limite. */
  current: string
  crossed: boolean
  schedule: string
  recipients: Recipient[]
  /** A mensagem, como chega no WhatsApp. */
  message: string
  /** O indicador ainda não passou do limite: a mensagem mostra um valor de exemplo. */
  sample: boolean
}

const sum = (xs: Cell[], f: string) => xs.reduce((a, c) => a + Number(c[f]), 0)
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)
const first = (u: User) => u.name.split(',')[0].trim()
/** O número aparece pela metade: dá para conferir sem expor o contato inteiro. */
const mask = (phone: string) => phone.replace(/(\(\d+\) \d)\d{4}/, '$1••••')

const CONVENIOS = ['SUS', 'Unimed', 'Bradesco Saúde', 'Particular']
const SETORES = ['Clínica médica', 'Cirurgia geral', 'Obstetrícia', 'Ortopedia', 'Pediatria', 'Cardiologia']
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const SCHEDULE = 'A cada execução do metadado, todo dia às 06h'

type Indicator = {
  code: string
  name: string
  unit: 'pct' | 'dias'
  /** O valor do mês, com o filtro (um convênio, um setor), na unidade do limite. */
  value: (filter?: { field: string; value: string }) => number
  /** O painel do portal para abrir a partir da mensagem. */
  link: string
}

const INDICATORS: { re: RegExp; ind: Indicator }[] = [
  {
    re: /glosa/,
    ind: {
      code: '32',
      name: 'taxa de glosa',
      unit: 'pct',
      value: (f) => {
        const xs = DATA.glosa.filter((c) => c.mes === CURRENT && (!f || c[f.field] === f.value))
        return (sum(xs, 'valor_glosado') / sum(xs, 'valor_faturado')) * 100
      },
      link: 'weknow.app/d/glosas',
    },
  },
  {
    re: /permanencia/,
    ind: {
      code: '21',
      name: 'permanência média',
      unit: 'dias',
      value: (f) => {
        const xs = DATA.permanencia.filter((c) => c.mes === CURRENT && (!f || c[f.field] === f.value))
        return sum(xs, 'paciente_dias') / sum(xs, 'saidas')
      },
      link: 'weknow.app/d/permanencia',
    },
  },
]

const fmt = (v: number, unit: Indicator['unit']) => (unit === 'pct' ? `${F.num(v, 1)}%` : `${F.num(v, 1)} dias`)
/** O limite como a pessoa disse: "8%", e não "8,0%". */
const fmtLimit = (v: number, unit: Indicator['unit']) => {
  const n = F.num(v, Number.isInteger(v) ? 0 : 1)
  return unit === 'pct' ? `${n}%` : `${n} dias`
}

/** Quem recebe: a própria pessoa, sempre, e quem a mensagem citar (um grupo de contato ou um nome). */
function recipientsOf(t: string): { people: User[]; group?: string } {
  const me = USERS.find((u) => u.email === CURRENT_USER.email)!
  const people: User[] = [me]
  let group: string | undefined
  const g = /faturamento|contas medicas/.test(t) ? 'Faturamento' : /diretoria|diretores|gerentes|gestores/.test(t) ? 'Diretoria' : /enfermagem/.test(t) ? 'Enfermagem' : undefined
  if (g) {
    group = g
    USERS.filter((u) => u.active && u.contactGroups.includes(g) && u !== me).forEach((u) => people.push(u))
  }
  USERS.filter((u) => u.active && u !== me && !people.includes(u) && new RegExp(`\\b${norm(first(u).split(' ')[0])}\\b`).test(t) && first(u).split(' ')[0].length > 3).forEach((u) =>
    people.push(u),
  )
  return { people, group }
}

export type AlertPlan =
  | { kind: 'alert'; reply: string; steps: Step[]; alert: AlertSpec }
  | { kind: 'reply'; reply: string; steps: Step[]; options?: { label: string; text: string }[]; about?: string }

export function alertPlan(raw: string, t: string): AlertPlan | null {
  const asks = /\b(me )?avis[ae]|\balert|whats|\bzap\b/.test(t)
  if (!asks) return null
  const found = INDICATORS.find((i) => i.re.test(t))
  if (!found) {
    return {
      kind: 'reply',
      steps: [],
      reply: 'Sobre qual indicador? Diga o que acompanhar e a partir de quanto avisar, por exemplo: "me avisa quando a taxa de glosa da Bradesco Saúde passar de 8%".',
      options: [
        { label: 'Glosa da Bradesco acima de 8%', text: 'Me avisa no WhatsApp quando a glosa da Bradesco Saúde passar de 8%' },
        { label: 'Permanência da clínica médica acima de 7 dias', text: 'Me avisa no WhatsApp quando a permanência média da Clínica médica passar de 7 dias' },
      ],
    }
  }
  const ind = found.ind
  const item = catalogItem(ind.code)!
  const conv = CONVENIOS.find((c) => t.includes(norm(c).split(' ')[0]))
  const setor = SETORES.find((s) => t.includes(norm(s)))
  const filter = conv ? { field: 'convenio', value: conv } : setor ? { field: 'setor', value: setor } : undefined
  const subject = `${ind.name[0].toUpperCase()}${ind.name.slice(1)}${filter ? ` ${filter.field === 'convenio' ? 'da' : 'na'} ${filter.value}` : ''}`
  const now = ind.value(filter)
  const steps: Step[] = [
    call('buscar_metadados', 'Procurando nos metadados', { busca: raw.trim() }, [`${label(item)}: cobre ${ind.name}`]),
    readCall(item),
    call('consultar_dados', `Lendo ${ind.name} de ${F.monthName(CURRENT)}`, { metadado: ind.code, medida: ind.name, ...(filter ? { [filter.field]: filter.value } : {}), periodo: CURRENT }, [fmt(now, ind.unit)]),
  ]

  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(%|por cento|dias?)?/)
  const value = filter ? `${ind.name} ${filter.field === 'convenio' ? 'da' : 'na'} ${filter.value}` : ind.name
  if (!m) {
    const suggest = ind.unit === 'pct' ? Math.ceil(now + 1) : Math.ceil(now + 0.5)
    return {
      kind: 'reply',
      steps,
      about: ind.code,
      reply: `A ${value} está em **${fmt(now, ind.unit)}** em ${F.monthName(CURRENT)}. A partir de quanto eu aviso?`,
      options: [{ label: `Acima de ${fmtLimit(suggest, ind.unit)}`, text: `${raw.trim()} quando passar de ${F.num(suggest)}${ind.unit === 'pct' ? '%' : ' dias'}` }],
    }
  }
  const limit = Number(m[1].replace(',', '.'))
  const below = /abaixo|menor|cair|baixar/.test(t)
  const crossed = below ? now < limit : now > limit
  const condition = `${below ? 'Abaixo de' : 'Acima de'} ${fmtLimit(limit, ind.unit)}`

  const { people, group } = recipientsOf(t)
  const wantsWhats = /whats|\bzap\b/.test(t)
  const recipients: Recipient[] = people.map((u) => {
    const you = u.email === CURRENT_USER.email
    return wantsWhats && u.whatsapp
      ? { name: you ? 'Você' : first(u), via: 'WhatsApp', address: mask(u.whatsapp), you }
      : { name: you ? 'Você' : first(u), via: 'E-mail', address: u.email, you }
  })
  if (group) {
    steps.push(
      call(
        'buscar_contatos',
        `Procurando o grupo de contato ${group}`,
        { busca: group },
        people.filter((u) => u.email !== CURRENT_USER.email).map((u) => `${first(u)} · ${u.whatsapp ? `WhatsApp ${mask(u.whatsapp)}` : 'sem WhatsApp, só e-mail'}`),
      ),
    )
  }

  /* Ainda dentro do limite: a prévia mostra um valor de exemplo, logo depois dele. */
  const step = ind.unit === 'pct' ? 0.4 : 0.3
  const shown = crossed ? now : below ? limit - step : limit + step
  const message = [
    `*Alerta do Weknow*`,
    `A ${value} está em *${fmt(shown, ind.unit)}*, ${below ? 'abaixo' : 'acima'} do limite de ${fmtLimit(limit, ind.unit)}.`,
    `Abrir no Weknow: ${ind.link}`,
  ].join('\n')

  const noWhats = wantsWhats ? recipients.filter((r) => r.via === 'E-mail') : []
  const others = recipients.filter((r) => !r.you).map((r) => r.name)
  const reply = [
    `Montei o alerta com o **${label(item)}**. A ${value} está em **${fmt(now, ind.unit)}** em ${F.monthName(CURRENT)}${crossed ? `, já ${below ? 'abaixo' : 'acima'} do limite: o primeiro aviso sai amanhã às 06h, depois da próxima execução.` : '.'}`,
    noWhats.length ? `${list(noWhats.map((r) => r.name))} não ${noWhats.length > 1 ? 'têm' : 'tem'} WhatsApp no cadastro, então ${noWhats.length > 1 ? 'recebem' : 'recebe'} por e-mail.` : '',
    others.length ? `Ele manda mensagem para outras pessoas${group ? ` do grupo ${group}` : ''}, então confira antes de eu criar:` : 'Confira antes de eu criar:',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    kind: 'alert',
    steps,
    reply,
    alert: {
      title: `Alerta: ${value} ${below ? 'abaixo' : 'acima'} de ${fmtLimit(limit, ind.unit)}`,
      code: ind.code,
      subject,
      condition,
      current: fmt(now, ind.unit),
      crossed,
      schedule: SCHEDULE.replace('do metadado', `do ${ind.code}`),
      recipients,
      message,
      sample: !crossed,
    },
  }
}
