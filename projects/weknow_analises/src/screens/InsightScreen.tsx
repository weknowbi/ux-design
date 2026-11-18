import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Btn } from '@ds/Btn'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { AppShell } from '@/components/AppShell'
import { Markdown } from '@/components/Markdown'
import { Dropdown } from '@/components/browser/Menu'
import type { PortalRoute } from '@/components/PortalSidebar'
import { AtendimentosCanvas, CANVAS_H, CANVAS_W } from '@/components/dashboard/AtendimentosCanvas'
import { CURRENT_USER } from '@/data/account'
import { USERS } from '@/data/settings'
import { analyzeMoment, momentTab, momentWhen } from '@/engine/moment'
import { conversationFor } from '@/lib/conversations'
import { addComment, ago, updateInsight, useInsights, type Insight, type ShareRole } from '@/lib/insights'
import { go } from '@/lib/router'

/**
 * Uma análise salva: o que era a Análise inteligente, agora um objeto do
 * dashboard. É a página de quem lê, escreve e comenta, e não uma conversa:
 *
 *   título      editável, como o nome de um dashboard
 *   momento     o dashboard como estava (aba, filtros, hora), clicável para
 *               abrir o dashboard na mesma aba
 *   texto       da IA ou da pessoa; quem tem acesso edita
 *   lado        comentários e quem tem acesso
 *
 * A IA aparece em dois lugares só: "Escrever com a IA" (o rascunho da análise
 * automática, quando o texto está vazio) e "Perguntar no Weknow Ask", que
 * abre a conversa com o mesmo momento. A conversa não entra aqui: quem
 * recebe a análise compartilhada quer ler e comentar, e não um chat.
 */

const COLUMN = 720
const SIDE = 320

export function InsightScreen({ id, onRoute }: { id: string; onRoute: (r: PortalRoute) => void }) {
  const all = useInsights()
  const it = all.find((i) => i.id === id)

  return (
    <AppShell
      route="portal"
      onNavigate={onRoute}
      trail={[
        { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => go(null) },
        ...(it ? [{ label: it.moment.dashboardName, onClick: () => go(`/dashboard/${it.moment.dashboard}`) }, { label: it.title }] : [{ label: 'Análise' }]),
      ]}
      search={{ value: '', onChange: () => {}, placeholder: 'Pesquise por nome ou tag', hidden: true }}
    >
      {it ? (
        <Page key={it.id} it={it} />
      ) : (
        <p style={{ fontFamily: FONT, padding: 24, fontSize: 14, color: COLOR.textSecondary }}>Esta análise foi excluída.</p>
      )}
    </AppShell>
  )
}

function Page({ it }: { it: Insight }) {
  const [editing, setEditing] = useState(!it.text)
  const ask = () => go(`/ia/${conversationFor(it)}`)
  const byLine = it.by === 'ia' ? `Escrita pelo Weknow Ask, a pedido de ${it.author}` : `Escrita por ${it.author}`

  return (
    <div className="mx-auto w-full flex flex-wrap items-start" style={{ fontFamily: FONT, maxWidth: COLUMN + SIDE + 48 + 32, padding: '24px 24px 64px', gap: 32 }}>
      <article className="flex flex-col" style={{ flex: `1 1 ${COLUMN / 1.6}px`, maxWidth: COLUMN, minWidth: 0, gap: 16 }}>
        <Title it={it} />
        <div className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
          <Icon name={it.by === 'ia' ? 'auto_awesome' : 'person'} size={16} color={COLOR.navLabel} />
          <span>
            {byLine} · {ago(it.updatedAt)}
          </span>
        </div>
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          <Btn variant="outlined" size="sm" iconLeft="forum" onClick={ask}>
            Perguntar no Weknow Ask
          </Btn>
          <Share it={it} />
          {!editing && (
            <Btn variant="ghost" size="sm" iconLeft="edit" onClick={() => setEditing(true)}>
              Editar texto
            </Btn>
          )}
        </div>
        <MomentCard it={it} />
        {editing ? <Editor it={it} onDone={() => setEditing(false)} /> : <Markdown text={it.text} />}
      </article>
      <aside className="flex flex-col" style={{ flex: `0 1 ${SIDE}px`, minWidth: 260, gap: 24 }}>
        <Comments it={it} />
      </aside>
    </div>
  )
}

function Title({ it }: { it: Insight }) {
  const [value, setValue] = useState(it.title)
  useEffect(() => setValue(it.title), [it.title])
  const commit = () => {
    const v = value.trim()
    if (v && v !== it.title) updateInsight(it.id, { title: v })
    else setValue(it.title)
  }
  return (
    <input
      aria-label="Título da análise"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setValue(it.title)
          requestAnimationFrame(() => e.currentTarget?.blur())
        }
      }}
      className="wk-title-input w-full"
      style={{ fontSize: 26, lineHeight: '36px', fontWeight: 600, color: COLOR.text }}
    />
  )
}

/** O dashboard como estava: o painel daquela aba, em miniatura, e o que congela o momento. */
function MomentCard({ it }: { it: Insight }) {
  const m = it.moment
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / CANVAS_W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  /* Mostra a parte de cima do painel: os números do dia e o comparativo. */
  const shown = 0.62
  return (
    <button
      type="button"
      onClick={() => go(`/dashboard/${m.dashboard}/aba/${m.tab}`)}
      className="wk-moment group w-full text-left flex flex-col overflow-hidden"
      aria-label={`Abrir o ${m.dashboardName} na aba ${m.tabName}`}
    >
      <div ref={box} className="relative w-full overflow-hidden" style={{ height: CANVAS_H * shown * scale, background: '#FFFFFF' }}>
        {scale > 0 && (
          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }} aria-hidden>
            <AtendimentosCanvas tab={momentTab(m)} />
          </div>
        )}
        <span className="wk-moment-open">
          <Icon name="open_in_new" size={16} color="currentColor" />
          Abrir nesta aba
        </span>
      </div>
      <div className="flex flex-wrap items-center" style={{ gap: '4px 16px', padding: '10px 14px', borderTop: `1px solid ${COLOR.border}` }}>
        <span className="flex items-center" style={{ gap: 6, fontSize: 13, lineHeight: '18px', fontWeight: 600, color: COLOR.text }}>
          <Icon name="photo_camera" size={16} color={COLOR.navLabel} />
          Momento registrado
        </span>
        <span style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
          Aba {m.tabName} · {momentWhen(m)} · {m.filters.join(' · ')}
        </span>
      </div>
    </button>
  )
}

function Editor({ it, onDone }: { it: Insight; onDone: () => void }) {
  const [text, setText] = useState(it.text)
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(200, el.scrollHeight)}px`
  }, [text])
  useEffect(() => ref.current?.focus(), [])
  const draft = () => setText(analyzeMoment(it.moment).text)
  const save = () => {
    updateInsight(it.id, { text: text.trim() })
    if (text.trim()) onDone()
  }
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <textarea
        ref={ref}
        aria-label="Texto da análise"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escreva o que você viu neste momento: o que chamou atenção, a hipótese e o que fazer."
        className="wk-field w-full"
        style={{ fontSize: 15, lineHeight: '24px', padding: '12px 14px', resize: 'none' }}
      />
      <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
        <Btn size="sm" onClick={save} disabled={!text.trim() && !it.text}>
          Salvar
        </Btn>
        {it.text && (
          <Btn variant="ghost" size="sm" onClick={onDone}>
            Cancelar
          </Btn>
        )}
        {!text.trim() && (
          <Btn variant="outlined" size="sm" iconLeft="auto_awesome" onClick={draft}>
            Escrever com a IA
          </Btn>
        )}
        <span style={{ fontSize: 12, lineHeight: '16px', color: COLOR.textSecondary }}>**negrito** e listas com “-” funcionam.</span>
      </div>
    </div>
  )
}

function Initials({ name, size = 28 }: { name: string; size?: number }) {
  const parts = name.split(',')[0].trim().split(/\s+/)
  const ini = `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase()
  return (
    <span className="shrink-0 flex items-center justify-center rounded-full" style={{ width: size, height: size, fontSize: size * 0.42, fontWeight: 600, background: COLOR.tint, color: COLOR.primaryDeep }} aria-hidden>
      {ini}
    </span>
  )
}

function Comments({ it }: { it: Insight }) {
  const [text, setText] = useState('')
  const send = () => {
    if (!text.trim()) return
    addComment(it.id, text.trim())
    setText('')
  }
  return (
    <section className="flex flex-col" style={{ gap: 12 }} aria-label="Comentários">
      <h2 style={{ margin: 0, fontSize: 15, lineHeight: '20px', fontWeight: 600, color: COLOR.text }}>
        Comentários{it.comments.length > 0 && <span style={{ fontWeight: 400, color: COLOR.textSecondary }}> · {it.comments.length}</span>}
      </h2>
      {it.comments.length === 0 && <p style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>Ninguém comentou ainda.</p>}
      <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 14 }}>
        {it.comments.map((c) => (
          <li key={c.id} className="flex" style={{ gap: 10 }}>
            <Initials name={c.author} />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, lineHeight: '18px' }}>
                <span style={{ fontWeight: 600, color: COLOR.text }}>{c.author}</span>
                <span style={{ color: COLOR.textSecondary }}> · {ago(c.at)}</span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 14, lineHeight: '20px', color: COLOR.text, whiteSpace: 'pre-wrap' }}>{c.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col" style={{ gap: 8 }}>
        <textarea
          aria-label="Escrever um comentário"
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Comentar…"
          className="wk-field w-full"
          style={{ fontSize: 14, lineHeight: '20px', padding: '8px 12px', resize: 'none' }}
        />
        <div>
          <Btn size="sm" variant="outlined" onClick={send} disabled={!text.trim()}>
            Comentar
          </Btn>
        </div>
      </div>
    </section>
  )
}

const ROLES: ShareRole[] = ['pode ver', 'pode comentar']
const ROLE_LABEL: Record<ShareRole, string> = { 'pode ver': 'Pode ver', 'pode comentar': 'Pode comentar' }

/** Compartilhar: quem tem acesso e o que pode fazer, como na Análise avançada. */
function Share({ it }: { it: Insight }) {
  const [q, setQ] = useState('')
  const has = (email: string) => it.shared.some((s) => s.email === email)
  const people = USERS.filter((u) => u.active && u.email !== CURRENT_USER.email && !has(u.email) && u.name.toLowerCase().includes(q.toLowerCase()) && !/^(admin|analista)$/i.test(u.name)).slice(0, 5)
  const add = (name: string, email: string) => {
    updateInsight(it.id, { shared: [...it.shared, { name: name.split(',')[0], email, role: 'pode comentar' }] })
    setQ('')
  }
  const others = it.shared.filter((s) => s.email !== CURRENT_USER.email)
  return (
    <Dropdown
      align="left"
      minWidth={320}
      onClose={() => setQ('')}
      trigger={({ toggle }) => (
        <Btn variant="outlined" size="sm" iconLeft="person_add" onClick={toggle}>
          {others.length ? `Compartilhada com ${others.length}` : 'Compartilhar'}
        </Btn>
      )}
    >
      {() => (
        <div className="flex flex-col" style={{ fontFamily: FONT, width: 320, padding: 8, gap: 8 }}>
          <input autoFocus aria-label="Adicionar pessoa" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adicionar pelo nome" className="wk-field w-full" style={{ fontSize: 14, lineHeight: '20px', padding: '7px 10px' }} />
          {q && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {people.map((u) => (
                <li key={u.email}>
                  <button type="button" onClick={() => add(u.name, u.email)} className="w-full text-left flex items-center rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]" style={{ gap: 8, padding: '6px 6px' }}>
                    <Initials name={u.name} size={24} />
                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, color: COLOR.text }}>
                      {u.name.split(',')[0]}
                    </span>
                  </button>
                </li>
              ))}
              {people.length === 0 && <li style={{ fontSize: 13, color: COLOR.textSecondary, padding: '4px 6px' }}>Ninguém com esse nome.</li>}
            </ul>
          )}
          <div style={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLOR.textSecondary, padding: '4px 2px 0' }}>Com acesso</div>
          <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }}>
            <li className="flex items-center" style={{ gap: 8 }}>
              <Initials name={it.author} size={24} />
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, color: COLOR.text }}>
                {it.author}
              </span>
              <span style={{ fontSize: 13, color: COLOR.textSecondary }}>Proprietário</span>
            </li>
            {it.shared
              .filter((s) => s.name !== it.author)
              .map((s) => (
                <li key={s.email} className="flex items-center" style={{ gap: 8 }}>
                  <Initials name={s.name} size={24} />
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, color: COLOR.text }}>
                    {s.email === CURRENT_USER.email ? `${s.name} (você)` : s.name}
                  </span>
                  <select
                    aria-label={`Permissão de ${s.name}`}
                    value={s.role}
                    onChange={(e) => updateInsight(it.id, { shared: it.shared.map((x) => (x.email === s.email ? { ...x, role: e.target.value as ShareRole } : x)) })}
                    className="wk-field"
                    style={{ fontSize: 13, padding: '3px 6px' }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Dropdown>
  )
}
