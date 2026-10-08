import { useMemo, useState, type ReactNode } from 'react'
import { COLOR, FONT, TABLE } from '@/design/tokens'
import { useIsMobile } from '@/design/viewport'
import { AppShell } from '@/components/AppShell'
import { Btn as Button } from '@ds/Btn'
import { FolderHeader } from '@/components/FolderHeader'
import { FilterChip, SearchField } from '@/components/Hero'
import { Icon } from '@/components/icons'
import { Chip, ChipList, CELL_STYLE, DataTable, MUTED_CELL_STYLE, type Column } from '@/components/settings/DataTable'
import {
  CONTACT_GROUPS,
  SETTINGS_PAGES,
  USERS,
  USER_GROUPS,
  countContactGroup,
  countUserGroup,
  findSettingsPage,
  type ContactGroup,
  type User,
  type UserGroup,
} from '@/data/settings'
import { normalize } from '@/lib/format'
import { go } from '@/lib/router'
import type { Crumb } from '@/components/Header'
import type { PortalRoute } from '@/components/PortalSidebar'

const CONTENT_WIDTH = 1159

const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const formatDate = (iso?: string) => (iso ? DATE.format(new Date(`${iso}T12:00:00`)) : undefined)

/**
 * Situação — um ponto e uma palavra, no lugar da coluna "Ativo: Sim" da tela
 * em produção.
 *
 * "Sim" obriga a ler o rótulo da coluna para saber sim ao quê, e vinte e seis
 * "Sim" iguais empilhados não deixam o caso raro — o usuário desligado —
 * saltar aos olhos, que é a única razão de a coluna existir. O ponto colorido
 * faz esse trabalho de relance; a palavra fica para quem não distingue as
 * cores, porque cor sozinha não é informação.
 */
function Status({ active, title }: { active: boolean; title?: string }) {
  return (
    <span className="flex items-center gap-2 min-w-0" title={title}>
      <span
        className="shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: active ? COLOR.ok : COLOR.textMuted }}
      />
      <span className="truncate" style={active ? CELL_STYLE : MUTED_CELL_STYLE}>
        {active ? 'Ativo' : 'Inativo'}
      </span>
    </span>
  )
}

/** Nome em cima, e-mail embaixo: o e-mail é o que identifica de fato quem é. */
function NameCell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <span className="flex flex-col min-w-0">
      <span className="truncate font-medium" style={CELL_STYLE} title={title}>
        {title}
      </span>
      {subtitle && (
        <span
          className="truncate text-[12px] leading-[16px]"
          style={{ fontFamily: FONT, color: COLOR.textMuted }}
          title={subtitle}
        >
          {subtitle}
        </span>
      )}
    </span>
  )
}

/** Editar e excluir — a coluna "Ações" do Weknow, revelada no hover da linha. */
function RowActions({ label }: { label: string }) {
  return (
    <>
      <button
        type="button"
        title={`Editar ${label}`}
        aria-label={`Editar ${label}`}
        className="wk-icon-btn flex items-center justify-center size-8"
      >
        <Icon name="edit" size={20} color={COLOR.navLabel} />
      </button>
      <button
        type="button"
        title={`Excluir ${label}`}
        aria-label={`Excluir ${label}`}
        /* Cinza em repouso, vermelho ao mirar. No celular as ações ficam
           sempre à vista, e vinte e seis lixeiras vermelhas empilhadas
           desenham uma coluna de alarme ao lado de gente que não tem nada de
           errado — o aviso pertence ao momento do clique, não à lista. */
        className="wk-icon-btn flex items-center justify-center size-8 text-[var(--wk-text-icon)] hover:text-[var(--wk-danger)] hover:bg-[color-mix(in_srgb,var(--wk-danger)_10%,transparent)]"
      >
        <Icon name="delete" size={20} color="currentColor" />
      </button>
    </>
  )
}

/* ------------------------------------------------------------------ usuários */

const USER_COLUMNS: Column<User>[] = [
  {
    key: 'code',
    label: 'Código',
    width: '48px',
    from: 'lg',
    cell: (u) => <span style={MUTED_CELL_STYLE}>{u.code}</span>,
  },
  {
    key: 'user',
    label: 'Usuário',
    width: 'minmax(180px, 2.4fr)',
    cell: (u) => <NameCell title={u.name} subtitle={u.email} />,
  },
  {
    key: 'status',
    label: 'Situação',
    width: '92px',
    cell: (u) => (
      <Status
        active={u.active}
        title={u.lastSeen ? `Último acesso em ${formatDate(u.lastSeen.slice(0, 10))}` : 'Nunca acessou'}
      />
    ),
  },
  {
    key: 'roles',
    label: 'Papéis',
    width: 'minmax(140px, 1.8fr)',
    cell: (u) => <ChipList items={u.roles} budget={18} />,
  },
  {
    key: 'userGroups',
    label: 'Grupos de usuário',
    width: 'minmax(120px, 1.2fr)',
    from: 'lg',
    cell: (u) => <ChipList items={u.userGroups} budget={14} />,
  },
  {
    key: 'contactGroups',
    label: 'Grupos de contato',
    width: 'minmax(120px, 1.2fr)',
    from: '2xl',
    cell: (u) => <ChipList items={u.contactGroups} budget={14} />,
  },
  {
    key: 'expires',
    label: 'Expira em',
    width: '88px',
    from: 'xl',
    /* Vazio vira travessão, e não célula em branco: em branco não se sabe se
       não expira ou se ninguém preencheu. */
    cell: (u) => <span style={MUTED_CELL_STYLE}>{formatDate(u.expiresAt) ?? '—'}</span>,
  },
]

/** Celular: a linha vira bloco, com o que se procura em cima. */
function UserCard({ u }: { u: User }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <NameCell title={u.name} subtitle={u.email} />
        </div>
        <Status active={u.active} />
      </div>
      <ChipList items={u.roles} wrap />
    </div>
  )
}

/* -------------------------------------------------------------------- grupos */

const USER_GROUP_COLUMNS: Column<UserGroup>[] = [
  {
    key: 'group',
    label: 'Grupo',
    width: 'minmax(200px, 2.4fr)',
    cell: (g) => <NameCell title={g.name} subtitle={g.description} />,
  },
  {
    key: 'people',
    label: 'Usuários',
    width: '84px',
    cell: (g) => <span style={CELL_STYLE}>{countUserGroup(g.name)}</span>,
  },
  {
    key: 'scope',
    label: 'Acesso a',
    /* Sem ponto de quebra: é o dado que diferencia um grupo do outro. Como
       coluna opcional, abaixo de 1024 sobrava o nome ocupando 400px e um
       número solto no meio do vazio. */
    width: 'minmax(160px, 2fr)',
    cell: (g) => <ChipList items={g.scope} budget={24} />,
  },
  {
    key: 'created',
    label: 'Criado em',
    width: '96px',
    from: 'xl',
    cell: (g) => <span style={MUTED_CELL_STYLE}>{formatDate(g.createdAt)}</span>,
  },
]

const CONTACT_GROUP_COLUMNS: Column<ContactGroup>[] = [
  {
    key: 'group',
    label: 'Grupo',
    width: 'minmax(200px, 2.4fr)',
    cell: (g) => <NameCell title={g.name} subtitle={g.description} />,
  },
  {
    key: 'people',
    label: 'Contatos',
    width: '84px',
    cell: (g) => <span style={CELL_STYLE}>{countContactGroup(g.name)}</span>,
  },
  {
    key: 'schedule',
    label: 'Envio',
    width: 'minmax(160px, 2fr)',
    cell: (g) => <Chip label={g.schedule} />,
  },
  {
    key: 'created',
    label: 'Criado em',
    width: '96px',
    from: 'xl',
    cell: (g) => <span style={MUTED_CELL_STYLE}>{formatDate(g.createdAt)}</span>,
  },
]

/* --------------------------------------------------------------------- tela */

type Content = 'users' | 'user-groups' | 'contact-groups' | 'stub'

function contentOf(pageId: string): Content {
  if (pageId === 'usuarios') return 'users'
  if (pageId === 'grupos-de-usuarios') return 'user-groups'
  if (pageId === 'grupos-de-contato') return 'contact-groups'
  return 'stub'
}

export function SettingsPageScreen({ pageId, onRoute }: { pageId: string; onRoute: (route: PortalRoute) => void }) {
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const page = findSettingsPage(pageId)
  const q = normalize(query.trim())

  const users = useMemo(
    () => USERS.filter((u) => !q || normalize(`${u.name} ${u.email} ${u.userGroups.join(' ')}`).includes(q)),
    [q],
  )
  const userGroups = useMemo(
    () => USER_GROUPS.filter((g) => !q || normalize(`${g.name} ${g.description}`).includes(q)),
    [q],
  )
  const contactGroups = useMemo(
    () => CONTACT_GROUPS.filter((g) => !q || normalize(`${g.name} ${g.description}`).includes(q)),
    [q],
  )

  if (!page) {
    go('/configuracoes')
    return null
  }

  const content = contentOf(page.id)
  const siblings = (page.siblings ?? []).map((id) => SETTINGS_PAGES.find((p) => p.id === id)!).filter(Boolean)

  const trail: Crumb[] = [
    { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => onRoute('portal') },
    { label: 'Configurações', onClick: () => go('/configuracoes') },
    { label: page.name },
  ]

  const table: Record<Content, { node: ReactNode; action?: string }> = {
    users: {
      action: 'Novo usuário',
      node: (
        <DataTable
          rows={users}
          columns={USER_COLUMNS}
          rowKey={(u) => u.code}
          mobile={isMobile}
          card={(u) => <UserCard u={u} />}
          actions={(u) => <RowActions label={u.name} />}
          empty={q ? 'Nenhum usuário com esse nome.' : 'Nenhum usuário cadastrado.'}
        />
      ),
    },
    'user-groups': {
      action: 'Novo grupo',
      node: (
        <DataTable
          rows={userGroups}
          columns={USER_GROUP_COLUMNS}
          rowKey={(g) => g.id}
          mobile={isMobile}
          card={(g) => <NameCell title={g.name} subtitle={g.description} />}
          actions={(g) => <RowActions label={g.name} />}
          empty="Nenhum grupo com esse nome."
        />
      ),
    },
    'contact-groups': {
      action: 'Novo grupo',
      node: (
        <DataTable
          rows={contactGroups}
          columns={CONTACT_GROUP_COLUMNS}
          rowKey={(g) => g.id}
          mobile={isMobile}
          card={(g) => <NameCell title={g.name} subtitle={g.description} />}
          actions={(g) => <RowActions label={g.name} />}
          empty="Nenhum grupo com esse nome."
        />
      ),
    },
    stub: { node: <Stub name={page.name} description={page.description} icon={page.icon} /> },
  }

  const current = table[content]
  const searchable = content !== 'stub'

  /**
   * A busca da tela assume a barra de topo, como acontece dentro de uma pasta
   * do portal. Ver a explicação longa em `SettingsScreen`: duas pílulas de
   * busca idênticas a sessenta pixels uma da outra, sem alinhar por lado
   * nenhum, faziam o olho parar para decidir qual delas servia.
   *
   * O que fica na linha do título é só a ação — "Novo usuário", que é a razão
   * de a tela existir e não tem outro lugar onde caiba.
   */
  const search = searchable
    ? { value: query, onChange: setQuery, placeholder: `Pesquise em ${page.name}` }
    : undefined

  const header = (
    <>
      <FolderHeader
        name={page.name}
        icon={page.icon}
        onBack={() => go('/configuracoes')}
        compact={isMobile}
        aside={!isMobile && current.action ? <Button iconLeft="add">{current.action}</Button> : undefined}
      />

      {/* As três telas de cadastro de gente são irmãs, e trocar entre elas é o
          que mais se faz aqui — criar um grupo depois de criar o usuário.
          Com chip, a troca custa um clique; passando pelo índice, custa dois e
          uma tela inteira no meio. São os mesmos chips das áreas do portal: o
          mesmo gesto, o mesmo desenho. */}
      {siblings.length > 1 && (
        <div className="flex gap-2 md:gap-3 mb-4 overflow-x-auto wk-no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {siblings.map((s) => (
            <FilterChip
              key={s.id}
              icon={s.icon}
              label={s.name}
              active={s.id === page.id}
              onSelect={() => {
                setQuery('')
                go(`/configuracoes/${s.id}`)
              }}
            />
          ))}
        </div>
      )}

      {/* No celular a barra de topo não tem busca — lá ela fica no corpo, ao
          lado da ação. O rótulo do botão encurta: "Novo usuário" mais o campo
          não cabem em 375px, e ao lado de um campo que diz "Pesquise em
          Usuários" o "Novo" não fica ambíguo. */}
      {isMobile && (searchable || current.action) && (
        <div className="flex items-center gap-2 mb-4">
          {searchable && (
            <div className="flex-1 min-w-0">
              <SearchField query={query} onQuery={setQuery} placeholder={`Pesquise em ${page.name}`} />
            </div>
          )}
          {current.action && <Button iconLeft="add">Novo</Button>}
        </div>
      )}
    </>
  )

  return (
    <AppShell
      route="configuracoes"
      onNavigate={onRoute}
      trail={trail}
      search={isMobile ? undefined : search}
    >
      {isMobile ? (
        <div className="flex flex-col px-4 pt-4 pb-16">
          {header}
          {current.node}
        </div>
      ) : (
        <div className="mx-auto flex flex-col px-8 pt-8 pb-24" style={{ maxWidth: CONTENT_WIDTH }}>
          {header}
          {current.node}
        </div>
      )}
    </AppShell>
  )
}

/**
 * Tela ainda não desenhada. Diz isso com todas as letras em vez de mostrar
 * uma tabela vazia: tabela vazia parece cadastro sem registro, e quem vê
 * conclui que o sistema perdeu os dados.
 */
function Stub({ name, description, icon }: { name: string; description: string; icon: string }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl px-6 py-16 text-center"
      style={{ border: `1px solid ${TABLE.border}` }}
    >
      <Icon name={icon} size={32} color={COLOR.textMuted} />
      <p className="text-[15px] font-medium" style={{ fontFamily: FONT, color: COLOR.text }}>
        {name}
      </p>
      <p className="max-w-[420px] text-[13px] leading-[20px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
        {description} Esta tela ainda não foi redesenhada nesta maquete.
      </p>
    </div>
  )
}
