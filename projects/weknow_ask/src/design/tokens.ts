/**
 * Weknow Design System — tokens extraídos do redesign (projeto figma_export)
 * e reaplicados na tela do Weknow ASK.
 */

export const FONT = "'Inter', sans-serif"

export const COLOR = {
  /* marca */
  primary:        'var(--wk-primary)',
  primaryHover:   'var(--wk-primary-hover)',
  primaryStrong:  'var(--wk-primary-strong)',
  primaryDeep:    'var(--wk-primary-deep)',
  tint:           'var(--wk-tint)',
  tintHover:      'var(--wk-tint-hover)',
  tintSoft:       'var(--wk-tint-soft)',

  /* logo */
  logoInk:        'var(--wk-logo-ink)',   // texto da marca: acompanha o tema
  logoBrand:      '#3366cc',              // símbolo: cor de marca, fixa nos dois temas
  logoTeal:       '#5adbdb',
  logoBlue:       '#30a7e2',

  /* texto */
  text:           'var(--wk-text)',
  textSecondary:  'var(--wk-text-secondary)',
  textMuted:      'var(--wk-text-muted)',
  textIcon:       'var(--wk-text-icon)',

  /* bolha da pergunta do usuário no chat */
  userBubble:     'var(--wk-user-bubble)',

  /* superfícies */
  canvas:         'var(--wk-canvas)',   // Variable "Card fundo 1 white" — fundo da página e do menu
  surface:        'var(--wk-surface)',
  surfaceSubtle:  'var(--wk-surface-subtle)',
  hover:          'var(--wk-hover)',
  hoverStrong:    'var(--wk-hover-strong)',
  pillActive:     'var(--wk-pill-active)',
  chipBg:         'var(--wk-chip-bg)',  // chip do design system (nó 4454:7159)
  chipBgHover:    'var(--wk-chip-bg-hover)',
  /* busca: o tom depende da superfície em que ela se apoia */
  searchPill:     'var(--wk-search-pill)',  // sobre o fundo tingido (topo e menu)
  searchPillLight:'var(--wk-search-pill-light)',  // sobre superfície branca (folha de conteúdo)

  /* menu lateral — espec. do nó "sidebar white" do portal (WP-832) */
  navActive:      'var(--wk-nav-active)',
  navActiveText:  'var(--wk-nav-active-text)',
  navHover:       'var(--wk-nav-hover)',
  navHoverText:   'var(--wk-nav-hover-text)',
  navText:        'var(--wk-nav-text)',
  navLabel:       'var(--wk-nav-label)',

  /* linhas */
  border:         'var(--wk-border)',
  borderStrong:   'var(--wk-border-strong)',

  /* hover de botão de ícone — nó 3630:3689 */
  iconHover:      'var(--wk-icon-hover)',

  /* estados */
  danger:         'var(--wk-danger)',
} as const

export const SHADOW = {
  composer: 'var(--wk-shadow-composer)',
} as const

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  composer: 20,
  pill: 9999,
} as const

/* Métricas de layout — do frame "home" do portal (WP-832) */
export const LAYOUT = {
  headerHeight: 56,      // Top Bar
  sidebarWidth: 255,     // instance "sidebar white"
  sheetRadius: 16,       // cantos superiores da folha branca
  sheetMarginRight: 48,  // 1920 - 255 - 1617: o conteúdo não encosta na borda
  threadMaxWidth: 896,
  /* item de menu — nó "item camadas dashboard" */
  navItemHeight: 40,
  navItemPadX: 8,
  navItemGap: 8,
  navItemRadius: 8,
  navIconSize: 24,
  sidebarPad: 16,
  /**
   * Os glifos do Material Symbols têm ~2px de recuo dentro da caixa de 24px.
   * O logo preenche a dele, então precisa desse mesmo recuo para a coluna
   * óptica do menu bater — medido, não estimado.
   */
  glyphInset: 2,
} as const

/**
 * Padrão único de tabela — o mesmo dentro da conversa e nas telas.
 *
 * A referência é a tabela que a resposta da IA monta: compacta, sóbria,
 * sem divisórias verticais e sem zebra. A versão anterior desta espec.
 * (linhas de 56, texto 14,4/1.6, raio 16) vinha do componente `grafico
 * tabela` do design system e ficava larga demais para listas longas — ao
 * lado da tabela da conversa, parecia outro produto.
 *
 * O cabeçalho é menor que o corpo de propósito: rótulo de coluna é
 * sinalização, não conteúdo. O peso 600 é o que o distingue, não o tamanho.
 *
 * O design system pede Roboto para tabelas, herança do Bootstrap 5. Como
 * todo o redesign usa Inter, mantemos Inter.
 */
export const TABLE = {
  radius: 12,
  border: 'var(--wk-border)',
  padX: 20,
  padY: 12,
  headerSize: 12,
  headerWeight: 600,
  headerText: 'var(--wk-text-secondary)',
  bodySize: 13,
  bodyWeight: 400,
  text: 'var(--wk-text)',
  /** Primeira coluna: age como rótulo da linha, então recua um tom. */
  labelText: 'var(--wk-text-secondary)',
  rowHover: 'var(--wk-surface-subtle)',
} as const

/**
 * Chip dentro de tabela — um só estilo, neutro.
 *
 * Antes cada tipo de dado tinha sua cor (azul, violeta, verde). Numa tabela
 * monocromática isso vira ruído: a cor prometia um significado que o texto
 * do chip já entrega. Neutro para todos, igual ao chip de contagem que já
 * acompanha o título da tela.
 */
export const TABLE_CHIP = {
  height: 22,
  padX: 8,
  fontSize: 12,
  fontWeight: 500,
  background: 'var(--wk-hover-strong)',
  color: 'var(--wk-text-secondary)',
} as const

/**
 * Barra de topo — espec. dos nós `Frame 427319838` e `pesquisar barra topo`
 * (WP-832, node 4454:7125).
 */
/**
 * Caminho (breadcrumb) — espec. do nó 5132:3761 (WP-832).
 *
 *   linha      gap 8 entre todos os itens, sem exceção
 *   ícones     24px em #8C98A8 ("Fonte terciária white"), inclusive os
 *              separadores `chevron_right`
 *   rótulos    Inter 15/1.2 em #475569 ("Fonte secundária white") — a cor é
 *              a mesma do primeiro ao último
 *   atual      o mesmo 15/1.2 na mesma cor, só que Semi Bold
 *
 * Repare que o destaque do item atual é **só o peso**. Escurecer a cor além
 * disso, como estava antes, cria uma segunda hierarquia que a espec. não tem.
 */
export const BREADCRUMB = {
  gap: 8,
  iconSize: 24,
  iconColor: 'var(--wk-nav-label)',
  fontSize: 15,
  lineHeight: 1.2,
  color: 'var(--wk-text-secondary)',
  weight: 400,
  currentWeight: 600,
} as const

export const TOPBAR = {
  height: 56,
  padX: 16,
  padY: 8,
  gap: 12,
  iconSize: 24,
  avatarSize: 36,   // nó 3630:4012
  search: {
    width: 328,
    height: 36,
    background: 'var(--wk-search-pill)',
    radius: 200,
    padLeft: 16,
    padRight: 12,
    gap: 8,
    fontSize: 16,
    lineHeight: 20,
    /* Cor do placeholder — fonte secundária a 75%. O texto digitado usa
       COLOR.text. Aplicada pela regra global `::placeholder` em index.css. */
    placeholderColor: 'var(--wk-placeholder-soft)',
  },
} as const
