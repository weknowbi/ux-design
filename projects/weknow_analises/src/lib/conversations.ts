import { useSyncExternalStore } from 'react'
import { addAlertTask } from '@/data/alerts'
import { updateUser } from '@/data/settings'
import { create } from '@/engine/assistant'
import { swapCode, understand, type Plan, type PlanOption } from '@/engine/mcp'
import { call, stepLabel, type Step } from '@/engine/tools'
import { createAnalysis, currentAnalyses, deleteAnalysis, linkConversation } from '@/lib/store'
import { analyzeMoment, answerMoment, captureMoment, momentWhen, readMomentSteps, type Moment } from '@/engine/moment'
import { createInsight, updateInsight, type Insight } from '@/lib/insights'
import { PORTAL_ROOT, flatten, type Dashboard } from '@/data/portal'

/**
 * As conversas do Weknow IA: o histórico que a pessoa reabre pela lista. Ficam
 * no navegador, como os dashboards (`lib/store`).
 *
 * O trabalho mora aqui, e não na tela: trocar de conversa ou de tela no meio
 * de uma resposta não a perde, ela chega na conversa dela.
 *
 * Como o Claude com o MCP, a IA faz direto o que só a pessoa vê (ler,
 * consultar, achar uma tela, criar um rascunho) e só espera confirmação para o
 * que muda algo de outra pessoa: um cadastro (`pending`).
 */

export type Entry =
  /** `moment`: o momento do dashboard que a pessoa trouxe junto (o "Analisar com IA" do dashboard). */
  | { id: number; role: 'user'; text: string; moment?: Moment }
  /**
   * `text` é markdown; `steps`, as chamadas de ferramenta que levaram a ela.
   * `about`: o metadado lido (ou os metadados), para a lista dizer de onde ela
   * veio. `made`: o dashboard que ela criou, para "usa o 32" saber o que refazer.
   */
  | {
      id: number
      role: 'ai'
      text: string
      steps?: Step[]
      options?: PlanOption[]
      link?: { label: string; path: string }
      about?: string | string[]
      made?: { code: string; request: string }
      /** A mensagem do alerta, como chega no WhatsApp: o que foi criado, ou o teste. */
      preview?: { message: string; sample?: boolean }
      /** O alerta que ela criou, para "manda um teste" saber qual. */
      alert?: { title: string; code: string; message: string; sample?: boolean }
      /** A análise que ela criou (ou de que a conversa trata), pelo id. */
      insight?: string
    }

/** O que espera confirmação: o que muda algo de outra pessoa (o cadastro dela) ou manda mensagem para ela (um alerta). */
export type Pending = Extract<Plan, { kind: 'user' | 'alert' }>

/**
 * `moment`: o contexto da conversa, quando ela é sobre um momento de um
 * dashboard. As perguntas seguintes partem dele, em vez de a IA procurar um
 * metadado do zero.
 */
export type Conversation = { id: string; title: string; entries: Entry[]; pending: Pending | null; updatedAt: number; moment?: Moment }

/** O que está sendo consultado em cada conversa, e até onde foi. Não se guarda. */
export type Work = { steps: string[]; done: number }

type State = { list: Conversation[]; work: Record<string, Work> }

const KEY = 'wk-ia-v1'
const EXAMPLES_KEY = 'wk-ia-examples-v8'

let seq = Date.now()

type AiEntry = Omit<Extract<Entry, { role: 'ai' }>, 'id' | 'role'>

/** A resposta de um plano, como entra na conversa. */
const entryOf = (plan: Plan): AiEntry => ({
  text: plan.reply,
  steps: plan.steps,
  ...(plan.kind === 'reply' ? { options: plan.options, about: plan.about, link: plan.link } : {}),
  ...(plan.kind === 'open' ? { link: { label: `Abrir ${plan.page.name}`, path: `/configuracoes/${plan.page.id}` } } : {}),
})

const createCall = (code: string, request: string, title: string) =>
  call('criar_dashboard', 'Criando o dashboard', { metadado: code, pedido: request }, [`Rascunho "${title}" em Meus rascunhos`])

/**
 * O histórico de exemplo, para o protótipo já abrir com cara de uso: situações
 * do dia a dia de quem usa o Weknow, a maioria terminando numa resposta. As
 * respostas saem do mesmo `understand` das conversas de verdade, e os
 * dashboards são os de exemplo do portal, então os botões levam a lugares que
 * existem. Entra uma vez: quem excluir um não o vê voltar.
 */
function examples(): Conversation[] {
  const ago = (hours: number) => Date.now() - hours * 3600e3
  const user = (text: string): Entry => ({ id: ++seq, role: 'user', text })
  const ai = (e: AiEntry): Entry => ({ id: ++seq, role: 'ai', ...e })
  const chat = (hours: number, title: string, entries: Entry[], pending: Pending | null = null): Conversation => ({
    id: `ia-${(++seq).toString(36)}`,
    title,
    entries,
    pending,
    updatedAt: ago(hours),
  })
  const asked = (hours: number, text: string) => {
    const plan = understand(text)
    return chat(hours, text, [user(text), ai(entryOf(plan))], plan.kind === 'user' || plan.kind === 'alert' ? plan : null)
  }

  /* O dashboard de exemplo, se ainda existir neste navegador; senão, um novo. */
  const boardFor = (name: string, code: string, text: string, conversation: string) => {
    const found = currentAnalyses().find((a) => (a.board.saved?.name ?? a.board.title) === name)
    if (found) {
      linkConversation(found.board.id, conversation)
      return found.board.id
    }
    const r = create({ kind: 'metadado', code }, text, { conversation })
    if (!r) return null
    createAnalysis({ board: { ...r.board, title: name }, messages: r.messages })
    return r.board.id
  }
  const withDashboard = (hours: number, name: string, text: string) => {
    const plan = understand(text)
    if (plan.kind !== 'dashboard') return asked(hours, text)
    const c = chat(hours, text, [user(text)])
    const id = boardFor(name, plan.code, text, c.id)
    c.entries.push(
      ai({
        ...entryOf(plan),
        options: plan.options,
        steps: [...plan.steps, createCall(plan.code, plan.request, name)],
        ...(id ? { link: { label: 'Abrir dashboard', path: `/dashboard/${id}` }, made: { code: plan.code, request: plan.request } } : {}),
      }),
    )
    return c
  }

  /* O Bruno já está inativo no cadastro de exemplo: a conversa conta o que a tela de Usuários mostra. */
  const bruno = 'Desativar o acesso do Bruno Tavares'
  const brunoChat = chat(72, bruno, [
    user(bruno),
    ai({
      text: 'Encontrei Bruno Tavares (bruno.tavares@weknow.com.br). Isto muda o acesso de outra pessoa, então confira antes de eu aplicar:',
      steps: [
        call('buscar_usuarios', 'Procurando em Usuários', { busca: bruno }, ['Bruno Tavares · bruno.tavares@weknow.com.br']),
        call('ler_usuario', 'Lendo o cadastro de Bruno Tavares', { nome: 'Bruno Tavares' }, ['Ativo · Visualizador · validade: sem prazo']),
      ],
    }),
    ai({
      text: 'Pronto. Bruno Tavares: situação agora é inativo.',
      steps: [call('alterar_usuario', 'Salvando o cadastro', { nome: 'Bruno Tavares', situacao: 'Inativo' }, ['Cadastro salvo'])],
      link: { label: 'Abrir Usuários', path: '/configuracoes/usuarios' },
    }),
  ])

  return [
    asked(0.5, 'Me avisa no WhatsApp quando a glosa da Bradesco Saúde passar de 5%, e avisa também o pessoal do faturamento'),
    asked(1, 'Tornar a Camila Ferraz administradora'),
    asked(2, 'Qual convênio mais glosou em outubro?'),
    withDashboard(3, 'Raio-x do faturamento e das glosas', 'Um raio-x do faturamento e das glosas'),
    asked(4, 'Os setores com permanência maior também glosam mais?'),
    asked(6, 'Resumo das internações de outubro para a reunião de diretoria'),
    asked(8, 'Me mostra todos os usuários'),
    asked(26, 'Por que a permanência média subiu em outubro?'),
    asked(30, 'Onde mudo as permissões?'),
    asked(50, 'Por que o MAPA da ANS não aparece para criar dashboard?'),
    brunoChat,
    asked(80, 'Quais dashboards usam o 32 - Faturamento e glosas?'),
    asked(98, 'O que é taxa de glosa e como ela é calculada?'),
    withDashboard(120, 'Permanência média em outubro', 'Quero um dashboard da permanência média para a diretoria'),
    asked(20 * 24, 'O que você consegue fazer aqui?'),
  ]
}

/** Exemplos de versões anteriores que não fazem mais sentido (esperavam a escolha do metadado). */
const RETIRED = ['Taxa de glosa por convênio', 'Me avisa no WhatsApp quando a glosa da Bradesco Saúde passar de 8%, e avisa também o pessoal do faturamento']

/** Conversas de antes: só o cadastro e o alerta ainda esperam confirmação; o resto já acontece direto. */
const clean = (c: Conversation): Conversation => ({ ...c, pending: c.pending?.kind === 'user' || c.pending?.kind === 'alert' ? c.pending : null })

function load(): Conversation[] {
  let list: Conversation[] = []
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (Array.isArray(raw)) list = raw.map(clean)
    if (localStorage.getItem(EXAMPLES_KEY)) return list
    localStorage.setItem(EXAMPLES_KEY, '1')
  } catch {
    /* sem armazenamento: os exemplos valem só nesta visita */
  }
  /* Mudar a chave troca os exemplos: o de mesmo nome sai, em vez de ficar
     dobrado, e os aposentados saem. As conversas da pessoa ficam. */
  const fresh = examples()
  const merged = [...list.filter((c) => !fresh.some((e) => e.title === c.title) && !RETIRED.includes(c.title)), ...fresh].sort((a, b) => b.updatedAt - a.updatedAt)
  try {
    localStorage.setItem(KEY, JSON.stringify(merged))
  } catch {
    /* idem */
  }
  return merged
}

let state: State = { list: load(), work: {} }
const listeners = new Set<() => void>()

function commit(next: Partial<State>) {
  state = { ...state, ...next }
  if (next.list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next.list))
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
  }
  listeners.forEach((l) => l())
}

export function useConversations() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

const find = (id: string) => state.list.find((c) => c.id === id)

/** A mais recente sobe na lista quando recebe algo novo. */
function update(id: string, f: (c: Conversation) => Conversation, touch = true) {
  const cur = find(id)
  if (!cur) return
  const next = f(cur)
  commit({ list: touch ? [{ ...next, updatedAt: Date.now() }, ...state.list.filter((c) => c.id !== id)] : state.list.map((c) => (c.id === id ? next : c)) })
}

const say = (id: string, e: AiEntry) => update(id, (c) => ({ ...c, entries: [...c.entries, { id: ++seq, role: 'ai', ...e }] }))

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function run(id: string, steps: string[]) {
  const setWork = (w?: Work) => {
    const work = { ...state.work }
    if (w) work[id] = w
    else delete work[id]
    commit({ work })
  }
  setWork({ steps, done: 0 })
  for (let i = 0; i < steps.length; i++) {
    await sleep(380)
    setWork({ steps, done: i + 1 })
  }
  await sleep(120)
  setWork()
}

export function setPending(id: string, pending: Pending | null) {
  update(id, (c) => ({ ...c, pending }), false)
}

export function renameConversation(id: string, title: string) {
  update(id, (c) => ({ ...c, title }), false)
}

export function deleteConversation(id: string) {
  commit({ list: state.list.filter((c) => c.id !== id) })
}

/** Abre uma conversa com a primeira mensagem: o nome dela na lista é o começo dela. */
export function startConversation(text: string): string {
  const line = text.trim().split('\n')[0]
  const id = `ia-${(++seq).toString(36)}`
  commit({ list: [{ id, title: line.length > 64 ? `${line.slice(0, 64).trimEnd()}…` : line, entries: [], pending: null, updatedAt: Date.now() }, ...state.list] })
  void sendRequest(id, text)
  return id
}

/** O último dashboard que esta conversa criou: a entrada e o id dele. */
function lastMade(c: Conversation) {
  const e = [...c.entries].reverse().find((x): x is Extract<Entry, { role: 'ai' }> => x.role === 'ai' && !!x.made)
  const board = e?.link?.path.startsWith('/dashboard/') ? e.link.path.slice('/dashboard/'.length) : undefined
  return e?.made ? { ...e.made, board } : null
}

export async function sendRequest(id: string, text: string) {
  const cur = find(id)
  if (!cur || state.work[id]) return
  update(id, (c) => ({ ...c, entries: [...c.entries, { id: ++seq, role: 'user', text }] }))

  /* "Manda um teste" depois de criar um alerta: a mensagem vai só para a pessoa. */
  const alert = [...cur.entries].reverse().find((e): e is Extract<Entry, { role: 'ai' }> => e.role === 'ai' && !!e.alert)?.alert
  if (alert && /\bteste\b|\btestar\b/.test(text.toLowerCase())) {
    if (cur.pending) setPending(id, null)
    await run(id, ['Enviando o teste'])
    say(id, {
      text: 'Mandei um teste só para o seu WhatsApp. Chegou assim:',
      steps: [call('enviar_teste_alerta', 'Enviando o teste', { tarefa: alert.title, para: 'Você' }, ['Mensagem entregue no WhatsApp'])],
      preview: { message: `*Teste* · ${alert.message}`, sample: alert.sample },
    })
    return
  }

  /* Conversa sobre um momento de dashboard: a pergunta parte dele. Pedir a
     análise de novo escreve outra, com os mesmos números. */
  const t = norm(text)
  if (cur.moment) {
    if (/\b(gera|gerar|faz|fazer|refaz|refazer|nova|outra|escreve|escrever)\b.{0,24}analise/.test(t)) {
      if (cur.pending) setPending(id, null)
      await analyze(id, cur.moment)
      return
    }
    const ans = answerMoment(cur.moment, text)
    if (ans) {
      if (cur.pending) setPending(id, null)
      await run(id, ans.steps.map(stepLabel))
      say(id, { text: ans.text, steps: ans.steps })
      return
    }
  }

  /* "Faz uma análise do dashboard de tempo de espera": a IA acha o dashboard
     e registra o momento dele agora, como o botão do dashboard faria. */
  const asked = dashboardAsked(t)
  if (asked) {
    if (cur.pending) setPending(id, null)
    if (asked.found) {
      const m = captureMoment(asked.found.id, asked.found.name, 0)
      update(id, (c) => ({ ...c, moment: m }))
      await analyze(id, m, [call('buscar_dashboards', 'Procurando nos dashboards', { busca: text.trim() }, [asked.found.name])])
      return
    }
    await run(id, ['Procurando nos dashboards'])
    say(id, {
      text: 'De qual dashboard? Diga o nome, ou abra o dashboard e use **Análise inteligente** na barra de baixo: aí a análise já parte da aba e dos filtros que você está vendo.',
      steps: [call('buscar_dashboards', 'Procurando nos dashboards', { busca: text.trim() }, asked.options.map((d) => d.name))],
      options: asked.options.map((d) => ({ label: d.name, text: `Faz uma análise do dashboard ${d.name}` })),
    })
    return
  }

  /* "usa o 32" depois de um dashboard: refaz o mesmo pedido com outro metadado. */
  const swap = swapCode(text)
  const made = lastMade(cur)
  const plan = swap && made ? understand(`Refazer com o metadado ${swap}: ${made.request}`) : understand(text)

  /* Uma mensagem nova deixa para trás o que esperava confirmação, como no Claude. */
  if (cur.pending) setPending(id, null)

  if (plan.kind === 'dashboard') {
    await run(id, [...plan.steps.map(stepLabel), 'Criando o dashboard'])
    const r = create({ kind: 'metadado', code: plan.code }, plan.request, { conversation: id })
    if (!r) {
      say(id, { text: 'Não consegui montar o dashboard com esses dados.', steps: plan.steps })
      return
    }
    createAnalysis({ board: r.board, messages: r.messages })
    /* Refazer troca o rascunho: o anterior sai, se ninguém além da pessoa o viu. */
    let note = ''
    if (plan.replaces && made?.board) {
      const old = currentAnalyses().find((a) => a.board.id === made.board)
      if (old && !old.board.saved) {
        deleteAnalysis(old.board.id)
        note = `\n\nO rascunho anterior, com o ${made.code}, saiu de Meus rascunhos.`
      } else if (old) note = `\n\nO anterior, com o ${made.code}, continua publicado.`
    }
    say(id, {
      /* Onde ele está depois (publicado, em que pasta) quem diz é o cartão, ao vivo. */
      text: `${plan.reply}\n\nEle está em Meus rascunhos: só você o vê até publicar.${note}`,
      steps: [...plan.steps, createCall(plan.code, plan.request, r.board.title)],
      options: plan.options,
      link: { label: 'Abrir dashboard', path: `/dashboard/${r.board.id}` },
      made: { code: plan.code, request: plan.request },
    })
    return
  }

  await run(id, plan.steps.length ? plan.steps.map(stepLabel) : ['Lendo sua mensagem'])
  say(id, entryOf(plan))
  if (plan.kind === 'user' || plan.kind === 'alert') setPending(id, plan)
}

/** Aplica a mudança de cadastro que espera confirmação. */
export async function confirmPending(id: string) {
  const pending = find(id)?.pending
  if (!pending || state.work[id]) return
  if (pending.kind === 'alert') {
    const a = pending.alert
    setPending(id, null)
    await run(id, ['Criando a tarefa do alerta'])
    const code = addAlertTask(a.title)
    const names = a.recipients.map((r) => (r.you ? 'você' : r.name))
    const who = names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
    say(id, {
      text: `Pronto. O alerta virou a tarefa **${code} - ${a.title}**, em Tarefas. Ele confere a cada execução do ${a.code} e avisa ${who} quando a condição valer. Depois, só avisa de novo se o valor voltar ao normal e passar outra vez.

A mensagem chega assim:`,
      steps: [call('criar_tarefa_alerta', 'Criando a tarefa do alerta', { metadado: a.code, condicao: `${a.subject}: ${a.condition.toLowerCase()}`, para: a.recipients.map((r) => `${r.name} (${r.via})`).join(', ') }, [`Tarefa ${code} criada`])],
      preview: { message: a.message, sample: a.sample },
      alert: { title: a.title, code: a.code, message: a.message, sample: a.sample },
      options: [{ label: 'Mandar um teste para mim', text: 'Manda um teste do alerta para mim' }],
      link: { label: 'Abrir em Tarefas', path: '/tarefas' },
    })
    return
  }
  const { user, set, changes } = pending
  setPending(id, null)
  await run(id, ['Salvando o cadastro'])
  updateUser(user.code, set)
  say(id, {
    text: `Pronto. ${user.name.split(',')[0]}: ${changes.map((c) => `${c.label.toLowerCase()} agora é ${c.to.toLowerCase()}`).join(', ')}.`,
    steps: [call('alterar_usuario', 'Salvando o cadastro', { nome: user.name.split(',')[0], ...Object.fromEntries(changes.map((c) => [c.label, c.to])) }, ['Cadastro salvo'])],
    link: { label: 'Abrir Usuários', path: '/configuracoes/usuarios' },
  })
}

/* ───────────────────────────────────────────── análise de um momento */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const dashboards = () => flatten(PORTAL_ROOT).flatMap((e) => (e.item.kind === 'dashboard' ? [e.item as Dashboard] : []))

/** Pediu a análise de um dashboard? Qual, pelo nome (ou pelo assunto, no caso do pronto-socorro). */
function dashboardAsked(t: string): { found?: Dashboard; options: Dashboard[] } | null {
  if (!/analis/.test(t) || !/dashboard|painel/.test(t)) return null
  /* "Criar um dashboard de análise de..." é pedir um dashboard, e não a análise de um. */
  if (/\b(cria|criar|crie|monta|montar|quero um|novo)\b.{0,12}(dashboard|painel)/.test(t)) return null
  const all = dashboards()
  const words = (n: string) => norm(n).split(/[^a-z0-9]+/).filter((w) => w.length > 3)
  const found =
    all.find((d) => norm(d.name).length > 4 && t.includes(norm(d.name))) ??
    all.find((d) => {
      const w = words(d.name)
      return w.length > 0 && w.filter((x) => t.includes(x)).length >= Math.min(2, w.length)
    }) ??
    (/pronto.?socorro|\bps\b|atendimento/.test(t) ? all.find((d) => d.name === 'Tempo de espera no PS') : undefined)
  const options = ['Tempo de espera no PS', 'Painel executivo geral', 'Classificação de risco (Protocolo de Manchester)']
  return { found, options: all.filter((d) => options.includes(d.name)) }
}

const MOMENT_OPTIONS = [
  { label: 'E o infantil?', text: 'Como ficou o infantil?' },
  { label: 'Qual o horário de pico?', text: 'Qual foi o horário de pico?' },
  { label: 'Por convênio', text: 'Como ficou por convênio?' },
]

/** Lê o momento, escreve a análise e a salva no dashboard. */
async function analyze(id: string, moment: Moment, before: Step[] = []) {
  const steps = [...before, ...readMomentSteps(moment)]
  await run(id, [...steps.map(stepLabel), 'Escrevendo a análise'])
  const a = analyzeMoment(moment)
  const it = createInsight({ title: a.title, moment, text: a.text, by: 'ia', conversation: id })
  say(id, {
    /* A análise vem na resposta, para ler ali mesmo; o cartão embaixo diz onde
       ela ficou salva, que é onde se edita, comenta e compartilha. */
    text: `Analisei a aba **${moment.tabName}** do **${moment.dashboardName}**, com os números de ${momentWhen(moment)}.\n\n${a.text}\n\nSalvei a análise no dashboard: lá dá para editar, comentar e compartilhar. Se quiser, continue perguntando aqui sobre este momento.`,
    steps: [...steps, call('criar_analise', 'Salvando a análise', { dashboard: moment.dashboardName, aba: moment.tabName, titulo: a.title }, ['Análise salva em Análises do dashboard'])],
    insight: it.id,
    options: MOMENT_OPTIONS,
  })
}

/** O "Analisar com IA" do dashboard: a conversa já nasce com o momento. */
export function startFromMoment(moment: Moment): string {
  const id = `ia-${(++seq).toString(36)}`
  const first: Entry = { id: ++seq, role: 'user', text: 'Analisa este momento do dashboard', moment }
  commit({ list: [{ id, title: `Análise do ${moment.dashboardName}`, entries: [first], pending: null, updatedAt: Date.now(), moment }, ...state.list] })
  void analyze(id, moment)
  return id
}

/**
 * Continuar perguntando sobre uma análise: a conversa em que ela nasceu, ou
 * uma nova com o momento dela, se foi escrita à mão ou a conversa saiu.
 */
export function conversationFor(it: Insight): string {
  if (it.conversation && find(it.conversation)) return it.conversation
  const id = `ia-${(++seq).toString(36)}`
  const entries: Entry[] = [
    { id: ++seq, role: 'user', text: `Quero conversar sobre a análise "${it.title}"`, moment: it.moment },
    {
      id: ++seq,
      role: 'ai',
      text: `Esta conversa parte do mesmo momento da análise: a aba **${it.moment.tabName}** do **${it.moment.dashboardName}**, com os números de ${momentWhen(it.moment)}. O que você quer saber?`,
      insight: it.id,
      options: MOMENT_OPTIONS,
    },
  ]
  commit({ list: [{ id, title: it.title, entries, pending: null, updatedAt: Date.now(), moment: it.moment }, ...state.list] })
  updateInsight(it.id, { conversation: id })
  return id
}

export function cancelPending(id: string) {
  setPending(id, null)
  say(id, { text: 'Certo, não mudei nada.' })
}
