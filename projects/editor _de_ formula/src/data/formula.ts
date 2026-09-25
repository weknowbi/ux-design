/**
 * O vocabulário da linguagem de fórmulas: campos, funções e constantes.
 *
 * Está separado da tela de propósito. O editor não sabe nada sobre saúde nem
 * sobre `person`; ele sabe pesquisar, completar, conferir e explicar o que
 * estiver escrito aqui. Trocar este arquivo pelos campos de outro modelo é
 * tudo o que separa esta tela de servir a qualquer painel.
 */

export type FieldType = 'number' | 'text' | 'boolean' | 'date'

export interface Field {
  name: string
  type: FieldType
  /** Pasta a que pertence — a tabela, ou o grupo de variáveis de contexto. */
  group: string
  desc?: string
  /** Tabela de origem, para o agrupamento "por Tabela". */
  table: string
  /** Categoria semântica dada no modelo, para "por Categoria". */
  category: string
  /**
   * Caminho da raiz até a pasta que contém a variável, para
   * "Hierarquicamente". Tem a profundidade que o modelo tiver — é daqui que
   * nasce a rolagem horizontal da lista.
   */
  path: string[]
}

export interface FnParam {
  name: string
  optional?: boolean
  default?: string
}

export interface Fn {
  name: string
  category: string
  params: FnParam[]
  returns: FieldType
  /**
   * O tipo do resultado é o dos argumentos, não um tipo fixo — `if` devolve
   * texto ou número conforme os ramos. Quem marca isto abre mão de anunciar o
   * tipo da fórmula, o que é melhor do que anunciar o errado.
   */
  polymorphic?: boolean
  desc: string
  example: string
}

export interface Const {
  name: string
  type: FieldType
  desc: string
}

export interface Operator {
  symbol: string
  name: string
  /** Aritméticos e de comparação ocupam grupos diferentes na barra. */
  group: 'aritmético' | 'comparação' | 'lógico' | 'agrupamento'
}

/** Rótulo curto do tipo, usado à direita da linha e na ajuda. */
export const TYPE_LABEL: Record<FieldType, string> = {
  number: 'número',
  text: 'texto',
  boolean: 'lógico',
  date: 'data',
}

// ── Variáveis ─────────────────────────────────────────────────────────────
/*
 * Os caminhos são fundos de propósito. Um modelo real de BI aninha pastas
 * várias camadas, e a lista precisa aguentar isso sem esconder o nome da
 * variável. O ramo `Saúde` desce quatro níveis justamente para o protótipo
 * mostrar a rolagem horizontal acontecendo, em vez de só prometer que ela
 * existiria.
 */
const CONTEXTO = 'Variáveis de contexto'

export const FIELDS: Field[] = [
  { name: 'age', type: 'number', group: 'person', table: 'person', category: 'Dimensões', path: ['person'], desc: 'Idade em anos' },
  { name: 'name', type: 'text', group: 'person', table: 'person', category: 'Identificadores', path: ['person'], desc: 'Nome da pessoa' },
  { name: 'sex', type: 'text', group: 'person', table: 'person', category: 'Dimensões', path: ['person'], desc: 'Sexo declarado' },
  { name: 'city', type: 'text', group: 'person', table: 'person', category: 'Dimensões', path: ['person', 'Localização'], desc: 'Município de residência' },
  { name: 'uf', type: 'text', group: 'person', table: 'person', category: 'Dimensões', path: ['person', 'Localização'], desc: 'Unidade federativa' },

  { name: 'height', type: 'number', group: 'person', table: 'person', category: 'Medidas', path: ['person', 'Saúde', 'Antropometria'], desc: 'Altura em metros' },
  { name: 'weight', type: 'number', group: 'person', table: 'person', category: 'Medidas', path: ['person', 'Saúde', 'Antropometria'], desc: 'Peso em quilos' },
  { name: 'imc', type: 'number', group: 'person', table: 'person', category: 'Medidas', path: ['person', 'Saúde', 'Antropometria', 'Índices derivados'], desc: 'Índice de massa corporal' },

  { name: 'daily_fat_intake', type: 'number', group: 'person', table: 'person', category: 'Medidas', path: ['person', 'Saúde', 'Ingestão diária'], desc: 'Gordura ingerida por dia, em gramas' },
  { name: 'daily_sugar_intake', type: 'number', group: 'person', table: 'person', category: 'Medidas', path: ['person', 'Saúde', 'Ingestão diária'], desc: 'Açúcar ingerido por dia, em gramas' },

  { name: 'is_adulto', type: 'boolean', group: 'person', table: 'person', category: 'Indicadores', path: ['person', 'Saúde', 'Classificações'], desc: 'Verdadeiro para 18 anos ou mais' },
  { name: 'is_obeso', type: 'boolean', group: 'person', table: 'person', category: 'Indicadores', path: ['person', 'Saúde', 'Classificações'], desc: 'Verdadeiro para IMC igual ou acima de 30' },
  { name: 'is_obeso_adulto', type: 'boolean', group: 'person', table: 'person', category: 'Indicadores', path: ['person', 'Saúde', 'Classificações', 'Indicadores derivados'], desc: 'Adulto e obeso ao mesmo tempo' },
  { name: 'perc_obeso_adulto', type: 'number', group: 'person', table: 'person', category: 'Medidas', path: ['person', 'Saúde', 'Classificações', 'Indicadores derivados'], desc: 'Percentual de adultos obesos' },

  /*
   * Segunda tabela, e ela existe para uma coisa: ter fundo de verdade.
   *
   * O ramo `Clínico › Diagnóstico › CID principal` desce cinco níveis com
   * nomes longos, que é o formato que um modelo de faturamento em saúde tem
   * mesmo. Sem um caso assim, a rolagem horizontal ficava só declarada no
   * código e ninguém conseguia olhar para ela e opinar.
   */
  { name: 'atendimento_id', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Identificadores', path: ['atendimento', 'Identificação'], desc: 'Chave única do atendimento' },
  { name: 'atendimento_numero_guia', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Identificadores', path: ['atendimento', 'Identificação'], desc: 'Número da guia apresentada ao convênio' },

  { name: 'diag_cid_principal_codigo', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Dimensões', path: ['atendimento', 'Clínico', 'Diagnóstico', 'CID principal'], desc: 'Código CID-10 do diagnóstico principal' },
  { name: 'diag_cid_principal_descricao', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Dimensões', path: ['atendimento', 'Clínico', 'Diagnóstico', 'CID principal'], desc: 'Descrição do diagnóstico principal' },
  { name: 'diag_cid_secundario_codigo', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Dimensões', path: ['atendimento', 'Clínico', 'Diagnóstico', 'CID secundário'], desc: 'Código CID-10 do diagnóstico secundário' },
  { name: 'diag_cid_secundario_descricao', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Dimensões', path: ['atendimento', 'Clínico', 'Diagnóstico', 'CID secundário'], desc: 'Descrição do diagnóstico secundário' },

  { name: 'proc_realizado_codigo_tuss', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Dimensões', path: ['atendimento', 'Clínico', 'Procedimentos', 'Realizados'], desc: 'Código TUSS do procedimento realizado' },
  { name: 'proc_realizado_quantidade', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Clínico', 'Procedimentos', 'Realizados'], desc: 'Quantidade executada do procedimento' },
  { name: 'proc_glosado_codigo_motivo', type: 'text', group: 'atendimento', table: 'atendimento', category: 'Dimensões', path: ['atendimento', 'Clínico', 'Procedimentos', 'Glosados'], desc: 'Motivo da glosa informado pelo convênio' },
  { name: 'proc_glosado_valor_total', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Clínico', 'Procedimentos', 'Glosados'], desc: 'Valor glosado no procedimento' },

  { name: 'fat_valor_apresentado', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Financeiro', 'Faturamento'], desc: 'Valor apresentado ao convênio' },
  { name: 'fat_valor_liberado', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Financeiro', 'Faturamento'], desc: 'Valor liberado pelo convênio' },
  { name: 'fat_valor_glosado', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Financeiro', 'Faturamento'], desc: 'Diferença entre apresentado e liberado' },
  { name: 'rep_valor_repassado', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Financeiro', 'Repasse', 'Corpo clínico'], desc: 'Valor repassado ao profissional' },

  /*
   * O caso extremo, e ele é o motivo de este ramo existir.
   *
   * Cinco pastas de recuo mais um nome de 38 caracteres dá uma linha bem mais
   * larga que a coluna. É aqui que se vê a ação da linha ficar presa à direita
   * enquanto o nome corre por baixo dela.
   */
  { name: 'rep_percentual_contratado_negociado', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Financeiro', 'Repasse', 'Corpo clínico', 'Regras de cálculo'], desc: 'Percentual de repasse após negociação com o corpo clínico' },
  { name: 'rep_base_calculo_liquida_impostos', type: 'number', group: 'atendimento', table: 'atendimento', category: 'Medidas', path: ['atendimento', 'Financeiro', 'Repasse', 'Corpo clínico', 'Regras de cálculo'], desc: 'Base de cálculo do repasse, já líquida de impostos' },

  { name: 'data_admissao', type: 'date', group: 'atendimento', table: 'atendimento', category: 'Datas', path: ['atendimento', 'Datas'], desc: 'Data e hora da admissão' },
  { name: 'data_alta', type: 'date', group: 'atendimento', table: 'atendimento', category: 'Datas', path: ['atendimento', 'Datas'], desc: 'Data e hora da alta' },
  { name: 'data_competencia', type: 'date', group: 'atendimento', table: 'atendimento', category: 'Datas', path: ['atendimento', 'Datas'], desc: 'Mês de competência do faturamento' },

  { name: 'sys:dashboardid', type: 'text', group: CONTEXTO, table: 'Sistema', category: 'Contexto', path: [CONTEXTO, 'Sessão'], desc: 'Identificador do painel aberto' },
  { name: 'sys:menuid', type: 'text', group: CONTEXTO, table: 'Sistema', category: 'Contexto', path: [CONTEXTO, 'Sessão'], desc: 'Identificador do item de menu' },
  { name: 'sys:ipaddress', type: 'text', group: CONTEXTO, table: 'Sistema', category: 'Contexto', path: [CONTEXTO, 'Sessão'], desc: 'Endereço de rede de quem consulta' },
  { name: 'sys:userid', type: 'text', group: CONTEXTO, table: 'Sistema', category: 'Contexto', path: [CONTEXTO, 'Usuário'], desc: 'Identificador de quem consulta' },
  { name: 'sys:username', type: 'text', group: CONTEXTO, table: 'Sistema', category: 'Contexto', path: [CONTEXTO, 'Usuário'], desc: 'Login de quem consulta' },
  { name: 'sys:userdisplayname', type: 'text', group: CONTEXTO, table: 'Sistema', category: 'Contexto', path: [CONTEXTO, 'Usuário'], desc: 'Nome de exibição de quem consulta' },
  { name: 'vcon_cd_contrato', type: 'text', group: CONTEXTO, table: 'Sistema', category: 'Contexto', path: [CONTEXTO, 'Contrato'], desc: 'Contrato do contexto atual' },
]

// ── Funções ───────────────────────────────────────────────────────────────
export const FUNCTIONS: Fn[] = [
  // Agregação
  { name: 'aggSum', category: 'Agregação', params: [{ name: 'campo' }], returns: 'number', desc: 'Soma os valores do campo no grupo.', example: 'aggSum(weight)' },
  { name: 'aggAvg', category: 'Agregação', params: [{ name: 'campo' }], returns: 'number', desc: 'Média dos valores do campo no grupo.', example: 'aggAvg(imc)' },
  { name: 'aggMin', category: 'Agregação', params: [{ name: 'campo' }], returns: 'number', desc: 'Menor valor do campo no grupo.', example: 'aggMin(age)' },
  { name: 'aggMax', category: 'Agregação', params: [{ name: 'campo' }], returns: 'number', desc: 'Maior valor do campo no grupo.', example: 'aggMax(age)' },
  { name: 'aggCount', category: 'Agregação', params: [{ name: 'campo' }], returns: 'number', desc: 'Quantidade de linhas com valor.', example: 'aggCount(name)' },
  { name: 'aggCountDistinct', category: 'Agregação', params: [{ name: 'campo' }], returns: 'number', desc: 'Quantidade de valores diferentes.', example: 'aggCountDistinct(city)' },

  // Janela
  { name: 'lead', category: 'Janela', params: [{ name: 'campo' }, { name: 'deslocamento', optional: true, default: '1' }], returns: 'number', desc: 'Valor da linha seguinte.', example: 'lead(weight, 1)' },
  { name: 'lag', category: 'Janela', params: [{ name: 'campo' }, { name: 'deslocamento', optional: true, default: '1' }], returns: 'number', desc: 'Valor da linha anterior.', example: 'lag(weight, 1)' },
  { name: 'runningSum', category: 'Janela', params: [{ name: 'campo' }], returns: 'number', desc: 'Soma acumulada na ordem atual.', example: 'runningSum(weight)' },
  { name: 'rank', category: 'Janela', params: [{ name: 'campo' }], returns: 'number', desc: 'Posição do valor na ordenação do grupo.', example: 'rank(imc)' },

  // Lógica
  { name: 'if', category: 'Lógica', params: [{ name: 'condição' }, { name: 'então' }, { name: 'senão' }], returns: 'text', polymorphic: true, desc: 'Escolhe entre dois valores segundo a condição.', example: 'if(imc >= 30, "obeso", "normal")' },
  { name: 'coalesce', category: 'Lógica', params: [{ name: 'valor1' }, { name: 'valor2' }, { name: '…', optional: true }], returns: 'text', polymorphic: true, desc: 'Primeiro valor que não for nulo.', example: 'coalesce(city, "não informado")' },
  { name: 'isNull', category: 'Lógica', params: [{ name: 'valor' }], returns: 'boolean', desc: 'Verdadeiro quando o valor é nulo.', example: 'isNull(city)' },
  { name: 'isText', category: 'Lógica', params: [{ name: 'valor' }], returns: 'boolean', desc: 'Verdadeiro quando o tipo é texto.', example: 'isText(uf)' },
  { name: 'isNumber', category: 'Lógica', params: [{ name: 'valor' }], returns: 'boolean', desc: 'Verdadeiro quando o tipo é numérico.', example: 'isNumber(age)' },

  // Matemática
  { name: 'div', category: 'Matemática', params: [{ name: 'dividendo' }, { name: 'divisor' }, { name: 'falha', optional: true, default: '@null' }], returns: 'number', desc: 'Divide tratando o divisor zero.', example: 'div(weight, height ^ 2, 0)' },
  { name: 'abs', category: 'Matemática', params: [{ name: 'número' }], returns: 'number', desc: 'Valor sem sinal.', example: 'abs(lead(weight) - weight)' },
  { name: 'round', category: 'Matemática', params: [{ name: 'número' }, { name: 'casas', optional: true, default: '0' }], returns: 'number', desc: 'Arredonda para o número de casas.', example: 'round(imc, 1)' },
  { name: 'floor', category: 'Matemática', params: [{ name: 'número' }], returns: 'number', desc: 'Arredonda para baixo.', example: 'floor(imc)' },
  { name: 'ceil', category: 'Matemática', params: [{ name: 'número' }], returns: 'number', desc: 'Arredonda para cima.', example: 'ceil(imc)' },
  { name: 'sqrt', category: 'Matemática', params: [{ name: 'número' }], returns: 'number', desc: 'Raiz quadrada.', example: 'sqrt(weight)' },

  // Texto
  { name: 'concat', category: 'Texto', params: [{ name: 'texto1' }, { name: 'texto2' }, { name: '…', optional: true }], returns: 'text', desc: 'Junta textos em um só.', example: 'concat(city, " / ", uf)' },
  { name: 'len', category: 'Texto', params: [{ name: 'texto' }], returns: 'number', desc: 'Quantidade de caracteres.', example: 'len(name)' },
  { name: 'upper', category: 'Texto', params: [{ name: 'texto' }], returns: 'text', desc: 'Converte para maiúsculas.', example: 'upper(uf)' },
  { name: 'lower', category: 'Texto', params: [{ name: 'texto' }], returns: 'text', desc: 'Converte para minúsculas.', example: 'lower(city)' },
  { name: 'trim', category: 'Texto', params: [{ name: 'texto' }], returns: 'text', desc: 'Remove espaços das pontas.', example: 'trim(name)' },
  { name: 'substr', category: 'Texto', params: [{ name: 'texto' }, { name: 'início' }, { name: 'tamanho', optional: true }], returns: 'text', desc: 'Recorta um pedaço do texto.', example: 'substr(name, 1, 3)' },
  { name: 'replace', category: 'Texto', params: [{ name: 'texto' }, { name: 'procurar' }, { name: 'trocar por' }], returns: 'text', desc: 'Troca todas as ocorrências.', example: 'replace(city, "-", " ")' },
  { name: 'contains', category: 'Texto', params: [{ name: 'texto' }, { name: 'trecho' }], returns: 'boolean', desc: 'Verdadeiro quando o trecho aparece.', example: 'contains(name, "Silva")' },

  // Data
  { name: 'now', category: 'Data', params: [], returns: 'date', desc: 'Data e hora de agora.', example: 'now()' },
  { name: 'year', category: 'Data', params: [{ name: 'data' }], returns: 'number', desc: 'Ano da data.', example: 'year(now())' },
  { name: 'month', category: 'Data', params: [{ name: 'data' }], returns: 'number', desc: 'Mês da data, de 1 a 12.', example: 'month(now())' },
  { name: 'day', category: 'Data', params: [{ name: 'data' }], returns: 'number', desc: 'Dia do mês.', example: 'day(now())' },
  { name: 'dateDiff', category: 'Data', params: [{ name: 'inicial' }, { name: 'final' }, { name: 'unidade', optional: true, default: '"dia"' }], returns: 'number', desc: 'Distância entre duas datas.', example: 'dateDiff(now(), now(), "dia")' },
  { name: 'getIniMonthDT', category: 'Data', params: [{ name: 'data' }], returns: 'date', desc: 'Primeiro instante do mês da data.', example: 'getIniMonthDT(now())' },
  { name: 'getFinMonthDT', category: 'Data', params: [{ name: 'data' }], returns: 'date', desc: 'Último instante do mês da data.', example: 'getFinMonthDT(now())' },
  { name: 'getIniYearDT', category: 'Data', params: [{ name: 'data' }], returns: 'date', desc: 'Primeiro instante do ano da data.', example: 'getIniYearDT(now())' },
]

// ── Constantes ────────────────────────────────────────────────────────────
export const CONSTANTS: Const[] = [
  { name: 'true', type: 'boolean', desc: 'Verdadeiro' },
  { name: 'false', type: 'boolean', desc: 'Falso' },
  { name: 'null', type: 'text', desc: 'Ausência de valor' },
  { name: 'pi', type: 'number', desc: 'Número pi, 3,14159…' },
  { name: 'e', type: 'number', desc: 'Base do logaritmo natural, 2,71828…' },
  { name: 'currT', type: 'date', desc: 'Hora atual do servidor' },
  { name: 'oneDay', type: 'number', desc: 'Um dia em milissegundos' },
  { name: 'timezoneOffset', type: 'number', desc: 'Diferença de fuso, em minutos' },
]

// ── Operadores ────────────────────────────────────────────────────────────
export const OPERATORS: Operator[] = [
  { symbol: '+', name: 'Soma', group: 'aritmético' },
  { symbol: '-', name: 'Subtração', group: 'aritmético' },
  { symbol: '*', name: 'Multiplicação', group: 'aritmético' },
  { symbol: '/', name: 'Divisão', group: 'aritmético' },
  { symbol: '\\', name: 'Divisão inteira', group: 'aritmético' },
  { symbol: '%', name: 'Resto da divisão', group: 'aritmético' },
  { symbol: '^', name: 'Potência', group: 'aritmético' },

  { symbol: '=', name: 'Igual a', group: 'comparação' },
  { symbol: '<>', name: 'Diferente de', group: 'comparação' },
  { symbol: '<', name: 'Menor que', group: 'comparação' },
  { symbol: '>', name: 'Maior que', group: 'comparação' },
  { symbol: '<=', name: 'Menor ou igual a', group: 'comparação' },
  { symbol: '>=', name: 'Maior ou igual a', group: 'comparação' },

  { symbol: '&', name: 'E lógico', group: 'lógico' },
  { symbol: '|', name: 'Ou lógico', group: 'lógico' },
  { symbol: '!', name: 'Negação', group: 'lógico' },

  { symbol: '(', name: 'Abre parênteses', group: 'agrupamento' },
  { symbol: ')', name: 'Fecha parênteses', group: 'agrupamento' },
  { symbol: ',', name: 'Separa argumentos', group: 'agrupamento' },
]

// ── Índices ───────────────────────────────────────────────────────────────
export const FIELD_BY_NAME = new Map(FIELDS.map((f) => [f.name, f]))
export const FN_BY_NAME = new Map(FUNCTIONS.map((f) => [f.name, f]))
export const CONST_BY_NAME = new Map(CONSTANTS.map((c) => [c.name, c]))

/** Assinatura legível: `round(número, [casas])`. */
export function signature(fn: Fn): string {
  const args = fn.params.map((p) => (p.optional ? `[${p.name}]` : p.name)).join(', ')
  return `${fn.name}(${args})`
}

// ── Árvore de variáveis ───────────────────────────────────────────────────

export type VarOrder = 'padrao' | 'categoria' | 'tabela' | 'hierarquia'

export const VAR_ORDERS: { id: VarOrder; label: string }[] = [
  { id: 'padrao', label: 'Padrão' },
  { id: 'categoria', label: 'por Categoria' },
  { id: 'tabela', label: 'por Tabela' },
  { id: 'hierarquia', label: 'Hierarquicamente' },
]

/** Nó da árvore: pasta quando tem filhos, variável quando é folha. */
export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
  field?: Field
}

/** Quantas variáveis existem abaixo deste nó, contando todos os níveis. */
export function countLeaves(node: TreeNode): number {
  if (node.field) return 1
  return (node.children ?? []).reduce((n, c) => n + countLeaves(c), 0)
}

/** Monta a árvore a partir do caminho de cada variável. */
function treeFromPaths(fields: Field[], pathOf: (f: Field) => string[]): TreeNode[] {
  const roots: TreeNode[] = []

  for (const f of fields) {
    let level = roots
    let id = ''
    for (const part of pathOf(f)) {
      id = id ? `${id}/${part}` : part
      let node = level.find((n) => n.id === id)
      if (!node) {
        node = { id, label: part, children: [] }
        level.push(node)
      }
      level = node.children!
    }
    level.push({ id: `${id}/${f.name}`, label: f.name, field: f })
  }

  return roots
}

/**
 * As quatro organizações do seletor.
 *
 * "Padrão" é o que o modelo entrega hoje: a tabela e as variáveis de
 * contexto, um nível só. As outras três reagrupam a mesma lista por um
 * atributo diferente, e só "Hierarquicamente" desce pelas pastas inteiras.
 *
 * A semântica exata de cada uma no Weknow eu não conheço — isto é a leitura
 * que faz sentido pelos nomes, e vale conferir com quem mantém o modelo.
 */
export function variableTree(order: VarOrder): TreeNode[] {
  /*
   * "Padrão" passou a ser a árvore de pastas do modelo, e não uma lista rasa
   * por tabela. É o que a palavra promete: o modelo como ele vem. Manter o
   * raso era esconder do protótipo justamente a estrutura que o cliente tem.
   *
   * Isso deixa "Padrão" e "Hierarquicamente" produzindo a mesma árvore hoje,
   * o que é uma pergunta em aberto e não um descuido. Em BI, "hierarquia"
   * costuma ser a de navegação — ano › mês › dia, estado › cidade — que é
   * outra coisa de pasta. Falta a definição de quem mantém o modelo.
   */
  if (order === 'hierarquia') return treeFromPaths(FIELDS, (f) => f.path)
  if (order === 'categoria') return treeFromPaths(FIELDS, (f) => [f.category])
  if (order === 'tabela') return treeFromPaths(FIELDS, (f) => [f.table])
  return treeFromPaths(FIELDS, (f) => f.path)
}
