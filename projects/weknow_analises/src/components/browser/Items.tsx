import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Btn as Button } from '@ds/Btn'
import { FormField, fieldBoxStyle, fieldTextStyle } from '@ds/Field'
import { Icon } from '@/components/icons'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { Item, SketchBlock, SketchKind } from '@/data/portal'
import type { ViewMode } from '@/components/browser/prefs'
import { Dropdown, MenuAction } from '@/components/browser/Menu'
import { useEllipsisTooltip } from '@/components/Tooltip'
import {
  APPEARANCE_COLORS,
  APPEARANCE_ICONS,
  DASHBOARD_COLOR,
  FOLDER_COLORS,
  getAppearance,
  readImageFile,
  replaceAppearance,
  setAppearance,
  useAppearance,
  type Appearance,
} from '@/components/browser/appearance'

/**
 * `meta`: coluna de metadado da Lista (conteúdo da pasta ou onde o item mora).
 * `context`: pasta de origem do item, mostrada no tooltip dos cards quando
 * ele está fora do lugar dele (Favoritos, busca).
 * `trail`: as pastas até ele, da raiz ao pai, para a linha de caminho do card.
 * Só a busca geral da barra de topo manda caminho: ali o resultado pode vir de
 * qualquer lugar do portal. Vazio quer dizer que o item mora na home.
 */
export type Listed = { item: Item; meta?: string; context?: string; trail?: string[] }

type ItemProps = {
  entry: Listed
  favorite: boolean
  quietFavorite?: boolean
  /** A coleção reserva a linha de caminho: o card cresce com ela (ver tileHeight). */
  reserveTrail?: boolean
  onOpen: (item: Item) => void
  onToggleFavorite: (id: string) => void
}

/** Botão invisível que cobre a linha/card; o conteúdo fica sem ponteiro. */
const OVERLAY =
  'absolute inset-0 rounded-[inherit] outline-none cursor-pointer focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]'

/**
 * Ícone de tipo — 20px. Pasta e dashboard mantêm as cores do Weknow (cinza e
 * rosado); tarefa e apresentação usam os mesmos ícones dos chips, para o item
 * na lista e o chip que leva até ele serem a mesma coisa aos olhos.
 */
const KIND_ICON: Record<Item['kind'], { name: string; color: string }> = {
  folder: { name: 'folder', color: 'var(--wk-folder-icon)' },
  dashboard: { name: 'dashboard', color: 'var(--wk-dashboard-icon)' },
  task: { name: 'task_alt', color: 'var(--wk-folder-icon)' },
  presentation: { name: 'animated_images', color: 'var(--wk-folder-icon)' },
}

/**
 * Miniatura de pasta sem imagem: cada pasta ganha um de seis tons
 * dessaturados e translúcidos, sorteado pelo nome — a mesma pasta tem sempre
 * a mesma cor.
 */
const FOLDER_TONES = 6
function folderToneIndex(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return (h % FOLDER_TONES) + 1
}
const folderTone = (name: string) => `var(--wk-folder-tone-${folderToneIndex(name)})`
/** O mesmo matiz bem diluído — fundo da miniatura de pasta sem imagem. */
const folderTint = (name: string) => `var(--wk-folder-tint-${folderToneIndex(name)})`

function ItemIcon({ item }: { item: Item }) {
  const { name, color } = KIND_ICON[item.kind]
  return <Icon name={name} size={20} filled color={color} className="shrink-0 pointer-events-none" />
}

/**
 * Estrela de favorito — o padrão do Weknow em produção.
 * Não favorito: some em repouso e aparece com o hover do card, em cinza.
 * Favorito: sempre visível, em amarelo. Sobre a própria estrela, o amarelo
 * a 80% antecipa o clique nos dois estados.
 */
function FavoriteToggle({
  item,
  favorite,
  onToggle,
  size = 24,
  quiet = false,
}: {
  item: Item
  favorite: boolean
  onToggle: (id: string) => void
  /** Favorito que não precisa se anunciar (já está na seção Favoritos): só no hover. */
  quiet?: boolean
  /** Na lista a estrela vem menor: ali ela se repete linha a linha. */
  size?: number
}) {
  const label = favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle(item.id)
      }}
      aria-pressed={favorite}
      aria-label={`${label}: ${item.name}`}
      title={label}
      // 40px no celular, 28 na mesa: no toque o alvo é o dedo, e a estrela
      // fica entre o nome e o menu — errar nela abre o item.
      className={`group/star relative z-10 shrink-0 flex items-center justify-center transition-opacity size-10 md:size-7 ${
        favorite && !quiet
          ? ''
          : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
      }`}
    >
      <Icon
        name="star"
        size={size}
        filled
        className={`transition-colors ${
          favorite ? 'text-[var(--wk-star)]' : 'text-[var(--wk-star-idle)]'
        } group-hover/star:text-[var(--wk-star-hover)]`}
      />
    </button>
  )
}

const NAME_STYLE = { fontFamily: FONT, color: COLOR.text }
const CONTEXT_STYLE = { fontFamily: FONT, color: COLOR.textMuted }

/** A home do portal, primeiro nível do caminho — o mesmo rótulo da barra de topo. */
const HOME_LABEL = 'Pastas'

/**
 * Linha de caminho do card: ONDE o item mora, acima do nome dele. Só na busca
 * geral da barra de topo, que varre o portal inteiro — nas outras telas o item
 * está no lugar dele e o caminho seria o cabeçalho repetido card a card.
 *
 *   Financeiro Hospitalar › Faturamento SUS e Convênios
 *   … › UTI Adulto – Hospital Unidade Centro (Bloco Cirúrgico 2º andar)
 *
 * Caminho fundo não cabe em 260px, então vale a regra da barra de topo: o que
 * não cabe some no "…" e sobra o fim do caminho, que é o que responde "onde
 * isso mora".
 *
 * Quantos níveis cabem depende do nome, não da quantidade: "5.1 IA › Exemplos
 * Soluções" entra inteiro, enquanto uma pasta de hospital já come a linha
 * sozinha. Por isso a conta é de caracteres e não de níveis — com dois níveis
 * fixos, dois nomes longos viravam dois pedaços cortados pela metade, que não
 * dizem nem um caminho nem o outro.
 */
const TRAIL_BUDGET = 38

function TrailLine({ trail }: { trail: string[] }) {
  const parts = trail.length ? trail : [HOME_LABEL]
  // Monta de trás para frente: a pasta onde o item mora nunca sai.
  const shown = [parts[parts.length - 1]]
  let used = shown[0].length
  for (let i = parts.length - 2; i >= 0; i--) {
    const next = used + 3 + parts[i].length
    if (next > TRAIL_BUDGET) break
    shown.unshift(parts[i])
    used = next
  }
  const deep = shown.length < parts.length
  const chevron = <Icon name="chevron_right" size={14} color={COLOR.textMuted} className="shrink-0 -mx-0.5" />
  return (
    <span
      className="pointer-events-none flex items-center gap-1 min-w-0 text-[12px] leading-[14px]"
      style={CONTEXT_STYLE}
    >
      {deep && (
        <>
          <span className="shrink-0">…</span>
          {chevron}
        </>
      )}
      {shown.map((name, i) => (
        <Fragment key={i}>
          {i > 0 && chevron}
          {/* A pasta onde o item mora leva a sobra da linha; as de cima já
              couberam na conta, e param em metade da linha por segurança. */}
          <span className={i === shown.length - 1 ? 'flex-1 min-w-0 truncate' : 'shrink-0 max-w-[50%] truncate'}>
            {name}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

/**
 * O que a linha de caminho acrescenta ao card. A linha mede 16px — 14 de texto
 * e 2 até o nome —, mas o card cresce só 12: os outros 4 saem do respiro, que
 * cai de 14 para 12px acima e abaixo do texto. Card com mais linha dentro
 * aguenta margem um pouco menor sem apertar; o que não pode encolher é o vão
 * entre o caminho e o nome, que é o que mantém os dois como um bloco só.
 */
const TRAIL_HEIGHT = 12

/**
 * Lista: uma tabela leve, na anatomia de um explorador de pastas.
 *
 *   NOME                        DETALHES              ÚLTIMA ALTERAÇÃO
 *   ─────────────────────────────────────────────────────────────────────────
 *   [ícone] Nome da pasta…      3 dashboards · 2 sub… 13/08/2026 14:49 por Admin  [★ ⋮ ›]
 *
 * As colunas têm posição fixa: "Detalhes" fica sempre na mesma distância da
 * borda direita, então os valores alinham entre as linhas em vez de flutuar
 * atrás de nomes de tamanhos diferentes. A vaga das ações é reservada mesmo
 * vazia — nada dança quando o ponteiro entra e sai da linha.
 *
 * Altura fixa e nome em uma linha: a lista é para varrer, não para ler. O
 * nome inteiro fica no tooltip.
 */
// Proporção em vez de largura fixa: o metadado acompanha o nome em vez de
// ficar na borda direita com um vazio no meio. Cerca de 42% / 18% / 29% / 11% — a
// alteração leva data, hora e nome, e é ela que precisa de mais largura.
//
// Abaixo de lg a grade tem TRÊS colunas, não cinco com duas zeradas: as duas
// colunas de metadado são `hidden` ali, e elemento escondido sai da grade —
// as ações caíam na terceira coluna, que media 0px, e a estrela ia parar em
// cima do nome. Colunas de menos, e não larguras de zero, é o que mantém cada
// coisa na sua.
const LIST_COLS =
  '[grid-template-columns:20px_minmax(0,1fr)_auto] lg:[grid-template-columns:20px_minmax(0,42fr)_minmax(0,18fr)_minmax(0,29fr)_minmax(92px,11fr)]'

/**
 * Tarefas e Apresentações: a tabela do Weknow, na mesma ordem de colunas.
 *
 *   Código   Descrição                                        Ações
 *   ──────────────────────────────────────────────────────────────────
 *   09       E-mail dashboard novidades                      [📄 ▶]
 *
 * Sem "Última alteração", que o Weknow não mostra aqui, e sem o ícone de
 * tipo: ele seria o mesmo em toda linha, e ícone repetido numa lista é
 * textura, não informação (regra 7 de Ícones no design system).
 *
 * O código vem primeiro e em largura fixa, porque é por ele que o cliente cita
 * o item. A coluna de ações tem a largura dos botões (`--wk-row-actions`,
 * dita pela coleção): com `auto`, o "Ações" do cabeçalho mediria menos que os
 * botões das linhas e puxaria a coluna do nome para fora do lugar. Abaixo de
 * md os botões viram um ⋮ de 40px (ver RowActions).
 */
const PLAIN_COLS =
  '[grid-template-columns:48px_minmax(0,1fr)_40px] md:[grid-template-columns:88px_minmax(0,1fr)_var(--wk-row-actions)]'

/** "13/08/2026 14:49" — os segundos do rodapé dos cadastros não ajudam a varrer a lista. */
const MODIFIED_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const formatModified = (iso: string) => MODIFIED_FORMAT.format(new Date(iso)).replace(',', '')

const LIST_PAD = 'px-3 gap-x-3'

/** Rótulo de coluna: discreto e em caixa normal — maiúsculas dariam ar de
 *  relatório administrativo, que não é o tom do Weknow. */
const HEAD_STYLE = {
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 600,
  color: COLOR.textMuted,
} as const

export type Columns = { name: string; meta: string }
const DEFAULT_COLUMNS: Columns = { name: 'Nome', meta: 'Detalhes' }

/** Cabeçalho da tabela de Tarefas e Apresentações (ver PLAIN_COLS). */
function PlainHeader({ columns }: { columns: Columns }) {
  return (
    <div className={`grid items-center h-7 ${LIST_PAD} ${PLAIN_COLS}`}>
      <span style={HEAD_STYLE}>{columns.meta}</span>
      <span style={HEAD_STYLE}>{columns.name}</span>
      <span className="text-right" style={HEAD_STYLE}>
        Ações
      </span>
    </div>
  )
}

function ListHeader({ columns, aside }: { columns: Columns; aside?: ReactNode }) {
  return (
    // Com os controles em cima dela, a linha de cabeçalho cresce: em 28px
    // eles encostavam no fio e na primeira linha da lista.
    <div className={`relative grid items-center ${aside ? 'h-12' : 'h-7'} ${LIST_PAD} ${LIST_COLS}`}>
      <span />
      <span style={HEAD_STYLE}>{columns.name}</span>
      <span className="hidden lg:block truncate" style={HEAD_STYLE}>
        {columns.meta}
      </span>
      <span className="hidden lg:block truncate" style={HEAD_STYLE}>
        Última alteração
      </span>
      <span />
      {/* Sem título de seção acima, é aqui que os controles do browser moram.
          Ficam soltos sobre a linha, fora da grade: ela precisa medir igual à
          das linhas, senão a coluna "Detalhes" sairia do lugar. */}
      {aside && <div className="absolute right-3 inset-y-0 flex items-center">{aside}</div>}
    </div>
  )
}

/**
 * Ações da linha: estrela e ⋮ só aparecem no hover; a estrela de um favorito
 * fica sempre, porque ali ela é informação, não ação. O chevron das pastas
 * aparece junto, para dizer que aquela linha leva a outro nível.
 */
const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-open]]:opacity-100 [@media(hover:none)]:opacity-100'

/** Pasta e dashboard vivem na árvore e podem virar favoritos; os outros não. */
const favoritable = (item: Item) => item.kind === 'folder' || item.kind === 'dashboard'

function RowMenu({ item, favorite, onOpen, onToggleFavorite }: Omit<ItemProps, 'entry'> & { item: Item }) {
  return (
    // Aberto, sobe acima das linhas seguintes: com z-10 igual ao da estrela, a
    // estrela da linha de baixo (que vem depois no DOM) aparecia sobre o menu.
    <div className={`relative z-10 has-[[data-open]]:z-30 shrink-0 ${REVEAL}`}>
      <Dropdown
        minWidth={220}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Ações de ${item.name}`}
            title="Mais ações"
            className="wk-icon-btn flex items-center justify-center size-10 md:size-7"
            style={{ background: open ? 'var(--wk-icon-hover)' : undefined }}
          >
            <Icon name="more_vert" size={20} color={COLOR.navLabel} />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuAction
              icon={item.kind === 'folder' ? 'folder_open' : 'dashboard'}
              label="Abrir"
              onSelect={() => {
                close()
                onOpen(item)
              }}
            />
            <MenuAction
              icon="star"
              label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              onSelect={() => {
                close()
                onToggleFavorite(item.id)
              }}
            />
          </>
        )}
      </Dropdown>
    </div>
  )
}

/**
 * "Abrir apresentação pública" do Weknow: a tela de play com o selo de pessoa
 * no canto. Não existe nos Material Symbols, então vem o desenho de lá — já
 * no traço fino do wght 200 —, herdando a cor de quem o usa.
 */
function PublicPresentationIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="block">
      <path d="M18 18C18.4167 18 18.7708 17.8542 19.0625 17.5625C19.3542 17.2708 19.5 16.9167 19.5 16.5C19.5 16.0833 19.3542 15.7292 19.0625 15.4375C18.7708 15.1458 18.4167 15 18 15C17.5833 15 17.2292 15.1458 16.9375 15.4375C16.6458 15.7292 16.5 16.0833 16.5 16.5C16.5 16.9167 16.6458 17.2708 16.9375 17.5625C17.2292 17.8542 17.5833 18 18 18ZM18 21C18.5038 21 18.9715 20.8823 19.403 20.647C19.8343 20.4118 20.1917 20.0859 20.475 19.6693C20.0955 19.4436 19.6974 19.2757 19.2807 19.1655C18.8641 19.0552 18.4372 19 18 19C17.5628 19 17.1359 19.0552 16.7193 19.1655C16.3026 19.2757 15.9045 19.4436 15.525 19.6693C15.8083 20.0859 16.1657 20.4118 16.597 20.647C17.0285 20.8823 17.4962 21 18 21ZM18 22C16.8858 22 15.9407 21.6118 15.1645 20.8355C14.3882 20.0593 14 19.1142 14 18C14 16.8858 14.3882 15.9407 15.1645 15.1645C15.9407 14.3882 16.8858 14 18 14C19.1142 14 20.0593 14.3882 20.8355 15.1645C21.6118 15.9407 22 16.8858 22 18C22 19.1142 21.6118 20.0593 20.8355 20.8355C20.0593 21.6118 19.1142 22 18 22Z" />
      <path d="M18.3848 4C18.845 4.00006 19.2288 4.15462 19.5371 4.46289C19.8454 4.77116 19.9999 5.15502 20 5.61523V13.416C19.6825 13.2773 19.3478 13.1702 19 13.0996V5.61523C18.9999 5.46134 18.9357 5.32048 18.8076 5.19238C18.6795 5.06429 18.5387 5.00007 18.3848 5H5.61523C5.46134 5.00007 5.32048 5.06429 5.19238 5.19238C5.06429 5.32048 5.00007 5.46134 5 5.61523V18.3848C5.00007 18.5387 5.06429 18.6795 5.19238 18.8076C5.32048 18.9357 5.46134 18.9999 5.61523 19H13.1006C13.1712 19.3479 13.2782 19.6824 13.417 20H5.61523C5.15502 19.9999 4.77116 19.8454 4.46289 19.5371C4.15462 19.2288 4.00006 18.845 4 18.3848V5.61523C4.00006 5.15502 4.15462 4.77116 4.46289 4.46289C4.77116 4.15462 5.15502 4.00006 5.61523 4H18.3848ZM15.4619 12L9.88477 15.5771V8.42285L15.4619 12Z" />
    </svg>
  )
}

/**
 * A coluna "Ações" do Weknow, botão a botão e na mesma ordem, com os mesmos
 * desenhos — só que no peso e na cor de ícone do design system. `toast`: o
 * aviso que o protótipo dá no lugar do que o Weknow faria de verdade; sem ele
 * o botão só existe para mostrar onde a função mora.
 */
type RowAction = { label: string; icon: string | typeof PublicPresentationIcon; toast?: string }
const ROW_ACTIONS: Partial<Record<Item['kind'], RowAction[]>> = {
  task: [
    { label: 'Exibir logs', icon: 'description' },
    { label: 'Executar tarefa', icon: 'play_circle', toast: 'Tarefa enviada para execução' },
  ],
  presentation: [
    { label: 'Abrir apresentação', icon: 'slideshow' },
    { label: 'Abrir apresentação pública', icon: PublicPresentationIcon },
    { label: 'Copiar link da apresentação pública', icon: 'link', toast: 'Link copiado' },
    { label: 'Exportar', icon: 'file_export' },
  ],
}

/**
 * Ícone da ação. Na linha ele vem em 24, o tamanho padrão, e não nos 20 de
 * linha densa: aqui os botões são o conteúdo da coluna, não um atalho ao lado
 * do nome. No menu do celular fica nos 20 do item de menu.
 */
const ACTION_ICON = 24
const actionIcon = (action: RowAction, size: number) =>
  typeof action.icon === 'string' ? (
    <Icon name={action.icon} size={size} color={COLOR.navLabel} />
  ) : (
    <action.icon size={size} />
  )

/** Caixa de 32px (o ícone de 24 com 4 de folga), 4px entre elas: a largura que a coluna de ações reserva. */
const actionsWidth = (count: number) => `${count * 32 + (count - 1) * 4}px`

/**
 * Ações de tarefa e apresentação. Sempre à vista, como no Weknow: aqui elas
 * são o que se faz com o item, não um atalho escondido no hover.
 *
 * No celular quatro botões de 40px tomariam metade da linha, e é o nome que
 * se lê — ali eles se juntam num ⋮, com os mesmos ícones e rótulos.
 */
function RowActions({ item, actions }: { item: Item; actions: RowAction[] }) {
  const toast = useContext(ToastContext)
  const run = (action: RowAction) => action.toast && toast(action.toast)
  return (
    <>
      <div className="hidden md:flex items-center justify-end gap-1">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => run(action)}
            aria-label={`${action.label}: ${item.name}`}
            title={action.label}
            className="wk-icon-btn flex items-center justify-center size-8"
            style={{ color: COLOR.navLabel }}
          >
            {actionIcon(action, ACTION_ICON)}
          </button>
        ))}
      </div>
      <div className="md:hidden relative z-10 has-[[data-open]]:z-30 flex justify-end">
        <Dropdown
          minWidth={260}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`Ações de ${item.name}`}
              title="Ações"
              className="wk-icon-btn flex items-center justify-center size-10"
              style={{ background: open ? 'var(--wk-icon-hover)' : undefined }}
            >
              <Icon name="more_vert" size={20} color={COLOR.navLabel} />
            </button>
          )}
        >
          {(close) =>
            actions.map((action) => (
              <MenuAction
                key={action.label}
                icon={actionIcon(action, 20)}
                label={action.label}
                onSelect={() => {
                  close()
                  run(action)
                }}
              />
            ))
          }
        </Dropdown>
      </div>
    </>
  )
}

function ItemRow({
  entry: { item, meta },
  favorite,
  metaLabel,
  onOpen,
  onToggleFavorite,
}: ItemProps & { metaLabel?: string }) {
  const tip = useEllipsisTooltip(item.name)
  return (
    <div
      role="listitem"
      data-item={item.id}
      onMouseEnter={tip.show}
      // Qualquer clique no card (abrir o ⋮, favoritar) derruba o tooltip do nome:
      // ele cobria as opções do menu que acabou de abrir.
      onPointerDown={tip.hide}
      onMouseLeave={tip.hide}
      /* 56px no celular contra 44 na mesa: é o piso de alvo de toque, e é o
         que deixa o nome ocupar duas linhas mais o detalhe sem apertar o
         texto contra as bordas. */
      className={`group relative grid items-center min-h-[56px] md:h-11 transition-colors hover:bg-[var(--wk-list-hover)] active:bg-[var(--wk-list-hover)] ${LIST_PAD} ${LIST_COLS}`}
    >
      <button type="button" onClick={() => onOpen(item)} aria-label={item.name} className={OVERLAY} />
      <ItemIcon item={item} />
      <span className="pointer-events-none min-w-0 flex flex-col justify-center py-1.5 md:py-0">
        <span
          ref={tip.ref}
          className="min-w-0 text-[14px] leading-[20px] line-clamp-2 md:truncate md:line-clamp-none"
          style={NAME_STYLE}
        >
          {item.name}
        </span>
        {/* Abaixo de lg a coluna do metadado não existe: ele desce para uma
            segunda linha em vez de sumir, e leva junto o nome da coluna. */}
        {meta && (
          <span className="lg:hidden truncate text-[12px] leading-[16px] mt-0.5" style={CONTEXT_STYLE}>
            {metaLabel ? `${metaLabel} ${meta}` : meta}
          </span>
        )}
      </span>
      <span className="pointer-events-none hidden lg:block truncate text-[13px] leading-[20px]" style={CONTEXT_STYLE}>
        {meta}
      </span>
      <span className="pointer-events-none hidden lg:block truncate text-[13px] leading-[20px]" style={CONTEXT_STYLE}>
        {formatModified(item.updatedAt)} por {item.updatedBy}
      </span>
      {/* Estrela e ⋮ agem sobre o item; o chevron só diz que a linha leva a
          outro nível. Por isso ele fica solto na ponta, e não colado neles. */}
      <div className="flex items-center justify-end">
        <FavoriteToggle item={item} favorite={favorite} onToggle={onToggleFavorite} size={20} />
        <RowMenu item={item} favorite={favorite} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
        {/* No celular o chevron sai: lá o toque na linha é a única forma de
            abrir, então ele não avisa nada que o dedo não saiba — e os 28px
            dele fazem falta no nome, que é o que se lê. */}
        <span
          className={`pointer-events-none ml-2 w-5 hidden md:flex justify-end ${
            item.kind === 'folder' ? REVEAL : 'invisible'
          }`}
        >
          <Icon name="chevron_right" size={20} color={COLOR.textMuted} />
        </span>
      </div>
      {tip.tooltip}
    </div>
  )
}

/**
 * Linha de tarefa ou apresentação: código, nome e as ações do Weknow (ver
 * PLAIN_COLS). Não abre pela linha — o que se faz com o item está nos botões,
 * e uma linha clicável que não leva a lugar nenhum prometeria o contrário.
 */
function PlainRow({ entry: { item, meta }, actions }: { entry: Listed; actions: RowAction[] }) {
  const tip = useEllipsisTooltip(item.name)
  return (
    <div
      role="listitem"
      data-item={item.id}
      onMouseEnter={tip.show}
      onPointerDown={tip.hide}
      onMouseLeave={tip.hide}
      // 56px no celular: descrição de tarefa tem 40, 60 caracteres, e numa
      // coluna de 375px uma linha só cortaria quase todas no meio.
      className={`group relative grid items-center min-h-[56px] md:h-11 transition-colors hover:bg-[var(--wk-list-hover)] ${LIST_PAD} ${PLAIN_COLS}`}
    >
      {/* Primeira coluna em texto secundário: ela é o rótulo da linha (Tabela,
          no design system). Algarismos tabulares para os códigos alinharem. */}
      <span className="text-[13px] leading-[20px] tabular-nums" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
        {meta}
      </span>
      <span
        ref={tip.ref}
        className="min-w-0 py-1.5 md:py-0 text-[14px] leading-[20px] line-clamp-2 md:truncate md:line-clamp-none"
        style={NAME_STYLE}
      >
        {item.name}
      </span>
      <RowActions item={item} actions={actions} />
      {tip.tooltip}
    </div>
  )
}

/**
 * A pasta de origem (Favoritos, busca) vai para o tooltip em vez de virar uma
 * linha dentro do card: dentro do card ela mudava a altura, e card de tamanho
 * diferente por seção quebra o ritmo da grade. Na Lista ela tem coluna própria.
 */
const tileTitle = (name: string, context?: string) => (context ? `${name}, em ${context}` : name)

/**
 * Compacto: card horizontal de altura FIXA, como as pastas do Drive.
 *
 *   [ícone 20] [nome, até 2 linhas]  [★]
 *
 * TODOS os cards têm 64px, em qualquer seção. Nome longo é o caso normal nos
 * clientes, então ele nunca mexe na altura: corta na segunda linha e fica
 * inteiro no tooltip.
 */
const TILE_HEIGHT = 64

/**
 * Estilo dos cards. O primeiro é o que o portal abre; os outros ficam no menu
 * "…" como alternativas numeradas, para comparar:
 * - padrao: card branco recortado por sombra, com o ícone dentro de um
 *   quadrado de 26px na cor da pasta, diluída;
 * - atual: o card que está em produção hoje — preenchido de cinza, ícone solto;
 * - referencia: o card do modelo do Márcio, mais alto, com círculo cheio,
 *   título curto e o nome da pasta embaixo;
 * - tingido: o padrão com a cor no outro lugar — caixa azulada sem sombra e o
 *   quadrado em cor cheia (ver CLEAN_WHITE_CARD).
 *
 * A ordem do array é a ordem do menu.
 */
export type CardStyle = 'padrao' | 'atual' | 'referencia' | 'tingido'
export const CARD_STYLES: CardStyle[] = ['padrao', 'atual', 'referencia', 'tingido']
/** Padrão, tingido e Referência Márcio dividem o mesmo corpo de card; muda o traje. */
const isClean = (style: CardStyle) => style !== 'atual'
export const CardStyleContext = createContext<CardStyle>('padrao')

/** Altura do card de referência: círculo de 38px, título e duas linhas de nome. */
const REFERENCE_TILE_HEIGHT = 100
/** Referência Márcio: sem borda, só sombra — no hover ela cresce um pouco. */
const REFERENCE_CARD =
  'rounded-[10px] bg-[var(--wk-card-surface)] shadow-[var(--wk-card-shadow)] hover:shadow-[var(--wk-card-shadow-hover)] transition-shadow'
/**
 * As duas leituras do card limpo, em teste lado a lado. A cor da pasta aparece
 * uma vez só em cada uma — o que muda é onde:
 *
 * - **padrão**: a caixa é branca e recortada por uma sombra curta; a cor fica
 *   no ícone, diluída no quadrado e cheia no glifo;
 * - **tingido**: a caixa é o azulado do card atual, sem sombra — é ela que
 *   delimita; a cor sobe toda para o quadrado, com o glifo em branco.
 *
 * Ou seja: no padrão a cor é um detalhe dentro de uma caixa neutra; no tingido
 * é uma marca cheia sobre uma caixa que já tem tom. Pôr as duas coisas fortes
 * ao mesmo tempo era o que deixava a grade poluída.
 */
const CLEAN_WHITE_CARD =
  'rounded-xl bg-[var(--wk-card-surface)] shadow-[var(--wk-clean-shadow)] hover:bg-[var(--wk-card-surface-hover)] hover:shadow-[var(--wk-clean-shadow-hover)] transition'
const CLEAN_TINTED_CARD = 'rounded-xl bg-[var(--wk-canvas)] hover:bg-[var(--wk-card-hover)] transition-colors'
const cleanCardClass = (style: CardStyle) =>
  style === 'referencia' ? REFERENCE_CARD : style === 'tingido' ? CLEAN_TINTED_CARD : CLEAN_WHITE_CARD
const cleanTileHeight = (style: CardStyle) => (style === 'referencia' ? REFERENCE_TILE_HEIGHT : TILE_HEIGHT)
/**
 * Altura do card. A linha de caminho não encolhe o nome: ela soma 12px, e a
 * seção inteira cresce junto — na busca geral um resultado pode estar na home
 * (sem caminho) e o outro quatro pastas abaixo, e card de altura diferente na
 * mesma grade quebraria a linha de baixo. Quem decide é a coleção, não o card.
 */
const tileHeight = (style: CardStyle, trail: boolean) =>
  (isClean(style) ? cleanTileHeight(style) : TILE_HEIGHT) + (trail ? TRAIL_HEIGHT : 0)
const FADE_FAST = 'transition-opacity duration-150'

/**
 * Estado dos ícones das pastas, alternado no menu "…". Não é um desenho de
 * card: é o estágio do cadastro do cliente.
 * - definidos: cada pasta traz o tema cadastrado (ícone e cor), como a tela
 *   ficará depois que o cliente configurar as pastas dele;
 * - indefinidos: nenhuma pasta tem tema — que é como a atualização entra no ar
 *   no primeiro dia. Cai tudo no padrão do tipo: pasta genérica na cor padrão.
 *
 * O que o usuário personalizar continua valendo nos dois modos. Em
 * "indefinidos" isso é justamente a graça: dá para ver a tela antes e depois
 * de ele começar a definir as pastas.
 */
export type IconMode = 'definidos' | 'indefinidos'
export const ICON_MODES: IconMode[] = ['definidos', 'indefinidos']
export const IconModeContext = createContext<IconMode>('definidos')

/**
 * Miniatura do dashboard sem imagem, em teste: o croqui do layout ou o ícone.
 * O croqui é o que o Weknow já faz hoje, redesenhado; o ícone é o do card novo.
 */
export type DashThumb = 'croqui' | 'icone'
export const DASH_THUMBS: DashThumb[] = ['croqui', 'icone']
export const DashThumbContext = createContext<DashThumb>('croqui')

/**
 * Ícone de cada tipo de componente no croqui: os mesmos desenhos que o
 * Weknow usa hoje (Material Design Icons), com a caixa em que cada um foi
 * desenhado — quase todos em 24, o de barras em 30, o de filtro em 18.
 */
const SKETCH_ICONS: Record<SketchKind, { d: string; box: number }> = {
  bar: { box: 30, d: 'M5,11H9.286V25H5Zm8-6h4V25H13Zm8,11.429h4V25H21Z' },
  line: { box: 24, d: 'M3.5,18.5L9.5,12.5L13.5,16.5L22,6.92L20.59,5.5L13.5,13.5L9.5,9.5L2,17L3.5,18.5Z' },
  pie: { box: 24, d: 'M11,2V22C5.9,21.5 2,17.2 2,12C2,6.8 5.9,2.5 11,2M13,2V11H22C21.5,6.2 17.8,2.5 13,2M13,13V22C17.7,21.5 21.5,17.8 22,13H13Z' },
  map: { box: 24, d: 'M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,20.97L9,18.9L15,21L20.64,19.1C20.85,19 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z' },
  gauge: { box: 24, d: 'M12,16A3,3 0 0,1 9,13C9,11.88 9.61,10.9 10.5,10.39L20.21,4.77L14.68,14.35C14.18,15.33 13.17,16 12,16M12,3C13.81,3 15.5,3.5 16.97,4.32L14.87,5.53C14,5.19 13,5 12,5A8,8 0 0,0 4,13C4,15.21 4.89,17.21 6.34,18.65H6.35C6.74,19.04 6.74,19.67 6.35,20.06C5.96,20.45 5.32,20.45 4.93,20.07V20.07C3.12,18.26 2,15.76 2,13A10,10 0 0,1 12,3M22,13C22,15.76 20.88,18.26 19.07,20.07V20.07C18.68,20.45 18.05,20.45 17.66,20.06C17.27,19.67 17.27,19.04 17.66,18.65V18.65C19.11,17.2 20,15.21 20,13C20,12 19.81,11 19.46,10.1L20.67,8C21.5,9.5 22,11.18 22,13Z' },
  table: { box: 24, d: 'M8,10h9V21H8Zm9,11h3a2.006,2.006,0,0,0,2-2V10H17ZM20,3H5A2.006,2.006,0,0,0,3,5V8H22V5A2.006,2.006,0,0,0,20,3ZM3,19a2.006,2.006,0,0,0,2,2H8V10H3Z' },
  text: { box: 24, d: 'M20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20M5,13V15H16V13H5M5,9V11H19V9H5Z' },
  label: { box: 24, d: 'M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z' },
  image: { box: 24, d: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
  filter: { box: 18, d: 'M16,18H2a2,2,0,0,1-2-2V2A2,2,0,0,1,2,0H16a2,2,0,0,1,2,2V16A2,2,0,0,1,16,18ZM4.77,3.561a.623.623,0,0,0-.374.132.605.605,0,0,0-.226.4.592.592,0,0,0,.124.443L7.773,9h.018v3.547a.6.6,0,0,0,.176.5l1.214,1.214a.6.6,0,0,0,.852,0,.58.58,0,0,0,.175-.5V9h.018l3.48-4.459a.592.592,0,0,0,.124-.443.605.605,0,0,0-.226-.4.623.623,0,0,0-.374-.132Z' },
}

/** O quadro do croqui do Weknow: 250×170, células com 1 de margem e raio 2. */
const SKETCH_W = 250
const SKETCH_H = 170

/**
 * Croqui do dashboard: a posição de cada componente e o tipo dele.
 *
 * É o croqui que o Weknow já desenha, refeito aqui do mesmo jeito — quadro de
 * 250×170 no centro da miniatura, células claras com 2 de vão sobre o fundo
 * da miniatura vazia, e no meio de cada célula o ícone do tipo de componente.
 * Muda só a cor dos ícones: o cinza #dadada de lá dá lugar à cor padrão de
 * ícone do design system (--wk-nav-label), que também tem par no tema escuro.
 */
function DashboardSketch({ layout }: { layout: SketchBlock[] }) {
  const col = SKETCH_W / 12
  const row = SKETCH_H / 6
  return (
    <svg viewBox={`0 0 ${SKETCH_W} ${SKETCH_H}`} className="h-[80%] w-auto max-w-[90%]" aria-hidden="true">
      {layout.map(([x, y, w, h, kind], i) => {
        const icon = SKETCH_ICONS[kind]
        const cx = (x + w / 2) * col
        const cy = (y + h / 2) * row
        return (
          <g key={i}>
            <rect
              x={x * col + 1}
              y={y * row + 1}
              width={w * col - 2}
              height={h * row - 2}
              rx={2}
              fill="var(--wk-surface-subtle)"
            />
            <path
              d={icon.d}
              transform={`translate(${cx - icon.box / 2} ${cy - icon.box / 2})`}
              fill="var(--wk-nav-label)"
            />
          </g>
        )
      })}
    </svg>
  )
}

const DEFAULT_APPEARANCE: Record<Item['kind'], { icon: string; color: string }> = {
  folder: { icon: 'folder', color: FOLDER_COLORS[0] },
  dashboard: { icon: 'bar_chart', color: DASHBOARD_COLOR },
  task: { icon: 'task_alt', color: APPEARANCE_COLORS[7] },
  presentation: { icon: 'animated_images', color: APPEARANCE_COLORS[7] },
}

/** Ícone e cor do card: o que o usuário escolheu, senão o tema do item, senão o do tipo. */
function useResolvedAppearance(item: Item) {
  const custom = useAppearance(item.id)
  // Em "indefinidos" o tema cadastrado é ignorado; o que o usuário escolheu, não.
  const theme = useContext(IconModeContext) === 'indefinidos' ? undefined : item.theme
  /* Dashboard é sempre o gráfico de barras em vermelho, venha de onde vier o
     resto: a cor é o que o separa da pasta de relance, e só vale se ninguém
     mais puder usá-la nem ele puder trocá-la. */
  if (fixedLook(item)) return DEFAULT_APPEARANCE.dashboard
  const base = theme
    ? { icon: theme.icon, color: FOLDER_COLORS[theme.tone % FOLDER_COLORS.length] }
    : DEFAULT_APPEARANCE[item.kind]
  // Vermelho salvo numa pasta antes da regra não vale mais: ela volta à dela.
  const color = custom?.color && custom.color !== DASHBOARD_COLOR ? custom.color : base.color
  return { icon: custom?.icon ?? base.icon, color }
}

/** Itens cujo ícone e cor não se escolhem — hoje, só os dashboards. */
const fixedLook = (item: Item) => item.kind === 'dashboard'

/** Aviso curto do portal ("Alterações salvas"); quem mostra é a tela. */
export const ToastContext = createContext<(text: string) => void>(() => {})

/**
 * Nome e imagem do item: o que o usuário salvou, senão o que veio do cadastro.
 * Nome vazio não apaga a pasta da tela — ela volta a se chamar como no
 * cadastro, que é o que o portal tem para mostrar.
 */
export function useItemFace(item: Item) {
  const custom = useAppearance(item.id)
  return {
    name: custom?.name?.trim() ? custom.name : item.name,
    // `null` é imagem retirada pelo usuário; `undefined` é "não mexeram nela".
    thumbnail: custom?.image === null ? undefined : custom?.image ?? item.thumbnail,
  }
}

/**
 * O catálogo inteiro do Material Symbols (~4 mil nomes, 50 KB). Só é baixado
 * quando um painel de ícones abre, e uma vez por visita: quem nunca edita uma
 * pasta não paga por ele.
 */
let iconCatalog: Promise<string[]> | undefined
const loadIconCatalog = () =>
  (iconCatalog ??= import('@ds/iconNames').then((m) => m.ICON_NAMES.split(' ')))

/** "local hospital", "Local-Hospital" e "local_hospital" são a mesma busca. */
const iconQuery = (q: string) => q.trim().toLowerCase().replace(/[\s-]+/g, '_')

/**
 * Ordem do resultado: o nome exato, depois o que começa com o texto, depois o
 * que tem uma palavra começando com ele, e por fim o que só o contém. Dentro
 * de cada grupo vale a ordem do catálogo, que é a de popularidade: buscar
 * "chart" traz `bar_chart` antes de `waterfall_chart`.
 */
function searchIcons(names: string[], q: string) {
  const rank = (name: string) =>
    name === q ? 0 : name.startsWith(q) ? 1 : name.includes(`_${q}`) ? 2 : name.includes(q) ? 3 : -1
  const buckets: string[][] = [[], [], [], []]
  for (const name of names) {
    const r = rank(name)
    if (r >= 0) buckets[r].push(name)
  }
  return buckets.flat()
}

/** Quantos ícones a grade desenha de cada vez: chegar ao fim pede o lote seguinte. */
const ICON_BATCH = 120

/** Rótulo do ícone para o leitor de tela e a dica: o nome sem os sublinhados. */
const iconLabel = (name: string) => name.replace(/_/g, ' ')

/**
 * Ícone e cor da pasta — um campo só, "Ícones".
 *
 * Um rótulo só, de 16/1.5 como o do Nome: ícone e cor produzem uma coisa só,
 * o disco colorido do card.
 *
 * A grade oferece o catálogo inteiro do Material Symbols, a mesma família dos
 * ícones do resto do app. Sem busca ela começa pelos temas que aparecem nas
 * pastas dos clientes (APPEARANCE_ICONS) e segue pelo catálogo na ordem de
 * popularidade. A busca é pelo nome do símbolo, que é em inglês, e o texto
 * do campo diz isso: sem o aviso, "dinheiro" sem resultado pareceria defeito.
 *
 * A área da grade tem altura fixa, com ou sem resultado. O menu se reposiciona
 * quando muda de altura (ver Dropdown), e um painel que encolhesse a cada letra
 * digitada pularia de lugar debaixo do cursor.
 *
 * Sem moldura em volta da grade: uma caixa de borda prometeria um campo que se
 * preenche, para o que é uma paleta. O escolhido vem preenchido na cor, no
 * mesmo desenho que vai para o card, e trocar a cor repinta o ícone na hora.
 */
function IconField({
  icon,
  color,
  onIcon,
  onColor,
}: {
  icon: string
  color: string
  onIcon: (name: string) => void
  onColor: (color: string) => void
}) {
  // A cor com a luz que o tema pede, como no disco do card (ver --wk-icon-lift):
  // o que o painel mostra preenchido tem de ser o que aparece lá fora.
  const tone = `color-mix(in srgb, #fff var(--wk-icon-lift), ${color})`
  const [catalog, setCatalog] = useState<string[]>()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [shown, setShown] = useState(ICON_BATCH)
  const gridRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    loadIconCatalog().then(
      (names) => alive && setCatalog(names),
      () => {}, // sem rede, a grade fica nos sugeridos
    )
    return () => {
      alive = false
    }
  }, [])

  const q = iconQuery(query)
  /* Sem busca, o ícone atual vem primeiro: a pasta pode estar com um que não
     é sugestão, e ele tem de aparecer marcado sem a pessoa rolar atrás dele. */
  const names = useMemo(() => {
    if (q) return searchIcons(catalog ?? APPEARANCE_ICONS, q)
    const first = [icon, ...APPEARANCE_ICONS.filter((n) => n !== icon)]
    const seen = new Set(first)
    return [...first, ...(catalog ?? []).filter((n) => !seen.has(n))]
  }, [catalog, q, icon])

  // Busca nova começa do alto e do primeiro lote.
  useEffect(() => {
    setShown(ICON_BATCH)
    gridRef.current?.scrollTo({ top: 0 })
  }, [q])

  // O fim da grade à vista pede o lote seguinte.
  useEffect(() => {
    const end = endRef.current
    const grid = gridRef.current
    if (!end || !grid) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShown((n) => n + ICON_BATCH),
      { root: grid, rootMargin: '0px 0px 120px 0px' },
    )
    io.observe(end)
    return () => io.disconnect()
  }, [names])

  return (
    <FormField label="Ícones">
      <div className="flex flex-col gap-3">
        <div
          className="flex items-center gap-2"
          style={{ ...fieldBoxStyle({ focused }), paddingInline: 8 }}
        >
          <Icon name="search" size={20} color={COLOR.navLabel} className="shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              /* Esc limpa a busca primeiro; só com o campo vazio ele fecha o
                 painel. O Dropdown ouve o Esc na janela, e parar a propagação
                 aqui impede que ele chegue lá. */
              if (e.key === 'Escape' && query) {
                e.stopPropagation()
                setQuery('')
              }
            }}
            placeholder="Buscar em inglês, ex.: chart"
            aria-label="Buscar ícone pelo nome, em inglês"
            className="flex-1 min-w-0 bg-transparent outline-none"
            style={{ ...fieldTextStyle, fontSize: 14 }}
          />
        </div>

        {/* 3 linhas e meia: a linha cortada embaixo é o que diz que a grade
            rola. Mais alta, o painel passava da janela num card da primeira
            fileira de uma tela de notebook. */}
        <div ref={gridRef} className="overflow-y-auto -mx-1 px-1" style={{ height: 126 }}>
          {names.length ? (
            <div className="grid grid-cols-6 gap-y-1 justify-items-center">
              {names.slice(0, shown).map((name) => {
                const on = name === icon
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onIcon(name)}
                    aria-label={iconLabel(name)}
                    title={iconLabel(name)}
                    aria-pressed={on}
                    className={`flex items-center justify-center size-8 rounded-full transition-colors ${
                      on ? '' : 'hover:bg-[var(--wk-menu-hover)]'
                    }`}
                    style={on ? { background: tone, color: '#fff' } : { color: COLOR.textSecondary }}
                  >
                    <Icon name={name} size={20} weight={on ? 400 : 300} color="currentColor" />
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-[13px] leading-[18px] pt-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
              {catalog ? 'Nenhum ícone com esse nome. Tente outra palavra em inglês.' : 'Carregando ícones…'}
            </p>
          )}
          <div ref={endRef} style={{ height: 1 }} />
        </div>

        {/* As cores seguem a mesma coluna óptica da grade: o px-1 alinha a
            primeira bolinha com o primeiro glifo. Vermelho não está aqui: é a
            cor do dashboard (ver FOLDER_COLORS). */}
        <div className="flex items-center justify-between px-1">
          {FOLDER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColor(c)}
              aria-label={`Cor ${c}`}
              aria-pressed={c === color}
              className="rounded-full"
              style={{
                width: 20,
                height: 20,
                background: c,
                // O anel sai da superfície do menu, que é onde ele é desenhado.
                boxShadow:
                  c === color ? `0 0 0 2px var(--wk-surface), 0 0 0 4px ${c}` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </FormField>
  )
}

/** Link discreto do painel (carregar, remover) — ação de apoio, sem caixa. */
const PANEL_LINK = 'self-start text-[13px] leading-[18px] rounded-md hover:underline'

/**
 * Uma edição da cara do item: o rascunho, o Cancelar que o desfaz e o
 * "Salvar para todos" que o confirma.
 *
 * O painel de editar é a parte visual do "Cadastro de menus" do desk —
 * nome, imagem, ícone e cor — e só ela. Documentação, variáveis,
 * palavras-chave e permissões continuam lá: num menu suspenso o cadastro
 * inteiro viraria um formulário, e não é por caber que ele viria. É porque no
 * desk a pessoa configura às cegas e precisa abrir o portal para ver como
 * ficou. A pasta aparece aqui; é aqui que se escolhe a cara dela.
 *
 * Daí o Salvar: o que se mexe aqui é o cadastro, não uma preferência do
 * navegador. Enquanto o painel está aberto o card muda junto — é o que a web
 * tem e o desk não —, e fechar sem salvar devolve tudo ao que era.
 *
 * E o cadastro é um só: a pasta muda para todo mundo que a vê, não só para
 * quem editou. Num ⋮ ao lado da estrela, que é preferência pessoal, a leitura
 * natural seria a contrária. Por isso o Salvar pergunta antes de gravar, num
 * modal: é uma decisão sem a qual não dá para seguir, que é o caso do modal.
 * O painel fica aberto atrás do véu, e Cancelar no modal devolve a pessoa à
 * edição com o rascunho intacto — quem hesitou quer rever, não perder tudo.
 */
function useEditSession(item: Item) {
  const [editing, setEditing] = useState(false)
  /** O Salvar foi clicado e o modal pergunta se vale para todos. */
  const [confirming, setConfirming] = useState(false)
  /** O cadastro como estava quando o painel abriu — o que o Cancelar devolve. */
  const snapshot = useRef<Appearance | undefined>(undefined)
  const saved = useRef(false)

  const begin = () => {
    snapshot.current = getAppearance(item.id)
    saved.current = false
    setConfirming(false)
    setEditing(true)
  }

  /* Fechar sem salvar é cancelar, venha de onde vier — botão, Esc ou clique
     fora. Sem isso o Salvar não significaria nada: bastava clicar ao lado para
     o rascunho virar cadastro. */
  const end = () => {
    if (editing && !saved.current) replaceAppearance(item.id, snapshot.current)
    setEditing(false)
    setConfirming(false)
  }

  /* Sem mudança não há o que confirmar: o Salvar só fecha. */
  const changed = () => JSON.stringify(getAppearance(item.id)) !== JSON.stringify(snapshot.current)

  const markSaved = () => {
    saved.current = true
  }

  return { editing, setEditing, confirming, setConfirming, begin, end, changed, markSaved }
}

type EditSession = ReturnType<typeof useEditSession>

/**
 * O painel de editar: nome, imagem, ícone e cor, com Cancelar e Salvar. É o
 * mesmo no ⋮ do card e no lápis ao lado do nome da pasta aberta; quem o abre
 * só decide o gatilho.
 */
function EditPanel({ item, session, close }: { item: Item; session: EditSession; close: () => void }) {
  const [focused, setFocused] = useState(false)
  const { icon, color } = useResolvedAppearance(item)
  const custom = useAppearance(item.id)
  const { thumbnail } = useItemFace(item)
  const toast = useContext(ToastContext)
  const fileRef = useRef<HTMLInputElement>(null)
  const { confirming, setConfirming, changed } = session
  const kind = item.kind === 'folder' ? 'pasta' : 'dashboard'
  /* O campo mostra o rascunho, não o nome que o card resolve: se mostrasse o
     resolvido, apagar o texto traria o nome do cadastro de volta na hora e a
     pessoa não conseguiria limpar o campo para digitar outro. */
  const draftName = custom?.name ?? item.name

  const pickImage = async (file: File | undefined) => {
    if (!file) return
    try {
      setAppearance(item.id, { image: await readImageFile(file) })
    } catch {
      toast('Não consegui ler essa imagem')
    }
  }

  return (
    /* O campo de texto é o do design system (ver components/Field):
       rótulo de 16/1.5 acima da caixa de 38, e o respiro de 16 entre um
       bloco e o seguinte sai do próprio FormField.

       p-3 aqui mais os 4 que o menu já tem dão 16 de respiro em volta,
       um passo da grade. Com 8 o conteúdo encostava na borda do painel
       e a caixa do campo parecia maior do que o painel comporta. */
    <div className="flex flex-col p-3" style={{ fontFamily: FONT }}>
      <FormField label="Nome">
        <input
          type="text"
          value={draftName}
          onChange={(e) => setAppearance(item.id, { name: e.target.value })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={`Nome da ${kind}`}
          className="w-full outline-none"
          style={{ ...fieldBoxStyle({ focused }), ...fieldTextStyle }}
        />
      </FormField>

      {/* A mesma imagem que o Expandido mostra no card, e sem rótulo em
          cima: a miniatura mostra o que é, e "Imagem" só repetia a
          imagem. A própria miniatura abre o seletor — alvo de 120×60 em
          vez de um link de 13px —, e segue a proporção 2:1 do card, que
          é o que ela está prevendo. "Carregar do disco" é o texto do
          cadastro no desk: mesma ação, mesmo nome. */}
      <div className="flex items-center gap-3" style={{ paddingBottom: 16 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title={thumbnail ? 'Trocar imagem' : 'Carregar imagem do disco'}
            className="shrink-0 overflow-hidden flex items-center justify-center border border-[var(--wk-border)]"
            style={{
              width: 120,
              height: 60,
              borderRadius: RADIUS.sm,
              background: 'var(--wk-thumb-empty)',
            }}
          >
            {thumbnail ? (
              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon name="image" size={24} color={COLOR.textMuted} />
            )}
          </button>
          <span className="flex flex-col gap-1 min-w-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={PANEL_LINK}
              style={{ color: 'var(--wk-primary)' }}
            >
              {thumbnail ? 'Trocar imagem' : 'Carregar do disco'}
            </button>
            {thumbnail && (
              <button
                type="button"
                onClick={() => setAppearance(item.id, { image: null })}
                className={PANEL_LINK}
                style={{ color: COLOR.textMuted }}
              >
                Remover
              </button>
            )}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pickImage(e.target.files?.[0])
              // zera para a mesma imagem poder ser escolhida de novo
              e.target.value = ''
            }}
          />
      </div>

      {/* Dashboard não oferece o campo: ícone e cor dele são fixos. */}
      {!fixedLook(item) && (
        <IconField
          icon={icon}
          color={color}
          onIcon={(name) => setAppearance(item.id, { icon: name })}
          onColor={(c) => setAppearance(item.id, { color: c })}
        />
      )}

      {/* O fio sangra até as bordas do painel: ele separa o formulário
          das ações, não uma coluna de texto da outra. */}
      <div
        className="flex justify-end gap-2 -mx-3 px-3 pt-3 border-t"
        style={{ borderColor: COLOR.border }}
      >
        <Button variant="ghost" onClick={close}>
          Cancelar
        </Button>
        <Button onClick={() => (changed() ? setConfirming(true) : close())}>
          Salvar
        </Button>
      </div>

      {confirming && (
        <ConfirmModal
          title="Salvar para todos?"
          confirmLabel="Salvar para todos"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            session.markSaved()
            toast('Alterações salvas para todos')
            close()
          }}
        >
          {kind === 'pasta'
            ? 'As alterações nesta pasta serão aplicadas para todos os usuários que têm acesso a ela.'
            : 'As alterações neste dashboard serão aplicadas para todos os usuários que têm acesso a ele.'}
        </ConfirmModal>
      )}
    </div>
  )
}

/** ⋮ do card: favoritar e editar. Aparece no hover. */
function CardMenu({
  item,
  favorite,
  onToggleFavorite,
}: {
  item: Item
  favorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  // O mesmo menu troca de conteúdo: primeiro as duas ações, e "Editar" abre
  // ali mesmo o painel — sem um segundo popover.
  const session = useEditSession(item)
  const { name } = useItemFace(item)
  const kind = item.kind === 'folder' ? 'pasta' : 'dashboard'

  return (
    <div className="relative shrink-0">
      <Dropdown
        minWidth={session.editing ? 300 : 220}
        onClose={session.end}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={() => {
              if (!open) session.setEditing(false)
              toggle()
            }}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Ações de ${name}`}
            title="Mais ações"
            // 40px no celular, 28 na mesa — o mesmo piso de toque da estrela,
            // que fica logo ao lado.
            className="wk-icon-btn flex items-center justify-center size-10 md:size-7"
            style={{ background: open ? 'var(--wk-icon-hover)' : undefined }}
          >
            <Icon name="more_vert" size={20} color={COLOR.navLabel} />
          </button>
        )}
      >
        {(close) =>
          !session.editing ? (
            <>
              <MenuAction icon="edit" label={`Editar ${kind}`} onSelect={session.begin} />
              <MenuAction
                icon="star"
                label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                onSelect={() => {
                  close()
                  onToggleFavorite(item.id)
                }}
              />
            </>
          ) : (
            <EditPanel item={item} session={session} close={close} />
          )
        }
      </Dropdown>
    </div>
  )
}

/**
 * Lápis ao lado do nome da pasta aberta: abre direto o painel de editar, o
 * mesmo do ⋮ do card, com o mesmo Cancelar e o mesmo "Salvar para todos".
 * Aqui não há menu de ações antes: favoritar mora no card, e dentro da pasta
 * a única coisa a fazer com ela mesma é editá-la.
 *
 * O painel abre para a direita, embaixo do título: o lápis fica colado ao
 * nome, perto da borda esquerda da folha.
 */
export function FolderEditButton({ item, compact = false }: { item: Item; compact?: boolean }) {
  const session = useEditSession(item)
  return (
    <div className="relative shrink-0">
      <Dropdown
        align="left"
        minWidth={300}
        onClose={session.end}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={() => {
              if (!open) session.begin()
              toggle()
            }}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label="Editar pasta"
            title="Editar pasta"
            // 40 no celular, o piso de toque, como a seta de voltar ao lado.
            className={`wk-icon-btn flex items-center justify-center ${compact ? 'size-10' : 'size-8'}`}
            style={{ background: open ? 'var(--wk-icon-hover)' : undefined }}
          >
            <Icon name="edit" size={20} color={COLOR.navLabel} />
          </button>
        )}
      >
        {(close) => (session.editing ? <EditPanel item={item} session={session} close={close} /> : null)}
      </Dropdown>
    </div>
  )
}

/**
 * O ícone da pasta no cabeçalho dela: o mesmo quadrado do card (ícone e cor
 * personalizados, o glifo na cor e o fundo diluído), em 32 para acompanhar o
 * título de 22. Antes era a pasta cinza para todas, e entrar numa pasta de
 * cifrão verde dava num cabeçalho que não a reconhecia.
 */
export function FolderMark({ item }: { item: Item }) {
  const { icon, color } = useResolvedAppearance(item)
  const tone = `color-mix(in srgb, #fff var(--wk-icon-lift), ${color})`
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-lg"
      style={{
        width: 32,
        height: 32,
        background: `color-mix(in srgb, ${tone} var(--wk-icon-tint), var(--wk-card-surface))`,
      }}
    >
      <Icon name={icon} size={22} weight={350} color={tone} />
    </span>
  )
}

/**
 * Card limpo — cópia fiel do card pedido (Indicadores Hospitalares):
 *
 *   ┌────────────────────────────────────────────┐
 *   │ (◉)  Financeiro                          🎨 ★ │
 *   │      ▎Nome completo da pasta, até          │
 *   │      ▎duas linhas.                          │
 *   └────────────────────────────────────────────┘
 *
 * Sem borda e com sombra suave; círculo cheio na cor escolhida com o ícone em
 * traço branco; título em negrito, só a inicial maiúscula (a caixa alta do
 * modelo saiu a pedido); o fio antes da descrição na
 * mesma cor do círculo. O título é o tema curto da pasta e o nome dela vem
 * embaixo, no lugar da descrição do modelo. Sem tema, o nome vira o título,
 * em até duas linhas. A seta do modelo saiu — o card inteiro já abre.
 */
function CleanTileBody({
  item,
  name,
  favorite,
  quietFavorite,
  trail,
  onToggleFavorite,
  tipRef,
}: {
  item: Item
  name: string
  favorite: boolean
  quietFavorite?: boolean
  trail?: string[]
  onToggleFavorite: (id: string) => void
  tipRef: RefObject<HTMLSpanElement | null>
}) {
  const style = useContext(CardStyleContext)
  const { icon, color } = useResolvedAppearance(item)
  // A cor da pasta com a luz que o tema pede: no claro é ela mesma, no escuro
  // ela sobe (ver --wk-icon-lift). Vale para o glifo e para o quadrado, que é
  // feito a partir dela — se só o glifo subisse, o quadrado ficaria fora de
  // tom com o ícone que ele abriga.
  const tone = `color-mix(in srgb, #fff var(--wk-icon-lift), ${color})`

  if (style === 'referencia') {
    const title = item.theme?.title ?? name
    // Com tema, o nome completo desce para a linha de baixo — e é ele que o
    // tooltip precisa revelar quando corta.
    const sub = item.theme ? name : undefined
    return (
      <>
        <span className="pointer-events-none flex-1 min-w-0 flex items-start gap-3.5">
          <span
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{ width: 38, height: 38, background: color }}
          >
            <Icon name={icon} size={20} weight={400} color="#fff" />
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-2.5 pt-0.5">
            {trail && <TrailLine trail={trail} />}
            <span
              ref={sub ? undefined : tipRef}
              className={`break-words text-[15px] leading-[20px] font-bold ${sub ? 'line-clamp-1' : 'line-clamp-2'}`}
              style={{ fontFamily: FONT, color: 'var(--wk-card-title)' }}
            >
              {title}
            </span>
            {sub && (
              <span className="flex gap-2 min-w-0">
                <span className="shrink-0 w-0.5 rounded-full" style={{ background: color }} />
                <span ref={tipRef} className="line-clamp-2 break-words text-[12px] leading-[16px]" style={CONTEXT_STYLE}>
                  {sub}
                </span>
              </span>
            )}
          </span>
        </span>
      {/* Ações: o ⋮ (personalizar e favoritar) aparece no hover, e a estrela
          fica na ponta, como sinal de favorito — fora da seção Favoritos, só
          no hover. Sem estrela não há vaga guardada: no card que não é
          favorito o ⋮ encosta na borda direita. */}
      <span className="shrink-0 flex items-center">
        {favoritable(item) && (
          <span className={`relative z-10 has-[[data-open]]:z-30 ${REVEAL}`}>
            <CardMenu item={item} favorite={favorite} onToggleFavorite={onToggleFavorite} />
          </span>
        )}
        {favorite && (
          <span
            className={`pointer-events-none flex items-center justify-center ${
              quietFavorite ? `opacity-0 ${FADE_FAST} group-hover:opacity-100` : ''
            }`}
            style={{ width: 28, height: 28 }}
          >
            <Icon name="star" size={24} filled className="text-[var(--wk-star)]" />
          </span>
        )}
      </span>
      </>
    )
  }

  // Limpo: a anatomia do card atual (ícone, nome, ações) com o fio no lugar do
  // fundo cinza e o ícone na cor do item. Sem título curto, sem fio colorido e
  // na mesma altura do atual — com título e descrição o card ficava alto demais
  // e a grade, pesada.
  return (
    <>
      {/* Quadrado de 24px arredondado, na cor da pasta — o que muda entre os dois
          limpos é o peso dessa cor. No tingido ela é cheia e o glifo sai em
          branco, uma marca que se lê de longe sobre o card azulado. No claro ela
          é diluída no branco do card e só o glifo fica na cor cheia: sobre uma
          caixa neutra, o bloco saturado repetido em toda a grade pesava. */}
      <span
        className="shrink-0 flex items-center justify-center rounded-lg pointer-events-none"
        style={{
          width: 26,
          height: 26,
          background:
            style === 'tingido'
              ? color
              : `color-mix(in srgb, ${tone} var(--wk-icon-tint), var(--wk-card-surface))`,
        }}
      >
        {/* 20 num quadrado de 26. As duas medidas saíram de comparar 24/26/28 na
            tela com o mesmo glifo, e a conta que importa não é font-size sobre
            caixa: o glifo do Material Symbols tem recuo dentro da própria caixa
            (o ~2px que LAYOUT.glyphInset documenta), então a 20px o desenho
            visível mede ~18x12. Em 24 esses 18 de tinta ficavam a 0,75 da
            caixa e encostavam no raio do canto; em 28 sobrava ar demais e o
            quadrado virava um bloco com um glifo solto dentro. */}
        <Icon
          name={icon}
          size={20}
          weight={style === 'tingido' ? 300 : 350}
          color={style === 'tingido' ? '#fff' : tone}
        />
      </span>
      <span className="pointer-events-none flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {trail && <TrailLine trail={trail} />}
        <span
          ref={tipRef}
          className="min-w-0 line-clamp-2 break-words text-[14px] leading-[18px]"
          style={NAME_STYLE}
        >
          {name}
        </span>
      </span>
      {/* Ações: o ⋮ (personalizar e favoritar) aparece no hover, e a estrela
          fica na ponta, como sinal de favorito — fora da seção Favoritos, só
          no hover. Sem estrela não há vaga guardada: no card que não é
          favorito o ⋮ encosta na borda direita. */}
      <span className="shrink-0 flex items-center">
        {favoritable(item) && (
          <span className={`relative z-10 has-[[data-open]]:z-30 ${REVEAL}`}>
            <CardMenu item={item} favorite={favorite} onToggleFavorite={onToggleFavorite} />
          </span>
        )}
        {favorite && (
          <span
            className={`pointer-events-none flex items-center justify-center ${
              quietFavorite ? `opacity-0 ${FADE_FAST} group-hover:opacity-100` : ''
            }`}
            style={{ width: 28, height: 28 }}
          >
            <Icon name="star" size={24} filled className="text-[var(--wk-star)]" />
          </span>
        )}
      </span>
    </>
  )
}

/** Ícone + texto + estrela: a faixa comum ao Compacto e ao rodapé do Expandido. */
function TileBody({
  item,
  name,
  favorite,
  quietFavorite,
  trail,
  onToggleFavorite,
  tipRef,
}: {
  item: Item
  name: string
  favorite: boolean
  quietFavorite?: boolean
  trail?: string[]
  onToggleFavorite: (id: string) => void
  tipRef: RefObject<HTMLSpanElement | null>
}) {
  const style = useContext(CardStyleContext)
  if (isClean(style)) {
    return (
      <CleanTileBody
        item={item}
        name={name}
        favorite={favorite}
        quietFavorite={quietFavorite}
        trail={trail}
        onToggleFavorite={onToggleFavorite}
        tipRef={tipRef}
      />
    )
  }
  return (
    <>
      <ItemIcon item={item} />
      <span className="pointer-events-none flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {trail && <TrailLine trail={trail} />}
        <span
          ref={tipRef}
          className="min-w-0 line-clamp-2 break-words text-[14px] leading-[18px]"
          style={NAME_STYLE}
        >
          {name}
        </span>
      </span>
      <FavoriteToggle item={item} favorite={favorite} quiet={quietFavorite} onToggle={onToggleFavorite} />
    </>
  )
}

function ItemTile({
  entry: { item, context, trail },
  favorite,
  quietFavorite,
  reserveTrail,
  onOpen,
  onToggleFavorite,
}: ItemProps) {
  const style = useContext(CardStyleContext)
  const { name } = useItemFace(item)
  const tip = useEllipsisTooltip(tileTitle(name, context), context !== undefined)
  return (
    <div
      role="listitem"
      data-item={item.id}
      // Só o mouse que entra no card de fato. O modal de confirmar a edição é
      // filho do card na árvore do React (vem do ⋮) mas mora no <body>, e o
      // React conta a entrada nele como entrada aqui: o nome aparecia por cima
      // do véu.
      onMouseEnter={(e) => e.currentTarget.contains(e.target as Node) && tip.show()}
      // Qualquer clique no card (abrir o ⋮, favoritar) derruba o tooltip do nome:
      // ele cobria as opções do menu que acabou de abrir.
      onPointerDown={tip.hide}
      onMouseLeave={tip.hide}
      className={`group relative flex items-center gap-3 ${
        isClean(style)
          ? `${style === 'referencia' ? 'px-5' : 'pl-4 pr-2'} ${cleanCardClass(style)}`
          : 'pl-4 pr-2 rounded-xl transition-colors bg-[var(--wk-canvas)] hover:bg-[var(--wk-card-hover)]'
      }`}
      style={{ height: tileHeight(style, Boolean(reserveTrail)) }}
    >
      <button type="button" onClick={() => onOpen(item)} aria-label={name} className={OVERLAY} />
      <TileBody
        item={item}
        name={name}
        favorite={favorite}
        quietFavorite={quietFavorite}
        trail={trail}
        onToggleFavorite={onToggleFavorite}
        tipRef={tip.ref}
      />
      {tip.tooltip}
    </div>
  )
}

/**
 * Expandido — o card do Compacto com a imagem cadastrada no item em cima:
 *
 *   ┌───────────────────────────────┐
 *   │                               │  miniatura sangrando até as bordas,
 *   │                               │  o card é o limite dela
 *   ├───────────────────────────────┤
 *   │ [ícone] Nome da pasta que   ★ │  rodapé de 64px, igual ao Compacto
 *   │         é bem comprido…       │
 *   └───────────────────────────────┘
 *
 * Sem imagem cadastrada, a miniatura mostra o ícone do tipo — nada de prévia
 * inventada. Trocar Compacto ↔ Expandido só acrescenta a imagem: a faixa do
 * nome é a mesma.
 */
function ItemThumb({
  entry: { item, context, trail },
  favorite,
  quietFavorite,
  reserveTrail,
  onOpen,
  onToggleFavorite,
}: ItemProps) {
  const folder = item.kind === 'folder'
  const style = useContext(CardStyleContext)
  const look = useResolvedAppearance(item)
  const { name, thumbnail } = useItemFace(item)
  const tip = useEllipsisTooltip(tileTitle(name, context), context !== undefined)
  // Sem imagem, no limpo: o ícone do tema grande, na cor dele, sobre a mesma
  // cor bem diluída — o card vazio conversa com o círculo do rodapé.
  const cleanEmpty = isClean(style) && !thumbnail
  // Dashboard sem imagem e com layout: o croqui no lugar do ícone, quando o
  // teste pede. Sem layout (painel vazio) o ícone continua.
  const sketch =
    useContext(DashThumbContext) === 'croqui' && cleanEmpty && item.kind === 'dashboard'
      ? item.layout
      : undefined
  // No Expandido o card é claro nos dois estilos, então a cor diluída da
  // miniatura vazia se mistura sempre no branco dele.
  // O croqui fica no fundo neutro da miniatura vazia, como no Weknow: a cor
  // do item tingindo o quadro brigava com as células claras.
  const emptyStyle = sketch
    ? undefined
    : cleanEmpty
    ? { background: `color-mix(in srgb, ${look.color} 9%, var(--wk-card-surface))` }
    : folder && !thumbnail
      ? { background: `linear-gradient(${folderTint(name)}, ${folderTint(name)}), var(--wk-card-surface)` }
      : undefined
  return (
    <div
      role="listitem"
      data-item={item.id}
      onMouseEnter={tip.show}
      // Qualquer clique no card (abrir o ⋮, favoritar) derruba o tooltip do nome:
      // ele cobria as opções do menu que acabou de abrir.
      onPointerDown={tip.hide}
      onMouseLeave={tip.hide}
      // O Expandido usa a MESMA caixa do Compacto em cada estilo — quem decide é
      // cleanCardClass, um lugar só. Antes ele tinha fio fixo enquanto o
      // Compacto já era sombra, e trocar de visualização mudava o material do
      // card. Só o estilo 'atual' segue com fio, que é o card de produção.
      className={`group relative flex flex-col ${
        isClean(style)
          ? cleanCardClass(style)
          : 'rounded-xl border border-[var(--wk-card-border)] transition-colors bg-[var(--wk-card-surface)] hover:bg-[var(--wk-card-surface-hover)]'
      }`}
    >
      <button type="button" onClick={() => onOpen(item)} aria-label={name} className={OVERLAY} />
      {/* Imagem e faixa do nome em tons diferentes: com o mesmo fundo, o card
          virava um bloco só e não se via onde a imagem acabava. */}
      {/* Pasta sem imagem: fundo no matiz da pasta, bem diluído sobre o
          branco do card, e o ícone no mesmo matiz — a grade ganha cor sem
          blocos cinza repetidos. */}
      <div
        // O raio de cima acompanha o da caixa, e o fio de 1px desconta 1 do raio:
        // sem fio o canto é o mesmo 12 do card; com fio, 11.
        //
        // Nos cards limpos não há fio aqui. Eles não têm contorno em volta —
        // quem os recorta é a sombra —, então um traço solto embaixo da imagem
        // não fechava nada: era um resquício do card 'atual', que tem contorno
        // e ali o fio de fato divide a caixa em duas células. Separar a imagem
        // da faixa do nome continua sendo trabalho do tom de fundo, como diz o
        // comentário acima, e da própria foto quando ela existe.
        className={`pointer-events-none aspect-[2/1] overflow-hidden flex items-center justify-center bg-[var(--wk-thumb-empty)] ${
          style === 'referencia'
            ? 'rounded-t-[10px]'
            : isClean(style)
              ? 'rounded-t-xl'
              : 'rounded-t-[11px] border-b border-[var(--wk-card-border)]'
        }`}
        style={emptyStyle}
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : sketch ? (
          <DashboardSketch layout={sketch} />
        ) : cleanEmpty ? (
          <Icon name={look.icon} size={56} weight={300} color={look.color} className="opacity-60" />
        ) : (
          <Icon
            name={folder ? 'folder' : 'dashboard'}
            size={48}
            filled
            color={folder ? folderTone(name) : 'var(--wk-dashboard-icon-soft)'}
          />
        )}
      </div>
      <div
        className={`flex items-center gap-3 ${isClean(style) ? (style === 'referencia' ? 'px-5' : 'pl-4 pr-2') : 'pl-4 pr-2'}`}
        style={{ height: tileHeight(style, Boolean(reserveTrail)) }}
      >
        <TileBody
          item={item}
          name={name}
          favorite={favorite}
          quietFavorite={quietFavorite}
          trail={trail}
          onToggleFavorite={onToggleFavorite}
          tipRef={tip.ref}
        />
      </div>
      {tip.tooltip}
    </div>
  )
}

/**
 * Compacto e Expandido dividem a mesma grade de colunas: trocar de
 * visualização não muda a largura do card nem o número de colunas — só o que
 * cabe dentro dele. Mínimo de 260px para o nome ter duas linhas legíveis;
 * 16px entre cards, como no Drive.
 */
const CARD_COLUMNS = { gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }

export function ItemCollection({
  entries,
  view,
  favorites,
  showHeader = true,
  headerAside,
  columns = DEFAULT_COLUMNS,
  quietFavorites = false,
  onOpen,
  onToggleFavorite,
}: {
  entries: Listed[]
  view: ViewMode
  favorites: Set<string>
  /** O cabeçalho de colunas vale para o browser inteiro: só a primeira lista
   *  o mostra, e as seções seguintes seguem na mesma grade. */
  showHeader?: boolean
  /** Ordenação e visualização, quando não há linha de seção para recebê-los. */
  headerAside?: ReactNode
  /** Rótulos das colunas — cada área de conteúdo chama as suas do seu jeito. */
  columns?: Columns
  /** A seção Favoritos já está na tela: aqui a estrela só aparece no hover. */
  quietFavorites?: boolean
  onOpen: (item: Item) => void
  onToggleFavorite: (id: string) => void
}) {
  /* A linha de caminho é decisão da coleção, não do card: basta um item vir
     com caminho para todos reservarem a linha. É o que mantém uma altura só na
     grade da busca geral, onde um resultado da home convive com um de dentro
     de quatro pastas. */
  const reserveTrail = entries.some((e) => e.trail !== undefined)
  const common = { onOpen, onToggleFavorite, quietFavorite: quietFavorites, reserveTrail }

  if (view === 'thumbs') {
    return (
      <div role="list" className="grid gap-4" style={CARD_COLUMNS}>
        {entries.map((e) => (
          <ItemThumb key={e.item.id} entry={e} favorite={favorites.has(e.item.id)} {...common} />
        ))}
      </div>
    )
  }

  if (view === 'grid') {
    return (
      // 12px entre cards no celular contra os 16 da mesa: ali a grade tem uma
      // coluna só, então o vão não separa colunas — só empilha ar entre um
      // card e o seguinte, e cada 4px custa meio item por tela.
      <div role="list" className="grid gap-3 md:gap-4" style={CARD_COLUMNS}>
        {entries.map((e) => (
          <ItemTile key={e.item.id} entry={e} favorite={favorites.has(e.item.id)} {...common} />
        ))}
      </div>
    )
  }

  /* Tarefas e Apresentações são listas de um tipo só: o primeiro item diz
     quantos botões a coluna de ações reserva, no cabeçalho e em toda linha. */
  const actions = entries.length ? ROW_ACTIONS[entries[0].item.kind] : undefined
  const actionsStyle = actions ? ({ '--wk-row-actions': actionsWidth(actions.length) } as CSSProperties) : undefined

  if (actions) {
    return (
      <div role="list" className="flex flex-col -mx-3 divide-y divide-[var(--wk-row-divider)]" style={actionsStyle}>
        {showHeader && <PlainHeader columns={columns} />}
        {entries.map((e) => (
          <PlainRow key={e.item.id} entry={e} actions={actions} />
        ))}
      </div>
    )
  }

  // -mx-3: o ícone da linha alinha com o título da seção; hover e fios sangram para fora.
  return (
    <div role="list" className="flex flex-col -mx-3 divide-y divide-[var(--wk-row-divider)]">
      {showHeader && <ListHeader columns={columns} aside={headerAside} />}
      {entries.map((e) => (
        <ItemRow
          key={e.item.id}
          entry={e}
          favorite={favorites.has(e.item.id)}
          metaLabel={columns.meta}
          {...common}
        />
      ))}
    </div>
  )
}
