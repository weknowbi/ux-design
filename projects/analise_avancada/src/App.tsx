import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import svgPaths from '@/imports/WeknowInsight/svg-sq3uvwlqzn'
import imgCurrentUser from '@/imports/matt-murdock-avatar.jpg'
import imgFoggy from '@/imports/foggy-nelson-avatar.jpg'
import weknowIcon from '@/imports/weknow-icon.png'

type RightTab = 'momento' | 'conversa' | 'ficha'
type ChatMessage = { role: 'user' | 'ai'; content: string; ts?: string }

// ── Weknow Design System — Btn ────────────────────────────────────────────────
const WK_PRIMARY        = '#3366cc'
const WK_PRIMARY_HOVER  = '#2855b0'
const WK_PRIMARY_SHADOW = '0 4px 14px rgba(51,102,204,.38)'
const WK_TINT           = '#dbeafe'
const WK_TINT_HOVER     = '#bfdbfe'
const WK_DANGER         = '#dc2626'
const WK_DANGER_HOVER   = '#b91c1c'
const WK_DANGER_SHADOW  = '0 4px 14px rgba(220,38,38,.35)'

// ── Weknow Design System — tokens de texto/superfície ─────────────────────────
const WK_TEXT         = '#363E49'  // texto principal
const WK_TEXT_SOFT    = '#475569'  // texto secundário
const WK_TEXT_MUTED   = '#8C98A8'  // texto de apoio / placeholder
const WK_ICON         = '#8C98A8'  // ícone sobre fundo branco
const WK_BORDER       = '#e8eaed'  // borda padrão
const WK_HOVER        = '#f1f5f9'  // hover de item de menu
const WK_MENU_SHADOW  = '0 12px 32px rgba(17,24,39,.12), 0 2px 8px rgba(17,24,39,.06)'

type BtnVariant = 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger'
type BtnSize    = 'sm' | 'md' | 'lg'
type BtnProps = {
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  children: React.ReactNode
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  title?: string
  onMouseDown?: (e: React.MouseEvent) => void
}

function Btn({ variant = 'primary', size = 'md', disabled = false, children, iconLeft, iconRight, fullWidth, onClick, type = 'button', title, onMouseDown }: BtnProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const pad      = size === 'sm' ? '6px 12px' : size === 'lg' ? '10px 20px' : iconLeft ? '7px 16px 7px 12px' : '7px 16px'
  const fontSize = size === 'sm' ? '0.8125rem' : size === 'lg' ? '1rem'      : '0.875rem'
  const radius   = size === 'sm' ? 6 : size === 'lg' ? 10 : 8
  const ring     = focused ? `0 0 0 3px rgba(51,102,204,.35)` : undefined
  type SM = Record<BtnVariant, React.CSSProperties>
  const base: SM = {
    primary:   { background: hovered ? WK_PRIMARY_HOVER : WK_PRIMARY,  color: '#fff', border: '1.5px solid transparent', boxShadow: hovered ? WK_PRIMARY_SHADOW : ring ?? 'none' },
    secondary: { background: hovered ? WK_TINT_HOVER    : WK_TINT,     color: WK_PRIMARY, border: '1.5px solid transparent', boxShadow: ring ?? 'none' },
    outlined:  { background: hovered ? WK_PRIMARY       : 'transparent', color: hovered ? '#fff' : WK_PRIMARY, border: `1.5px solid ${WK_PRIMARY}`, boxShadow: hovered ? '0 2px 8px rgba(51,102,204,.2)' : ring ?? 'none' },
    ghost:     { background: hovered ? '#eef3fb'        : 'transparent', color: WK_PRIMARY, border: '1.5px solid transparent', boxShadow: ring ?? 'none' },
    danger:    { background: hovered ? WK_DANGER_HOVER  : WK_DANGER,   color: '#fff', border: '1.5px solid transparent', boxShadow: hovered ? WK_DANGER_SHADOW : ring ?? 'none' },
  }
  const dis: Partial<SM> = {
    primary:   { background: 'rgba(51,102,204,.15)', color: 'rgba(51,102,204,.4)', border: 'none' },
    secondary: { background: 'rgba(51,102,204,.07)', color: 'rgba(51,102,204,.35)', border: 'none' },
    outlined:  { background: 'transparent', color: 'rgba(51,102,204,.35)', border: '1.5px solid rgba(51,102,204,.3)' },
    ghost:     { background: 'transparent', color: 'rgba(51,102,204,.35)', border: 'none' },
    danger:    { background: '#f87171', color: '#fff', border: 'none' },
  }
  const style: React.CSSProperties = {
    ...(disabled ? dis[variant] : base[variant]),
    padding: pad, fontSize, borderRadius: radius,
    fontWeight: 400, fontFamily: "'Inter', sans-serif",
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background .15s ease, box-shadow .15s ease, color .15s ease',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    outline: 'none',
    width: fullWidth ? '100%' : undefined,
    justifyContent: fullWidth ? 'center' : undefined,
    opacity: 1,
  }
  const iconBox: React.CSSProperties = {
    width: 20,
    height: 20,
    flex: '0 0 20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <button
      type={type} disabled={disabled} style={style} title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {iconLeft  && <span style={iconBox}>{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span style={iconBox}>{iconRight}</span>}
    </button>
  )
}

const ANALYSIS_GROUPS = [
  {
    label: 'Hoje',
    items: [
      { id: 1, title: 'Pico de demanda na Segunda-Feira', sub: 'Financeiro Hospitalar · há 4 min', date: '01/07/2025', author: 'Matt Murdock' },
      { id: 2, title: 'Tempo de espera após nova triagem', sub: 'Financeiro Hospitalar · 11:20', date: '01/07/2025', author: 'Matt Murdock' },
    ],
  },
  {
    label: 'Julho 2025',
    items: [
      { id: 3, title: 'Balancete de custos e receitas', sub: 'Matt Murdock · 01/07/2025', date: '01/07/2025', author: 'Matt Murdock' },
      { id: 4, title: 'Ocupação de leitos por setor', sub: 'Ana Beatriz · 01/07/2025', date: '01/07/2025', author: 'Ana Beatriz' },
    ],
  },
]

const ANALYSES = ANALYSIS_GROUPS.flatMap((g) => g.items)

const CREDITS = { left: 30, total: 50 }

const INITIAL_ANALYSIS_HTML = `<p><strong>Principais Observações:</strong></p>
<ul>
  <li>Pico de Demanda na Segunda-feira: O dashboard mostra um pico expressivo no volume de atendimentos na segunda-feira, representando aproximadamente 35% do total da semana. O fluxo se normaliza a partir de terça, com os menores volumes registrados na quarta e quinta-feira.</li>
  <li>Melhora no Tempo de Espera: Foi identificada uma queda acentuada e consistente no tempo médio de espera a partir de quarta-feira. O indicador, que estava em 28 minutos na segunda, caiu para 12 minutos na quinta, uma redução de mais de 50%.</li>
</ul>
<p><br></p>
<p><strong>Hipótese:</strong></p>
<p>A melhora no tempo de espera no meio da semana parece estar diretamente relacionada à nova organização da triagem que iniciamos como piloto na quarta-feira. Os dados indicam que a iniciativa foi bem-sucedida em otimizar o fluxo.</p>
<p><br></p>
<p><strong>Conclusão e Recomendações:</strong></p>
<ol>
  <li>Demanda de Segunda-feira: A alta concentração de atendimentos no início da semana é um padrão recorrente que sobrecarrega a equipe.</li>
  <li>Sucesso da Nova Triagem: A iniciativa de otimização da triagem demonstrou resultados positivos e imediatos na qualidade do serviço (redução do tempo de espera).</li>
</ol>
<p><br></p>
<p><strong>Próximos Passos Sugeridos:</strong></p>
<ul>
  <li>Avaliar a possibilidade de alocar um recurso de reforço para o período da manhã nas segundas-feiras.</li>
  <li>Oficializar o novo processo de triagem para todos os dias da semana e continuar monitorando o tempo de espera para garantir que a melhora se mantenha.</li>
</ul>`

const INITIAL_CHAT: ChatMessage[] = [
  {
    role: 'user',
    content: 'Qual foi o dia com maior volume de atendimentos?',
    ts: '14:22',
  },
  {
    role: 'ai',
    content:
      'Segunda-feira foi o dia com maior volume, representando aproximadamente **35%** do total semanal — significativamente mais do que qualquer outro dia. O fluxo caiu de forma consistente de terça a quinta.',
    ts: '14:22',
  },
]

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d={svgPaths.p128f3a00} fill="#94a3b8" />
    </svg>
  )
}
function IconNewAnalysis() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      <path d={svgPaths.p3ba53cf0} fill="#2563eb" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg width="20" height="20" viewBox="0 -960 960 960" fill="#3366cc" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M664.43-120q-39.81 0-67.51-27.82-27.69-27.82-27.69-67.56 0-6 5.31-30.31L286.62-416.62q-12.93 15-31.72 23.5-18.8 8.5-40.28 8.5-39.43 0-67.02-28.07Q120-440.77 120-480q0-39.23 27.6-67.31 27.59-28.07 67.02-28.07 21.48 0 40.28 8.5 18.79 8.5 31.72 23.5l287.92-170.16q-2.77-7.77-4.04-15.42-1.27-7.66-1.27-15.66 0-39.74 27.87-67.56Q624.98-840 664.8-840q39.82 0 67.51 27.87Q760-784.25 760-744.43q0 39.81-27.82 67.51-27.82 27.69-67.56 27.69-21.7 0-40-8.89Q606.31-667 593.38-682L305.46-511.08q2.77 7.77 4.04 15.43 1.27 7.65 1.27 15.65t-1.27 15.65q-1.27 7.66-4.04 15.43L593.38-278q12.93-15 31.24-23.88 18.3-8.89 40-8.89 39.74 0 67.56 27.87Q760-255.02 760-215.2q0 39.82-27.87 67.51Q704.25-120 664.43-120Zm.19-40q23.53 0 39.46-15.92Q720-191.85 720-215.38q0-23.54-15.92-39.47-15.93-15.92-39.46-15.92-23.54 0-39.47 15.92-15.92 15.93-15.92 39.47 0 23.53 15.92 39.46Q641.08-160 664.62-160Zm-450-264.62q23.86 0 40-16.11 16.15-16.12 16.15-39.27 0-23.15-16.15-39.27-16.14-16.11-40-16.11-23.22 0-38.92 16.11Q160-503.15 160-480q0 23.15 15.7 39.27 15.7 16.11 38.92 16.11Zm489.26-280.53Q720-721.08 720-744.62q0-23.53-15.92-39.46Q688.15-800 664.62-800q-23.54 0-39.47 15.92-15.92 15.93-15.92 39.46 0 23.54 16.12 39.47 16.11 15.92 39.27 15.92 23.15 0 39.26-15.92Zm-39.26 489.77ZM215.38-480Zm449.24-264.62Z" />
    </svg>
  )
}
function IconAdd() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d={svgPaths.pc380b80} fill="#94a3b8" />
    </svg>
  )
}
function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d={svgPaths.p2a159270} fill="#94a3b8" />
    </svg>
  )
}
function IconMinimize() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 12V11H18V12H7Z" fill="#94a3b8" />
    </svg>
  )
}
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 25 24.227" fill="none">
      <path d={svgPaths.p16c50b00} fill="#94a3b8" />
    </svg>
  )
}
function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
    </svg>
  )
}
function IconSparkle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
      <path d="m267.62-185 56.84-236L136-580.77l246.77-20.92L480-825l98 224.31 246.77 19.92L636.31-421l56.84 236L480-310.62 267.62-185Zm412.3-484.69 18.93-75.16-60.23-50.53 79.38-6.47 30.62-70.92 31.61 70.92 78.39 6.47-60.24 50.53 17.93 75.16-67.69-40.08-68.7 40.08Z" />
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="20" height="20" viewBox="0 -960 960 960" fill="#3366cc" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M200-200h43.92l427.93-427.92-43.93-43.93L200-243.92V-200Zm-40 40v-100.77l527.23-527.77q6.15-5.48 13.57-8.47 7.43-2.99 15.49-2.99t15.62 2.54q7.55 2.54 13.94 9.15l42.69 42.93q6.61 6.38 9.04 14 2.42 7.63 2.42 15.25 0 8.13-2.74 15.56-2.74 7.42-8.72 13.57L260.77-160H160Zm600.77-556.31-44.46-44.46 44.46 44.46ZM649.5-649.5l-21.58-22.35 43.93 43.93-22.35-21.58Z" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M389-280.85 209.62-459.23 246.38-497 389-354.38 713.62-678l36.76 36.77L389-280.85Z" />
    </svg>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

function IconDoc({ active }: { active?: boolean }) {
  return active ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M20 2H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2z" fill="#3366cc" opacity=".18"/>
      <path d="M20 2H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2zM4 6H2v14a2 2 0 002 2h14v-2H4V6z" fill="#3366cc"/>
      <path d="M10 8h8v1.5h-8zm0 3h8v1.5h-8zm0 3h5v1.5h-5z" fill="#3366cc"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M20 2H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2zM4 6H2v14a2 2 0 002 2h14v-2H4V6z" fill="#adb5bd"/>
      <path d="M10 8h8v1.5h-8zm0 3h8v1.5h-8zm0 3h5v1.5h-5z" fill="#adb5bd"/>
    </svg>
  )
}

/** Créditos restantes — anel de consumo no rodapé da barra lateral. */
function CreditsMeter() {
  const { left, total } = CREDITS
  const pct = Math.max(0, Math.min(100, (left / total) * 100))
  const low = left / total <= 0.2
  const color = low ? WK_DANGER : WK_PRIMARY

  // anel de 20px, mesma caixa dos ícones da barra lateral
  const r = 8
  const circumference = 2 * Math.PI * r

  return (
    <div
      className="flex items-center gap-2 w-full py-[7px] pl-3 pr-4 text-[14px]"
      style={{ fontFamily: 'Inter, sans-serif', color: WK_TEXT_SOFT }}
      title={`${left} de ${total} créditos disponíveis`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="shrink-0"
        role="progressbar"
        aria-label="Créditos restantes"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={left}
      >
        <circle cx="10" cy="10" r={r} fill="none" stroke={WK_BORDER} strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          transform="rotate(-90 10 10)"
          style={{ transition: 'stroke-dasharray .5s ease-out' }}
        />
      </svg>
      <span>Créditos</span>
      <span className="ml-auto text-[13px] tabular-nums">
        <span className="font-medium" style={{ color: low ? WK_DANGER : WK_TEXT }}>{left}</span>
        <span style={{ color: WK_TEXT_MUTED }}>/{total}</span>
      </span>
    </div>
  )
}

function Sidebar({
  activeId,
  onSelect,
  onNewAnalysis,
}: {
  activeId: number
  onSelect: (id: number) => void
  onNewAnalysis: () => void
}) {
  const [search, setSearch] = useState('')

  const filteredGroups = ANALYSIS_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase())),
  })).filter((g) => g.items.length > 0)

  return (
    <aside className="w-[210px] xl:w-[248px] shrink-0 border-r border-[#e8eaed] bg-white flex flex-col h-full">
      {/* New analysis button */}
      <div className="px-3 pt-4 pb-3">
        <button
          onClick={onNewAnalysis}
          className="inline-flex items-center gap-2 w-full text-left py-[7px] pl-3 pr-4 rounded-lg text-[14px] text-[#3366cc] hover:bg-[#eef3fb] transition-colors"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <IconNewAnalysis />
          Nova análise
        </button>
      </div>

      {/* Search — pill style Weknow */}
      <div className="px-3 pb-3">
        <div className="group flex items-center gap-2 bg-[#eaecef] rounded-full px-3 py-1.5 focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)]">
          <IconSearch />
          <input
            type="text"
            placeholder="Pesquisar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-[#363E49] placeholder-[#8C98A8] outline-none"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto px-2">
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <p
              className="px-2 pt-2 pb-1 text-[10.5px] font-semibold text-[#8C98A8] uppercase tracking-widest"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = activeId === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`w-full text-left flex items-start px-2.5 py-2 rounded-lg mb-0.5 transition-colors ${
                    active ? 'bg-[#eef2ff]' : 'hover:bg-[#f8f9fa]'
                  }`}
                >
                  <span className="flex flex-col min-w-0 w-full">
                    <span
                      className={`text-[13px] leading-snug truncate ${active ? 'font-semibold text-[#3366cc]' : 'font-normal text-[#363E49]'}`}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {item.title}
                    </span>
                    <span
                      className="text-[11px] text-[#475569] mt-0.5 truncate"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {item.sub}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#e8eaed] px-3 py-2.5">
        <CreditsMeter />
      </div>
    </aside>
  )
}

// ── Rich-text editor ──────────────────────────────────────────────────────────

const FONT_SIZES = ['10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32']

function ToolbarDivider() {
  return <div className="w-px h-4 bg-[#e2e8f0] mx-0.5 shrink-0" />
}

function ToolbarBtn({
  title,
  active,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`w-8 h-8 flex items-center justify-center rounded text-[13px] transition-colors shrink-0 ${
        active
          ? 'bg-[#eff6ff] text-[#2563eb]'
          : 'text-[#363E49] hover:bg-[#f1f5f9]'
      }`}
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </button>
  )
}

function EditorToolbar({
  editorRef,
  fontSize,
  setFontSize,
  generating,
  onGenerateAI,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>
  fontSize: string
  setFontSize: (s: string) => void
  generating: boolean
  onGenerateAI: () => void
}) {
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [textColor, setTextColor] = useState('#363E49')
  const colorRef = useRef<HTMLDivElement>(null)

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val ?? '')
    updateActiveFormats()
  }, [editorRef])

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    })
  }

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.addEventListener('keyup', updateActiveFormats)
    el.addEventListener('mouseup', updateActiveFormats)
    el.addEventListener('selectionchange', updateActiveFormats)
    return () => {
      el.removeEventListener('keyup', updateActiveFormats)
      el.removeEventListener('mouseup', updateActiveFormats)
      el.removeEventListener('selectionchange', updateActiveFormats)
    }
  }, [editorRef])

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColorPicker])

  const applyFontSize = (size: string) => {
    setFontSize(size)
    editorRef.current?.focus()
    // Wrap selection in a span with font-size
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return
    const span = document.createElement('span')
    span.style.fontSize = size + 'px'
    try {
      range.surroundContents(span)
    } catch {
      // complex selection — fall back to execCommand fontSize
      document.execCommand('fontSize', false, '3')
    }
  }

  const applyColor = (color: string) => {
    setTextColor(color)
    exec('foreColor', color)
    setShowColorPicker(false)
  }

  const insertLink = () => {
    const url = prompt('URL do link:')
    if (url) exec('createLink', url)
  }

  const insertImage = () => {
    const url = prompt('URL da imagem:')
    if (url) exec('insertImage', url)
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-[#e8eaed] bg-white shrink-0 flex-wrap">
      {/* Font size */}
      <select
        value={fontSize}
        onChange={(e) => applyFontSize(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        className="h-7 px-1.5 text-[12px] text-[#363E49] bg-white border border-[#e2e8f0] rounded cursor-pointer outline-none hover:border-[#94a3b8] transition-colors mr-1"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Text color */}
      <div className="relative" ref={colorRef}>
        <button
          title="Cor do texto"
          onMouseDown={(e) => { e.preventDefault(); setShowColorPicker((v) => !v) }}
          className="w-8 h-8 flex flex-col items-center justify-center gap-0.5 rounded hover:bg-[#f1f5f9] transition-colors"
        >
          <span className="text-[13px] font-bold text-[#363E49]" style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>T</span>
          <span className="w-4 h-1 rounded-sm" style={{ backgroundColor: textColor }} />
        </button>
        {showColorPicker && (
          <div className="absolute top-8 left-0 z-20 bg-white border border-[#e2e8f0] rounded-lg shadow-lg p-2 grid grid-cols-7 gap-1 w-[180px]">
            {[
              '#000000','#363E49','#475569','#8C98A8','#d1d5db','#f3f4f6','#ffffff',
              '#dc2626','#ea580c','#d97706','#16a34a','#0891b2','#2563eb','#7c3aed',
              '#fca5a5','#fdba74','#fcd34d','#86efac','#67e8f9','#93c5fd','#c4b5fd',
            ].map((c) => (
              <button
                key={c}
                onMouseDown={(e) => { e.preventDefault(); applyColor(c) }}
                className="w-6 h-6 rounded border border-[#e2e8f0] hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>

      <ToolbarDivider />

      {/* Bold / Italic / Underline / Strikethrough */}
      <ToolbarBtn title="Negrito (Ctrl+B)" active={activeFormats.bold} onClick={() => exec('bold')}>
        <strong style={{ fontSize: 15 }}>B</strong>
      </ToolbarBtn>
      <ToolbarBtn title="Itálico (Ctrl+I)" active={activeFormats.italic} onClick={() => exec('italic')}>
        <em style={{ fontStyle: 'italic', fontSize: 15 }}>I</em>
      </ToolbarBtn>
      <ToolbarBtn title="Sublinhado (Ctrl+U)" active={activeFormats.underline} onClick={() => exec('underline')}>
        <span style={{ textDecoration: 'underline', fontSize: 15 }}>U</span>
      </ToolbarBtn>
      <ToolbarBtn title="Tachado" active={activeFormats.strikeThrough} onClick={() => exec('strikeThrough')}>
        <span style={{ textDecoration: 'line-through', fontSize: 15 }}>S</span>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarBtn title="Alinhar à esquerda" active={activeFormats.justifyLeft} onClick={() => exec('justifyLeft')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5h18v2H3zm0 4h12v2H3zm0 4h18v2H3zm0 4h12v2H3z"/>
        </svg>
      </ToolbarBtn>
      <ToolbarBtn title="Centralizar" active={activeFormats.justifyCenter} onClick={() => exec('justifyCenter')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5h18v2H3zm3 4h12v2H6zm-3 4h18v2H3zm3 4h12v2H6z"/>
        </svg>
      </ToolbarBtn>
      <ToolbarBtn title="Alinhar à direita" active={activeFormats.justifyRight} onClick={() => exec('justifyRight')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5h18v2H3zm6 4h12v2H9zm-6 4h18v2H3zm6 4h12v2H9z"/>
        </svg>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Indent / Outdent */}
      <ToolbarBtn title="Aumentar recuo" onClick={() => exec('indent')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5h18v2H3zm0 12h18v2H3zm0-8h12v2H3zm6 4h12v2H9zM3 13l4-2-4-2v4z"/>
        </svg>
      </ToolbarBtn>

      {/* Lists */}
      <ToolbarBtn title="Lista com marcadores" active={activeFormats.insertUnorderedList} onClick={() => exec('insertUnorderedList')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7zm0-6h14v-2H7zm0-8v2h14V5H7z"/>
        </svg>
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Image */}
      <ToolbarBtn title="Inserir imagem" onClick={insertImage}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-12.5-5.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </ToolbarBtn>

      {/* Link */}
      <ToolbarBtn title="Inserir link" onClick={insertLink}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
        </svg>
      </ToolbarBtn>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate with AI */}
      <Btn
        variant="primary" size="sm"
        iconLeft={<IconSparkle />}
        disabled={generating}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onGenerateAI}
      >
        {generating ? 'Gerando...' : 'Gerar análise com IA'}
      </Btn>
    </div>
  )
}

// ── Comment rich-text box ────────────────────────────────────────────────────

function CommentBox({
  avatar,
  replyTo,
  replyRequestId,
}: {
  avatar: string
  replyTo?: string
  replyRequestId?: number
}) {
  const [active, setActive] = useState(false)
  const [html, setHtml] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({})

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val ?? '')
    updateFmts()
  }
  const updateFmts = () => setActiveFormats({
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strikeThrough: document.queryCommandState('strikeThrough'),
    insertUnorderedList: document.queryCommandState('insertUnorderedList'),
  })

  // close on outside click
  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [active])

  useEffect(() => {
    if (!replyTo || !replyRequestId || !editorRef.current) return

    const editor = editorRef.current
    const alreadyMentioned = Array.from(editor.querySelectorAll<HTMLElement>('[data-mention]'))
      .some((mention) => mention.dataset.mention === replyTo)

    if (!alreadyMentioned) {
      const mention = document.createElement('a')
      mention.href = '#foggy-nelson'
      mention.dataset.mention = replyTo
      mention.contentEditable = 'false'
      mention.textContent = `@${replyTo}`
      editor.prepend(mention, '\u00a0')
    }

    setActive(true)
    editor.focus()
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)
  }, [replyRequestId, replyTo])

  const handleSend = () => {
    const content = editorRef.current?.innerHTML ?? ''
    if (!content.trim()) return
    setHtml('')
    if (editorRef.current) editorRef.current.innerHTML = ''
    setActive(false)
  }

  const MiniBtn = ({ title, isActive, cmd }: { title: string; isActive?: boolean; cmd: string }) => (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd) }}
      className={`w-7 h-7 flex items-center justify-center rounded text-[13px] transition-colors ${isActive ? 'bg-[#eef2ff] text-[#3366cc]' : 'text-[#475569] hover:bg-[#f1f3f5]'}`}
    >
      {title === 'Negrito' && <strong style={{ fontSize: 14 }}>B</strong>}
      {title === 'Itálico' && <em style={{ fontStyle: 'italic', fontSize: 14 }}>I</em>}
      {title === 'Sublinhado' && <span style={{ textDecoration: 'underline', fontSize: 14 }}>U</span>}
      {title === 'Tachado' && <span style={{ textDecoration: 'line-through', fontSize: 14 }}>S</span>}
      {title === 'Lista' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7zm0-6h14v-2H7zm0-8v2h14V5H7z"/>
        </svg>
      )}
    </button>
  )

  return (
    <div className="flex gap-3 items-start" ref={containerRef}>
      <img src={avatar} alt="" className="w-8 h-8 rounded-full shrink-0 mt-1" />
      <div
        className={`flex-1 border rounded-xl overflow-hidden transition-all ${active ? 'border-[#3366cc] ring-2 ring-[rgba(51,102,204,0.12)]' : 'border-[#e8eaed]'} bg-white`}
      >
        {/* Mini toolbar — only when active */}
        {active && (
          <div className="flex items-center gap-0.5 px-2 pt-1.5 pb-1 border-b border-[#f1f3f5]">
            <MiniBtn title="Negrito" isActive={activeFormats.bold} cmd="bold" />
            <MiniBtn title="Itálico" isActive={activeFormats.italic} cmd="italic" />
            <MiniBtn title="Sublinhado" isActive={activeFormats.underline} cmd="underline" />
            <MiniBtn title="Tachado" isActive={activeFormats.strikeThrough} cmd="strikeThrough" />
            <div className="w-px h-4 bg-[#e2e8f0] mx-1" />
            <MiniBtn title="Lista" isActive={activeFormats.insertUnorderedList} cmd="insertUnorderedList" />
          </div>
        )}

        {/* Editable area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setActive(true)}
          onKeyUp={updateFmts}
          onMouseUp={updateFmts}
          data-placeholder="Faça um comentário..."
          className="px-4 py-2.5 text-[13px] text-[#363E49] leading-relaxed outline-none min-h-[38px] [&_ul]:list-disc [&_ul]:pl-4 [&_strong]:font-semibold [&_em]:italic [&_a]:font-medium [&_a]:text-[#3366cc] [&_a]:no-underline empty:before:content-[attr(data-placeholder)] empty:before:text-[#8C98A8] empty:before:pointer-events-none"
          style={{ fontFamily: 'Inter, sans-serif' }}
        />

        {/* Send row — only when active */}
        {active && (
          <div className="flex items-center justify-end gap-2 px-3 pb-2">
            <Btn variant="ghost" size="sm" onClick={() => setActive(false)}>Cancelar</Btn>
            <Btn variant="primary" size="sm" onClick={handleSend}>Comentar</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Menus (visual padrão Weknow para menus que abrem) ────────────────────────

/** Ícone do Google Material Symbols. Sobre fundo branco o ícone é #8C98A8. */
function MSIcon({
  name,
  size = 22,
  color = WK_ICON,
  fill = 0,
  weight = 300,
}: {
  name: string
  size?: number
  color?: string
  fill?: 0 | 1
  weight?: number
}) {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined select-none shrink-0"
      style={{
        fontSize: size,
        width: size,
        height: size,
        color,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  )
}

/** Cartão branco com cantos arredondados e sombra suave — base de todo menu. */
function MenuSurface({
  children,
  className = '',
  style,
  ref,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className={`wk-menu-in bg-white ${className}`}
      style={{
        borderRadius: 16,
        border: `1px solid ${WK_BORDER}`,
        boxShadow: WK_MENU_SHADOW,
        fontFamily: 'Inter, sans-serif',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function MenuDivider() {
  return <div className="my-1 h-px" style={{ background: WK_BORDER }} />
}

function MenuSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-widest"
      style={{ color: WK_TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </p>
  )
}

/** Linha de menu: ícone + rótulo (+ descrição / elemento à direita). */
function MenuItem({
  icon,
  label,
  description,
  trailing,
  onClick,
  selected = false,
  danger = false,
  as = 'button',
}: {
  icon?: string
  label: string
  description?: string
  trailing?: React.ReactNode
  onClick?: () => void
  selected?: boolean
  danger?: boolean
  as?: 'button' | 'div'
}) {
  const [hovered, setHovered] = useState(false)
  const color = danger ? WK_DANGER : WK_TEXT
  const iconColor = danger ? WK_DANGER : selected ? WK_PRIMARY : WK_ICON

  const content = (
    <>
      {icon && <MSIcon name={icon} color={iconColor} />}
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[14px] leading-snug truncate" style={{ color }}>
          {label}
        </span>
        {description && (
          <span className="block text-[11.5px] leading-snug mt-0.5" style={{ color: WK_TEXT_MUTED }}>
            {description}
          </span>
        )}
      </span>
      {trailing}
    </>
  )

  const style: React.CSSProperties = {
    background: hovered && as === 'button' ? (danger ? '#fef2f2' : WK_HOVER) : 'transparent',
    fontFamily: 'Inter, sans-serif',
  }

  if (as === 'div') {
    return (
      <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl" style={style}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[rgba(51,102,204,0.25)]"
      style={style}
    >
      {content}
    </button>
  )
}

/** Interruptor — mesmo padrão do toggle de tema do menu da barra do dashboard. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className="relative shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[rgba(51,102,204,0.25)]"
      style={{
        width: 42,
        height: 24,
        background: checked ? WK_PRIMARY : '#e2e8f0',
        border: `1px solid ${checked ? WK_PRIMARY : '#dee2e6'}`,
      }}
    >
      <span
        className="absolute top-1/2 rounded-full bg-white transition-all"
        style={{
          width: 18,
          height: 18,
          transform: 'translateY(-50%)',
          left: checked ? 21 : 2,
          boxShadow: '0 1px 3px rgba(17,24,39,.25)',
        }}
      />
    </button>
  )
}

// ── Compartilhamento ─────────────────────────────────────────────────────────

type ShareRole = 'viewer' | 'commenter'
type PersonRole = ShareRole | 'owner'
type SharePerson = {
  id: string
  name: string
  email: string
  avatar?: string
  role: PersonRole
  pending?: boolean
}

const ROLE_LABEL: Record<PersonRole, string> = {
  owner: 'Proprietário',
  commenter: 'Pode comentar',
  viewer: 'Pode ver',
}

const ROLE_OPTIONS: { value: ShareRole; icon: string; label: string; description: string }[] = [
  { value: 'commenter', icon: 'mode_comment', label: 'Pode comentar', description: 'Vê a análise e o momento e pode comentar.' },
  { value: 'viewer',    icon: 'visibility',   label: 'Pode ver',      description: 'Apenas visualiza a análise e o momento capturado.' },
]

const CURRENT_USER_ID = 'u-matt'

const WORKSPACE_PEOPLE: { id: string; name: string; email: string; avatar?: string }[] = [
  { id: 'u-foggy',  name: 'Foggy Nelson', email: 'foggy.nelson@weknow.com.br', avatar: imgFoggy },
  { id: 'u-ana',     name: 'Ana Beatriz',    email: 'ana.beatriz@weknow.com.br' },
  { id: 'u-carlos',  name: 'Carlos Nunes',   email: 'carlos.nunes@weknow.com.br' },
  { id: 'u-juliana', name: 'Juliana Prado',  email: 'juliana.prado@weknow.com.br' },
  { id: 'u-rafael',  name: 'Rafael Mendes',  email: 'rafael.mendes@weknow.com.br' },
]

const INITIAL_SHARED_PEOPLE: SharePerson[] = [
  { id: CURRENT_USER_ID, name: 'Matt Murdock', email: 'matt.murdock@weknow.com.br', avatar: imgCurrentUser, role: 'owner' },
  { id: 'u-foggy', name: 'Foggy Nelson', email: 'foggy.nelson@weknow.com.br', avatar: imgFoggy, role: 'commenter' },
]

const AVATAR_TONES = [
  { bg: '#eef2ff', fg: '#3366cc' },
  { bg: '#f1f5f9', fg: '#475569' },
  { bg: '#dbeafe', fg: '#2855b0' },
]

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function Avatar({
  name,
  avatar,
  size = 30,
  ring = false,
}: {
  name: string
  avatar?: string
  size?: number
  ring?: boolean
}) {
  const ringStyle: React.CSSProperties = ring ? { boxShadow: '0 0 0 2px #ffffff' } : {}
  if (avatar) {
    return (
      <span
        className="rounded-full overflow-hidden shrink-0 inline-flex"
        style={{ width: size, height: size, ...ringStyle }}
      >
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
        />
      </span>
    )
  }
  const tone = AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length]
  return (
    <span
      className="rounded-full shrink-0 inline-flex items-center justify-center font-semibold"
      title={name}
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        fontSize: Math.round(size * 0.38),
        fontFamily: 'Inter, sans-serif',
        ...ringStyle,
      }}
    >
      {initialsOf(name)}
    </span>
  )
}

/** Seletor de permissão — abre um menu com o mesmo visual dos demais. */
function RoleSelect({
  value,
  onChange,
  onRemove,
  compact = false,
  disabled = false,
}: {
  value: PersonRole
  onChange: (role: ShareRole) => void
  onRemove?: () => void
  compact?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = () => {
    if (open) return setOpen(false)
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 264
    setPos({
      top: rect.bottom + 6,
      left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
    })
    setOpen(true)
  }

  // com a altura real já renderizada, vira o menu para cima se não couber abaixo
  useLayoutEffect(() => {
    if (!open || !pos) return
    const menu = menuRef.current
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!menu || !rect) return
    const h = menu.offsetHeight
    const limit = window.innerHeight - 8
    let top = rect.bottom + 6
    if (top + h > limit) top = rect.top - h - 6
    if (top < 8) top = Math.max(8, limit - h)
    if (Math.abs(top - pos.top) > 1) setPos({ top, left: pos.left })
  }, [open, pos])

  if (disabled) {
    return (
      <span
        className={`${compact ? 'text-[11.5px]' : 'text-[12px]'} px-2 py-1 shrink-0`}
        style={{ color: WK_TEXT_MUTED, fontFamily: 'Inter, sans-serif' }}
      >
        {ROLE_LABEL[value]}
      </span>
    )
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggle}
        className={`flex items-center gap-0.5 rounded-lg pl-2 pr-1 py-1 transition-colors hover:bg-[#f1f5f9] outline-none focus-visible:ring-2 focus-visible:ring-[rgba(51,102,204,0.25)] ${compact ? 'text-[11.5px]' : 'text-[12px]'}`}
        style={{ color: WK_TEXT_SOFT, fontFamily: 'Inter, sans-serif' }}
      >
        {ROLE_LABEL[value]}
        <MSIcon name="expand_more" size={16} color={WK_ICON} />
      </button>

      {open && pos && (
        <MenuSurface
          ref={menuRef}
          className="p-1.5"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 264, zIndex: 70 }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <MenuItem
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              description={opt.description}
              selected={value === opt.value}
              trailing={value === opt.value ? <MSIcon name="check" size={18} color={WK_PRIMARY} /> : undefined}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            />
          ))}
          {onRemove && (
            <>
              <MenuDivider />
              <MenuItem
                icon="person_remove"
                label="Remover acesso"
                danger
                onClick={() => { onRemove(); setOpen(false) }}
              />
            </>
          )}
        </MenuSurface>
      )}
    </div>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Menu de compartilhamento da análise: convida pessoas para visualizar/comentar,
 * gerencia quem já tem acesso e controla o acesso por link.
 */
function SharePopover({
  anchorRef,
  analysisTitle,
  people,
  setPeople,
  linkShare,
  setLinkShare,
  linkRole,
  setLinkRole,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>
  analysisTitle: string
  people: SharePerson[]
  setPeople: React.Dispatch<React.SetStateAction<SharePerson[]>>
  linkShare: boolean
  setLinkShare: (v: boolean) => void
  linkRole: ShareRole
  setLinkRole: (r: ShareRole) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<{ id: string; name: string; email: string; avatar?: string }[]>([])
  const [inviteRole, setInviteRole] = useState<ShareRole>('commenter')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedbackTimer = useRef<number | null>(null)

  const shareLink = `https://app.weknow.com.br/analises/${
    analysisTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }`

  // posiciona o menu abaixo do botão (fixed, para não ser cortado pelo overflow)
  useEffect(() => {
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right) })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchorRef])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => () => { if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current) }, [])

  const flash = (text: string) => {
    setFeedback(text)
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 3200)
  }

  const alreadyIn = (id: string) => people.some((p) => p.id === id) || selected.some((p) => p.id === id)

  const term = query.trim().toLowerCase()
  const suggestions = term
    ? WORKSPACE_PEOPLE.filter(
        (p) => !alreadyIn(p.id) && (p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term)),
      ).slice(0, 4)
    : []

  const addPerson = (p: { id: string; name: string; email: string; avatar?: string }) => {
    setSelected((s) => [...s, p])
    setQuery('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions[0]) {
        addPerson(suggestions[0])
        return
      }
      const value = query.trim()
      if (EMAIL_RE.test(value) && !alreadyIn(value)) {
        addPerson({ id: value, name: value.split('@')[0].replace(/[._-]+/g, ' '), email: value })
      }
      return
    }
    if (e.key === 'Backspace' && !query && selected.length) {
      setSelected((s) => s.slice(0, -1))
    }
  }

  const sendInvites = () => {
    if (!selected.length) return
    const invited = selected
    setPeople((prev) => [...prev, ...invited.map((p) => ({ ...p, role: inviteRole as PersonRole, pending: true }))])
    setSelected([])
    setMessage('')
    setQuery('')
    flash(
      invited.length === 1
        ? `Convite enviado para ${invited[0].name} · ${ROLE_LABEL[inviteRole]}`
        : `Convite enviado para ${invited.length} pessoas · ${ROLE_LABEL[inviteRole]}`,
    )
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      flash('Link copiado para a área de transferência')
    } catch {
      flash(shareLink)
    }
  }

  const changeRole = (id: string, role: ShareRole) =>
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)))

  const removePerson = (id: string) => {
    const target = people.find((p) => p.id === id)
    setPeople((prev) => prev.filter((p) => p.id !== id))
    if (target) flash(`${target.name} não tem mais acesso`)
  }

  if (!pos) return null

  return (
    <MenuSurface
      className="p-2"
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        width: 404,
        zIndex: 60,
        maxHeight: `calc(100vh - ${pos.top + 16}px)`,
        overflowY: 'auto',
      }}
    >
      {/* Cabeçalho */}
      <div className="flex items-start gap-2 px-3 pt-2 pb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: WK_TEXT }}>
            Compartilhar análise
          </p>
          <p className="text-[11.5px] mt-0.5 truncate" style={{ color: WK_TEXT_MUTED }}>
            {analysisTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar compartilhamento"
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[#f1f5f9] shrink-0"
        >
          <MSIcon name="close" size={18} />
        </button>
      </div>

      {/* Convidar pessoas */}
      <div className="px-3 pb-1 relative">
        <div
          className="flex flex-wrap items-center gap-1.5 rounded-xl px-2.5 py-2 transition-all focus-within:border-[#3366cc] focus-within:ring-2 focus-within:ring-[rgba(51,102,204,0.15)]"
          style={{ border: '1px solid #dee2e6' }}
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-1.5 py-0.5"
              style={{ background: '#eef2ff' }}
            >
              <Avatar name={p.name} avatar={p.avatar} size={20} />
              <span className="text-[12px] capitalize" style={{ color: WK_PRIMARY }}>{p.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelected((s) => s.filter((x) => x.id !== p.id)) }}
                aria-label={`Remover ${p.name}`}
                className="flex items-center"
              >
                <MSIcon name="close" size={14} color={WK_PRIMARY} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selected.length ? '' : 'Adicionar pessoas por nome ou e-mail'}
            className="flex-1 min-w-[140px] bg-transparent text-[13px] outline-none placeholder-[#8C98A8]"
            style={{ color: WK_TEXT, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Sugestões */}
        {suggestions.length > 0 && (
          <MenuSurface className="absolute left-3 right-3 top-full mt-1 z-20 p-1.5">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addPerson(p)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors hover:bg-[#f1f5f9] text-left"
              >
                <Avatar name={p.name} avatar={p.avatar} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] truncate" style={{ color: WK_TEXT }}>{p.name}</span>
                  <span className="block text-[11px] truncate" style={{ color: WK_TEXT_MUTED }}>{p.email}</span>
                </span>
              </button>
            ))}
          </MenuSurface>
        )}

        {selected.length > 0 && (
          <div className="mt-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Mensagem para quem vai receber (opcional)"
              className="w-full rounded-xl px-3 py-2 text-[12.5px] outline-none resize-none transition-all focus:border-[#3366cc] focus:ring-2 focus:ring-[rgba(51,102,204,0.15)] placeholder-[#8C98A8]"
              style={{ border: '1px solid #dee2e6', color: WK_TEXT, fontFamily: 'Inter, sans-serif' }}
            />
            <div className="flex items-center justify-between mt-2">
              <RoleSelect value={inviteRole} onChange={setInviteRole} />
              <Btn variant="primary" size="sm" onClick={sendInvites}>
                Enviar convite
              </Btn>
            </div>
          </div>
        )}
      </div>

      <MenuDivider />

      {/* Quem tem acesso */}
      <MenuSectionLabel>Com acesso</MenuSectionLabel>
      <div className="max-h-[188px] overflow-y-auto pb-1">
        {people.map((p) => (
          <div key={p.id} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl">
            <Avatar name={p.name} avatar={p.avatar} size={30} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-[13px] truncate" style={{ color: WK_TEXT }}>
                  <span className="capitalize">{p.name}</span>
                  {p.id === CURRENT_USER_ID && ' (você)'}
                </span>
                {p.pending && (
                  <span
                    className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: '#eef2ff', color: WK_PRIMARY }}
                  >
                    convite enviado
                  </span>
                )}
              </span>
              <span className="block text-[11px] truncate" style={{ color: WK_TEXT_MUTED }}>
                {p.email}
              </span>
            </span>
            <RoleSelect
              value={p.role}
              disabled={p.role === 'owner'}
              compact
              onChange={(role) => changeRole(p.id, role)}
              onRemove={() => removePerson(p.id)}
            />
          </div>
        ))}
      </div>

      <MenuDivider />

      {/* Acesso por link */}
      <MenuItem
        as="div"
        icon={linkShare ? 'link' : 'lock'}
        label={linkShare ? 'Qualquer pessoa com o link' : 'Restrito'}
        description={
          linkShare
            ? `Quem tiver o link ${linkRole === 'commenter' ? 'pode ver e comentar' : 'pode apenas visualizar'}`
            : 'Somente as pessoas com acesso podem abrir'
        }
        trailing={<Switch checked={linkShare} onChange={setLinkShare} label="Acesso por link" />}
      />
      {linkShare && (
        <div className="flex items-center justify-end px-3 pb-1">
          <RoleSelect value={linkRole} onChange={setLinkRole} compact />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <Btn
          variant="ghost"
          size="sm"
          iconLeft={<MSIcon name="content_copy" size={18} color={WK_PRIMARY} />}
          onClick={copyLink}
        >
          Copiar link
        </Btn>
        <Btn variant="secondary" size="sm" onClick={onClose}>
          Concluir
        </Btn>
      </div>

      {feedback && (
        <p
          role="status"
          className="px-3 pt-2 pb-1 text-[11.5px] flex items-center gap-1.5"
          style={{ color: WK_PRIMARY, fontFamily: 'Inter, sans-serif' }}
        >
          <MSIcon name="check_circle" size={15} color={WK_PRIMARY} fill={1} />
          {feedback}
        </p>
      )}
    </MenuSurface>
  )
}

/** Pilha de avatares de quem já tem acesso, ao lado do botão Compartilhar. */
function SharedAvatars({ people, onClick }: { people: SharePerson[]; onClick: () => void }) {
  const shown = people.slice(0, 3)
  const rest = people.length - shown.length
  return (
    <button
      type="button"
      onClick={onClick}
      title={people.map((p) => `${p.name} — ${ROLE_LABEL[p.role]}`).join('\n')}
      className="hidden @xs:flex items-center -space-x-2 rounded-full transition-opacity hover:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-[rgba(51,102,204,0.25)]"
      aria-label={`${people.length} pessoas com acesso`}
    >
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} avatar={p.avatar} size={26} ring />
      ))}
      {rest > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full text-[10.5px] font-semibold"
          style={{ width: 26, height: 26, background: '#eef2ff', color: WK_PRIMARY, boxShadow: '0 0 0 2px #ffffff' }}
        >
          +{rest}
        </span>
      )}
    </button>
  )
}

function AnalysisEditor({
  title: initialTitle,
  date,
  author,
}: {
  title: string
  date: string
  author: string
}) {
  const [editing, setEditing] = useState(false)
  const [savedHtml, setSavedHtml] = useState(INITIAL_ANALYSIS_HTML)
  const [generating, setGenerating] = useState(false)
  const [fontSize, setFontSize] = useState('14')
  const [title, setTitle] = useState(initialTitle)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(initialTitle)
  const [replyRequestId, setReplyRequestId] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // compartilhamento
  const [shareOpen, setShareOpen] = useState(false)
  const [sharedPeople, setSharedPeople] = useState<SharePerson[]>(INITIAL_SHARED_PEOPLE)
  const [linkShare, setLinkShare] = useState(false)
  const [linkRole, setLinkRole] = useState<ShareRole>('commenter')
  const shareRef = useRef<HTMLDivElement>(null)

  // fecha o menu de compartilhamento ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!shareOpen) return
    const onDown = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [shareOpen])

  useEffect(() => {
    if (editing && editorRef.current) {
      editorRef.current.innerHTML = savedHtml
      editorRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
    }
  }, [editing])

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  }, [editingTitle])

  const handleSave = () => {
    if (editorRef.current) setSavedHtml(editorRef.current.innerHTML)
    setEditing(false)
  }

  const commitTitle = () => {
    setTitle(titleDraft.trim() || title)
    setEditingTitle(false)
  }

  return (
    <div className="@container flex flex-col h-full overflow-hidden">
      {/* Title bar */}
      <div className="px-4 py-3.5 @2xl:px-8 @2xl:py-5 border-b border-[#e8eaed] shrink-0 flex flex-col gap-2 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-6">
        {/* Inline-editable title */}
        <div className="flex-1 min-w-0">
          <div className="group flex items-center gap-1.5 min-w-0">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle()
                  if (e.key === 'Escape') { setTitleDraft(title); setEditingTitle(false) }
                }}
                className="text-[17px] @2xl:text-[20px] font-semibold text-[#363E49] leading-snug bg-transparent border-b-2 border-[#3366cc] outline-none min-w-0"
                style={{ fontFamily: 'Inter, sans-serif', width: Math.max(120, titleDraft.length * 11.5) + 'px', maxWidth: '100%' }}
              />
            ) : (
              <h1
                className="text-[17px] @2xl:text-[20px] font-semibold text-[#363E49] leading-snug truncate cursor-text"
                style={{ fontFamily: 'Inter, sans-serif' }}
                onClick={() => { setTitleDraft(title); setEditingTitle(true) }}
                title="Clique para editar o título"
              >
                {title}
              </h1>
            )}
            {!editingTitle && (
              <button
                onClick={() => { setTitleDraft(title); setEditingTitle(true) }}
                className="opacity-0 group-hover:opacity-40 hover:!opacity-100 shrink-0 text-[#475569] transition-opacity p-0.5"
                title="Editar título"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
            )}
          </div>
          {(date || author) && (
            <p className="hidden @2xl:block text-[12px] text-[#8C98A8] mt-1 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
              {[date, author].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Actions — descem para uma segunda linha quando a coluna é estreita */}
        <div className="flex items-center justify-between gap-3 min-w-0 shrink-0 @2xl:justify-end">
          {(date || author) && (
            <p className="@2xl:hidden text-[12px] text-[#8C98A8] truncate min-w-0" style={{ fontFamily: 'Inter, sans-serif' }}>
              {[date, author].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="flex items-center gap-2 @2xl:gap-3 shrink-0" ref={shareRef}>
          <SharedAvatars people={sharedPeople} onClick={() => setShareOpen((o) => !o)} />
          <Btn
            variant="ghost"
            iconLeft={<IconShare />}
            title="Compartilhar esta análise"
            onClick={() => setShareOpen((o) => !o)}
          >
            <span className="hidden @lg:inline">Compartilhar</span>
          </Btn>

          {shareOpen && (
            <SharePopover
              anchorRef={shareRef}
              analysisTitle={title}
              people={sharedPeople}
              setPeople={setSharedPeople}
              linkShare={linkShare}
              setLinkShare={setLinkShare}
              linkRole={linkRole}
              setLinkRole={setLinkRole}
              onClose={() => setShareOpen(false)}
            />
          )}
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {editing && (
          <EditorToolbar
            editorRef={editorRef}
            fontSize={fontSize}
            setFontSize={setFontSize}
            generating={generating}
            onGenerateAI={() => { setGenerating(true); setTimeout(() => setGenerating(false), 1800) }}
          />
        )}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 @2xl:px-8 @2xl:py-5"
          style={{ scrollbarGutter: 'stable' }}
        >
        {editing ? (
          <>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className={`min-h-[300px] text-[14px] text-[#363E49] leading-[1.8] outline-none transition-opacity ${generating ? 'opacity-40 pointer-events-none' : ''} [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_a]:text-[#3366cc] [&_a]:underline [&_img]:max-w-full [&_img]:rounded`}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: fontSize + 'px' }}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(false)}>Cancelar</Btn>
              <Btn variant="secondary" iconLeft={<IconCheck />} onClick={handleSave}>Salvar</Btn>
            </div>
          </>
        ) : (
          <>
              {savedHtml.replace(/<[^>]*>/g, '').trim() === '' ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#f1f3f5] flex items-center justify-center mb-4">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M14 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V10l-7-7z" stroke="#adb5bd" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M14 3v7h7M9 13h6M9 17h4" stroke="#adb5bd" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-[15px] font-medium text-[#475569] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Nenhuma análise ainda
                  </p>
                  <p className="text-[13px] text-[#8C98A8] mb-6 max-w-[280px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Escreva sua análise sobre o momento capturado ou deixe a IA gerar uma para você.
                  </p>
                  <div className="flex items-center gap-3">
                    <Btn variant="secondary" size="sm" iconLeft={<IconEdit />} onClick={() => setEditing(true)}>
                      Escrever análise
                    </Btn>
                    <Btn variant="primary" size="sm" iconLeft={<IconSparkle />} onClick={() => { setEditing(true); setTimeout(() => { setGenerating(true); setTimeout(() => setGenerating(false), 1800) }, 100) }}>
                      Gerar com IA
                    </Btn>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Editar texto da análise"
                  title="Clique para editar"
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('a')) return
                    setEditing(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setEditing(true)
                  }}
                  className={`-mx-3 -my-2 rounded-lg px-3 py-2 cursor-text text-[14px] text-[#363E49] leading-[1.8] outline-none transition-[background-color,box-shadow,opacity] duration-150 hover:bg-[#f1f2f4] focus-visible:bg-[#f1f2f4] focus-visible:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_a]:text-[#3366cc] [&_a]:underline [&_img]:max-w-full [&_img]:rounded ${generating ? 'opacity-40' : ''}`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: savedHtml }}
                />
              )}
          </>
        )}

          {/* Comments */}
          <div className="mt-8 pt-6 border-t border-[#e8eaed]">
            <p className="text-[13px] font-semibold text-[#363E49] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Comentários
            </p>
            <div
              id="foggy-nelson"
              role="button"
              tabIndex={0}
              aria-label="Responder ao comentário de Foggy"
              title="Clique para responder a Foggy"
              onClick={() => setReplyRequestId((requestId) => requestId + 1)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setReplyRequestId((requestId) => requestId + 1)
                }
              }}
              className="-mx-3 mb-3 flex gap-3 rounded-lg px-3 py-2 cursor-pointer outline-none transition-[background-color,box-shadow] duration-150 hover:bg-[#f1f2f4] focus-visible:bg-[#f1f2f4] focus-visible:shadow-[0_0_0_2px_rgba(51,102,204,0.18)]"
            >
              <div className="shrink-0 mt-0.5">
                <Avatar name="Foggy Nelson" avatar={imgFoggy} size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-[#363E49]" style={{ fontFamily: 'Inter, sans-serif' }}>Foggy Nelson</span>
                  <span className="text-[11px] text-[#8C98A8]" style={{ fontFamily: 'Inter, sans-serif' }}>08 jun 2025 · 15:43</span>
                </div>
                <p className="text-[13px] text-[#363E49] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Olhando o gráfico, dá pra ver que segunda-feira foi o dia mais cheio. No resto da semana ficou mais tranquilo, principalmente na quarta e quinta.
                  <br />
                  Acho que seria bom reforçar o time na segunda. Também reparei que o tempo de espera caiu depois de quarta — vale continuar acompanhando.
                </p>
              </div>
            </div>
            <CommentBox avatar={imgCurrentUser} replyTo="Foggy" replyRequestId={replyRequestId} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Right panel tabs ──────────────────────────────────────────────────────────

function TabMomento({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      {/* Snapshot card */}
      <button
        type="button"
        onClick={onOpenDashboard}
        className="group relative w-full rounded-xl border border-[#e8eaed] bg-[#f8fafc] overflow-hidden mb-4 text-left cursor-pointer transition-[border-color,box-shadow] duration-300 ease-out hover:border-[#dbeafe] hover:shadow-[0_4px_14px_rgba(37,99,235,0.06)] focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.18)]"
        aria-label="Abrir dashboard do momento"
      >
        <span className="pointer-events-none absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#e4edfb] bg-white/90 text-[#3b6fd8] opacity-0 shadow-[0_2px_6px_rgba(37,99,235,0.08)] transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="M7.25 5.25H5.75a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5v-1.5M10 4.25h5.75V10M15.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        {/* Mini chart preview */}
        <div className="px-4 pt-4 pb-3">
          <p
            className="text-[10px] font-medium text-[#8C98A8] uppercase tracking-wider mb-3"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Atendimentos por dia — Semana 27
          </p>
          <div className="flex items-end gap-1.5 h-[64px]">
            {[
              { day: 'Seg', pct: 100, highlight: true },
              { day: 'Ter', pct: 62, highlight: false },
              { day: 'Qua', pct: 44, highlight: false },
              { day: 'Qui', pct: 40, highlight: false },
              { day: 'Sex', pct: 55, highlight: false },
            ].map(({ day, pct, highlight }) => (
              <div key={day} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-full rounded-t-sm ${highlight ? 'bg-[#2563eb]' : 'bg-[#dbeafe]'}`}
                  style={{ height: `${pct * 0.56}px` }}
                />
                <span
                  className={`text-[10px] ${highlight ? 'text-[#2563eb] font-semibold' : 'text-[#8C98A8]'}`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#e8eaed] mx-4" />

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-px bg-[#e8eaed] mx-4 my-3 rounded-lg overflow-hidden">
          {[
            { label: 'Pico segunda', value: '35%', sub: 'do total semanal' },
            { label: 'Queda na espera', value: '–50%', sub: 'qua→qui' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white px-3 py-2">
              <p
                className="text-[10px] text-[#8C98A8] mb-0.5"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {label}
              </p>
              <p
                className="text-[15px] font-semibold text-[#363E49]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {value}
              </p>
              <p
                className="text-[10px] text-[#8C98A8]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {sub}
              </p>
            </div>
          ))}
        </div>
      </button>

      {/* Metadata */}
      <div className="space-y-3">
        {[
          { label: 'Capturado em', value: '01/07/2025 às 14:18' },
          { label: 'Por', value: 'Matt Murdock' },
          { label: 'Dashboard', value: 'Painel de Atendimentos' },
          { label: 'Período', value: '24/06 – 01/07/2025' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-start">
            <span
              className="text-[12px] text-[#8C98A8]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {label}
            </span>
            <span
              className="text-[12px] text-[#363E49] font-medium text-right max-w-[55%]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MomentDashboardModal({ onClose }: { onClose: () => void }) {
  const F = 'Inter, sans-serif'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[760px] flex flex-col overflow-hidden"
        style={{ border: '1px solid #e8eaed', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#e8eaed] shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[#363E49]" style={{ fontFamily: F }}>
              Dashboard do momento
            </h2>
            <p className="text-[12px] text-[#475569] mt-0.5" style={{ fontFamily: F }}>
              Revise o estado capturado do painel em 01/07/2025 às 14:18
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C98A8] hover:bg-[#f1f3f5] hover:text-[#475569] transition-colors"
            aria-label="Fechar dashboard do momento"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Dashboard', value: 'Painel de Atendimentos' },
              { label: 'Capturado em', value: '01/07/2025 às 14:18' },
              { label: 'Responsável', value: 'Matt Murdock' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-[#e8eaed] bg-[#f8fafc] px-4 py-3">
                <p className="text-[10px] text-[#8C98A8] mb-1" style={{ fontFamily: F }}>
                  {label}
                </p>
                <p className="text-[13px] font-medium text-[#363E49]" style={{ fontFamily: F }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <DashboardPreview />
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#e8eaed] shrink-0 bg-white">
          <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
        </div>
      </div>
    </div>
  )
}

function TabConversa() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: ChatMessage = { role: 'user', content: text.trim(), ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        role: 'ai',
        content: 'Com base no momento capturado, posso ver que os dados indicam um padrão consistente ao longo da semana. Há algo específico que você gostaria de explorar mais a fundo?',
        ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((m) => [...m, aiMsg])
      setLoading(false)
    }, 1200)
  }

  const QUICK_ACTIONS = ['Gerar análise', 'Resumir em 3 pontos', 'Identificar anomalias']

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-16">
            <div className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center mb-3">
              <IconSparkle />
            </div>
            <p
              className="text-[15px] font-medium text-[#363E49] mb-1"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              O que você quer saber sobre este momento?
            </p>
            <p
              className="text-[12px] text-[#8C98A8]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Pergunte algo ou use uma das ações abaixo.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-[#eff6ff] flex items-center justify-center shrink-0 mt-0.5">
                <img src={weknowIcon} alt="Weknow" className="w-4 h-4 object-contain" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-[#2563eb] text-white rounded-br-sm'
                  : 'bg-[#f1f5f9] text-[#363E49] rounded-bl-sm'
              }`}
            >
              <p
                className="text-[13px] leading-relaxed"
                style={{ fontFamily: 'Inter, sans-serif' }}
                dangerouslySetInnerHTML={{
                  __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
              {msg.ts && (
                <p
                  className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-[#8C98A8]'}`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {msg.ts}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-[#eff6ff] flex items-center justify-center shrink-0">
              <img src={weknowIcon} alt="Weknow" className="w-4 h-4 object-contain" />
            </div>
            <div className="bg-[#f1f5f9] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-bounce"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
        {QUICK_ACTIONS.map((action) => (
          <Btn key={action} variant="secondary" iconLeft={<IconSparkle />} onClick={() => send(action)}>
            {action}
          </Btn>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-1">
        <div className="flex items-center gap-2 bg-white border border-[#e8eaed] rounded-full px-3 py-2 shadow-sm focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-blue-50 transition-all">
          <button className="text-[#8C98A8] hover:text-[#475569] shrink-0 transition-colors">
            <IconAdd />
          </button>
          <input
            type="text"
            placeholder="Pergunte alguma coisa..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            className="flex-1 bg-transparent text-[13px] text-[#363E49] placeholder-[#8C98A8] outline-none"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
          <button className="text-[#8C98A8] hover:text-[#475569] shrink-0 transition-colors">
            <IconMic />
          </button>
          {input.trim() && (
            <button
              onClick={() => send(input)}
              className="w-7 h-7 rounded-full bg-[#2563eb] flex items-center justify-center text-white hover:bg-[#1d4ed8] transition-colors shrink-0"
            >
              <IconSend />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TabFicha() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      {/* AI-generated badge */}
      <div className="flex items-center gap-1.5 mb-4">
        <span
          className="text-[10px] font-medium text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <IconSparkle size={14} /> Gerada por IA
        </span>
        <span
          className="text-[10px] text-[#8C98A8]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          01/07/2025
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        {[
          {
            title: 'Identificação',
            rows: [
              ['Dashboard', 'Painel de Atendimentos'],
              ['Módulo', 'Operações / Triagem'],
              ['Período', '24/06 – 01/07/2025'],
              ['Responsável', 'Matt Murdock'],
            ],
          },
          {
            title: 'Métricas Analisadas',
            rows: [
              ['Volume de atendimentos', 'Por dia da semana'],
              ['Tempo médio de espera', '12–28 min'],
              ['Variação semanal', '–50% (qua→qui)'],
              ['Pico identificado', 'Segunda-feira (35%)'],
            ],
          },
          {
            title: 'Fontes de Dados',
            rows: [
              ['Tipo', 'Dashboard operacional'],
              ['Granularidade', 'Diária'],
              ['Atualização', 'Tempo real'],
            ],
          },
        ].map(({ title, rows }) => (
          <div key={title}>
            <p
              className="text-[11px] font-medium text-[#8C98A8] uppercase tracking-wider mb-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {title}
            </p>
            <div className="rounded-lg border border-[#e8eaed] overflow-hidden">
              {rows.map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex justify-between items-start px-3 py-2.5 ${
                    i < rows.length - 1 ? 'border-b border-[#f1f5f9]' : ''
                  }`}
                >
                  <span
                    className="text-[12px] text-[#8C98A8]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[12px] text-[#363E49] font-medium text-right max-w-[55%]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Regenerate */}
        <Btn variant="outlined" size="sm" iconLeft={<IconSparkle />} fullWidth>
          Regenerar ficha técnica
        </Btn>
      </div>
    </div>
  )
}

// ── New Analysis Modal ────────────────────────────────────────────────────────

function DashboardPreview() {
  const bars = [
    { day: 'Seg', pct: 100, active: true },
    { day: 'Ter', pct: 62,  active: false },
    { day: 'Qua', pct: 44,  active: false },
    { day: 'Qui', pct: 40,  active: false },
    { day: 'Sex', pct: 55,  active: false },
  ]
  return (
    <div className="rounded-lg border border-[#e8eaed] bg-[#f8fafc] overflow-hidden">
      {/* Fake browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#e8eaed] bg-white">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e8eaed]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e8eaed]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e8eaed]" />
        <span className="ml-2 flex-1 bg-[#f1f3f5] rounded text-[10px] text-[#8C98A8] px-2 py-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
          Painel de Atendimentos — Financeiro Hospitalar
        </span>
      </div>
      {/* Fake dashboard content */}
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          {[
            { label: 'Total semana', value: '1.847' },
            { label: 'Tempo médio', value: '18 min' },
            { label: 'Pico', value: 'Segunda' },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 bg-white rounded-md border border-[#e8eaed] px-3 py-2">
              <p className="text-[10px] text-[#8C98A8] mb-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</p>
              <p className="text-[14px] font-semibold text-[#363E49]" style={{ fontFamily: 'Inter, sans-serif' }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-md border border-[#e8eaed] px-4 pt-3 pb-2">
          <p className="text-[10px] text-[#8C98A8] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>Atendimentos por dia</p>
          <div className="flex items-end gap-2 h-[52px]">
            {bars.map(({ day, pct, active }) => (
              <div key={day} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-full rounded-t-sm ${active ? 'bg-[#3366cc]' : 'bg-[#dbeafe]'}`}
                  style={{ height: `${pct * 0.46}px` }}
                />
                <span className={`text-[9px] ${active ? 'text-[#3366cc] font-semibold' : 'text-[#8C98A8]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const SUGGESTED_TAGS = ['Operacional', 'Financeiro', 'RH', 'Qualidade', 'Urgente']

function NewAnalysisModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, context: string) => void
}) {
  const now = new Date()
  const timestamp = now.toLocaleDateString('pt-BR') + ' · ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const [name, setName] = useState('')
  const [context, setContext] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate(name.trim(), context.trim())
    onClose()
  }

  const F = 'Inter, sans-serif'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[520px] flex flex-col overflow-hidden"
        style={{ border: '1px solid #e8eaed', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#e8eaed] shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[#363E49]" style={{ fontFamily: F }}>
              Registrar novo momento
            </h2>
            <p className="text-[12px] text-[#475569] mt-0.5" style={{ fontFamily: F }}>
              Capture o estado atual do dashboard para análise
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C98A8] hover:bg-[#f1f3f5] hover:text-[#475569] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Auto-filled metadata */}
          <div className="flex items-center gap-3 bg-[#f8f9fa] rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 flex-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#6c757d" strokeWidth="1.5"/>
                <path d="M3 9h18M8 2v4M16 2v4" stroke="#6c757d" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[12px] text-[#475569]" style={{ fontFamily: F }}>{timestamp}</span>
            </div>
            <div className="w-px h-4 bg-[#dee2e6]" />
            <div className="flex items-center gap-2 flex-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#6c757d" strokeWidth="1.5"/>
                <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke="#6c757d" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[12px] text-[#475569]" style={{ fontFamily: F }}>Matt Murdock</span>
            </div>
            <div className="w-px h-4 bg-[#dee2e6]" />
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="#6c757d" strokeWidth="1.5"/>
                <path d="M8 21h8M12 17v4" stroke="#6c757d" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[12px] text-[#475569] truncate max-w-[100px]" style={{ fontFamily: F }}>Fin. Hospitalar</span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div>
            <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-2" style={{ fontFamily: F }}>
              Momento capturado
            </p>
            <DashboardPreview />
          </div>

          {/* Name field */}
          <div>
            <label className="block text-[13px] font-medium text-[#363E49] mb-1.5" style={{ fontFamily: F }}>
              Nome da análise <span className="text-[#dc2626]">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex.: Pico de demanda na segunda-feira"
              className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[13px] text-[#363E49] placeholder-[#8C98A8] outline-none transition-all focus:border-[#3366cc] focus:ring-2 focus:ring-[rgba(51,102,204,0.15)]"
              style={{ fontFamily: F }}
            />
          </div>

          {/* Context field */}
          <div>
            <label className="block text-[13px] font-medium text-[#363E49] mb-1.5" style={{ fontFamily: F }}>
              Contexto inicial
              <span className="text-[11px] font-normal text-[#8C98A8] ml-1.5">opcional</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="O que motivou este registro? O que você está investigando?"
              rows={2}
              className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[13px] text-[#363E49] placeholder-[#8C98A8] outline-none resize-none transition-all focus:border-[#3366cc] focus:ring-2 focus:ring-[rgba(51,102,204,0.15)]"
              style={{ fontFamily: F }}
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-[13px] font-medium text-[#363E49] mb-2" style={{ fontFamily: F }}>
              Categorias
              <span className="text-[11px] font-normal text-[#8C98A8] ml-1.5">opcional</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((tag) => {
                const on = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-[12px] border transition-colors ${
                      on
                        ? 'bg-[#eef2ff] text-[#3366cc] border-[#c7d7f7] font-medium'
                        : 'bg-white text-[#475569] border-[#dee2e6] hover:border-[#adb5bd] hover:text-[#475569]'
                    }`}
                    style={{ fontFamily: F }}
                  >
                    {on && <span className="mr-1">✓</span>}{tag}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#e8eaed] shrink-0 bg-white">
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" disabled={!name.trim()} onClick={handleCreate}>
            Registrar momento
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Right panel ───────────────────────────────────────────────────────────────

const TAB_LABELS: { id: RightTab; label: string }[] = [
  { id: 'conversa', label: 'Chat' },
  { id: 'momento', label: 'Momento' },
  { id: 'ficha', label: 'Ficha' },
]

function RightPanel() {
  const [tab, setTab] = useState<RightTab>('conversa')
  const [showMomentDashboard, setShowMomentDashboard] = useState(false)
  const [panelWidth, setPanelWidth] = useState(() =>
    typeof window === 'undefined'
      ? 440
      : Math.round(Math.min(440, Math.max(320, window.innerWidth * 0.33)))
  )
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)

  const clampPanelWidth = (width: number) => {
    const minWidth = 300
    const reservedForCenter = Math.min(600, Math.max(420, window.innerWidth * 0.42))
    const maxWidth = Math.max(minWidth, Math.min(800, window.innerWidth - reservedForCenter))
    return Math.min(maxWidth, Math.max(minWidth, width))
  }

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeStartRef.current = { x: event.clientX, width: panelWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return
    const delta = resizeStartRef.current.x - event.clientX
    setPanelWidth(clampPanelWidth(resizeStartRef.current.width + delta))
  }

  const stopResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return
    resizeStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  useEffect(() => {
    const keepPanelInBounds = () => setPanelWidth((width) => clampPanelWidth(width))
    window.addEventListener('resize', keepPanelInBounds)
    return () => {
      window.removeEventListener('resize', keepPanelInBounds)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <aside
      className="relative shrink-0 border-l border-[#e8eaed] bg-white flex flex-col h-full"
      style={{ width: panelWidth }}
    >
      <div
        role="separator"
        aria-label="Redimensionar painel lateral"
        aria-orientation="vertical"
        aria-valuemin={300}
        aria-valuemax={800}
        aria-valuenow={Math.round(panelWidth)}
        tabIndex={0}
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            setPanelWidth((width) => clampPanelWidth(width + 20))
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            setPanelWidth((width) => clampPanelWidth(width - 20))
          }
        }}
        className="absolute -left-1 top-0 z-20 h-full w-2 cursor-col-resize touch-none outline-none"
      />

      {/* Tab bar — Bootstrap nav-pills style */}
      <div className="border-b border-[#e8eaed] px-3 pt-2 pb-0 flex items-center justify-between shrink-0">
        <div className="flex gap-1">
          {TAB_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 mb-2 text-[13px] rounded-md font-medium transition-colors ${
                tab === id
                  ? 'bg-[#e9ecef] text-[#363E49]'
                  : 'text-[#475569] hover:bg-[#f8f9fa] hover:text-[#475569]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'momento' && <TabMomento onOpenDashboard={() => setShowMomentDashboard(true)} />}
        {tab === 'conversa' && <TabConversa />}
        {tab === 'ficha' && <TabFicha />}
      </div>

      {showMomentDashboard && (
        <MomentDashboardModal onClose={() => setShowMomentDashboard(false)} />
      )}
    </aside>
  )
}

// ── App shell ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeId, setActiveId] = useState(1)
  const [showNewModal, setShowNewModal] = useState(false)
  const current = ANALYSES.find((a) => a.id === activeId) ?? ANALYSES[0]

  const handleCreate = (name: string, _context: string) => {
    // In a real app this would persist; here we just acknowledge
    console.log('New analysis:', name)
  }

  return (
    <div
      className="flex flex-col bg-[#f8fafc]"
      style={{ width: '100vw', height: '100vh', fontFamily: 'Inter, sans-serif' }}
    >
      {/* App window */}
      <div
        className="flex flex-col bg-white rounded-xl shadow-xl overflow-hidden"
        style={{ margin: '16px', flex: 1, minHeight: 0, border: '1px solid #e8eaed' }}
      >
        {/* Header */}
        <header className="h-[48px] border-b border-[#e8eaed] bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[15px] font-semibold text-[#363E49]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Análise avançada
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-[#f1f5f9] rounded-md transition-colors text-[#94a3b8]">
              <IconMinimize />
            </button>
            <button className="p-1.5 hover:bg-[#f1f5f9] rounded-md transition-colors text-[#94a3b8]">
              <IconClose />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeId={activeId} onSelect={setActiveId} onNewAnalysis={() => setShowNewModal(true)} />

          {/* Center */}
          <main className="flex-1 overflow-hidden bg-white">
            <AnalysisEditor
              title={current.title}
              date={current.date}
              author={current.author}
            />
          </main>

          <RightPanel />
        </div>
      </div>

      {showNewModal && (
        <NewAnalysisModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
