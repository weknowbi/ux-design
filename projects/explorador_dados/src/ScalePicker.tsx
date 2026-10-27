import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBtn } from '@ds/Btn'
import { Icon } from '@ds/icons'
import { Switch } from '@ds/Switch'
import { COLOR } from '@ds/tokens'
import { DEFAULT_SCALE, GROUP_LABEL, type Scale } from './scales'

/**
 * Painel "Cor" do quadro "Resultado".
 *
 * Em cima, "Colorir cada ponto", o mesmo nome e o mesmo efeito da opção do
 * editor de gráfico: ligado, cada categoria ganha uma cor da escala;
 * desligado (o padrão, como hoje), a série inteira fica na 1ª cor.
 *
 * Embaixo, as escalas que o Weknow já tem, nos mesmos três grupos do seletor
 * do editor de gráfico, mais a cor padrão de hoje no topo (é a que vem
 * marcada: visão antiga continua igual até alguém escolher outra coisa).
 *
 * Sem prévia: o clique (ou Enter) aplica e o gráfico redesenha na hora. O
 * mouse e as setas só destacam a linha. O painel continua aberto depois da
 * escolha; Esc ou o X fecham.
 *
 * Desenho pelo design system: painel de página (fio --wk-border, raio 8),
 * Switch na linha de preferência (Inter 14, controle na ponta), busca de
 * lista (38, raio 8, borda de controle, lupa à direita), opção do Select
 * (36, raio 6, Inter 14, escolhida em primária com o check) e rótulo de
 * grupo em caixa alta, como o seletor agrupado do ASK.
 */

type Props = {
  groups: { key: keyof typeof GROUP_LABEL; scales: Scale[] }[]
  selectedId: string
  byPoint: boolean
  onByPoint: (on: boolean) => void
  onSelect: (id: string) => void
  onClose: () => void
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Strip({ colors, width = 64, height = 12 }: { colors: string[]; width?: number; height?: number }) {
  return (
    <span className="strip" style={{ width, height }} aria-hidden>
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </span>
  )
}

export function ScalePicker({ groups, selectedId, byPoint, onByPoint, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = norm(query.trim())
    const base = groups.map((g) => ({ ...g, scales: q ? g.scales.filter((s) => norm(s.name).includes(q)) : g.scales }))
    const showDefault = !q || norm(DEFAULT_SCALE.name).includes(q) || 'padrao'.includes(q)
    return { showDefault, groups: base.filter((g) => g.scales.length) }
  }, [groups, query])

  const flat = useMemo(
    () => [...(filtered.showDefault ? [DEFAULT_SCALE] : []), ...filtered.groups.flatMap((g) => g.scales)],
    [filtered],
  )

  /* Ao abrir, a escolhida aparece com algumas linhas de contexto acima. A
     rolagem cai na grade das linhas, logo abaixo do rótulo de grupo fixo:
     centralizar solto deixava meia linha cortada atrás do rótulo. */
  useEffect(() => {
    inputRef.current?.focus()
    const list = listRef.current
    const el = list?.querySelector('[aria-selected="true"]') as HTMLElement | null
    if (!list || !el) return
    const top = (n: Element) => n.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop
    const group = el.closest('[role="group"]')
    if (!group) return
    const label = group.querySelector('.sp-group') as HTMLElement
    const rows = Math.floor((list.clientHeight - label.offsetHeight) / el.offsetHeight / 2)
    list.scrollTop = Math.max(top(group), top(el) - label.offsetHeight - rows * el.offsetHeight)
  }, [])

  useEffect(() => {
    if (!active) return
    const el = listRef.current?.querySelector(`[data-id="${CSS.escape(active)}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function move(delta: number) {
    if (!flat.length) return
    const from = active ?? selectedId
    const i = flat.findIndex((s) => s.id === from)
    const next = flat[(i + delta + flat.length) % flat.length] ?? flat[0]
    setActive(next.id)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = active ?? (query && flat[0]?.id)
      if (pick) onSelect(pick)
    } else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  const row = (s: Scale) => {
    const selected = s.id === selectedId
    return (
      <div
        key={s.id}
        data-id={s.id}
        id={'opt-' + s.id}
        role="option"
        aria-selected={selected}
        className={'sp-row' + (active === s.id ? ' is-active' : '') + (selected ? ' is-selected' : '')}
        onMouseEnter={() => setActive(s.id)}
        onClick={() => onSelect(s.id)}
      >
        <span className="sp-name">{s.name}</span>
        <Strip colors={s.colors} />
        <span className="sp-check">{selected && <Icon name="check" size={18} color={COLOR.primary} />}</span>
      </div>
    )
  }

  return (
    <div className="scale-pop" role="dialog" aria-labelledby="sp-title" onKeyDown={onKey}>
      <div className="sp-head">
        <h3 id="sp-title" className="sp-title">Cor</h3>
        <IconBtn title="Fechar" onClick={onClose}>
          <Icon name="close" size={24} />
        </IconBtn>
      </div>

      {/* Linha de preferência: o controle fica na ponta, e por isso a linha
          não é clicável inteira (regra do switch no design system) */}
      <div className="sp-option">
        <span>Colorir cada ponto</span>
        <Switch checked={byPoint} onChange={onByPoint} label="Colorir cada ponto" />
      </div>

      <div className="sp-search-wrap">
        <label className="sp-search">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(null) }}
            placeholder="Pesquisar"
            aria-label="Pesquisar escala"
            role="combobox"
            aria-expanded
            aria-controls="sp-list"
            aria-activedescendant={active ? 'opt-' + active : undefined}
          />
          <Icon name="search" size={24} color={COLOR.navLabel} />
        </label>
      </div>

      <div
        id="sp-list"
        ref={listRef}
        className="sp-list"
        role="listbox"
        aria-label="Escalas"
        onMouseLeave={() => setActive(null)}
      >
        {filtered.showDefault && <div className="sp-default">{row(DEFAULT_SCALE)}</div>}
        {filtered.groups.map((g) => (
          <div key={g.key} role="group" aria-labelledby={'sp-g-' + g.key}>
            <div id={'sp-g-' + g.key} className="sp-group">{GROUP_LABEL[g.key]}</div>
            {g.scales.map(row)}
          </div>
        ))}
        {!flat.length && <p className="sp-empty">Nenhuma escala corresponde a “{query}”.</p>}
      </div>
    </div>
  )
}
