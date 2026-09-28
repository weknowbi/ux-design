type Base = {
  id: string
  name: string
  updatedAt: string
  /** Quem fez a última alteração — o "por Admin" do rodapé dos cadastros. */
  updatedBy: string
  /**
   * Tema do card limpo: título curto ("Financeiro"), ícone e cor (índice na
   * paleta do card). NÃO existe no Weknow hoje — só alimenta o teste no
   * estilo pedido, com o nome da pasta embaixo do título.
   */
  theme?: { title: string; icon: string; tone: number }
  /** Imagem cadastrada pelo cliente. Só a visualização Expandido a mostra. */
  thumbnail?: string
}

export type Dashboard = Base & { kind: 'dashboard' }
export type Folder = Base & { kind: 'folder'; children: Item[] }
export type Item = Folder | Dashboard | Task | Presentation

export type Entry<T extends Item = Item> = { item: T; path: Folder[] }

let seq = 0
// O `seq` espalha as horas: sem ele, todo item cairia no mesmo minuto do dia.
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000 - ((seq * 97) % 540) * 60_000).toISOString()

const AUTHORS = ['Admin', 'Mariana Souza', 'Carlos Pereira', 'Admin', 'Juliana Lima', 'Rafael Costa']
const author = () => AUTHORS[(seq * 7) % AUTHORS.length]

/**
 * Fotos do Unsplash (licença livre), só para a maquete mostrar o Expandido
 * com imagem. No produto, a imagem é a que o cliente cadastra.
 */
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=640&q=70&auto=format&fit=crop`

const dash = (name: string, days: number, thumbnail?: string): Dashboard => ({
  kind: 'dashboard',
  id: `d${++seq}`,
  name,
  updatedAt: daysAgo(days),
  updatedBy: author(),
  thumbnail,
})

const folder = (name: string, days: number, children: Item[], thumbnail?: string): Folder => ({
  kind: 'folder',
  id: `f${++seq}`,
  name,
  updatedAt: daysAgo(days),
  updatedBy: author(),
  children,
  thumbnail,
})

/** Volume realista de pastas na raiz — cliente grande tem dezenas, com nomes curtos e longos misturados. */
const MAIS_PASTAS = [
  'Oncologia',
  'Centro de Diagnóstico Cardiológico – Hemodinâmica, Ecocardiograma e Holter',
  'Pronto Socorro Infantil',
  'Maternidade e Obstetrícia (Parto Normal, Cesárea e Alojamento Conjunto)',
  'Hemodiálise',
  'Controladoria e Orçamento Anual 2025 – Revisões Trimestrais da Diretoria',
  'Tecnologia da Informação',
  'Jurídico e Compliance – Contratos com Operadoras de Saúde',
  'Marketing e Relacionamento com Médicos',
  'Hotelaria Hospitalar',
  'Central de Material e Esterilização (CME)',
  'SESMT – Saúde e Segurança do Trabalho',
  'Educação Continuada e Residência Médica',
  'Faturamento Ambulatorial SUS',
  'Unidade Filial Norte',
  'Unidade Filial Sul – Expansão e Obras do Novo Bloco Cirúrgico',
  'Indicadores ANS',
  'Epidemiologia e Controle de Infecção Hospitalar (CCIH)',
  'Fisioterapia e Reabilitação',
  'Psicologia e Serviço Social',
  'Banco de Sangue',
  'Home Care e Atenção Domiciliar – Pacientes Crônicos',
  'Logística e Transporte de Pacientes',
  'Governança Corporativa',
]

export const PORTAL_ROOT: Folder = folder('Portal', 0, [
  folder('Prontuário do Paciente – Indicadores Assistenciais e Evolução Clínica 2024', 2, [
    folder('Internação Clínica e Cirúrgica (Alas A, B e C)', 4, [
      dash('Pacientes internados por ala, especialidade e médico responsável', 4),
      dash('Tempo médio de permanência', 9),
    ]),
    folder('Ambulatório de Especialidades', 12, [dash('Consultas por especialidade', 12)]),
    dash('Indicadores de prontuário', 2),
    dash('Tempo médio de atendimento – comparativo mensal entre unidades', 5),
    dash('Evolução clínica', 21),
  ], photo('1666887360921-85952a86894f')),
  folder('Controle de Leitos e Gestão de Ocupação Hospitalar (Unidades de Internação)', 1, [
    folder('UTI Adulto, Neonatal e Pediátrica – Ocupação em Tempo Real', 1, [
      folder('UTI Adulto – Hospital Unidade Centro (Bloco Cirúrgico 2º andar)', 1, [
        dash('Ocupação UTI adulto por leito e turno', 1),
        dash('Tempo de espera por vaga de UTI', 2),
      ]),
      dash('Ocupação UTI neonatal', 3),
    ]),
    dash('Ocupação de leitos por unidade, especialidade e convênio (atualização diária)', 1, photo('1551288049-bebda4e38f71')),
    dash('Giro de leitos', 6),
    dash('Leitos por especialidade', 15),
  ], photo('1611587266737-cc128ffe2946')),
  folder('Agendamento Cirúrgico - Centro Cirúrgico Principal e Hemodinâmica', 3, [
    dash('Agenda do centro cirúrgico', 3),
    dash('Cancelamentos e suspensões de cirurgia por motivo', 8),
    dash('Tempo de sala', 30),
  ], photo('1579684453423-f84349ef60b0')),
  folder('Financeiro Hospitalar | Faturamento, Glosas e Contas a Receber - Consolidado Rede', 6, [
    folder('Faturamento SUS e Convênios', 6, [
      dash('Faturamento por convênio', 6),
      dash('Glosas', 10),
      dash('Contas a receber', 14),
    ]),
    folder('Custos', 20, [dash('Custo por paciente-dia', 20), dash('Custos por centro de custo', 45)]),
    dash('5.1 IA - Análise Inteligente | Exemplos Soluções', 7),
    dash('DRE gerencial', 25),
  ], photo('1626266061368-46a8f578ddd6')),
  folder('Atendimento e Triagem PS Adulto e Pediátrico', 9, [
    dash('Tempo de espera no PS', 0),
    dash('Classificação de risco (Protocolo de Manchester)', 9),
  ], photo('1758404958502-44f156617bae')),
  folder('Materiais e Medicamentos - Farmácia Central, CAF e Farmácias Satélites', 11, [
    folder('Farmácia', 11, [dash('Dispensação', 11)]),
    dash('Consumo por setor', 13),
    dash('Estoque crítico', 2),
  ], photo('1587854692152-cbe660dbde88')),
  folder('RH - Recursos Humanos (Absenteísmo, Turnover e Horas Extras)', 16, [
    dash('Absenteísmo', 16),
    dash('Headcount', 33),
    dash('Horas extras', 40),
  ]),
  folder('Compras e Suprimentos', 22, [dash('Pedidos em aberto', 22), dash('Fornecedores', 60)]),
  folder('Qualidade e Auditoria - Acreditação ONA Nível 3 / Segurança do Paciente', 27, [
    dash('Eventos adversos', 27),
    dash('Indicadores ONA', 50),
  ]),
  folder('Laboratório de Análises Clínicas', 35, [
    dash('Exames por período', 35),
    dash('Tempo de liberação de laudo', 70),
  ], photo('1579154341184-22069e4614d2')),
  folder('Diagnóstico por Imagem (RX, TC, RM e US)', 41, [dash('Laudos pendentes', 41)], photo('1666214280352-db292c05fd80')),
  folder('Nutrição', 58, [dash('Refeições servidas', 58)]),
  folder('Manutenção e Engenharia Clínica - Ordens de Serviço e Equipamentos Médicos', 64, [
    dash('Ordens de serviço', 64),
    dash('Disponibilidade de equipamentos', 90),
  ]),
  folder('Ouvidoria', 80, [dash('Satisfação do paciente (NPS)', 80)]),
  folder('Diretoria Executiva - Painéis Estratégicos para Reunião Mensal do Conselho', 120, [
    folder('Planejamento estratégico', 120, []),
    dash('Painel executivo', 18),
    dash('Painel executivo geral', 4, photo('1460925895917-afdab827c52f')),
  ]),
  ...MAIS_PASTAS.map((name, i) =>
    folder(name, 3 + ((i * 11) % 150), [dash(`Visão geral – ${name.split(/[–(|-]/)[0].trim()}`, 3 + i), dash('Indicadores do mês', 10 + i)]),
  ),
  // Sem dashboard na raiz: no sistema todo dashboard mora dentro de uma pasta.
  // Na área de trabalho ele só aparece se for favorito.
])

/**
 * Temas do teste: [nome da pasta, título curto, ícone (Material Symbols)].
 * A cor segue a ordem da lista, girando pela paleta, para vizinhos não
 * repetirem cor.
 */
const THEMES: [string, string, string][] = [
  ['Prontuário do Paciente – Indicadores Assistenciais e Evolução Clínica 2024', 'Prontuário', 'clinical_notes'],
  ['Controle de Leitos e Gestão de Ocupação Hospitalar (Unidades de Internação)', 'Leitos', 'bed'],
  ['Agendamento Cirúrgico - Centro Cirúrgico Principal e Hemodinâmica', 'Centro cirúrgico', 'surgical'],
  ['Financeiro Hospitalar | Faturamento, Glosas e Contas a Receber - Consolidado Rede', 'Financeiro', 'payments'],
  ['Atendimento e Triagem PS Adulto e Pediátrico', 'Pronto-socorro', 'emergency'],
  ['Materiais e Medicamentos - Farmácia Central, CAF e Farmácias Satélites', 'Farmácia', 'medication'],
  ['RH - Recursos Humanos (Absenteísmo, Turnover e Horas Extras)', 'Recursos humanos', 'groups'],
  ['Compras e Suprimentos', 'Suprimentos', 'shopping_cart'],
  ['Qualidade e Auditoria - Acreditação ONA Nível 3 / Segurança do Paciente', 'Qualidade', 'verified'],
  ['Laboratório de Análises Clínicas', 'Laboratório', 'biotech'],
  ['Diagnóstico por Imagem (RX, TC, RM e US)', 'Imagem', 'radiology'],
  ['Nutrição', 'Nutrição', 'restaurant'],
  ['Manutenção e Engenharia Clínica - Ordens de Serviço e Equipamentos Médicos', 'Engenharia clínica', 'build'],
  ['Ouvidoria', 'Ouvidoria', 'forum'],
  ['Diretoria Executiva - Painéis Estratégicos para Reunião Mensal do Conselho', 'Diretoria', 'monitoring'],
  ['Oncologia', 'Oncologia', 'oncology'],
  ['Centro de Diagnóstico Cardiológico – Hemodinâmica, Ecocardiograma e Holter', 'Cardiologia', 'cardiology'],
  ['Pronto Socorro Infantil', 'PS infantil', 'child_care'],
  ['Maternidade e Obstetrícia (Parto Normal, Cesárea e Alojamento Conjunto)', 'Maternidade', 'pregnant_woman'],
  ['Hemodiálise', 'Hemodiálise', 'nephrology'],
  ['Controladoria e Orçamento Anual 2025 – Revisões Trimestrais da Diretoria', 'Controladoria', 'account_balance'],
  ['Tecnologia da Informação', 'Tecnologia', 'computer'],
  ['Jurídico e Compliance – Contratos com Operadoras de Saúde', 'Jurídico', 'gavel'],
  ['Marketing e Relacionamento com Médicos', 'Marketing', 'campaign'],
  ['Hotelaria Hospitalar', 'Hotelaria', 'hotel'],
  ['Central de Material e Esterilização (CME)', 'Esterilização', 'sanitizer'],
  ['SESMT – Saúde e Segurança do Trabalho', 'Segurança do trabalho', 'health_and_safety'],
  ['Educação Continuada e Residência Médica', 'Educação', 'school'],
  ['Faturamento Ambulatorial SUS', 'Faturamento SUS', 'receipt_long'],
  ['Unidade Filial Norte', 'Filial Norte', 'domain'],
  ['Unidade Filial Sul – Expansão e Obras do Novo Bloco Cirúrgico', 'Filial Sul', 'domain'],
  ['Indicadores ANS', 'ANS', 'analytics'],
  ['Epidemiologia e Controle de Infecção Hospitalar (CCIH)', 'Controle de infecção', 'coronavirus'],
  ['Fisioterapia e Reabilitação', 'Fisioterapia', 'physical_therapy'],
  ['Psicologia e Serviço Social', 'Psicologia', 'psychology'],
  ['Banco de Sangue', 'Banco de sangue', 'bloodtype'],
  ['Home Care e Atenção Domiciliar – Pacientes Crônicos', 'Home care', 'home_health'],
  ['Logística e Transporte de Pacientes', 'Logística', 'ambulance'],
  ['Governança Corporativa', 'Governança', 'account_tree'],
  ['Ocupação de leitos por unidade, especialidade e convênio (atualização diária)', 'Ocupação', 'bar_chart'],
  ['Painel executivo geral', 'Painel executivo', 'bar_chart'],
]
{
  const byName = new Map(THEMES.map(([name, title, icon], i) => [name, { title, icon, tone: i % 8 }]))
  for (const { item } of flatten(PORTAL_ROOT)) {
    const theme = byName.get(item.name)
    if (theme) item.theme = theme
  }
}

export const isFolder = (i: Item): i is Folder => i.kind === 'folder'
export const isDashboard = (i: Item): i is Dashboard => i.kind === 'dashboard'

export function stats(f: Folder) {
  let folders = 0
  let dashboards = 0
  for (const c of f.children) {
    if (c.kind === 'folder') folders++
    else dashboards++
  }
  return { folders, dashboards }
}

/** Todos os itens abaixo da raiz, cada um com as pastas que levam até ele (sem a raiz). */
export function flatten(root: Folder): Entry[] {
  const out: Entry[] = []
  const walk = (f: Folder, path: Folder[]) => {
    for (const item of f.children) {
      out.push({ item, path })
      if (item.kind === 'folder') walk(item, [...path, item])
    }
  }
  walk(root, [])
  return out
}

/** Caminho da raiz até a pasta, inclusive ela e sem a raiz. `null` se não existir. */
export function findFolderPath(root: Folder, id: string): Folder[] | null {
  for (const item of root.children) {
    if (item.kind !== 'folder') continue
    if (item.id === id) return [item]
    const sub = findFolderPath(item, id)
    if (sub) return [item, ...sub]
  }
  return null
}

export function initialFavorites(root: Folder): Set<string> {
  const wanted = new Set([
    'Prontuário do Paciente – Indicadores Assistenciais e Evolução Clínica 2024',
    'Controle de Leitos e Gestão de Ocupação Hospitalar (Unidades de Internação)',
    'Agendamento Cirúrgico - Centro Cirúrgico Principal e Hemodinâmica',
    'Ocupação de leitos por unidade, especialidade e convênio (atualização diária)',
    'Painel executivo geral',
  ])
  const ids = new Set<string>()
  for (const { item } of flatten(root)) {
    if (wanted.delete(item.name)) ids.add(item.id)
  }
  return ids
}

/**
 * Tarefas e Apresentações — as outras duas áreas de conteúdo do portal, que
 * no Weknow são listas próprias, sem pasta e sem hierarquia. Cada uma tem um
 * código curto que o cliente usa para se referir ao item.
 */
export type Task = Base & { kind: 'task'; code: string }
export type Presentation = Base & { kind: 'presentation'; code: string }

const numbered = <T extends 'task' | 'presentation'>(kind: T, names: string[], step: number) =>
  names.map((name, i) => ({
    kind,
    id: `${kind[0]}${++seq}`,
    code: String(i + 1).padStart(2, '0'),
    name,
    updatedAt: daysAgo(2 + i * step),
    updatedBy: author(),
  }))

export const TASKS: Task[] = numbered(
  'task',
  [
    'Envio diário do painel de ocupação para a diretoria',
    'E-mail semanal de glosas para o faturamento',
    'Alerta de leitos críticos na UTI adulto',
    'Fechamento mensal do DRE gerencial',
    'Relatório de absenteísmo para o RH',
    'Exportação dos indicadores ANS',
    'Resumo de eventos adversos para a qualidade',
  ],
  3,
) as Task[]

export const PRESENTATIONS: Presentation[] = numbered(
  'presentation',
  [
    'Operadoras',
    'Sequência de dashboards – operadora',
    'Hospitalar geral',
    'Reunião mensal do conselho',
    'Indicadores assistenciais – fechamento trimestral',
    'Painel executivo da diretoria',
  ],
  5,
) as Presentation[]
