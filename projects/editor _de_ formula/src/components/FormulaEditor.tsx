import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { Icon } from '@/components/icons'
import { FormulaInput, type FormulaInputHandle } from '@/components/FormulaInput'
import { FadeScroll } from '@/components/FadeScroll'
import { InsertValueModal, type LiteralKind } from '@/components/InsertValueModal'
import ColorPicker from '@/components/ColorPicker'
import { ValuePopover } from '@/components/ValuePopover'
import {
  CONSTANTS,
  FUNCTIONS,
  OPERATORS,
  TYPE_LABEL,
  VAR_ORDERS,
  signature,
  variableTree,
  type Field,
  type Fn,
  type TreeNode,
  type VarOrder,
} from '@/data/formula'
import { check, signatureAt } from '@/lib/formulaLang'

/**
 * Editor de fórmula.
 *
 * A tela existe para uma coisa: escrever uma expressão que o painel entenda,
 * sem ter decorado a linguagem. Tudo aqui responde a isso.
 *
 * O que mudou em relação ao desenho anterior, e por quê:
 *
 * — **Uma busca só, no lugar de quatro abas.** `Op`, `Ct`, `Fn` e `Vr` eram
 *   siglas que exigiam saber de antemão em qual delas o `aggSum` morava.
 *   Quem escreve fórmula pensa "quero somar", não "quero a aba de funções".
 *   A lista agora é uma, com seções, e a busca corta as três categorias.
 *
 * — **A caixa da fórmula ganhou a linguagem.** Pintura dos símbolos,
 *   sugestão enquanto se digita, sublinhado no ponto do erro e a assinatura
 *   da função em que o cursor está. É onde a pessoa passa o tempo todo, e era
 *   a única parte da tela que não ajudava em nada.
 *
 * — **Os operadores viraram barra.** São dezenove símbolos de um caractere;
 *   uma aba inteira para isso custava dois cliques por sinal de menos.
 *
 * — **As inserções literais viraram um menu.** Texto, hexadecimal, binário,
 *   cor e máscara são acessórios; ocupavam cinco botões na altura dos olhos e
 *   agora ocupam um.
 *
 * — **Nada de verde.** O sistema não tem verde. Válido é discreto, e só o
 *   erro puxa `--wk-danger` — na mensagem, na borda e no trecho errado.
 */

/**
 * A barra leva só os operadores de verdade.
 *
 * Parênteses e vírgula ficam de fora: são pontuação, a sugestão já escreve
 * `()` junto com o nome da função, e os três empurravam a barra para além da
 * largura do painel.
 */
const BAR_OPERATORS = OPERATORS.filter((o) => o.group !== 'agrupamento')

/**
 * A largura sai da barra de operadores.
 *
 * São dezesseis alvos de 32 mais três divisórias e o botão de inserir valor:
 * abaixo de 1080 a fileira não fecha numa linha só, e uma barra de
 * ferramentas em duas fileiras deixa de ser barra.
 */
const MODAL = { width: 1080, height: 660, radius: RADIUS.md, headerHeight: 64, padX: 24 }
const PANEL_WIDTH = 280
const ROW_H = 40
const MONO = 'var(--wk-mono)'

/**
 * Item que a faixa de ajuda está explicando.
 *
 * O tipo e a localização vêm para cá porque saíram da linha da lista: numa
 * árvore que rola na horizontal não existe "canto direito" onde encostar um
 * rótulo, ele fugiria da vista junto com o resto.
 */
interface Explained {
  title: string
  /** `número`, `texto`… — o que antes ficava à direita da linha. */
  type?: string
  /** Onde a variável mora: `person › Saúde › Antropometria`. */
  where?: string
  desc: string
  example?: string
}

type Section = 'Variáveis' | 'Funções' | 'Outros'

/** O que uma linha-folha insere e explica. */
interface Item {
  insert: string
  caretOffset?: number
  isFn?: boolean
  explain: Explained
  /** Só variáveis. É o que habilita escrever um valor em vez da referência. */
  field?: Field
}

/**
 * Nó da lista, e ele é recursivo de propósito.
 *
 * A estrutura anterior era pasta com filhos, um nível só, porque era o que o
 * modelo de exemplo tinha. Um modelo de verdade aninha o quanto quiser, e a
 * versão rasa escondia isso em vez de mostrar.
 */
interface ListNode {
  id: string
  label: string
  item?: Item
  children?: ListNode[]
  /** Tudo o que a busca considera neste nó e abaixo dele, normalizado. */
  haystack: string
}

/**
 * Comparação de busca sem acento e sem caixa.
 *
 * Ninguém digita `mês` na pressa, e a descrição de `month` começa com ele. Sem
 * isto, procurar "mes" não devolvia nada — e a lista sem resultado é lida como
 * "não existe", não como "sua busca não bate".
 *
 * O `NFD` separa a letra do acento e a classe seguinte varre os combinantes
 * de U+0300 a U+036F, que é onde eles todos moram.
 */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Um nó de pasta herda na busca tudo o que os filhos têm. */
function folder(id: string, label: string, children: ListNode[]): ListNode {
  return { id, label, children, haystack: norm(label) + ' ' + children.map((c) => c.haystack).join(' ') }
}

/**
 * Quantas folhas existem abaixo deste nó, em todos os níveis.
 *
 * O contador da árvore de dados não serve aqui: lá a folha é reconhecida por
 * `field`, e no nó da lista o que marca folha é `item`. As duas formas são
 * parecidas o bastante para o TypeScript aceitar a troca em silêncio, e o
 * resultado era toda pasta anunciando zero.
 */
function countItems(node: ListNode): number {
  if (node.item) return 1
  return (node.children ?? []).reduce((n, c) => n + countItems(c), 0)
}

function variableNode(node: TreeNode): ListNode {
  if (node.field) {
    const f = node.field
    return {
      id: node.id,
      label: f.name,
      haystack: norm([f.name, f.desc, f.table, f.category, f.path.join(' '), TYPE_LABEL[f.type]].join(' ')),
      item: {
        insert: f.name,
        field: f,
        explain: {
          title: f.name,
          type: TYPE_LABEL[f.type],
          where: f.path.join(' › '),
          /* Sem descrição no modelo, a faixa fica com o que o sistema sempre
             sabe. Nunca inventa uma frase para preencher espaço. */
          desc: f.desc ?? 'Sem descrição no modelo.',
        },
      },
    }
  }
  return folder(node.id, node.label, (node.children ?? []).map(variableNode))
}

/** As três seções da lista, já na ordem em que aparecem. */
function buildSections(order: VarOrder): { section: Section; roots: ListNode[] }[] {
  const byCategory = new Map<string, Fn[]>()
  for (const fn of FUNCTIONS) {
    const list = byCategory.get(fn.category) ?? []
    list.push(fn)
    byCategory.set(fn.category, list)
  }

  return [
    { section: 'Variáveis', roots: variableTree(order).map(variableNode) },
    {
      section: 'Funções',
      roots: [...byCategory].map(([category, fns]) =>
        folder(
          `fn:${category}`,
          category,
          fns.map((fn) => ({
            id: `fn:${fn.name}`,
            label: signature(fn),
            haystack: norm([fn.name, fn.desc, fn.example, category, TYPE_LABEL[fn.returns]].join(' ')),
            item: {
              insert: `${fn.name}()`,
              caretOffset: fn.params.length > 0 ? fn.name.length + 1 : fn.name.length + 2,
              isFn: true,
              explain: {
                title: signature(fn),
                type: `devolve ${TYPE_LABEL[fn.returns]}`,
                desc: fn.desc,
                example: fn.example,
              },
            },
          })),
        ),
      ),
    },
    {
      /* "Outros" no lugar de "Constantes": além de `pi` e `null`, é onde cabe
         qualquer coisa que não seja variável nem função. */
      section: 'Outros',
      roots: [
        folder(
          'outros:constantes',
          'Constantes',
          CONSTANTS.map((c) => ({
            id: `c:${c.name}`,
            label: c.name,
            haystack: norm([c.name, c.desc, 'constante', TYPE_LABEL[c.type]].join(' ')),
            item: {
              insert: c.name,
              explain: { title: c.name, type: TYPE_LABEL[c.type], desc: c.desc },
            },
          })),
        ),
      ],
    },
  ]
}

/**
 * Uma linha da lista, e as de baixo dela.
 *
 * O recuo é `8 + profundidade × 16`. Não existe rótulo encostado à direita:
 * numa árvore que rola na horizontal ele fugiria da vista junto com o resto
 * da linha, e é por isso que o tipo da variável foi para a faixa de ajuda.
 *
 * O canto direito que sobrou dessa remoção é onde mora a ação de escrever um
 * valor — só na linha sob o ponteiro, para o ícone não virar textura repetida
 * em toda a árvore.
 */
function ListRow({
  node,
  depth,
  isOpen,
  onToggle,
  onInsert,
  onExplain,
  valueFor,
  setValueFor,
}: {
  node: ListNode
  depth: number
  isOpen: (id: string) => boolean
  onToggle: (id: string, open: boolean) => void
  onInsert: (text: string, caretOffset?: number) => void
  onExplain: (e: Explained | null) => void
  valueFor: { id: string; field: Field } | null
  setValueFor: (v: { id: string; field: Field } | null) => void
}) {
  const indent = 8 + depth * 16
  const valueBtnRef = useRef<HTMLButtonElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  /*
   * O nome passa por baixo do ícone? Só nesse caso o esmaecimento entra.
   * A medida acontece ao receber o ponteiro e a cada rolagem enquanto ele
   * está na linha, porque rolar na horizontal muda a resposta.
   */
  const rowRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const actionRef = useRef<HTMLSpanElement>(null)
  const [covered, setCovered] = useState(false)
  const detachScroll = useRef<(() => void) | null>(null)

  const measureCover = useCallback(() => {
    const name = nameRef.current?.getBoundingClientRect()
    const action = actionRef.current?.getBoundingClientRect()
    if (name && action) setCovered(name.right > action.left)
  }, [])

  useEffect(() => () => detachScroll.current?.(), [])

  if (!node.item) {
    const open = isOpen(node.id)
    return (
      <div>
        <button
          onClick={() => onToggle(node.id, open)}
          aria-expanded={open}
          className="flex items-center gap-2 text-left transition-colors hover:bg-[var(--wk-surface-subtle)]"
          style={{ height: ROW_H, paddingLeft: indent, paddingRight: 8, width: '100%', minWidth: 'max-content' }}
        >
          <span className="flex items-center shrink-0" style={{ color: COLOR.navLabel }}>
            <Icon name="keyboard_arrow_down" size={24} className={open ? undefined : 'wk-rot-neg90'} />
            <Icon name="folder" size={24} />
          </span>
          <span className="shrink-0" style={{ fontSize: 14, color: COLOR.text }}>{node.label}</span>
          <span className="shrink-0" style={{ fontSize: 12, color: COLOR.textMuted, paddingLeft: 8 }}>
            {countItems(node)}
          </span>
        </button>
        {open &&
          node.children?.map((c) => (
            <ListRow
              key={c.id}
              node={c}
              depth={depth + 1}
              isOpen={isOpen}
              onToggle={onToggle}
              onInsert={onInsert}
              onExplain={onExplain}
              valueFor={valueFor}
              setValueFor={setValueFor}
            />
          ))}
      </div>
    )
  }

  const item = node.item
  const open = valueFor?.id === node.id
  /* A âncora é medida na hora de abrir, não a cada render: o painel não deve
     perseguir a linha se a lista rolar por baixo dele. */
  const anchor = open ? anchorRect : null

  return (
    <div
      ref={rowRef}
      className="wk-tree-row group relative flex items-center transition-colors"
      style={{ height: ROW_H, paddingLeft: indent, minWidth: 'max-content', columnGap: 12 }}
      onMouseEnter={() => {
        onExplain(item.explain)
        if (!item.field) return
        measureCover()
        const scroller = rowRef.current?.closest('.overflow-auto')
        if (scroller && !detachScroll.current) {
          scroller.addEventListener('scroll', measureCover, { passive: true })
          detachScroll.current = () => {
            scroller.removeEventListener('scroll', measureCover)
            detachScroll.current = null
          }
        }
      }}
      onMouseLeave={() => detachScroll.current?.()}
    >
      <button
        onClick={() => onInsert(item.insert, item.caretOffset)}
        onFocus={() => onExplain(item.explain)}
        title="Escrever na fórmula"
        className="flex items-center gap-2 text-left shrink-0"
        style={{ height: ROW_H }}
      >
        <span className="shrink-0" style={{ width: 24 }} />
        <span
          ref={nameRef}
          style={{
            fontFamily: MONO,
            fontSize: 13,
            color: item.isFn ? COLOR.primary : COLOR.text,
            fontWeight: item.isFn ? 500 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          {node.label}
        </span>
      </button>

      {item.field && (
        <>
          {/*
            Duas camadas, cada uma com um trabalho.

            O invólucro é retangular, opaco e ocupa a altura da linha: é ele
            que esconde o nome que corre por baixo. O botão dentro dele tem o
            hover do sistema, que é translúcido e arredondado.

            Quando os dois eram o mesmo elemento, o hover trocava o fundo
            opaco pelo translúcido e as letras apareciam através do quadrado
            azul. E os cantos arredondados deixavam o texto vazar nas quinas.
          */}
          <span
            ref={actionRef}
            className={`wk-row-action shrink-0 flex items-center transition-opacity ${covered ? 'wk-row-action--cover' : ''} ${
              open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
            }`}
            /* Na borda direita: toda linha tem a ação na mesma coluna, e um
               nome curto nunca fica encostado nela. */
            style={{ marginLeft: 'auto' }}
          >
            <button
              ref={valueBtnRef}
              onClick={() => {
                if (open) return setValueFor(null)
                setAnchorRect(valueBtnRef.current?.getBoundingClientRect() ?? null)
                setValueFor({ id: node.id, field: item.field! })
              }}
              title={`Escrever um valor de ${node.label} na fórmula`}
              aria-label={`Escrever um valor de ${node.label} na fórmula`}
              aria-haspopup="dialog"
              aria-expanded={open}
              className="wk-icon-btn flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                color: open ? COLOR.primary : COLOR.textIcon,
                background: open ? 'var(--wk-icon-hover)' : undefined,
              }}
            >
              <Icon name="edit" size={20} />
            </button>
          </span>

          {/*
            O painel sai para um portal, com posição fixa medida do botão.

            Dentro da linha ele era filho da área que rola, e isso dava dois
            defeitos: ficava recortado pela borda da lista quando a variável
            estava lá embaixo, e escorregava junto com o conteúdo a cada
            rolagem. Preso à janela, ele fica onde nasceu.
          */}
          {open &&
            anchor &&
            createPortal(
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setValueFor(null)} />
                <div
                  className="fixed z-[61]"
                  style={{
                    left: Math.min(anchor.left, window.innerWidth - 276),
                    /* Abre para cima quando não cabe para baixo. */
                    top: anchor.bottom + 190 < window.innerHeight ? anchor.bottom + 4 : undefined,
                    bottom: anchor.bottom + 190 < window.innerHeight ? undefined : window.innerHeight - anchor.top + 4,
                  }}
                >
                  <ValuePopover
                    field={item.field}
                    onConfirm={(literal) => onInsert(literal)}
                    onClose={() => setValueFor(null)}
                  />
                </div>
              </>,
              document.body,
            )}
        </>
      )}
    </div>
  )
}

interface FormulaEditorProps {
  initialFormula?: string
  onClose?: () => void
  onSave?: (formula: string) => void
}

export default function FormulaEditor({
  initialFormula = 'if(imc >= 30, "obeso", "normal")',
  onClose,
  onSave,
}: FormulaEditorProps) {
  const [formula, setFormula] = useState(initialFormula)
  const [search, setSearch] = useState('')
  const [caret, setCaret] = useState(initialFormula.length)
  /* Fechadas por padrão: o que a pessoa menos costuma pegar primeiro. A
     árvore de `person` abre porque é o assunto da fórmula. */
  const [closed, setClosed] = useState<Record<string, boolean>>({
    'Variáveis de contexto': true,
    'fn:Janela': true,
    'fn:Matemática': true,
    'fn:Texto': true,
    'fn:Data': true,
    'outros:constantes': true,
  })
  const [varOrder, setVarOrder] = useState<VarOrder>('padrao')
  const [orderMenuOpen, setOrderMenuOpen] = useState(false)
  /** Variável cujo painel de valor está aberto, pela id do nó. */
  const [valueFor, setValueFor] = useState<{ id: string; field: Field } | null>(null)
  const [hovered, setHovered] = useState<Explained | null>(null)
  const [literal, setLiteral] = useState<LiteralKind | null>(null)
  const [valueMenuOpen, setValueMenuOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [color, setColor] = useState('#3366CC')

  const inputRef = useRef<FormulaInputHandle>(null)

  const status = useMemo(() => check(formula), [formula])

  /**
   * Nome pela metade sob o cursor não é erro: é alguém digitando.
   *
   * Sem isto, escrever `upper` acusava "não existe u", depois "não existe up",
   * e assim por diante — a tela reclamando a cada tecla de algo que a pessoa
   * ainda estava escrevendo. O rabisco vermelho embaixo da palavra continua,
   * porque ele informa sem interromper; o que sai de cena é a moldura vermelha
   * em volta do editor e a frase de erro no rodapé.
   *
   * Salvar segue bloqueado: calar o aviso não torna o nome existente.
   */
  const stillTyping =
    status.state === 'error' &&
    status.problem.kind === 'nome-desconhecido' &&
    caret >= status.problem.start &&
    caret <= status.problem.end

  const problem = status.state === 'error' && !stillTyping ? status.problem : null
  const help = signatureAt(formula, caret)

  const insert = useCallback((text: string, caretOffset?: number) => {
    inputRef.current?.insert(text, caretOffset)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !literal && !colorOpen) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, literal, colorOpen])

  const sections = useMemo(() => buildSections(varOrder), [varOrder])

  const term = norm(search.trim())

  /**
   * Filtra a árvore inteira, em qualquer profundidade.
   *
   * Pasta cujo nome bate entra inteira — quem procura "Agregação" quer as seis
   * funções, não a linha do título sozinha. Pasta que não bate sobrevive se
   * algum descendente bater, e aí só com os ramos que bateram.
   */
  const prune = useCallback(
    (node: ListNode): ListNode | null => {
      if (!term || norm(node.label).includes(term)) return node
      if (!node.haystack.includes(term)) return null
      if (!node.children) return null
      const children = node.children.map(prune).filter((c): c is ListNode => c !== null)
      return children.length > 0 ? { ...node, children } : null
    },
    [term],
  )

  const visible = useMemo(
    () =>
      sections
        .map((s) => ({ ...s, roots: s.roots.map(prune).filter((r): r is ListNode => r !== null) }))
        .filter((s) => s.roots.length > 0),
    [sections, prune],
  )

  const anyResult = visible.length > 0

  /** Buscar abre tudo: esconder resultado atrás de uma pasta fechada é o pior
      jeito de responder a uma busca. */
  const isOpen = (id: string) => (term ? true : !closed[id])

  /** Leva o cursor ao trecho com problema e o deixa selecionado. */
  const goToProblem = () => {
    if (!problem) return
    inputRef.current?.focus()
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Fórmula"]')
      if (!ta) return
      ta.selectionStart = problem.start
      ta.selectionEnd = problem.end
      setCaret(problem.end)
    })
  }

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        width: MODAL.width,
        maxWidth: '100%',
        height: MODAL.height,
        maxHeight: '92vh',
        background: COLOR.surface,
        borderRadius: MODAL.radius,
        boxShadow: 'var(--wk-shadow-menu)',
        fontFamily: FONT,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Editor de fórmula"
    >
      {literal && (
        <InsertValueModal
          kind={literal}
          onConfirm={(text) => insert(text)}
          onClose={() => setLiteral(null)}
        />
      )}

      {/* Cabeçalho */}
      <div
        className="shrink-0 flex items-center gap-2"
        style={{ height: MODAL.headerHeight, paddingInline: MODAL.padX, paddingBlock: 16 }}
      >
        <h2
          className="flex-1 min-w-0 truncate"
          style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}
        >
          Editor de fórmula
        </h2>
        <button
          title="Ajuda sobre a linguagem de fórmulas"
          aria-label="Ajuda sobre a linguagem de fórmulas"
          className="wk-icon-btn shrink-0 flex items-center justify-center"
          style={{ width: 24, height: 24, color: COLOR.navLabel }}
        >
          <Icon name="help" size={24} />
        </button>
        <button
          onClick={onClose}
          title="Fechar"
          aria-label="Fechar"
          className="wk-icon-btn shrink-0 flex items-center justify-center"
          style={{ width: 24, height: 24, color: COLOR.navLabel }}
        >
          <Icon name="close" size={24} />
        </button>
      </div>

      {/*
        Sem divisória entre as duas colunas.

        A espec. de tabela do design system já resolve esta pergunta: sem
        zebra e sem divisória vertical, porque o alinhamento das colunas
        separa sozinho. Vale igual aqui. E a coluna da direita não fica
        solta: a caixa da fórmula e a faixa de ajuda têm borda própria, então
        o olho já encontra estrutura sem precisar de um risco.

        Uma linha de 1px encostada na barra de rolagem virava duas linhas
        verticais paralelas, que é o efeito oposto do pretendido. O respiro
        sobe de 24 para 32 para a separação não depender do risco.
      */}
      <div className="flex flex-1 min-h-0" style={{ paddingInline: MODAL.padX, paddingBottom: 8, gap: 32 }}>
        {/* ── Vocabulário ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex flex-col min-h-0"
          style={{ width: PANEL_WIDTH }}
          /* Sair da coluna inteira limpa a explicação, e não sair da lista:
             o ponteiro passa pela busca a caminho do editor, e a faixa de
             ajuda piscava nesse trajeto. */
          onMouseLeave={() => setHovered(null)}
        >
          {/* Busca em cápsula, a mesma do filtro de campos do ASK: fundo
              `--wk-search-pill-light` porque ela se apoia em superfície
              branca, ícone de 24 à esquerda e anel de foco discreto. Antes
              era a caixa de busca de modal, com borda e raio 8 — as duas
              existem no sistema, e para uma lista de filtragem a cápsula é a
              que o produto já usa. */}
          <div className="shrink-0 flex items-center" style={{ gap: 4 }}>
            <div
              className="flex-1 min-w-0 flex items-center gap-2 rounded-full px-3 focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-shadow"
              style={{ height: 36, background: 'var(--wk-search-pill-light)' }}
            >
              <Icon name="search" size={24} color={COLOR.navLabel} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar"
                aria-label="Filtrar variáveis, funções e outros"
                className="flex-1 min-w-0 bg-transparent outline-none"
                style={{ fontSize: 14, color: COLOR.text }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  title="Limpar filtro"
                  aria-label="Limpar filtro"
                  className="wk-icon-btn shrink-0 flex items-center justify-center"
                  style={{ width: 20, height: 20 }}
                >
                  <Icon name="close" size={18} color={COLOR.navLabel} />
                </button>
              )}
            </div>

            {/* Organização das variáveis. Fica ao lado da busca, e não dentro
                da lista, porque a lista rola na horizontal: um controle
                ancorado lá dentro sairia da vista ao rolar. Os dois são
                controles da mesma lista, então dividem a mesma linha. */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOrderMenuOpen((v) => !v)}
                title={`Organizar variáveis: ${VAR_ORDERS.find((o) => o.id === varOrder)?.label}`}
                aria-label="Organizar as variáveis"
                aria-haspopup="listbox"
                aria-expanded={orderMenuOpen}
                className="wk-icon-btn flex items-center justify-center"
                style={{ width: 32, height: 32, color: orderMenuOpen ? COLOR.primary : COLOR.navLabel }}
              >
                <Icon name="sort" size={24} />
              </button>

              {orderMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setOrderMenuOpen(false)} />
                  <div
                    role="listbox"
                    aria-label="Organizar as variáveis"
                    className="absolute right-0 z-40 mt-1 overflow-hidden"
                    style={{
                      minWidth: 200,
                      background: COLOR.surface,
                      border: `1px solid ${COLOR.border}`,
                      borderRadius: RADIUS.sm,
                      boxShadow: 'var(--wk-shadow-menu)',
                      padding: 4,
                    }}
                  >
                    {VAR_ORDERS.map((o) => {
                      const on = o.id === varOrder
                      return (
                        <button
                          key={o.id}
                          role="option"
                          aria-selected={on}
                          onClick={() => { setVarOrder(o.id); setOrderMenuOpen(false) }}
                          className="w-full flex items-center gap-2 text-left px-3 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
                          style={{ height: 36, fontSize: 14, color: on ? COLOR.primary : COLOR.text }}
                        >
                          <span className="flex-1 min-w-0 truncate">{o.label}</span>
                          {on && <Icon name="check" size={18} color={COLOR.primary} />}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/*
            O respiro é margem, não recheio.
            Como recheio ele ficava dentro da área que rola: bastava rolar um
            dedo para a primeira linha visível encostar na busca, e a barra de
            rolagem já nascia colada nela. Como margem, os 16 valem sempre, e a
            barra começa abaixo deles.

            O `FadeScroll` cuida do resto: rolando, o topo da lista se dissolve
            em vez de ser cortado por uma linha reta. É o mesmo recurso que a
            conversa do ASK usa, e a máscara só aparece quando existe conteúdo
            acima.
          */}
          <FadeScroll
            /* Rola nos dois eixos: a árvore pode ser funda, e nome recuado
               cinco níveis passa da largura do painel. Cortar com reticências
               seria esconder justamente a ponta do nome, que é onde as
               variáveis de um mesmo ramo se diferenciam. */
            className="flex-1 min-h-0 overflow-auto"
            /*
              A barra de rolagem mora na borda direita de quem rola, e não há
              como afastá-la do texto por dentro sem encurtar as linhas. Então
              a lista avança 8 para fora da coluna: as linhas continuam
              alinhadas com a busca e a barra fica no respiro entre as duas
              colunas, sozinha, sem nada paralelo a ela.

              `scrollbar-gutter` reserva o espaço dela mesmo quando não
              aparece. Sem isso, filtrar até sobrar pouca coisa fazia a coluna
              inteira pular 8 pixels para a direita.
            */
            style={{ marginTop: 16, marginRight: -8, scrollbarGutter: 'stable' }}
          >
            {/* `max-content` nas linhas e `min-w-full` no bloco: a linha
                cresce com o conteúdo, e o realce de hover ainda cobre a
                largura toda quando não há o que rolar. */}
            <div style={{ width: 'max-content', minWidth: '100%' }}>
              {visible.map((s, i) => (
                <div key={s.section}>
                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      color: COLOR.textMuted,
                      paddingInline: 8,
                      paddingTop: i === 0 ? 0 : 16,
                      paddingBottom: 4,
                    }}
                  >
                    {s.section}
                  </div>
                  {s.roots.map((node) => (
                    <ListRow
                      key={node.id}
                      node={node}
                      depth={0}
                      isOpen={isOpen}
                      onToggle={(id, open) => setClosed((p) => ({ ...p, [id]: open }))}
                      onInsert={insert}
                      onExplain={setHovered}
                      valueFor={valueFor}
                      setValueFor={setValueFor}
                    />
                  ))}
                </div>
              ))}

              {!anyResult && (
                <p style={{ padding: 8, fontSize: 14, color: COLOR.textMuted }}>
                  Nada corresponde a “{search}”.
                </p>
              )}
            </div>
          </FadeScroll>
        </div>

        {/* ── Fórmula ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0" style={{ gap: 12 }}>
          <div className="shrink-0 flex items-center" style={{ gap: 8 }}>
            {/* Os operadores nunca quebram linha: uma barra de símbolos que
                vira duas fileiras deixa de ser barra e vira lista. Faltando
                espaço, ela rola. */}
            {/* Cada operador ocupa a mesma caixa de 32 com conteúdo de 24 que
                todo botão de ícone do produto, e não uma caixinha de texto
                própria. Sem `gap`: numa barra de ferramentas os alvos se
                encostam, é o realce do hover que os separa. */}
            <div className="flex-1 min-w-0 flex items-center overflow-x-auto">
              {BAR_OPERATORS.map((op, i) => {
                const prev = BAR_OPERATORS[i - 1]
                return (
                  <span key={op.symbol} className="flex items-center shrink-0">
                    {prev && prev.group !== op.group && (
                      <span aria-hidden="true" style={{ width: 1, height: 16, background: COLOR.border, marginInline: 4 }} />
                    )}
                    <button
                      onClick={() => insert(op.symbol)}
                      title={op.name}
                      aria-label={`Inserir ${op.name.toLowerCase()}`}
                      className="wk-icon-btn flex items-center justify-center shrink-0"
                      style={{ width: 32, height: 32, color: COLOR.textIcon }}
                    >
                      {/* Não há glifo do Material Symbols para `<>` nem `>=`,
                          então o símbolo é tipográfico — mas dentro da mesma
                          caixa de 24 dos ícones, para a fileira ter uma
                          coluna óptica só. */}
                      <span
                        className="flex items-center justify-center"
                        style={{ width: 24, height: 24, fontFamily: MONO, fontSize: 15, lineHeight: 1 }}
                      >
                        {op.symbol}
                      </span>
                    </button>
                  </span>
                )
              })}
            </div>

            <div className="relative shrink-0">
              {/*
                Fantasma pequeno: acessório numa barra densa. A ação que a
                tela existe para receber é "Salvar fórmula", e esta compete
                com ela se tiver mais peso.

                Ícone "+" à esquerda, reforçando o rótulo (regra 4). Medidas
                todas do componente `Btn`, tamanho pequeno: recheio 6/12,
                texto 13, raio 6, intervalo de 8 entre ícone e rótulo, caixa
                do ícone de 20. Nada aqui é medida solta.
              */}
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => { setValueMenuOpen((v) => !v); setColorOpen(false) }}
                title="Inserir um valor literal na fórmula"
                ariaHasPopup="menu"
                ariaExpanded={valueMenuOpen}
                iconLeft={<Icon name="add" size={20} color={COLOR.primary} />}
              >
                Inserir valor
              </Btn>

              {valueMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setValueMenuOpen(false)} />
                  <div
                    role="menu"
                    className="absolute right-0 z-40 mt-1 overflow-hidden"
                    style={{
                      minWidth: 224,
                      background: COLOR.surface,
                      border: `1px solid ${COLOR.border}`,
                      borderRadius: RADIUS.sm,
                      boxShadow: 'var(--wk-shadow-menu)',
                      padding: 4,
                    }}
                  >
                    {([
                      ['text', 'Texto entre aspas', 'format_quote'],
                      ['hex', 'Número hexadecimal', 'tag'],
                      ['binary', 'Número binário', 'code'],
                      ['format', 'Máscara de saída', 'format_shapes'],
                    ] as [LiteralKind, string, string][]).map(([kind, label, icon]) => (
                      <button
                        key={kind}
                        role="menuitem"
                        onClick={() => { setValueMenuOpen(false); setLiteral(kind) }}
                        className="w-full flex items-center gap-2 text-left px-3 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
                        style={{ height: 36, fontSize: 14, color: COLOR.text }}
                      >
                        <Icon name={icon} size={20} color={COLOR.navLabel} />
                        {label}
                      </button>
                    ))}
                    <button
                      role="menuitem"
                      onClick={() => { setValueMenuOpen(false); setColorOpen(true) }}
                      className="w-full flex items-center gap-2 text-left px-3 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
                      style={{ height: 36, fontSize: 14, color: COLOR.text }}
                    >
                      <span
                        className="shrink-0 rounded-full"
                        style={{ width: 16, height: 16, marginInline: 2, background: color, border: `1px solid ${COLOR.border}` }}
                      />
                      Cor em hexadecimal
                    </button>
                  </div>
                </>
              )}

              {colorOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setColorOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-40">
                    <ColorPicker
                      initial={color}
                      onConfirm={(hex) => {
                        setColor(hex)
                        setColorOpen(false)
                        insert(`"${hex}"`)
                      }}
                      onCancel={() => setColorOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <FormulaInput
            ref={inputRef}
            value={formula}
            onChange={setFormula}
            problem={problem}
            onCaret={setCaret}
            onSubmit={() => status.state === 'ok' && onSave?.(formula)}
          />

          {/* Estado da fórmula */}
          <div className="shrink-0 flex items-center gap-2" style={{ minHeight: 24 }}>
            {status.state === 'empty' || stillTyping ? (
              <span style={{ fontSize: 13, color: COLOR.textMuted }}>
                {stillTyping
                  ? 'Continue escrevendo o nome, ou escolha um da lista.'
                  : 'Comece a escrever a fórmula.'}
              </span>
            ) : status.state === 'error' ? (
              <>
                <Icon name="error" size={18} color={COLOR.danger} />
                <span className="min-w-0 truncate" style={{ fontSize: 13, color: COLOR.danger }}>
                  {status.problem.message}
                </span>
                <button
                  onClick={goToProblem}
                  className="shrink-0 transition-colors hover:bg-[var(--wk-btn-ghost-hover)]"
                  style={{ height: 24, paddingInline: 8, borderRadius: RADIUS.sm, fontSize: 13, color: COLOR.primary }}
                >
                  Ir para o trecho
                </button>
              </>
            ) : (
              <>
                <Icon name="check_circle" size={18} color={COLOR.textMuted} />
                <span style={{ fontSize: 13, color: COLOR.textMuted }}>
                  Fórmula válida{status.returns ? `, devolve ${TYPE_LABEL[status.returns]}` : ''}.
                </span>
              </>
            )}
          </div>

          {/*
            Faixa de ajuda, e ela tem uma ordem de prioridade fixa:

            1. O item sob o ponteiro na lista. Apontar é intenção deliberada e
               imediata, então ganha de tudo.
            2. A chamada de função em volta do cursor, com o argumento atual
               marcado. Vale enquanto o ponteiro não estiver na lista.
            3. Nada disso: os atalhos de teclado.

            O erro da fórmula **não** entra aqui. Ele mora na linha de estado
            logo acima, que é o lugar de "como está a fórmula". A faixa
            responde outra pergunta, "o que é isto que estou olhando", e
            misturar as duas faria a explicação sumir justo quando a pessoa
            está consertando algo e mais precisa dela.

            A altura é fixa em 84 de propósito: se ela crescesse e encolhesse
            conforme o conteúdo, o editor de fórmula pularia de tamanho a cada
            movimento do ponteiro.
          */}
          <div
            className="shrink-0 flex flex-col justify-center"
            style={{
              height: 84,
              background: 'var(--wk-surface-subtle)',
              border: `1px solid ${COLOR.border}`,
              borderRadius: RADIUS.md,
              paddingInline: 16,
              gap: 4,
            }}
          >
            {hovered ? (
              <>
                {/* O nome fica sozinho na primeira linha, com o tipo colado
                    nele. É a única parte da tela onde ele cabe inteiro: na
                    lista ele pode estar recuado cinco níveis e cortado. O
                    caminho desceu para a terceira linha justamente por
                    disputar essa largura. */}
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="truncate" style={{ fontFamily: MONO, fontSize: 13, color: COLOR.text }}>
                    {hovered.title}
                  </span>
                  {hovered.type && (
                    <span className="shrink-0" style={{ fontSize: 12, color: COLOR.textMuted }}>
                      {hovered.type}
                    </span>
                  )}
                </div>
                <div className="truncate" style={{ fontSize: 13, color: COLOR.textSecondary }}>{hovered.desc}</div>
                <div className="truncate" style={{ fontFamily: MONO, fontSize: 12, color: COLOR.textMuted }}>
                  {hovered.where ?? hovered.example ?? ''}
                </div>
              </>
            ) : help ? (
              <>
                <div style={{ fontFamily: MONO, fontSize: 13, color: COLOR.text }}>
                  <span style={{ color: COLOR.primary, fontWeight: 500 }}>{help.fn.name}</span>
                  {'('}
                  {help.fn.params.map((p, i) => (
                    <span key={p.name}>
                      {i > 0 && ', '}
                      <span
                        style={
                          i === help.argIndex
                            ? { color: COLOR.text, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }
                            : { color: COLOR.textMuted }
                        }
                      >
                        {p.optional ? `[${p.name}]` : p.name}
                      </span>
                    </span>
                  ))}
                  {')'}
                </div>
                <div className="truncate" style={{ fontSize: 13, color: COLOR.textSecondary }}>{help.fn.desc}</div>
                <div className="truncate" style={{ fontFamily: MONO, fontSize: 12, color: COLOR.textMuted }}>
                  {help.fn.example}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: COLOR.textMuted }}>
                Comece a digitar um nome para receber sugestões. Ctrl+Espaço chama a lista a qualquer momento, e
                Ctrl+Enter salva.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div
        className="shrink-0 flex items-center justify-end gap-2"
        style={{ paddingInline: MODAL.padX, paddingBlock: 16 }}
      >
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => onSave?.(formula)} disabled={status.state !== 'ok'}>
          Salvar fórmula
        </Btn>
      </div>
    </div>
  )
}
