import { Fragment, useContext, useMemo, type ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { PRESENTATIONS, TASKS, flatten, stats, type Entry, type Folder, type Item } from '@/data/portal'
import { describeCounts, normalize } from '@/lib/format'
import { sortItems, type BrowserPrefs, type ViewMode } from '@/components/browser/prefs'
import { FADE, HIDDEN } from '@/components/Hero'
import { Icon } from '@/components/icons'
import { CardStyleContext, ItemCollection, type Columns, type Listed } from '@/components/browser/Items'
import type { SectionId } from '@/components/Hero'

/**
 * Cada área de conteúdo chama as colunas do seu jeito, como no Weknow: Pastas
 * lista nome e o que tem dentro; Tarefas e Apresentações são listas planas,
 * com um código curto que o cliente usa para se referir ao item.
 */
const SECTION_COLUMNS: Record<SectionId, Columns> = {
  pastas: { name: 'Nome', meta: 'Detalhes' },
  tarefas: { name: 'Descrição', meta: 'Código' },
  apresentacoes: { name: 'Nome da apresentação', meta: 'Código' },
}

/** Contexto de um item fora do lugar dele: só a pasta onde ele mora. */
const parentLabel = (path: Folder[]) => (path.length ? path[path.length - 1].name : 'Pastas')

/**
 * Seção: o título fica colado aos próprios itens (8px) e longe da seção
 * anterior (40px) — o espaço é que agrupa, sem caixa nem cartão em volta. O
 * ícone identifica o tipo, como no Weknow, e o título vem no tom de texto
 * cheio para mandar mais que os rótulos de coluna da lista, que são 11px
 * apagados.
 */
function Section({
  label,
  icon,
  iconColor,
  aside,
  children,
}: {
  label: string
  icon: string
  iconColor: string
  aside?: ReactNode
  children: ReactNode
}) {
  // Só a Referência Márcio traz o título de seção do modelo; nos Cards limpos
  // ele é o mesmo do resto do portal — ali o card mudou, a seção não.
  const clean = useContext(CardStyleContext) === 'referencia'
  return (
    <section className={`flex flex-col ${clean ? 'gap-3' : 'gap-2'}`}>
      <div className="flex items-center gap-4 min-h-[28px]">
        {clean ? (
          // Referência Márcio: o título de seção fala a língua do card — negrito e
          // o mesmo grafite do título dele, sem caixa alta; ícone em traço, como o
          // da pasta no cabeçalho do modelo. A estrela segue cheia e amarela:
          // é ela que diz "favorito" em todo o resto da interface.
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Icon
              name={icon}
              size={20}
              weight={400}
              filled={icon === 'star'}
              color={icon === 'star' ? iconColor : 'var(--wk-card-title)'}
              className="shrink-0"
            />
            <h3
              className="text-[15px] font-bold leading-[22px]"
              style={{ fontFamily: FONT, color: 'var(--wk-card-title)' }}
            >
              {label}
            </h3>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <Icon name={icon} size={24} filled color={iconColor} className="shrink-0" />
            <h3 className="text-[15px] font-semibold leading-[22px]" style={{ fontFamily: FONT, color: COLOR.text }}>
              {label}
            </h3>
          </div>
        )}
        {aside}
      </div>
      {children}
    </section>
  )
}

/**
 * Metadado da coluna da Lista:
 * - pasta: o que ela contém;
 * - dashboard fora do lugar dele (favoritos, busca): a pasta onde mora.
 */
function metaFor(entry: Entry, view: ViewMode, withContext: boolean): string | undefined {
  if (view !== 'list') return undefined
  const { item, path } = entry
  if (item.kind === 'folder') return describeCounts(stats(item))
  return withContext ? parentLabel(path) : undefined
}

export function ContentBrowser({
  root,
  path,
  query,
  favorites,
  prefs,
  section,
  controls,
  controlsHidden,
  onNavigate,
  onToggleFavorite,
}: {
  root: Folder
  path: Folder[]
  query: string
  favorites: Set<string>
  prefs: BrowserPrefs
  /** Área de conteúdo aberta: Pastas, Tarefas ou Apresentações. */
  section: SectionId
  /** Ordenação e visualização, quando é o browser que os mostra. */
  controls?: ReactNode
  /** Os controles subiram para a barra do topo; aqui eles só esmaecem. */
  controlsHidden?: boolean
  onNavigate: (id: string | null) => void
  onToggleFavorite: (id: string) => void
}) {
  const all = useMemo(() => flatten(root), [root])
  const q = normalize(query.trim())
  const current = path.length ? path[path.length - 1] : root

  const open = (item: Item) => {
    if (item.kind === 'folder') onNavigate(item.id)
  }

  const asideControls = controls ? (
    <div className={`${FADE} ${controlsHidden ? HIDDEN : ''}`}>{controls}</div>
  ) : undefined

  /* Tarefas e Apresentações são listas planas: nada de pasta, favorito ou
     seção — só a mesma anatomia de lista com outros rótulos de coluna. */
  if (section !== 'pastas') {
    const source = section === 'tarefas' ? TASKS : PRESENTATIONS
    const found = source.filter((item) => !q || normalize(item.name).includes(q))
    const entries: Listed[] = sortItems(found, prefs.sort, prefs.dir).map((item) => ({ item, meta: item.code }))
    return (
      <div className="flex flex-col gap-8">
        {entries.length ? (
          <ItemCollection
            entries={entries}
            view="list"
            favorites={favorites}
            columns={SECTION_COLUMNS[section]}
            headerAside={asideControls}
            onOpen={open}
            onToggleFavorite={onToggleFavorite}
          />
        ) : (
          <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
            {q ? 'Nada com esse nome por aqui.' : 'Nada cadastrado ainda.'}
          </p>
        )}
      </div>
    )
  }

  const toListed = (entries: Entry[], withContext: boolean, view: ViewMode): Listed[] => {
    const byItem = new Map(entries.map((e) => [e.item, e]))
    return sortItems(
      entries.map((e) => e.item),
      prefs.sort,
      prefs.dir,
    ).map((item) => {
      const entry = byItem.get(item)!
      return {
        item,
        meta: metaFor(entry, view, withContext),
        // Fora da Lista, a origem vai para o tooltip do card (Favoritos, busca).
        context: withContext && view !== 'list' ? parentLabel(entry.path) : undefined,
      }
    })
  }

  const entries: Entry[] = q
    ? all.filter((e) => normalize(e.item.name).includes(q))
    : current.children.map((item) => ({ item, path }))
  const withContext = Boolean(q)
  /* Conteúdo todo junto, sem separar pasta de dashboard: dentro de pasta
     sempre, como no Weknow, e na Lista também na raiz — ali o ícone, a coluna
     Detalhes e o chevron já dizem o que é cada linha, e dois blocos só
     afastavam o usuário do que ele procura. Nas visualizações de card a raiz
     mantém as seções, que ali fazem o papel de sumário; a busca também, porque
     o resultado vem de pastas diferentes. */
  const flat = !q && (path.length > 0 || prefs.view === 'list')
  /* Na Lista não há seção de Favoritos: eles ficam no meio da própria lista,
     marcados pela estrela. Uma faixa de cards em cima repetia os mesmos itens
     que apareciam logo abaixo e empurrava a tabela para fora da tela. Nas
     visualizações de card a seção continua, porque ali ela é o atalho. */
  const folders = toListed(entries.filter((e) => e.item.kind === 'folder'), withContext, prefs.view)
  const dashboards = toListed(entries.filter((e) => e.item.kind === 'dashboard'), withContext, prefs.view)
  const favs =
    !q && path.length === 0 && prefs.view !== 'list'
      ? toListed(all.filter((e) => favorites.has(e.item.id)), true, prefs.view)
      : []

  const collection = { favorites, onOpen: open, onToggleFavorite }

  type Group = { label?: string; icon?: string; iconColor?: string; entries: Listed[]; view: ViewMode }

  const sections: Group[] = flat
    ? [{ entries: toListed(entries, withContext, prefs.view), view: prefs.view }]
    : (
        [
          { label: 'Favoritos', icon: 'star', iconColor: 'var(--wk-star)', entries: favs, view: prefs.view },
          { label: 'Pastas', icon: 'folder', iconColor: COLOR.navLabel, entries: folders, view: prefs.view },
          {
            label: 'Dashboards',
            icon: 'dashboard',
            iconColor: 'var(--wk-dashboard-icon)',
            entries: dashboards,
            view: prefs.view,
          },
        ] as Group[]
      ).filter((s) => s.entries.length > 0)

  const firstList = sections.findIndex((s) => s.view === 'list')
  /** Há título de seção para receber os controles? Na Lista solta, não há. */
  const titled = sections.some((s) => s.label)
  const empty = folders.length + dashboards.length === 0

  return (
    <div className="flex flex-col gap-8">
{q && (
        <h2
          className="text-[15px] font-semibold leading-[24px] min-h-[28px] -mb-4"
          style={{ fontFamily: FONT, color: COLOR.text }}
        >
          Resultados para “{query.trim()}”
        </h2>
      )}

      <div className="flex flex-col gap-10">
        {/* Os controles ficam na primeira linha de seção; sem seção nenhuma
            — a Lista solta, sem títulos —, eles vão para a linha do cabeçalho
            de colunas. Nos dois casos sem gastar uma faixa própria de altura. */}
        {sections.map((s, i) => {
          // Cabeçalho de colunas uma vez só: as seções seguintes continuam
          // dentro da mesma grade, como divisores.
          const items = (
            <ItemCollection
              entries={s.entries}
              view={s.view}
              showHeader={i === firstList}
              headerAside={!titled && i === firstList ? asideControls : undefined}
              quietFavorites={favs.length > 0 && s.label !== 'Favoritos'}
              {...collection}
            />
          )
          if (!s.label) return <Fragment key="tudo">{items}</Fragment>
          return (
            <Section
              key={s.label}
              label={s.label}
              icon={s.icon!}
              iconColor={s.iconColor!}
              aside={i === 0 ? asideControls : undefined}
            >
              {items}
            </Section>
          )
        })}
        {empty && (
          <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
            {q ? 'Nenhuma pasta ou dashboard com esse nome.' : 'Esta pasta está vazia.'}
          </p>
        )}
      </div>
    </div>
  )
}
