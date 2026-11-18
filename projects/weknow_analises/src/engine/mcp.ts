import { alertPlan, type AlertSpec } from '@/engine/alerts'
import { answerFor } from '@/engine/answers'
import { CATALOG, DASHBOARDS, catalogItem, type CatalogItem } from '@/engine/catalog'
import { call, label, readCall, usable, type Step } from '@/engine/tools'
import { SETTINGS_PAGES, USERS, roleSet, type RoleLevel, type SettingsPage, type User } from '@/data/settings'

/**
 * O que está por trás do Weknow IA: uma mensagem em português vira chamadas às
 * mesmas ferramentas que o MCP do Weknow expõe para uma IA de fora (procurar e
 * ler metadados, consultar dados, ler e mudar cadastros, achar telas, criar
 * dashboards), e uma resposta.
 *
 * A regra é a do Claude usando o MCP: a IA escolhe as ferramentas e os
 * metadados sozinha, usa quantos precisar, mostra cada chamada (`steps`) e só
 * pede permissão para o que muda algo que outras pessoas veem (um cadastro).
 * Ler, consultar, achar uma tela e criar um rascunho, que só a pessoa vê,
 * acontecem direto; corrigir é conversando ("usa o 32").
 *
 * Simulado por regras, como o `assistant.ts`, para rodar sem chave de API.
 * Num produto, um modelo recebe a mensagem e as ferramentas e devolve a mesma
 * coisa. Os nomes das ferramentas aqui são provisórios: valem os do MCP.
 */

export type { Step, ToolCall } from '@/engine/tools'
export { stepLabel, usable } from '@/engine/tools'

export type Candidate = {
  item: CatalogItem
  /** O que da mensagem este metadado cobre: "permanência", "convênio". */
  covers: string[]
  /** Falou do assunto dele, e não só de um campo que vários têm (setor, convênio). */
  strong: boolean
}

export type UserChange = { label: string; from: string; to: string }

/** Uma resposta pronta para continuar: o rótulo do botão e o texto que ele envia. */
export type PlanOption = { label: string; text: string }

export type Plan =
  /** Criar um rascunho: acontece direto. `code` é o metadado escolhido; `replaces`, o pedido refeito com outro. */
  | { kind: 'dashboard'; request: string; code: string; reply: string; steps: Step[]; options?: PlanOption[]; replaces?: boolean }
  | { kind: 'user'; reply: string; steps: Step[]; user: User; set: Partial<User>; changes: UserChange[] }
  | { kind: 'open'; reply: string; steps: Step[]; page: SettingsPage }
  /** Um alerta: manda mensagem para outras pessoas, então espera confirmação, como o cadastro. */
  | { kind: 'alert'; reply: string; steps: Step[]; alert: AlertSpec }
  /**
   * Só uma resposta, e talvez opções para continuar. `about` é o que ela leu,
   * quando responde com dados (`engine/answers`); `link`, uma tela para abrir.
   */
  | { kind: 'reply'; reply: string; steps: Step[]; options?: PlanOption[]; unknown?: boolean; about?: string | string[]; link?: { label: string; path: string } }

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)


/* ─────────────────────────────────────────────── procurar metadados */

/* O assunto de cada metadado. No produto é a busca no catálogo, com a
   descrição, os campos e a configuração de cada um. */
const SUBJECTS: Record<string, [RegExp, string][]> = {
  '21': [
    [/permanencia/, 'permanência'],
    [/internac|internad/, 'internações'],
    [/\bsaidas?\b|\baltas?\b/, 'saídas'],
    [/paciente.dia|\bdiarias?\b/, 'paciente-dia'],
  ],
  '22': [
    [/pronto.socorro|\bps\b|emergencia/, 'pronto-socorro'],
    [/triagem|manchester|classificacao de risco/, 'classificação de risco'],
    [/\bespera\b/, 'tempo de espera'],
    [/\batendimentos?\b/, 'atendimentos'],
  ],
  '23': [
    [/cirurgi/, 'cirurgias'],
    [/cancelament/, 'cancelamentos'],
    [/\bsalas?\b/, 'tempo de sala'],
  ],
  '24': [
    [/\bleitos?\b/, 'leitos'],
    [/ocupacao/, 'ocupação'],
    [/\bcenso\b/, 'censo diário'],
  ],
  '32': [
    [/glosa/, 'glosas'],
    [/fatura/, 'faturamento'],
    [/\breceita\b|contas? a receber/, 'receita'],
    [/operadora/, 'operadoras'],
  ],
  '33': [[/\bcustos?\b|\bgastos?\b|despesa/, 'custos']],
  '41': [
    [/absente/, 'absenteísmo'],
    [/\bfaltas?\b|afastament/, 'faltas e afastamentos'],
  ],
  '16': [[/\bmapa\b|\bans\b/, 'MAPA da ANS']],
}

function searchMetadata(t: string): Candidate[] {
  const found = CATALOG.map((item) => {
    const subjects = (SUBJECTS[item.code] ?? []).filter(([re]) => re.test(t)).map(([, name]) => name)
    /* Os campos de texto contam menos: setor e convênio estão em vários, e
       sozinhos não dizem qual é o assunto. */
    const fields = item.fields.filter((f) => f.type === 'Texto' && t.includes(norm(f.title))).map((f) => f.title.toLowerCase())
    return { item, covers: [...subjects, ...fields], strong: subjects.length > 0, score: subjects.length * 3 + fields.length }
  }).filter((c) => c.score > 0)
  /* No empate, o que dá para usar vem antes. */
  const ok = (c: { item: CatalogItem }) => (usable(c.item) ? 1 : 0)
  return found
    .sort((a, b) => b.score - a.score || ok(b) - ok(a))
    .slice(0, 3)
    .map(({ item, covers, strong }) => ({ item, covers, strong }))
}

const searchCall = (busca: string, found: Candidate[]) =>
  call(
    'buscar_metadados',
    `Procurando nos ${CATALOG.length} metadados`,
    { busca },
    found.length ? found.map((c) => `${label(c.item)}${c.covers.length ? `: cobre ${list(c.covers)}` : ''}${usable(c.item) ? '' : c.item.failed ? ' (última execução falhou)' : ' (sem dados neste protótipo)'}`) : ['Nenhum metadado encontrado'],
  )


/* ─────────────────────────────────────────────────── criar dashboard */

/** Quem cuida do dashboard: o melhor metadado que dá para usar, e o que mais a mensagem pediu. */
function dashboardPlan(raw: string, t: string, forced?: string): Plan {
  const found = searchMetadata(t)
  const forcedItem = forced ? catalogItem(forced) : undefined
  const steps: Step[] = forcedItem ? [] : [searchCall(raw.trim(), found)]
  const pool = forcedItem ? [{ item: forcedItem, covers: [], strong: true }, ...found.filter((c) => c.item.code !== forced)] : found
  const chosen = pool.find((c) => usable(c.item) && (c.strong || !pool.some((x) => x.strong && usable(x.item))))
  if (!chosen) {
    /* O assunto existe, mas não dá para montar em cima dele agora. */
    const best = pool[0]
    if (best) steps.push(readCall(best.item))
    const why = best?.item.failed ? 'a última execução dele falhou' : 'ele não tem dados neste protótipo'
    return {
      kind: 'reply',
      steps,
      about: best?.item.code,
      reply: best
        ? `O assunto é do **${label(best.item)}**, mas ${why}, então não dá para montar o dashboard agora. Neste protótipo, só **21 - Internações** e **32 - Faturamento e glosas** têm dados.`
        : 'Sobre o quê? Diga o assunto ou a pergunta que o dashboard precisa responder, e eu procuro os dados.',
      options: best ? undefined : SUBJECT_EXAMPLES,
    }
  }
  steps.push(readCall(chosen.item))
  const others = forced ? [] : pool.filter((c) => c !== chosen && c.strong && usable(c.item))
  const why = chosen.covers.length ? `, que cobre ${list(chosen.covers)}` : ''
  const reply = [
    `Criei o dashboard com o **${label(chosen.item)}**${why}.`,
    others.length
      ? `Você também falou de ${list(others[0].covers)}, que fica em **${label(others[0].item)}**. Posso montar outro dashboard com ele, ou cruzar os dois numa resposta.`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const options: PlanOption[] = others.length
    ? [
        { label: `Outro dashboard com ${others[0].item.code}`, text: `Criar um dashboard com o metadado ${others[0].item.code}: ${raw.trim()}` },
        ...(others[0].item.code === '32' || chosen.item.code === '32' ? [{ label: 'Cruzar os dois', text: 'Os setores com permanência maior também glosam mais?' }] : []),
      ]
    : forced
      ? []
      : pool
        .filter((c) => c !== chosen && usable(c.item))
        .slice(0, 1)
        .map((c) => ({ label: `Refazer com ${label(c.item)}`, text: `Refazer com o metadado ${c.item.code}: ${raw.trim()}` }))
  return { kind: 'dashboard', request: raw.trim(), code: chosen.item.code, reply, steps, options: options.length ? options : undefined }
}

/* ─────────────────────────────────────────────────────── cadastros */

const ROLES: [RegExp, RoleLevel][] = [
  [/administrador/, 'Administrador'],
  [/desenvolvedor|analista/, 'Desenvolvedor'],
  [/visualizador|leitor/, 'Visualizador'],
]

const firstName = (u: User) => u.name.split(',')[0].trim()
const yesNo = (v: boolean) => (v ? 'Ativo' : 'Inativo')
const dateBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : 'Sem prazo')
const roleOf = (u: User) => (u.roles.includes('Administrador') ? 'Administrador' : u.roles.includes('Desenvolvedor') ? 'Desenvolvedor' : 'Visualizador')

/** Quem a mensagem cita: o nome inteiro, se houver; senão, um nome ou sobrenome. */
function findUsers(t: string): User[] {
  /* Palavra inteira: "administradora" não é o usuário "Admin". */
  const full = USERS.filter((u) => new RegExp(`\\b${norm(firstName(u))}\\b`).test(t))
  if (full.length) return full
  return USERS.filter((u) =>
    norm(firstName(u))
      .split(' ')
      .some((w) => w.length > 3 && !['admin', 'analista'].includes(w) && new RegExp(`\\b${w}\\b`).test(t)),
  )
}

const readUserCall = (u: User) =>
  call('ler_usuario', `Lendo o cadastro de ${firstName(u)}`, { nome: firstName(u) }, [`${firstName(u)} · ${u.email}`, `${yesNo(u.active)} · ${roleOf(u)} · validade: ${dateBr(u.expiresAt).toLowerCase()}`])

/** Ler o cadastro: "me mostra todos os usuários", "quem é administrador", "quais estão inativos". */
function listUsers(t: string): Plan | null {
  const asks = /\b(lista|listar|liste|mostra|mostre|mostrar|quais|quem|todos|todas|ver|quantos)\b/.test(t)
  if (!asks || !/usuari|administrador|desenvolvedor|visualizador|\bpessoas\b|acesso/.test(t)) return null
  const role = ROLES.find(([re]) => re.test(t))?.[1]
  const filters: [string, (u: User) => boolean][] = []
  if (role) filters.push([`papel ${role.toLowerCase()}`, (u) => roleOf(u) === role])
  if (/inativ|desativad|bloquead/.test(t)) filters.push(['inativos', (u) => !u.active])
  else if (/\bativos?\b/.test(t)) filters.push(['ativos', (u) => u.active])
  if (/prazo|validade|vence|expira/.test(t)) filters.push(['com validade', (u) => !!u.expiresAt])
  const found = USERS.filter((u) => filters.every(([, f]) => f(u)))
  const filtro = filters.map(([n]) => n).join(', ') || 'todos'
  const rows = found.map((u) => `| ${firstName(u)} | ${u.email} | ${roleOf(u)} | ${yesNo(u.active)} | ${dateBr(u.expiresAt)} |`)
  const active = found.filter((u) => u.active).length
  const reply = found.length
    ? [
        filters.length
          ? `Encontrei **${found.length}** ${found.length === 1 ? 'usuário' : 'usuários'} (${filtro}).`
          : `O Weknow tem **${found.length} usuários**: ${active} ativos e ${found.length - active} inativos.`,
        ['| Nome | E-mail | Papel | Situação | Validade |', '| --- | --- | --- | --- | --- |', ...rows].join('\n'),
        'Para mudar alguém, é só dizer: "desativar o acesso do Bruno", "tornar a Camila administradora".',
      ].join('\n\n')
    : `Nenhum usuário ${filtro}.`
  return {
    kind: 'reply',
    steps: [call('listar_usuarios', 'Listando os usuários', { filtro }, [`${found.length} ${found.length === 1 ? 'usuário' : 'usuários'}`])],
    reply,
    link: { label: 'Abrir Usuários', path: '/configuracoes/usuarios' },
  }
}

function userPlan(t: string, raw: string): Plan | null {
  const action = /desativ|inativ|bloque|reativ|\bativ[aeo]r?\b|liber|validade|\bprazo\b|acesso ate/.test(t) || ROLES.some(([re]) => re.test(t))
  const about = /usuari|cadastro|permiss|\bpapel\b/.test(t)
  if (!action && !about) return null
  const users = findUsers(t)
  const search = call('buscar_usuarios', 'Procurando em Usuários', { busca: raw.trim() }, users.length ? users.slice(0, 4).map((u) => `${firstName(u)} · ${u.email}`) : ['Ninguém com esse nome'])
  if (!users.length) {
    const listed = listUsers(t)
    if (listed) return listed
    if (!about) return null
    return { kind: 'reply', steps: [search], reply: 'De qual usuário? Diga o nome e o que mudar: a situação, o papel ou a validade do acesso.' }
  }
  if (users.length > 1) {
    return {
      kind: 'reply',
      steps: [search],
      reply: `Encontrei ${users.length} pessoas com esse nome. Qual delas?`,
      options: users.slice(0, 4).map((u) => ({ label: firstName(u), text: `${raw.trim()} (${firstName(u)})` })),
    }
  }
  const u = users[0]
  const name = firstName(u)
  const steps: Step[] = [search, readUserCall(u)]
  const set: Partial<User> = {}
  const changes: UserChange[] = []
  const active = /desativ|inativ|bloque/.test(t) ? false : /reativ|\bativ[aeo]r?\b|liber/.test(t) ? true : undefined
  if (active !== undefined && active !== u.active) {
    set.active = active
    changes.push({ label: 'Situação', from: yesNo(u.active), to: yesNo(active) })
  }
  const role = ROLES.find(([re]) => re.test(t))?.[1]
  if (role && role !== roleOf(u)) {
    set.roles = roleSet(role)
    changes.push({ label: 'Papel', from: roleOf(u), to: role })
  }
  const date = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (date) {
    const iso = `${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}`
    if (iso !== u.expiresAt) {
      set.expiresAt = iso
      changes.push({ label: 'Validade do acesso', from: dateBr(u.expiresAt), to: dateBr(iso) })
    }
  }
  /* Mudar um cadastro afeta outra pessoa: é a única coisa que pede permissão. */
  if (changes.length) return { kind: 'user', steps, user: u, set, changes, reply: `Encontrei ${name} (${u.email}). Isto muda o acesso de outra pessoa, então confira antes de eu aplicar:` }
  if (active !== undefined || role || date) return { kind: 'reply', steps, reply: `O cadastro de ${name} já está assim. Nada a mudar.` }
  return { kind: 'reply', steps, reply: `Encontrei ${name}: ${yesNo(u.active).toLowerCase()}, ${roleOf(u).toLowerCase()}, validade: ${dateBr(u.expiresAt).toLowerCase()}. O que mudar? A situação, o papel ou a validade do acesso.` }
}

/* ────────────────────────────────────────────────────── abrir telas */

function openPlan(t: string): Plan | null {
  if (!/\babr(e|ir|a)\b|\bir para\b|\bleva\b|\bonde\b|\bcomo (eu )?(mudo|troco|altero|configuro|cadastro)\b/.test(t)) return null
  /* Pelo radical: a palavra-chave "permissão" também acha "permissões". */
  const page = SETTINGS_PAGES.find((p) => t.includes(norm(p.name)) || p.keywords?.some((k) => new RegExp(`\\b${norm(k).replace(/(ao|oes|s)$/, '')}`).test(t)))
  if (!page) return null
  return {
    kind: 'open',
    page,
    steps: [call('buscar_telas', 'Procurando nas Configurações', { busca: page.name }, [`Configurações › ${page.name}`])],
    reply: `Isso fica em **Configurações › ${page.name}**: ${page.description}`,
  }
}

/* ────────────────────────────────────────────── listar dashboards */

function listDashboards(t: string): Plan | null {
  if (!/\b(quais|lista|listar|mostra|mostre|onde (estao|ficam)|existe|tem)\b/.test(t) || !/dashboards?|paineis|painel/.test(t)) return null
  if (/\b(cria|criar|crie|monta|montar|faz|fazer|quero)\b/.test(t)) return null
  const found = searchMetadata(t)
  const code = found[0]?.item.code
  const items = code ? DASHBOARDS.filter((d) => d.code === code) : DASHBOARDS
  const steps: Step[] = [
    ...(code ? [searchCall(t, found)] : []),
    call('listar_dashboards', 'Listando os dashboards do portal', code ? { metadado: code } : {}, [`${items.length} dashboards`]),
  ]
  const head = code
    ? `**${items.length} ${items.length === 1 ? 'dashboard' : 'dashboards'}** do portal ${items.length === 1 ? 'usa' : 'usam'} o **${label(found[0].item)}**:`
    : `O portal tem **${items.length} dashboards** publicados:`
  return {
    kind: 'reply',
    steps,
    about: code,
    reply: [head, ['| Dashboard | Pasta | Metadado |', '| --- | --- | --- |', ...items.map((d) => `| ${d.name} | ${d.folder} | ${d.code} |`)].join('\n')].join('\n\n'),
  }
}

/* ─────────────────────────────────────────────────────────── mensagem */

const option = (text: string): PlanOption => ({ label: text, text })
const SUBJECT_EXAMPLES = ['Permanência média por setor', 'Taxa de glosa por convênio', 'Cancelamentos no centro cirúrgico', 'Custos por centro de custo'].map(option)

const HELP = [
  'Aqui você pede e eu faço no Weknow, com as mesmas ferramentas que uma IA de fora usa pelo MCP:',
  '- **Respondo perguntas sobre os dados**, cruzando metadados quando precisa.',
  '- **Crio dashboards**, escolhendo os dados certos.',
  '- **Crio alertas**: aviso por WhatsApp ou e-mail quando um indicador passa de um limite.',
  '- **Leio e mudo cadastros** de usuários: situação, papel, validade do acesso.',
  '- **Levo você às telas** de configuração.',
  'Só peço sua confirmação para o que muda algo que outras pessoas veem.',
].join('\n')

export function understand(raw: string): Plan {
  const t = norm(raw)
  if (/^(oi|ola|ajuda|help)\b.{0,12}$|o que (voce|vc) (faz|sabe|pode|consegue)/.test(t)) {
    return { kind: 'reply', steps: [], reply: HELP, options: ['Por que a permanência média subiu em outubro?', 'Me mostra todos os usuários', 'Permanência média por setor'].map(option) }
  }

  /* Refazer o dashboard com outro metadado, pela opção ou escrevendo "usa o 32". */
  const redo = t.match(/^(refazer|criar um dashboard) com o metadado (\d+): (.+)$/)
  if (redo) {
    const plan = dashboardPlan(redo[3], norm(redo[3]), redo[2])
    return plan.kind === 'dashboard' ? { ...plan, replaces: redo[1] === 'refazer' } : plan
  }

  /* Primeiro a tela: "onde mudo as permissões?" é uma pergunta sobre o caminho,
     e não um pedido para mudar o cadastro de alguém. */
  const open = openPlan(t)
  if (open) return open
  /* "Me avisa quando...": um alerta, e não uma pergunta sobre o número de agora. */
  const alert = alertPlan(raw, t)
  if (alert) return alert
  const dashboards = listDashboards(t)
  if (dashboards) return dashboards
  const user = userPlan(t, raw)
  if (user) return user

  /* Uma pergunta que se responde lendo os dados ("por que subiu", "qual mais
     glosou") vira resposta, e não dashboard. */
  const answer = answerFor(t)
  if (answer) return { kind: 'reply', ...answer }

  if (searchMetadata(t).length) return dashboardPlan(raw, t)
  if (/dashboard|painel|analise|relatorio|grafico|indicador/.test(t)) return dashboardPlan(raw, t)
  return {
    kind: 'reply',
    unknown: true,
    steps: [],
    reply: `Ainda não sei fazer isso por aqui.\n\n${HELP}`,
  }
}

/** "usa o 32", "usa o metadado 32 no lugar": o código pedido, se for isso. */
export function swapCode(raw: string) {
  const m = norm(raw).match(/^(usa|use|usar|troca|troque|trocar)( para)? o( metadado)? (\d{2})\b/)
  return m && catalogItem(m[4]) ? m[4] : null
}
