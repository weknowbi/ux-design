export type TableBlock = {
  kind: 'table'
  columns: string[]
  rows: string[][]
}

export type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'suggestions'; items: string[] }
  | TableBlock

export type Message =
  | { id: string; role: 'user'; text: string; ts: string; filters?: FilterChip[] }
  | { id: string; role: 'ai'; blocks: Block[]; ts: string }

export type FilterChip = { id: string; label: string; value: string }

export type Conversation = {
  id: string
  title: string
  folder?: string
  /** Metadado que dá contexto — escolhido ao criar a conversa. */
  context?: MetaContext
  /** Provedor de IA usado nesta conversa. */
  provider?: string
  updatedAt: string
  messages: Message[]
}

const ALERT_ROWS: string[][] = Array.from({ length: 5 }, () => [
  '2147',
  'Taxa de ocupação acima do limite',
  'UTI Geral ultrapassou 90% de ocupação por 3 horas consecutivas.',
])

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c0',
    title: 'Esclarecendo o dado',
    updatedAt: 'agora',
    messages: [
      { id: 'm1', role: 'user', text: 'sobre o que é esse dado', ts: '09:12' },
      {
        id: 'm2',
        role: 'ai',
        ts: '09:12',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Poderia explicar o que você quer saber sobre esses dados? Por exemplo, você quer ver totais, comparar categorias, ou filtrar por um período específico?',
          },
          {
            kind: 'suggestions',
            items: [
              'Quero ver o total agrupado por categoria',
              'Mostre um valor específico',
              'Preciso de um filtro por data',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c1',
    title: 'Materiais, medicamentos, serviços - Projeção',
    updatedAt: 'há 4 min',
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'Quais alertas de ocupação foram disparados e qual a projeção de atendimentos para os próximos 14 dias?',
        ts: '14:18',
        filters: [{ id: 'f1', label: 'birth.Mês/ano', value: 'Todos' }],
      },
      {
        id: 'm2',
        role: 'ai',
        ts: '14:18',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Foram registrados **5 alertas** no período selecionado, todos relacionados ao mesmo indicador de atendimento:',
          },
          {
            kind: 'table',
            columns: ['Código', 'Nome', 'Descrição'],
            rows: ALERT_ROWS,
          },
          {
            kind: 'paragraph',
            text: 'Com base no comportamento dos últimos três meses, a projeção para os próximos 14 dias indica manutenção do padrão observado recentemente. O fluxo apresenta variação leve, porém consistente, ao longo da quinzena. A média prevista permanece entre **245 e 260 atendimentos por dia**, sugerindo um cenário relativamente estável, ainda acima do período anterior à elevação da demanda.',
          },
          { kind: 'heading', text: 'Destaques da projeção' },
          {
            kind: 'list',
            items: [
              '**Dias de maior demanda:** segunda, terça e quarta-feira.',
              '**Faixa de maior oscilação:** entre o 4º e o 6º dia da projeção, correspondendo aos picos esperados após fins de semana.',
              '**Menores volumes estimados:** entre o 6º e o 7º dia, refletindo o padrão de queda pós-pico semanal.',
              '**Tendência geral:** estabilidade moderada, com leve crescimento ao final da segunda semana.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: 'Clínica Central: Horário de maior movimento',
    updatedAt: 'ontem',
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'Em qual faixa de horário a Clínica Central concentra o maior movimento?',
        ts: '09:41',
      },
      {
        id: 'm2',
        role: 'ai',
        ts: '09:41',
        blocks: [
          {
            kind: 'paragraph',
            text: 'O maior movimento se concentra entre **08h e 11h**, faixa que responde por cerca de 38% dos atendimentos do dia. O segundo pico ocorre no fim da tarde, entre 16h e 18h.',
          },
          { kind: 'heading', text: 'Leitura do período' },
          {
            kind: 'list',
            items: [
              '**Manhã (08h–11h):** maior concentração, puxada por retornos e exames agendados.',
              '**Meio-dia (11h–14h):** queda acentuada, com ociosidade em duas salas.',
              '**Tarde (16h–18h):** retomada moderada, sem ultrapassar o pico da manhã.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'c3',
    title: 'Comparativo com a unidade Norte',
    updatedAt: '18/08/2025',
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'Compare o movimento da Clínica Central com o da unidade Norte.',
        ts: '16:07',
      },
      {
        id: 'm2',
        role: 'ai',
        ts: '16:07',
        blocks: [
          {
            kind: 'paragraph',
            text: 'A Clínica Central mantém volume **22% superior** ao da unidade Norte, mas com distribuição mais desigual ao longo do dia.',
          },
          {
            kind: 'table',
            columns: ['Unidade', 'Média diária', 'Pico'],
            rows: [
              ['Clínica Central', '258 atendimentos', '08h – 11h'],
              ['Unidade Norte', '211 atendimentos', '14h – 16h'],
            ],
          },
        ],
      },
    ],
  },
]

/** Conversa vista de dentro da pasta: o bastante para listá-la sem abri-la. */
export type FolderItem = {
  id: string
  title: string
  /** Primeira linha da conversa, como resumo. */
  preview?: string
  updatedAt?: string
}

export type Folder = {
  id: string
  label: string
  items: FolderItem[]
}

export const FOLDERS: Folder[] = [
  {
    id: 'p1',
    label: 'Clínica Central',
    items: [
      { id: 'p1-a', title: 'Horário de maior movimento', preview: 'sobre o movimento por faixa de horário', updatedAt: '22/04/2026 09:14' },
      { id: 'p1-b', title: 'Ocupação por especialidade', preview: 'como está a ocupação por especialidade', updatedAt: '19/04/2026 15:02' },
    ],
  },
  {
    id: 'p2',
    label: 'Financeiro',
    items: [
      { id: 'p2-a', title: 'Balancete de custos e receitas', preview: 'quero o balancete do trimestre', updatedAt: '24/04/2026 16:36' },
      { id: 'p2-b', title: 'Glosas por convênio', preview: 'quais convênios mais geram glosa', updatedAt: '23/04/2026 11:28' },
      { id: 'p2-c', title: 'Ticket médio por procedimento', preview: 'ticket médio por procedimento', updatedAt: '21/04/2026 17:45' },
      { id: 'p2-d', title: 'Inadimplência por convênio', preview: 'inadimplência por convênio', updatedAt: '20/04/2026 10:03' },
      { id: 'p2-e', title: 'Faturamento por unidade', preview: 'faturamento comparado entre unidades', updatedAt: '18/04/2026 14:20' },
      { id: 'p2-f', title: 'Custo de materiais e medicamentos', preview: 'custo de materiais no último mês', updatedAt: '17/04/2026 08:55' },
      { id: 'p2-g', title: 'Receita por especialidade', preview: 'receita por especialidade', updatedAt: '16/04/2026 14:55' },
      { id: 'p2-h', title: 'Prazo médio de recebimento', preview: 'prazo médio de recebimento', updatedAt: '15/04/2026 16:10' },
      { id: 'p2-i', title: 'Comparativo mensal de despesas', preview: 'comparativo mensal de despesas', updatedAt: '14/04/2026 09:40' },
      { id: 'p2-j', title: 'Repasse médico por período', preview: 'repasse médico do período', updatedAt: '13/04/2026 13:12' },
      { id: 'p2-k', title: 'Contas a pagar em aberto', preview: 'contas a pagar em aberto', updatedAt: '10/04/2026 11:05' },
      { id: 'p2-l', title: 'Margem por linha de serviço', preview: 'margem por linha de serviço', updatedAt: '08/04/2026 15:33' },
    ],
  },
]

/** Fontes usadas pela aba "Dados". */
export const DATA_SOURCES = [
  { label: 'Dashboard', value: 'Painel de Atendimentos' },
  { label: 'Período', value: '24/06 – 01/07/2025' },
  { label: 'Atualizado em', value: '01/07/2025 às 14:18' },
  { label: 'Registros', value: '18.402 linhas' },
]

export const QUICK_ACTIONS = [
  'Resumir em 3 pontos',
  'Detalhar a projeção',
  'Identificar anomalias',
]

export const AI_FALLBACK: Block[] = [
  {
    kind: 'paragraph',
    text: 'Analisei os dados do painel com os filtros ativos. O padrão observado se mantém consistente no período, sem desvios relevantes em relação à média histórica.',
  },
  {
    kind: 'list',
    items: [
      '**Volume:** dentro da faixa esperada para a quinzena.',
      '**Dispersão:** baixa, com oscilação concentrada nos dias de pico.',
      '**Recomendação:** acompanhar o indicador semanalmente antes de ajustar a escala.',
    ],
  },
  {
    kind: 'suggestions',
    items: [
      'Comparar com o mesmo período do ano passado',
      'Detalhar por unidade',
      'Exportar esses números',
    ],
  },
]

/* ── Metadado ─────────────────────────────────────────────────────────────── */

export type FieldType = 'Numero' | 'Texto' | 'Data' | 'Booleano'

export type MetaField = {
  /** Rótulo de negócio, como aparece na conversa. */
  title: string
  /** Nome técnico da coluna na origem. */
  name: string
  type: FieldType
}

export type Dataset = {
  name: string
  /** Descrição do conjunto, em prosa. Texto de exemplo enquanto não há origem real. */
  documentation?: string
  /** Frescor do dado — a pergunta que vem antes de "quais são as colunas". */
  updatedAt?: string
  fields: MetaField[]
}

export const DATASET: Dataset = {
  name: 'Vendas',
  updatedAt: 'há 2 horas',
  documentation:
    'Base transacional de vendas consolidada a partir do ERP, com uma linha por item de pedido. ' +
    'Inclui dados do cliente, da empresa emissora e do produto, além de valores brutos, descontos ' +
    'e devoluções. Os campos com prefixo person_1_ referem-se ao contato principal do cadastro; ' +
    'os demais person_ trazem o titular. Pedidos cancelados permanecem na base com is_returned ' +
    'marcado, então filtre por esse campo ao apurar receita. A carga roda de hora em hora.',
  fields: [
    { title: 'birth.Ano', name: 'person_1_birth_year', type: 'Numero' },
    { title: 'birth.Ano', name: 'person_birth_year', type: 'Numero' },
    { title: 'birth.Dia', name: 'person_1_birth_day', type: 'Numero' },
    { title: 'birth.Dia', name: 'person_birth_day', type: 'Numero' },
    { title: 'birth.Mês', name: 'person_1_birth_month', type: 'Numero' },
    { title: 'birth.Mês', name: 'person_birth_month', type: 'Numero' },
    { title: 'birth.Mês/ano', name: 'person_1_birth_yearMonth', type: 'Numero' },
    { title: 'birth.Mês/ano', name: 'person_birth_yearMonth', type: 'Numero' },
    { title: 'company_city', name: 'company_city', type: 'Texto' },
    { title: 'company_id', name: 'company_id', type: 'Numero' },
    { title: 'company_name', name: 'company_name', type: 'Texto' },
    { title: 'company_state', name: 'company_state', type: 'Texto' },
    { title: 'discount_pct', name: 'order_discount_pct', type: 'Numero' },
    { title: 'is_returned', name: 'order_is_returned', type: 'Booleano' },
    { title: 'item_category', name: 'product_category', type: 'Texto' },
    { title: 'item_name', name: 'product_name', type: 'Texto' },
    { title: 'item_sku', name: 'product_sku', type: 'Texto' },
    { title: 'order.Data', name: 'order_date', type: 'Data' },
    { title: 'order.Mês/ano', name: 'order_yearMonth', type: 'Numero' },
    { title: 'order_id', name: 'order_id', type: 'Numero' },
    { title: 'payment_method', name: 'order_payment_method', type: 'Texto' },
    { title: 'quantity', name: 'order_quantity', type: 'Numero' },
    { title: 'salesperson_name', name: 'seller_name', type: 'Texto' },
    { title: 'total_value', name: 'order_total_value', type: 'Numero' },
    { title: 'unit_price', name: 'product_unit_price', type: 'Numero' },
  ],
}

/* ── Filtros do prompt ────────────────────────────────────────────────────── */

export type FilterField = { id: string; label: string; value: string }
export type FilterGroup = { id: string; label: string; fields: FilterField[] }

export const FILTER_TREE: FilterGroup[] = [
  {
    id: 'g1',
    label: 'DT_Internação_Paciente',
    fields: [
      { id: 'f1', label: 'birth.Mês/ano', value: 'Todos' },
      { id: 'f2', label: 'DT_Consultas_Agendadas', value: 'Todos' },
      { id: 'f3', label: 'DT_Exames_Realizados', value: 'Todos' },
      { id: 'f4', label: 'DT_Alta_Hospitalar', value: 'Todos' },
    ],
  },
  {
    id: 'g2',
    label: 'DT_Paciente_Internado',
    fields: [
      { id: 'f5', label: 'DT_Leito_Ocupado', value: 'Todos' },
      { id: 'f6', label: 'DT_Tempo_Permanência', value: 'Todos' },
    ],
  },
]

/* ── Contexto de dados e provedor de IA ───────────────────────────────────── */

/** Metadado que dá contexto à conversa. Agrupado pela origem. */
export type MetaContext = { id: string; label: string; group: string }

export const META_CONTEXTS: MetaContext[] = [
  { id: '38', label: '38 - 2.2 - Fraturas', group: '2.2 - Sample Data (SQLite)' },
  { id: '39', label: '39 - 2.2 - Persons (39)', group: '2.2 - Sample Data (SQLite)' },
  { id: '36', label: '36 - Empresas', group: '2.2 - Sample Data (SQLite)' },
  { id: '107', label: '107 - Itens das vendas', group: '2.2 - Sample Data (SQLite)' },
  { id: '34', label: '34 - Vendas', group: '2.2 - Sample Data (SQLite)' },
  { id: '98', label: '98 - Contas Pendentes', group: '2024 Maicon' },
  { id: '90', label: '90 - Contas Pendentes', group: '2024 Maicon' },
  { id: '12', label: '12 - Beneficiários', group: 'ANS' },
  { id: '15', label: '15 - Procedimentos', group: 'ANS' },
]

export type AiProvider = { id: string; label: string }

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'weknow', label: 'Weknow (padrão)' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'claude', label: 'Claude' },
]

/**
 * Provedores configurados na conta, oferecidos ao criar uma conversa.
 *
 * Com `?providers=none` na URL a lista chega vazia, para ver a tela de nova
 * conversa no estado em que nada foi configurado. É uma lista à parte do
 * catálogo acima de propósito: conversas que já existem continuam sabendo o
 * nome do provedor com que foram criadas, e só quem cria conversa nova sente
 * a falta. A tela reage à lista vazia sem saber que está sendo simulada.
 */
const semProvedor = new URLSearchParams(window.location.search).get('providers') === 'none'

export const CONFIGURED_PROVIDERS: AiProvider[] = semProvedor ? [] : AI_PROVIDERS
