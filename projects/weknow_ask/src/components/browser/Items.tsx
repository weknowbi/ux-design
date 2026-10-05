import { createContext, useContext, useState, type ReactNode, type RefObject } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import type { Item } from '@/data/portal'
import type { ViewMode } from '@/components/browser/prefs'
import { Dropdown, MenuAction } from '@/components/browser/Menu'
import { useEllipsisTooltip } from '@/components/Tooltip'
import { APPEARANCE_COLORS, APPEARANCE_ICONS, setAppearance, useAppearance } from '@/components/browser/appearance'
import { FormField } from '@/components/Field'

/**
 * `meta`: coluna de metadado da Lista (conteúdo da pasta ou onde o item mora).
 * `context`: pasta de origem do item, mostrada no tooltip dos cards quando
 * ele está fora do lugar dele (Favoritos, busca).
 */
export type Listed = { item: Item; meta?: string; context?: string }

type ItemProps = {
  entry: Listed
  favorite: boolean
  quietFavorite?: boolean
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
        {(close) =>
          item.kind === 'presentation' ? (
            // As duas ações que a coluna "Ações" do Weknow oferece aqui.
            <>
              <MenuAction icon="link" label="Copiar link" onSelect={close} />
              <MenuAction icon="file_export" label="Exportar" onSelect={close} />
            </>
          ) : (
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
          )
        }
      </Dropdown>
    </div>
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
      onMouseEnter={tip.show}
      // Qualquer clique no card (abrir o ⋮, favoritar) derruba o tooltip do nome:
      // ele cobria as opções do menu que acabou de abrir.
      onPointerDown={tip.hide}
      onMouseLeave={tip.hide}
      /* 56px no celular contra 44 na mesa: é o piso de alvo de toque, e é o
         que deixa o nome ocupar duas linhas mais o código sem apertar o texto
         contra as bordas. Descrição de tarefa tem 40, 60 caracteres — numa
         coluna de 375px, uma linha só cortaria quase todas no meio da
         primeira palavra útil. */
      className={`group relative grid items-center min-h-[56px] md:h-11 transition-colors hover:bg-[var(--wk-portal-list-hover)] active:bg-[var(--wk-portal-list-hover)] ${LIST_PAD} ${LIST_COLS}`}
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
        {/* Abaixo de lg a coluna do metadado não existe, e nela mora o código
            que o cliente usa para citar a tarefa ou a apresentação — o dado
            que ele lê para o telefone. Aqui ele desce para uma segunda linha
            em vez de sumir, e leva junto o nome da coluna: sem o cabeçalho
            para explicá-lo, um "03" solto embaixo do título não é dado
            nenhum. */}
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
        {/* Tarefa e apresentação não entram em Favoritos no Weknow, então ali
            a vaga da estrela fica vazia em vez de oferecer uma ação que não
            existe. */}
        {favoritable(item) && (
          <FavoriteToggle item={item} favorite={favorite} onToggle={onToggleFavorite} size={20} />
        )}
        {(favoritable(item) || item.kind === 'presentation') && (
          <RowMenu item={item} favorite={favorite} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
        )}
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
 * A pasta de origem (Favoritos, busca) vai para o tooltip em vez de virar uma
 * linha dentro do card: dentro do card ela mudava a altura, e card de tamanho
 * diferente por seção quebra o ritmo da grade. Na Lista ela tem coluna própria.
 */
const tileTitle = (item: Item, context?: string) => (context ? `${item.name} — em ${context}` : item.name)

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

const DEFAULT_APPEARANCE: Record<Item['kind'], { icon: string; color: string }> = {
  folder: { icon: 'folder', color: APPEARANCE_COLORS[0] },
  dashboard: { icon: 'bar_chart', color: APPEARANCE_COLORS[4] },
  task: { icon: 'task_alt', color: APPEARANCE_COLORS[7] },
  presentation: { icon: 'animated_images', color: APPEARANCE_COLORS[7] },
}

/** Ícone e cor do card: o que o usuário escolheu, senão o tema do item, senão o do tipo. */
function useResolvedAppearance(item: Item) {
  const custom = useAppearance(item.id)
  // Em "indefinidos" o tema cadastrado é ignorado; o que o usuário escolheu, não.
  const theme = useContext(IconModeContext) === 'indefinidos' ? undefined : item.theme
  const base = theme
    ? { icon: theme.icon, color: APPEARANCE_COLORS[theme.tone % APPEARANCE_COLORS.length] }
    : DEFAULT_APPEARANCE[item.kind]
  const color = custom?.color ?? base.color
  // Dashboard tem ícone fixo por ora: é sempre o gráfico de barras, venha de
  // onde vier o resto. A cor continua livre.
  if (fixedIcon(item)) return { icon: DEFAULT_APPEARANCE.dashboard.icon, color }
  return { icon: custom?.icon ?? base.icon, color }
}

/** Itens cujo ícone não se escolhe — hoje, só os dashboards. */
const fixedIcon = (item: Item) => item.kind === 'dashboard'

/** ⋮ do card limpo: personalizar ícone e cor, e favoritar. Aparece no hover. */
function CardMenu({
  item,
  icon,
  color,
  favorite,
  onToggleFavorite,
}: {
  item: Item
  icon: string
  color: string
  favorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  // O mesmo menu troca de conteúdo: primeiro as duas ações, e "Personalizar"
  // abre ali mesmo o painel de ícone e cor — sem um segundo popover.
  const [customizing, setCustomizing] = useState(false)
  return (
    <div className="relative shrink-0">
      <Dropdown
        minWidth={customizing ? 300 : 220}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={() => {
              if (!open) setCustomizing(false)
              toggle()
            }}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Ações de ${item.name}`}
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
          !customizing ? (
            <>
              <MenuAction
                icon="palette"
                label={fixedIcon(item) ? 'Personalizar cor' : 'Personalizar ícone e cor'}
                onSelect={() => setCustomizing(true)}
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
          ) : (
          /* p-3 aqui mais os 4 que o menu já tem dão 16 de respiro em volta, um
             passo da grade — a mesma conta do painel do Portal. */
          <div className="flex flex-col p-3" style={{ fontFamily: FONT }}>
            {/* Ícone e cor num campo só, "Aparência", com o rótulo de 16 do
                design system. Eram dois rótulos de 12 em semibold, um para cada
                grupo: num painel desse tamanho eles pesavam mais que a escolha
                que nomeavam, e as escolhas ficavam soltas embaixo. Os dois
                produzem uma coisa só — o disco colorido do card —, e o ícone
                escolhido aparece preenchido na cor escolhida, no mesmo desenho
                que vai para o card: trocar a cor repinta o ícone na hora.
                Dashboard não oferece a grade, o ícone dele é fixo. */}
            <FormField label="Aparência">
              <div className="flex flex-col gap-3">
                {!fixedIcon(item) && (
                  <div className="grid grid-cols-6 gap-y-1 justify-items-center">
                    {APPEARANCE_ICONS.map((name) => {
                      const on = name === icon
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setAppearance(item.id, { icon: name })}
                          aria-label={name}
                          aria-pressed={on}
                          className={`flex items-center justify-center size-8 rounded-full transition-colors ${
                            on ? '' : 'hover:bg-[var(--wk-menu-hover)]'
                          }`}
                          style={
                            on
                              ? {
                                  // A cor com a luz que o tema pede, como no disco
                                  // do card (ver --wk-icon-lift).
                                  background: `color-mix(in srgb, #fff var(--wk-icon-lift), ${color})`,
                                  color: '#fff',
                                }
                              : { color: COLOR.textSecondary }
                          }
                        >
                          <Icon name={name} size={20} weight={on ? 400 : 300} color="currentColor" />
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* As cores seguem a mesma coluna óptica da grade: o px-1 alinha
                    a primeira bolinha com o primeiro glifo. */}
                <div className="flex items-center justify-between px-1">
                  {APPEARANCE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAppearance(item.id, { color: c })}
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
            <button
              type="button"
              onClick={() => {
                setAppearance(item.id, null)
                close()
              }}
              className="self-start text-[13px] rounded-md px-1 -mx-1 hover:underline"
              style={{ color: 'var(--wk-primary)' }}
            >
              Restaurar padrão
            </button>
          </div>
          )
        }
      </Dropdown>
    </div>
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
  favorite,
  quietFavorite,
  onToggleFavorite,
  tipRef,
}: {
  item: Item
  favorite: boolean
  quietFavorite?: boolean
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
    const title = item.theme?.title ?? item.name
    // Com tema, o nome completo desce para a linha de baixo — e é ele que o
    // tooltip precisa revelar quando corta.
    const sub = item.theme ? item.name : undefined
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
            <CardMenu item={item} icon={icon} color={color} favorite={favorite} onToggleFavorite={onToggleFavorite} />
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
      <span
        ref={tipRef}
        className="pointer-events-none flex-1 min-w-0 line-clamp-2 break-words text-[14px] leading-[18px]"
        style={NAME_STYLE}
      >
        {item.name}
      </span>
      {/* Ações: o ⋮ (personalizar e favoritar) aparece no hover, e a estrela
          fica na ponta, como sinal de favorito — fora da seção Favoritos, só
          no hover. Sem estrela não há vaga guardada: no card que não é
          favorito o ⋮ encosta na borda direita. */}
      <span className="shrink-0 flex items-center">
        {favoritable(item) && (
          <span className={`relative z-10 has-[[data-open]]:z-30 ${REVEAL}`}>
            <CardMenu item={item} icon={icon} color={color} favorite={favorite} onToggleFavorite={onToggleFavorite} />
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
  favorite,
  quietFavorite,
  onToggleFavorite,
  tipRef,
}: {
  item: Item
  favorite: boolean
  quietFavorite?: boolean
  onToggleFavorite: (id: string) => void
  tipRef: RefObject<HTMLSpanElement | null>
}) {
  const style = useContext(CardStyleContext)
  if (isClean(style)) {
    return (
      <CleanTileBody
        item={item}
        favorite={favorite}
        quietFavorite={quietFavorite}
        onToggleFavorite={onToggleFavorite}
        tipRef={tipRef}
      />
    )
  }
  return (
    <>
      <ItemIcon item={item} />
      <span
        ref={tipRef}
        className="pointer-events-none flex-1 min-w-0 line-clamp-2 break-words text-[14px] leading-[18px]"
        style={NAME_STYLE}
      >
        {item.name}
      </span>
      <FavoriteToggle item={item} favorite={favorite} quiet={quietFavorite} onToggle={onToggleFavorite} />
    </>
  )
}

function ItemTile({ entry: { item, context }, favorite, quietFavorite, onOpen, onToggleFavorite }: ItemProps) {
  const style = useContext(CardStyleContext)
  const tip = useEllipsisTooltip(tileTitle(item, context), context !== undefined)
  return (
    <div
      role="listitem"
      onMouseEnter={tip.show}
      // Qualquer clique no card (abrir o ⋮, favoritar) derruba o tooltip do nome:
      // ele cobria as opções do menu que acabou de abrir.
      onPointerDown={tip.hide}
      onMouseLeave={tip.hide}
      className={`group relative flex items-center gap-3 ${
        isClean(style)
          ? `${style === 'referencia' ? 'px-5' : 'pl-4 pr-2'} ${cleanCardClass(style)}`
          : 'pl-4 pr-2 rounded-xl transition-colors bg-[var(--wk-canvas)] hover:bg-[var(--wk-card-hover)]'
      }`}
      style={{ height: isClean(style) ? cleanTileHeight(style) : TILE_HEIGHT }}
    >
      <button type="button" onClick={() => onOpen(item)} aria-label={item.name} className={OVERLAY} />
      <TileBody
        item={item}
        favorite={favorite}
        quietFavorite={quietFavorite}
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
function ItemThumb({ entry: { item, context }, favorite, quietFavorite, onOpen, onToggleFavorite }: ItemProps) {
  const folder = item.kind === 'folder'
  const style = useContext(CardStyleContext)
  const look = useResolvedAppearance(item)
  const tip = useEllipsisTooltip(tileTitle(item, context), context !== undefined)
  // Sem imagem, no limpo: o ícone do tema grande, na cor dele, sobre a mesma
  // cor bem diluída — o card vazio conversa com o círculo do rodapé.
  const cleanEmpty = isClean(style) && !item.thumbnail
  // No Expandido o card é claro nos dois estilos, então a cor diluída da
  // miniatura vazia se mistura sempre no branco dele.
  const emptyStyle = cleanEmpty
    ? { background: `color-mix(in srgb, ${look.color} 9%, var(--wk-card-surface))` }
    : folder && !item.thumbnail
      ? { background: `linear-gradient(${folderTint(item.name)}, ${folderTint(item.name)}), var(--wk-card-surface)` }
      : undefined
  return (
    <div
      role="listitem"
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
      <button type="button" onClick={() => onOpen(item)} aria-label={item.name} className={OVERLAY} />
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
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : cleanEmpty ? (
          <Icon name={look.icon} size={56} weight={300} color={look.color} className="opacity-60" />
        ) : (
          <Icon
            name={folder ? 'folder' : 'dashboard'}
            size={48}
            filled
            color={folder ? folderTone(item.name) : 'var(--wk-dashboard-icon-soft)'}
          />
        )}
      </div>
      <div
        className={`flex items-center gap-3 ${isClean(style) ? (style === 'referencia' ? 'px-5' : 'pl-4 pr-2') : 'pl-4 pr-2'}`}
        style={{ height: isClean(style) ? cleanTileHeight(style) : TILE_HEIGHT }}
      >
        <TileBody
          item={item}
          favorite={favorite}
          quietFavorite={quietFavorite}
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
  const common = { onOpen, onToggleFavorite, quietFavorite: quietFavorites }

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
