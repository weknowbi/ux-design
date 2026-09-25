/**
 * A linguagem de fórmulas: separar em símbolos, conferir, completar e
 * explicar. Não interpreta nem calcula — só entende o texto o bastante para
 * a tela poder ajudar quem escreve.
 *
 * O leitor de símbolos é um só, e as três funcionalidades saem dele. Escrever
 * uma varredura por funcionalidade era o caminho curto para elas discordarem
 * entre si: o pintor achando que `"a b"` são duas palavras e o conferidor
 * achando que é uma.
 */

import {
  CONST_BY_NAME,
  FIELD_BY_NAME,
  FN_BY_NAME,
  FUNCTIONS,
  FIELDS,
  CONSTANTS,
  signature,
  type Fn,
  type FieldType,
} from '@/data/formula'

// ── Símbolos ──────────────────────────────────────────────────────────────
export type TokenKind =
  | 'fn'        // nome de função conhecida
  | 'field'     // nome de campo conhecido
  | 'const'     // constante conhecida
  | 'unknown'   // parece nome, mas não existe no vocabulário
  | 'string'
  | 'number'
  | 'operator'
  | 'punct'
  | 'space'

export interface Token {
  kind: TokenKind
  text: string
  start: number
  end: number
  /** Só para textos: aspas nunca fechadas. */
  unterminated?: boolean
}

/* `:` entra no nome por causa das variáveis de contexto (`sys:userid`). */
const NAME_RE = /[A-Za-z_]/
const NAME_BODY_RE = /[A-Za-z0-9_:.]/
const OPERATOR_CHARS = '+-*/\\%^=<>&|!'

export function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0

  const push = (kind: TokenKind, start: number, end: number, extra?: Partial<Token>) =>
    out.push({ kind, text: src.slice(start, end), start, end, ...extra })

  while (i < src.length) {
    const c = src[i]

    if (/\s/.test(c)) {
      const start = i
      while (i < src.length && /\s/.test(src[i])) i++
      push('space', start, i)
      continue
    }

    if (c === '"' || c === "'") {
      const quote = c
      const start = i
      i++
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i++
        i++
      }
      const closed = src[i] === quote
      if (closed) i++
      push('string', start, i, { unterminated: !closed })
      continue
    }

    if (/[0-9]/.test(c)) {
      const start = i
      while (i < src.length && /[0-9._]/.test(src[i])) i++
      /* `0x1A` e `0b1011` continuam sendo um número só. */
      if (/^0[xb]/i.test(src.slice(start, start + 2))) {
        while (i < src.length && /[0-9a-fA-F]/.test(src[i])) i++
      }
      push('number', start, i)
      continue
    }

    if (NAME_RE.test(c) || c === '@') {
      const start = i
      if (c === '@') i++
      while (i < src.length && NAME_BODY_RE.test(src[i])) i++
      const raw = src.slice(start, i)
      const name = raw.replace(/^@/, '')
      const kind: TokenKind = FN_BY_NAME.has(name)
        ? 'fn'
        : FIELD_BY_NAME.has(name)
          ? 'field'
          : CONST_BY_NAME.has(name)
            ? 'const'
            : 'unknown'
      push(kind, start, i)
      continue
    }

    if ('(),'.includes(c)) {
      push('punct', i, i + 1)
      i++
      continue
    }

    if (OPERATOR_CHARS.includes(c)) {
      const start = i
      /* Os de dois caracteres primeiro, senão `<=` vira `<` seguido de `=`. */
      const two = src.slice(i, i + 2)
      i += ['<=', '>=', '<>'].includes(two) ? 2 : 1
      push('operator', start, i)
      continue
    }

    push('punct', i, i + 1)
    i++
  }

  return out
}

// ── Conferência ───────────────────────────────────────────────────────────
export interface Problem {
  message: string
  start: number
  end: number
  /**
   * `nome-desconhecido` recebe tratamento próprio na tela: um nome pela
   * metade é o estado normal de quem está digitando, não um defeito ainda.
   */
  kind: 'nome-desconhecido' | 'sintaxe'
}

export type Status =
  | { state: 'empty' }
  | { state: 'ok'; returns: FieldType | null }
  | { state: 'error'; problem: Problem }

/**
 * Devolve o primeiro problema, e só ele.
 *
 * Uma lista de cinco erros de uma fórmula meio escrita é ruído: os quatro
 * últimos costumam ser consequência do primeiro, e some com a única coisa que
 * a pessoa precisa consertar agora.
 */
export function check(src: string): Status {
  if (!src.trim()) return { state: 'empty' }

  const tokens = tokenize(src)
  const code = tokens.filter((t) => t.kind !== 'space')

  for (const t of tokens) {
    if (t.kind === 'string' && t.unterminated) {
      return { state: 'error', problem: { message: 'Texto aberto: falta fechar as aspas.', start: t.start, end: t.end, kind: 'sintaxe' } }
    }
    if (t.kind === 'unknown') {
      const name = t.text.replace(/^@/, '')
      return {
        state: 'error',
        problem: { message: `Não existe campo nem função com o nome ${name}.`, start: t.start, end: t.end, kind: 'nome-desconhecido' },
      }
    }
  }

  /* Função sem parênteses é quase sempre a pessoa achando que o nome sozinho
     agrega. Vale um recado próprio, não um "erro de sintaxe". */
  for (let i = 0; i < code.length; i++) {
    const t = code[i]
    if (t.kind !== 'fn') continue
    const next = code[i + 1]
    if (!next || next.text !== '(') {
      return {
        state: 'error',
        problem: { message: `${t.text} é uma função e precisa de parênteses: ${t.text}(…).`, start: t.start, end: t.end, kind: 'sintaxe' },
      }
    }
  }

  const stack: Token[] = []
  for (const t of code) {
    if (t.text === '(') stack.push(t)
    if (t.text === ')') {
      if (stack.length === 0) {
        return { state: 'error', problem: { message: 'Há um ")" a mais.', start: t.start, end: t.end, kind: 'sintaxe' } }
      }
      stack.pop()
    }
  }
  if (stack.length > 0) {
    const open = stack[stack.length - 1]
    return { state: 'error', problem: { message: 'Falta fechar um ")".', start: open.start, end: open.end, kind: 'sintaxe' } }
  }

  const last = code[code.length - 1]
  if (last && (last.kind === 'operator' || last.text === ',')) {
    return {
      state: 'error',
      problem: { message: `A fórmula termina em "${last.text}" e espera um valor depois.`, start: last.start, end: last.end, kind: 'sintaxe' },
    }
  }

  return { state: 'ok', returns: resultType(code) }
}

const BOOLEAN_OPS = ['=', '<>', '<', '>', '<=', '>=', '&', '|', '!']

/**
 * Tipo do resultado, quando dá para dizer sem interpretar a fórmula.
 *
 * Não é inferência de tipos — é uma pista para a linha de estado, e uma pista
 * errada é pior que nenhuma. Por isso só duas regras, e `null` no resto:
 *
 * 1. Comparação ou lógica **fora de qualquer parêntese** manda: a expressão
 *    inteira é uma pergunta de sim ou não. A profundidade importa. Em
 *    `if(imc >= 30, "obeso", "normal")` o `>=` é argumento do `if`, e dizer
 *    que a fórmula devolve lógico por causa dele era o que estava acontecendo.
 * 2. Fora isso, vale o tipo do primeiro nome — menos quando ele é uma função
 *    cujo tipo depende do que receber, como `if` e `coalesce`.
 */
function resultType(code: Token[]): FieldType | null {
  let depth = 0
  for (const t of code) {
    if (t.text === '(') depth++
    else if (t.text === ')') depth--
    else if (depth === 0 && t.kind === 'operator' && BOOLEAN_OPS.includes(t.text)) return 'boolean'
  }

  const first = code.find((t) => t.kind === 'fn' || t.kind === 'field' || t.kind === 'const')
  if (!first) return code.some((t) => t.kind === 'number') ? 'number' : null

  const name = first.text.replace(/^@/, '')
  const fn = FN_BY_NAME.get(name)
  if (fn) return fn.polymorphic ? null : fn.returns
  return FIELD_BY_NAME.get(name)?.type ?? CONST_BY_NAME.get(name)?.type ?? null
}

// ── Ajuda de assinatura ───────────────────────────────────────────────────
export interface SignatureHelp {
  fn: Fn
  /** Índice do argumento em que o cursor está. */
  argIndex: number
}

/**
 * Que chamada envolve o cursor, e em que argumento ele está.
 *
 * Anda de trás para frente contando parênteses: cada `)` esconde uma chamada
 * inteira, cada `(` sem par é a chamada que ainda está aberta em volta.
 */
export function signatureAt(src: string, caret: number): SignatureHelp | null {
  const code = tokenize(src).filter((t) => t.kind !== 'space' && t.start < caret)
  let depth = 0
  let commas = 0

  for (let i = code.length - 1; i >= 0; i--) {
    const t = code[i]
    if (t.text === ')') depth++
    else if (t.text === '(') {
      if (depth === 0) {
        const before = code[i - 1]
        if (before?.kind === 'fn') {
          const fn = FN_BY_NAME.get(before.text.replace(/^@/, ''))
          if (fn) return { fn, argIndex: commas }
        }
        return null
      }
      depth--
    } else if (t.text === ',' && depth === 0) commas++
  }
  return null
}

// ── Sugestões ─────────────────────────────────────────────────────────────
export interface Suggestion {
  kind: 'fn' | 'field' | 'const'
  name: string
  /** Assinatura no caso de função, tipo no caso de campo e constante. */
  detail: string
  desc: string
  /** O que entra no texto, e onde o cursor deve parar depois. */
  insert: string
  caretOffset: number
}

export interface CompletionContext {
  /** Trecho já digitado que vai ser substituído. */
  start: number
  end: number
  prefix: string
  items: Suggestion[]
}

const suggestionOf = {
  fn: (fn: Fn): Suggestion => ({
    kind: 'fn',
    name: fn.name,
    detail: signature(fn),
    desc: fn.desc,
    insert: `${fn.name}()`,
    /* Cursor dentro dos parênteses, no lugar do primeiro argumento — ou
       depois deles quando a função não recebe nada. */
    caretOffset: fn.params.length > 0 ? fn.name.length + 1 : fn.name.length + 2,
  }),
}

/**
 * O que oferecer para o nome que está sendo digitado sob o cursor.
 *
 * Devolve `null` quando o cursor não está num nome: sugerir sozinho no meio
 * de um número ou dentro de um texto entre aspas só atrapalha.
 */
export function completionAt(src: string, caret: number): CompletionContext | null {
  const tokens = tokenize(src)
  const hit = tokens.find((t) => caret > t.start && caret <= t.end)
  if (hit && (hit.kind === 'string' || hit.kind === 'number')) return null

  let start = caret
  while (start > 0 && NAME_BODY_RE.test(src[start - 1])) start--
  if (start > 0 && src[start - 1] === '@') start--

  const prefix = src.slice(start, caret)
  if (!prefix) return null

  const needle = prefix.replace(/^@/, '').toLowerCase()
  if (!needle) return null

  const items: Suggestion[] = [
    ...FUNCTIONS.filter((f) => f.name.toLowerCase().includes(needle)).map(suggestionOf.fn),
    ...FIELDS.filter((f) => f.name.toLowerCase().includes(needle)).map((f) => ({
      kind: 'field' as const,
      name: f.name,
      detail: f.group,
      desc: f.desc ?? '',
      insert: f.name,
      caretOffset: f.name.length,
    })),
    ...CONSTANTS.filter((c) => c.name.toLowerCase().includes(needle)).map((c) => ({
      kind: 'const' as const,
      name: c.name,
      detail: 'constante',
      desc: c.desc,
      insert: c.name,
      caretOffset: c.name.length,
    })),
  ]

  /* Quem começa com o que foi digitado vem antes de quem só contém. */
  items.sort((a, b) => {
    const ap = a.name.toLowerCase().startsWith(needle) ? 0 : 1
    const bp = b.name.toLowerCase().startsWith(needle) ? 0 : 1
    return ap - bp || a.name.length - b.name.length || a.name.localeCompare(b.name)
  })

  if (items.length === 0) return null
  /* Um item idêntico ao que já está escrito não é sugestão, é eco. */
  if (items.length === 1 && items[0].name === prefix.replace(/^@/, '')) return null

  return { start, end: caret, prefix, items: items.slice(0, 8) }
}
