/**
 * Configurações do Weknow — catálogo das telas e dados de maquete.
 *
 * O catálogo é plano de propósito. No sistema em produção as configurações
 * moram em três níveis (Configurações › Gerenciar usuários › Cadastro de
 * usuários), e os dois primeiros não mostram nada: são menus vestidos de
 * conteúdo. Aqui o grupo deixou de ser uma parada no caminho e virou só o
 * título que organiza a grade — quem abre Configurações vê, de uma vez, todos
 * os destinos que existem, e chega em qualquer um com um clique.
 *
 * É isso que também salva a busca: com o catálogo plano ela procura em todos
 * os destinos, e não só nos rótulos do nível em que você está. Digitar
 * "grupos" na primeira tela devolve "Grupos de usuários" e "Grupos de
 * contato" — no sistema de hoje não devolve nada, porque os dois estão um
 * nível abaixo.
 */

export type SettingsPage = {
  id: string
  name: string
  /** Uma linha: o que se resolve ali dentro. */
  description: string
  icon: string
  /** Palavras que levam à tela sem estar no nome ("permissão" → Usuários). */
  keywords?: string[]
  /** Telas irmãs, que viram chips no topo da tela aberta. */
  siblings?: string[]
  /** Ainda não desenhada nesta maquete. */
  stub?: boolean
}

export type SettingsGroup = {
  id: string
  label: string
  icon: string
  /**
   * Índice na paleta dos cards (`APPEARANCE_COLORS`). A cor identifica o
   * GRUPO, não a tela: com uma cor por item, oito destinos viram oito cores e
   * a grade fica um mostruário. Por grupo, a cor ainda diz alguma coisa —
   * duas telas do mesmo tom resolvem o mesmo assunto.
   */
  tone: number
  pages: SettingsPage[]
}

/** As três telas de cadastro de gente: irmãs entre si, alternadas por chip. */
const ACCESS = ['usuarios', 'grupos-de-usuarios', 'grupos-de-contato']

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'acessos',
    label: 'Usuários e acessos',
    icon: 'manage_accounts',
    tone: 0,
    pages: [
      {
        id: 'usuarios',
        name: 'Usuários',
        description: 'Cadastro, papéis e validade de acesso de cada pessoa.',
        icon: 'person',
        keywords: ['cadastro', 'pessoas', 'permissao', 'acesso', 'senha', 'papel'],
        siblings: ACCESS,
      },
      {
        id: 'grupos-de-usuarios',
        name: 'Grupos de usuários',
        description: 'Permissões e acessos concedidos a vários usuários de uma vez.',
        icon: 'groups',
        keywords: ['permissao', 'acesso', 'perfil'],
        siblings: ACCESS,
        stub: true,
      },
      {
        id: 'grupos-de-contato',
        name: 'Grupos de contato',
        description: 'Listas para o envio automático de dashboards e comunicados.',
        icon: 'contacts',
        keywords: ['envio', 'email', 'distribuicao', 'mala direta'],
        siblings: ACCESS,
        stub: true,
      },
    ],
  },
  {
    id: 'ia',
    label: 'Inteligência artificial',
    icon: 'neurology',
    tone: 2,
    pages: [
      {
        id: 'ia',
        name: 'Configurações de IA',
        description: 'Modelos, limites e consumo do Weknow Ask e do SQL AI.',
        icon: 'smart_toy',
        keywords: ['ask', 'sql', 'token', 'consumo', 'modelo'],
        stub: true,
      },
    ],
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    icon: 'forum',
    tone: 1,
    pages: [
      {
        id: 'notificacoes',
        name: 'Histórico de notificações',
        description: 'Tudo que o sistema avisou, para quem e quando.',
        icon: 'notifications',
        keywords: ['aviso', 'alerta', 'log'],
        stub: true,
      },
      {
        id: 'emails',
        name: 'E-mails',
        description: 'Servidor de envio e modelos das mensagens automáticas.',
        icon: 'mail',
        keywords: ['smtp', 'remetente', 'modelo', 'template'],
        stub: true,
      },
    ],
  },
  {
    id: 'dados',
    label: 'Dados e execução',
    icon: 'database',
    tone: 5,
    pages: [
      {
        id: 'conexoes',
        name: 'Conexões',
        description: 'Bancos e fontes que alimentam os dashboards.',
        icon: 'database',
        keywords: ['banco', 'fonte', 'sql', 'servidor'],
        stub: true,
      },
      {
        id: 'tarefas',
        name: 'Tarefas',
        description: 'Agendamentos, execuções e histórico de falhas.',
        icon: 'task_alt',
        keywords: ['agendamento', 'rotina', 'erro', 'execucao'],
        stub: true,
      },
    ],
  },
]

/** Todas as telas, na ordem em que aparecem — a busca varre esta lista. */
export const SETTINGS_PAGES: (SettingsPage & { group: SettingsGroup })[] = SETTINGS_GROUPS.flatMap(
  (group) => group.pages.map((page) => ({ ...page, group })),
)

export const findSettingsPage = (id: string) => SETTINGS_PAGES.find((p) => p.id === id)

/* -------------------------------------------------------------------------
   Maquete do cadastro de usuários. Os nomes e a mistura de papéis vêm da
   tela em produção; e-mail e último acesso não existem lá, e entram aqui
   porque são o que se procura numa lista de gente (ver a coluna "Usuário"
   em `screens/SettingsPageScreen`).
------------------------------------------------------------------------- */

export type Role = 'Visualizador' | 'Desenvolvedor' | 'Administrador' | 'Contato'

export type User = {
  code: number
  name: string
  email: string
  active: boolean
  roles: Role[]
  /** Acesso com prazo — a maioria não tem. */
  expiresAt?: string
  userGroups: string[]
  contactGroups: string[]
  /** ISO; vazio em quem nunca entrou. */
  lastSeen?: string
}

const ADMIN: Role[] = ['Visualizador', 'Desenvolvedor', 'Administrador', 'Contato']
const ANALISTA: Role[] = ['Visualizador', 'Desenvolvedor', 'Contato']
const LEITOR: Role[] = ['Visualizador', 'Contato']

const days = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

export const USERS: User[] = [
  { code: 3, name: 'Admin', email: 'admin@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: [], lastSeen: days(0) },
  { code: 35, name: 'Alexandre da Silva', email: 'alexandre.silva@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: ['Diretoria'], lastSeen: days(1) },
  { code: 13, name: 'Aline Luchtenberg', email: 'aline.luchtenberg@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: [], lastSeen: days(2) },
  { code: 34, name: 'Alini Mello', email: 'alini.mello@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: ['Diretoria'], lastSeen: days(4) },
  { code: 5, name: 'analista', email: 'analista@weknow.com.br', active: true, roles: ANALISTA, userGroups: ['Analistas'], contactGroups: [], lastSeen: days(9) },
  { code: 11, name: 'Anderson Castilho', email: 'anderson.castilho@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: [], lastSeen: days(3) },
  { code: 15, name: 'Anderson Pebrianca', email: 'anderson.pebrianca@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos'], lastSeen: days(12) },
  { code: 19, name: 'Andreia, Hospital São José', email: 'andreia@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos', 'Enfermagem'], lastSeen: days(21) },
  { code: 27, name: 'Beatriz Nogueira', email: 'beatriz.nogueira@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos'], expiresAt: '2026-12-31', lastSeen: days(5) },
  { code: 8, name: 'Bruno Tavares', email: 'bruno.tavares@weknow.com.br', active: false, roles: ANALISTA, userGroups: ['Analistas'], contactGroups: [], lastSeen: days(180) },
  { code: 41, name: 'Camila Ferraz', email: 'camila.ferraz@weknow.com.br', active: true, roles: ANALISTA, userGroups: ['Analistas'], contactGroups: ['Diretoria'], lastSeen: days(1) },
  { code: 22, name: 'Carlos Pereira', email: 'carlos.pereira@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: [], lastSeen: days(0) },
  { code: 30, name: 'Cláudia Menezes, Faturamento SUS', email: 'claudia.menezes@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos', 'Faturamento'], lastSeen: days(7) },
  { code: 44, name: 'Diego Rampelotti', email: 'diego.rampelotti@weknow.com.br', active: true, roles: ANALISTA, userGroups: ['Analistas'], contactGroups: [], lastSeen: days(2) },
  { code: 17, name: 'Eduardo Hoffmann', email: 'eduardo.hoffmann@hsj.com.br', active: false, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos'], expiresAt: '2025-06-30', lastSeen: days(320) },
  { code: 51, name: 'Fernanda Klein', email: 'fernanda.klein@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: ['Diretoria'], lastSeen: days(0) },
  { code: 26, name: 'Gabriel Nunes', email: 'gabriel.nunes@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Enfermagem'], lastSeen: days(15) },
  { code: 9, name: 'Helena Prado', email: 'helena.prado@weknow.com.br', active: true, roles: ANALISTA, userGroups: ['Analistas'], contactGroups: [], lastSeen: days(6) },
  { code: 38, name: 'Igor Sampaio', email: 'igor.sampaio@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos'], lastSeen: days(45) },
  { code: 20, name: 'Juliana Lima', email: 'juliana.lima@weknow.com.br', active: true, roles: ADMIN, userGroups: ['Administrators'], contactGroups: [], lastSeen: days(1) },
  { code: 47, name: 'Leonardo Bastos, CCIH', email: 'leonardo.bastos@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos', 'Enfermagem'], lastSeen: days(30) },
  { code: 14, name: 'Mariana Souza', email: 'mariana.souza@weknow.com.br', active: true, roles: ANALISTA, userGroups: ['Analistas'], contactGroups: ['Diretoria'], lastSeen: days(0) },
  { code: 33, name: 'Nathalia Ribas', email: 'nathalia.ribas@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Faturamento'], lastSeen: days(11) },
  { code: 6, name: 'Rafael Costa', email: 'rafael.costa@weknow.com.br', active: true, roles: ANALISTA, userGroups: ['Analistas'], contactGroups: [], lastSeen: days(3) },
  { code: 52, name: 'Renata Villas', email: 'renata.villas@hsj.com.br', active: true, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: ['Externos'], expiresAt: '2027-03-01' },
  { code: 29, name: 'Thiago Marques', email: 'thiago.marques@weknow.com.br', active: false, roles: LEITOR, userGroups: ['Usuarios'], contactGroups: [], lastSeen: days(240) },
]

/* -------------------------------------------------------------------------
   Grupos. As duas listas existem no Weknow como telas separadas, e são: um
   grupo de USUÁRIOS concede acesso (quem entra e o que vê); um grupo de
   CONTATO recebe envio (para quem o dashboard vai). Nomes parecidos, funções
   opostas — é por isso que os cards do índice precisam da linha de baixo.
------------------------------------------------------------------------- */

export type UserGroup = {
  id: string
  name: string
  description: string
  /** Pastas e dashboards que o grupo enxerga. */
  scope: string[]
  createdAt: string
}

export type ContactGroup = {
  id: string
  name: string
  description: string
  /** O que o grupo recebe, e quando. */
  schedule: string
  createdAt: string
}

/** Quantos usuários ativos citam o grupo — contado, não digitado. */
export const countUserGroup = (name: string) =>
  USERS.filter((u) => u.userGroups.includes(name)).length

export const countContactGroup = (name: string) =>
  USERS.filter((u) => u.contactGroups.includes(name)).length

export const USER_GROUPS: UserGroup[] = [
  {
    id: 'administrators',
    name: 'Administrators',
    description: 'Acesso total, inclusive às configurações do sistema.',
    scope: ['Todas as pastas'],
    createdAt: '2019-03-12',
  },
  {
    id: 'analistas',
    name: 'Analistas',
    description: 'Cria e edita dashboards, sem mexer em cadastro.',
    scope: ['Todas as pastas', 'Builder'],
    createdAt: '2021-07-02',
  },
  {
    id: 'usuarios',
    name: 'Usuarios',
    description: 'Só visualiza o que foi compartilhado com o grupo.',
    scope: ['Indicadores Hospitalares', 'Faturamento', 'Enfermagem'],
    createdAt: '2021-07-02',
  },
]

export const CONTACT_GROUPS: ContactGroup[] = [
  {
    id: 'diretoria',
    name: 'Diretoria',
    description: 'Resultado consolidado do mês.',
    schedule: 'Todo dia 1º, às 07h',
    createdAt: '2022-01-10',
  },
  {
    id: 'externos',
    name: 'Externos',
    description: 'Parceiros e hospitais conveniados.',
    schedule: 'Segundas, às 08h',
    createdAt: '2022-04-26',
  },
  {
    id: 'enfermagem',
    name: 'Enfermagem',
    description: 'Ocupação de leitos e escala do plantão.',
    schedule: 'Diário, às 06h',
    createdAt: '2023-09-05',
  },
  {
    id: 'faturamento',
    name: 'Faturamento',
    description: 'Glosas e contas em aberto.',
    schedule: 'Sextas, às 17h',
    createdAt: '2024-02-19',
  },
]
