import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { COLOR, RADIUS } from '@/design/tokens'
import { Icon } from '@/components/icons'
import {
  completionAt,
  tokenize,
  type CompletionContext,
  type Problem,
  type Suggestion,
  type TokenKind,
} from '@/lib/formulaLang'

/**
 * A caixa da fórmula: numeração, pintura dos símbolos, sublinhado do erro e
 * a lista de sugestões junto ao cursor.
 *
 * A pintura é uma camada atrás de um `textarea` de texto transparente. Tudo
 * o que decide medida — família, corpo, entrelinha, respiro, quebra — está em
 * `TEXT_STYLE` e vale para as duas camadas, porque um pixel de diferença
 * entre elas descola a cor das letras e o defeito só aparece na linha 12.
 *
 * A linha não quebra (`pre`, com rolagem lateral). Fora manter a numeração
 * honesta, é o que permite achar o cursor por conta: em fonte monoespaçada
 * sem quebra, a posição é coluna × largura do caractere, medida uma vez.
 */

const FONT_SIZE = 13
const LINE_HEIGHT = 22
const PAD = 12
const GUTTER = 44

const TEXT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--wk-mono)',
  fontSize: FONT_SIZE,
  lineHeight: `${LINE_HEIGHT}px`,
  padding: PAD,
  whiteSpace: 'pre',
  tabSize: 2,
  border: 0,
  margin: 0,
}

/**
 * Cores dos símbolos.
 *
 * Uma linguagem de fórmula não precisa de arco-íris, e este sistema não tem
 * um: existe a primária e existem três tons de texto. Então a hierarquia é a
 * do próprio sistema — a função, que é o verbo, fica na primária; o campo,
 * que é o dado, ganha o fundo tingido de uma referência; valor literal e
 * pontuação recuam. Nome inexistente é o único que puxa `--wk-danger`.
 */
const TOKEN_STYLE: Record<TokenKind, React.CSSProperties> = {
  fn: { color: COLOR.primary, fontWeight: 500 },
  field: { color: COLOR.text, background: 'var(--wk-tint-soft)', borderRadius: 3 },
  const: { color: COLOR.textSecondary, fontWeight: 500 },
  unknown: { color: COLOR.danger, textDecoration: 'underline wavy', textUnderlineOffset: 3 },
  string: { color: COLOR.textSecondary },
  number: { color: COLOR.textSecondary },
  operator: { color: COLOR.textMuted },
  punct: { color: COLOR.textMuted },
  space: {},
}

export interface FormulaInputHandle {
  /** Escreve no lugar do cursor, ou por cima do que estiver selecionado. */
  insert: (text: string, caretOffset?: number) => void
  focus: () => void
}

interface Props {
  value: string
  onChange: (v: string) => void
  problem: Problem | null
  /** Cursor mudou de lugar — o rodapé usa isso para a ajuda de assinatura. */
  onCaret: (caret: number) => void
  onSubmit?: () => void
}

export const FormulaInput = forwardRef<FormulaInputHandle, Props>(function FormulaInput(
  { value, onChange, problem, onCaret, onSubmit },
  ref,
) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const paintRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLSpanElement>(null)

  const [focused, setFocused] = useState(false)
  const [charWidth, setCharWidth] = useState(7.8)
  const [completion, setCompletion] = useState<CompletionContext | null>(null)
  const [picked, setPicked] = useState(0)
  const [caretBox, setCaretBox] = useState({ x: PAD, y: PAD + LINE_HEIGHT })

  /* A largura do caractere é medida do DOM, não chutada: ela muda com a fonte
     que o sistema acabar escolhendo na pilha monoespaçada. */
  useLayoutEffect(() => {
    const el = rulerRef.current
    if (el) setCharWidth(el.getBoundingClientRect().width / 40)
  }, [])

  const syncScroll = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    if (paintRef.current) {
      paintRef.current.scrollTop = ta.scrollTop
      paintRef.current.scrollLeft = ta.scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop
  }, [])

  /** Onde desenhar a lista: logo abaixo da linha em que o cursor está. */
  const measureCaret = useCallback(
    (caret: number) => {
      const ta = taRef.current
      if (!ta) return
      const upto = value.slice(0, caret)
      const line = upto.split('\n').length - 1
      const col = caret - (upto.lastIndexOf('\n') + 1)
      setCaretBox({
        x: PAD + col * charWidth - ta.scrollLeft,
        y: PAD + (line + 1) * LINE_HEIGHT - ta.scrollTop,
      })
    },
    [value, charWidth],
  )

  const refresh = useCallback(
    (nextValue: string, caret: number, allowCompletion: boolean) => {
      onCaret(caret)
      measureCaret(caret)
      const next = allowCompletion ? completionAt(nextValue, caret) : null
      setCompletion(next)
      setPicked(0)
    },
    [measureCaret, onCaret],
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    refresh(e.target.value, e.target.selectionStart ?? 0, true)
  }

  /* Clique e setas mexem o cursor sem mudar o texto: a ajuda de assinatura
     precisa acompanhar, mas a lista de sugestões não deve abrir sozinha. */
  const handleCaretMove = () => {
    const ta = taRef.current
    if (!ta) return
    const caret = ta.selectionStart ?? 0
    onCaret(caret)
    measureCaret(caret)
    if (completion) setCompletion(completionAt(value, caret))
  }

  /**
   * Onde o cursor deve parar depois que o texto novo chegar de volta.
   *
   * Guardar e aplicar num efeito de layout, e não logo depois do `onChange`:
   * o texto é controlado pelo pai, então o React ainda vai reescrever o
   * `value` do campo, e reescrever o valor de um `textarea` joga o cursor
   * para o fim. Mexer antes disso era perder a posição — o `aggSum()` da
   * sugestão terminava com o cursor depois do `)`, não entre eles.
   */
  const pendingCaret = useRef<number | null>(null)

  const write = useCallback(
    (text: string, from: number, to: number, caretOffset?: number) => {
      pendingCaret.current = from + (caretOffset ?? text.length)
      onChange(value.slice(0, from) + text + value.slice(to))
    },
    [value, onChange],
  )

  useLayoutEffect(() => {
    const caret = pendingCaret.current
    const ta = taRef.current
    if (caret === null || !ta) return
    pendingCaret.current = null
    ta.focus()
    ta.selectionStart = ta.selectionEnd = caret
    refresh(value, caret, false)
  }, [value, refresh])

  const accept = useCallback(
    (s: Suggestion) => {
      if (!completion) return
      setCompletion(null)
      write(s.insert, completion.start, completion.end, s.caretOffset)
    },
    [completion, write],
  )

  useImperativeHandle(ref, () => ({
    insert: (text, caretOffset) => {
      const ta = taRef.current
      const from = ta?.selectionStart ?? value.length
      const to = ta?.selectionEnd ?? value.length
      write(text, from, to, caretOffset)
    },
    focus: () => taRef.current?.focus(),
  }))

  useEffect(() => {
    if (!completion) return
    /* Rola a lista para o item escolhido continuar visível. */
    document.getElementById(`sug-${picked}`)?.scrollIntoView({ block: 'nearest' })
  }, [picked, completion])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onSubmit?.()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault()
      const caret = taRef.current?.selectionStart ?? 0
      refresh(value, caret, true)
      return
    }

    if (!completion) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setPicked((p) => (p + 1) % completion.items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setPicked((p) => (p - 1 + completion.items.length) % completion.items.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      accept(completion.items[picked])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setCompletion(null)
    }
  }

  const tokens = tokenize(value)
  const lineCount = value.split('\n').length
  const borderColor = problem ? COLOR.danger : focused ? COLOR.primary : COLOR.border

  return (
    <div
      className="relative flex flex-1 min-h-0 overflow-hidden transition-colors"
      style={{ border: `1px solid ${borderColor}`, borderRadius: RADIUS.lg, background: COLOR.surface }}
    >
      {/* Régua invisível: 40 caracteres cuja largura dá a de um. */}
      <span
        ref={rulerRef}
        aria-hidden="true"
        style={{ ...TEXT_STYLE, padding: 0, position: 'absolute', visibility: 'hidden', top: -9999 }}
      >
        0000000000000000000000000000000000000000
      </span>

      <div
        ref={gutterRef}
        aria-hidden="true"
        className="shrink-0 overflow-hidden text-right select-none"
        style={{
          width: GUTTER,
          background: 'var(--wk-surface-subtle)',
          borderRight: `1px solid ${COLOR.border}`,
          color: COLOR.textMuted,
          fontFamily: 'var(--wk-mono)',
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_HEIGHT}px`,
          paddingBlock: PAD,
          paddingInline: 8,
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>

      <div className="relative flex-1 min-w-0">
        <pre ref={paintRef} aria-hidden="true" className="absolute inset-0 overflow-hidden" style={TEXT_STYLE}>
          {/* O texto do campo é transparente, porque quem pinta é esta
              camada — então o `placeholder` nativo do `textarea` também sairia
              transparente. Ele é desenhado aqui. */}
          {value === '' && <span style={{ color: COLOR.textMuted }}>Comece a escrever a fórmula.</span>}
          {tokens.map((t, i) => {
            const marked = problem && t.start < problem.end && t.end > problem.start
            return (
              <span
                key={i}
                style={{
                  ...TOKEN_STYLE[t.kind],
                  ...(marked
                    ? { color: COLOR.danger, textDecoration: 'underline wavy', textUnderlineOffset: 3, background: 'transparent' }
                    : null),
                }}
              >
                {t.text}
              </span>
            )
          })}
          {/* Uma linha em branco no fim garante que a pintura role tanto
              quanto o campo, senão a última linha fica sem cor ao rolar. */}
          {'\n'}
        </pre>

        <textarea
          ref={taRef}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onKeyUp={handleCaretMove}
          onClick={handleCaretMove}
          onScroll={syncScroll}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            /* Um instante antes de fechar: o clique numa sugestão precisa
               acontecer antes de a lista sumir. */
            setTimeout(() => setCompletion(null), 120)
          }}
          spellCheck={false}
          autoComplete="off"
          aria-label="Fórmula"
          className="absolute inset-0 w-full h-full resize-none outline-none overflow-auto"
          style={{ ...TEXT_STYLE, background: 'transparent', color: 'transparent', caretColor: COLOR.text }}
        />

        {completion && (
          <div
            className="absolute z-20 overflow-y-auto"
            style={{
              left: Math.max(0, Math.min(caretBox.x, 320)),
              top: caretBox.y + 4,
              width: 340,
              maxHeight: 232,
              background: COLOR.surface,
              border: `1px solid ${COLOR.border}`,
              borderRadius: RADIUS.md,
              boxShadow: 'var(--wk-shadow-menu)',
              padding: 4,
            }}
            role="listbox"
            aria-label="Sugestões"
          >
            {completion.items.map((s, i) => {
              const on = i === picked
              return (
                <button
                  key={`${s.kind}-${s.name}`}
                  id={`sug-${i}`}
                  role="option"
                  aria-selected={on}
                  onMouseEnter={() => setPicked(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    accept(s)
                  }}
                  className="w-full flex items-center gap-2 text-left rounded-md"
                  style={{ height: 36, paddingInline: 8, background: on ? 'var(--wk-menu-hover)' : 'transparent' }}
                >
                  <Icon
                    name={s.kind === 'fn' ? 'function' : s.kind === 'field' ? 'label' : 'data_object'}
                    size={20}
                    color={s.kind === 'fn' ? COLOR.primary : COLOR.navLabel}
                  />
                  <span
                    className="truncate"
                    style={{ fontFamily: 'var(--wk-mono)', fontSize: 13, color: COLOR.text }}
                  >
                    {s.name}
                  </span>
                  <span
                    className="ml-auto shrink-0 truncate"
                    style={{ fontSize: 12, color: COLOR.textMuted, maxWidth: 150 }}
                  >
                    {s.kind === 'fn' ? s.detail.slice(s.name.length) : s.detail}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
