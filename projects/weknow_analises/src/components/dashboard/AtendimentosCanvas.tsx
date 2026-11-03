import type { ReactNode } from 'react'
import type { DashTab } from '@/data/dashboard'

/**
 * O painel "Cenário Atendimentos (Foco Hoje/Semana)" (dashboard 19), em
 * código. No Weknow cada componente é um objeto Python que devolve um SVG;
 * aqui os mesmos SVGs são desenhados em React, com as coordenadas, cores e
 * fontes lidas dos originais, e os números vindos da aba.
 *
 * O quadro é o de todo dashboard do Weknow, 1920 × 1080, e a tela só o
 * escala. As cores são as do painel, fixas: o dashboard é do cliente e não
 * acompanha o tema do portal.
 */
export const CANVAS_W = 1920
export const CANVAS_H = 1080

const FONT = 'Arial, Helvetica, sans-serif'
const BLUE = '#295E8A'
const ORANGE = '#F79009'

const pct = (n: number, total: number) =>
  `${((n / total) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const signed = (n: number) => (n > 0 ? `+${n}` : String(n))

type Box = [x: number, y: number, w: number, h: number]

/** Um componente no quadro. O SVG se ajusta à caixa sem distorcer, como no Weknow. */
function Place({ box, viewBox, children }: { box: Box; viewBox: string; children: ReactNode }) {
  const [x, y, w, h] = box
  return (
    <svg
      className="absolute"
      style={{ left: x, top: y }}
      width={w}
      height={h}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      fontFamily={FONT}
    >
      {children}
    </svg>
  )
}

/* ------------------------------------------------------------- cartões */

function TodayCard({ tab }: { tab: DashTab }) {
  const today = tab.today.adult + tab.today.child
  const yesterday = tab.yesterday.adult + tab.yesterday.child
  const change = ((today - yesterday) / yesterday) * 100
  return (
    <Place box={[31, 18, 470, 243]} viewBox="0 0 400 220">
      <rect x="2" y="2" width="396" height="216" rx="18" fill="#14212D" />
      <text x="28" y="47" fontSize="18" fontWeight="500" fill="#F2F4F7">
        Atendimentos hoje
      </text>
      <text x="28" y="132" fontSize="72" fontWeight="700" fill="#FFFFFF">
        {today}
      </text>
      <rect x="28" y="158" width="100" height="31" rx="10" fill="#243444" />
      <text x="41" y="179" fontSize="17" fontWeight="700" fill="#DCE7EF">
        {change < 0 ? '↓' : '↑'}
      </text>
      <text x="62" y="179" fontSize="15" fontWeight="700" fill="#FFFFFF">
        {Math.abs(change).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%
      </text>
      <text x="142" y="178" fontSize="14" fontWeight="500" fill="#CBD5DC">
        vs. ontem no mesmo horário
      </text>
    </Place>
  )
}

/** Adulto e Infantil: o mesmo cartão, com a cor e o ícone da faixa. */
function AgeCard({
  box,
  title,
  count,
  total,
  color,
  tint,
  noteColor,
  child,
}: {
  box: Box
  title: string
  count: number
  total: number
  color: string
  tint: string
  noteColor: string
  child?: boolean
}) {
  return (
    <Place box={box} viewBox="0 0 400 220">
      <rect x="2" y="2" width="396" height="216" rx="18" fill="none" stroke="#E4E7EC" strokeWidth="1" />
      <rect x="2" y="22" width="4" height="48" rx="2" fill={color} />
      <rect x="26" y="24" width="44" height="44" rx="12" fill={tint} />
      <circle cx="48" cy="39" r={child ? 6 : 7} fill="none" stroke={color} strokeWidth="2.2" />
      <path
        d={child ? 'M38 58 C40 51 56 51 58 58' : 'M37 59 C39 50 57 50 59 59'}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <text x="84" y="43" fontSize="18" fontWeight="600" fill="#344054">
        {title}
      </text>
      <text x="84" y="66" fontSize="14" fill="#98A2B3">
        Pronto Socorro
      </text>
      <text x="28" y="145" fontSize="68" fontWeight="700" fill="#101828">
        {count}
      </text>
      <text x="30" y="174" fontSize="15" fill="#667085">
        atendimentos
      </text>
      <rect x="28" y="185" width="242" height="27" rx="13.5" fill={tint} />
      <circle cx="42" cy="198.5" r="3.5" fill={color} />
      <text x="53" y="203" fontSize="13" fontWeight="600" fill={noteColor}>
        {pct(count, total)} dos atendimentos de hoje
      </text>
    </Place>
  )
}

function YesterdayCard({ tab }: { tab: DashTab }) {
  const total = tab.yesterday.adult + tab.yesterday.child
  return (
    <Place box={[1430, 0, 465, 287]} viewBox="0 0 400 220">
      <rect x="2" y="2" width="396" height="216" rx="18" fill="none" stroke="#E4E7EC" strokeWidth="1" />
      <text x="28" y="46" fontSize="18" fontWeight="500" fill="#667085">
        Ontem até {tab.cutoff} · {tab.yesterdayDate}
      </text>
      <text x="28" y="127" fontSize="68" fontWeight="700" fill="#475467">
        {total}
      </text>
      <text x="30" y="156" fontSize="15" fill="#98A2B3">
        atendimentos
      </text>
      <line x1="28" y1="173" x2="372" y2="173" stroke="#EAECF0" strokeWidth="1" />
      <circle cx="32" cy="196" r="4" fill={BLUE} />
      <text x="44" y="201" fontSize="14" fontWeight="600" fill="#667085">
        {pct(tab.yesterday.adult, total)} adulto
      </text>
      <circle cx="218" cy="196" r="4" fill={ORANGE} />
      <text x="230" y="201" fontSize="14" fontWeight="600" fill="#667085">
        {pct(tab.yesterday.child, total)} infantil
      </text>
    </Place>
  )
}

/* ----------------------------------------------------- hoje vs. ontem */

/** Barra empilhada: adulto à esquerda, infantil à direita, cantos só nas pontas. */
function StackedBar({
  y,
  adult,
  child,
  max,
  colors,
  childText,
}: {
  y: number
  adult: number
  child: number
  max: number
  colors: [string, string]
  childText: string
}) {
  const x0 = 38
  const W = 650
  const r = 9
  const h = 50
  const a = x0 + (W * adult) / max
  const b = x0 + (W * (adult + child)) / max
  return (
    <g>
      <rect x={x0} y={y} width={W} height={h} rx={r} fill="#F2F4F7" />
      <path d={`M ${x0 + r} ${y} H ${a} V ${y + h} H ${x0 + r} Q ${x0} ${y + h} ${x0} ${y + h - r} V ${y + r} Q ${x0} ${y} ${x0 + r} ${y}`} fill={colors[0]} />
      <path d={`M ${a} ${y} H ${b - r} Q ${b} ${y} ${b} ${y + r} V ${y + h - r} Q ${b} ${y + h} ${b - r} ${y + h} H ${a} Z`} fill={colors[1]} />
      <text x="54" y={y + 31} fontSize="15" fontWeight="700" fill="#FFFFFF">
        {adult}
      </text>
      <text x={a + 12} y={y + 31} fontSize="15" fontWeight="700" fill={childText}>
        {child}
      </text>
    </g>
  )
}

function TodayVsYesterday({ tab }: { tab: DashTab }) {
  const { today, yesterday } = tab
  const tTotal = today.adult + today.child
  const yTotal = yesterday.adult + yesterday.child
  const max = Math.max(tTotal, yTotal)
  return (
    <Place box={[31, 281, 956, 411]} viewBox="0 0 900 430">
      <rect x="2" y="2" width="896" height="426" rx="18" fill="#FFFFFF" stroke="#DDE3E8" strokeWidth="1.5" />
      <text x="38" y="48" fontSize="22" fontWeight="700" fill="#101828">
        Hoje vs. ontem
      </text>
      <text x="38" y="76" fontSize="14" fill="#667085">
        Atendimentos acumulados até {tab.cutoff}, por faixa etária
      </text>
      <rect x="695" y="35" width="12" height="12" rx="3" fill={BLUE} />
      <text x="716" y="46" fontSize="13" fill="#475467">
        Adulto
      </text>
      <rect x="790" y="35" width="12" height="12" rx="3" fill="#F4A340" />
      <text x="811" y="46" fontSize="13" fill="#475467">
        Infantil
      </text>

      <text x="38" y="124" fontSize="15" fontWeight="600" fill="#475467">
        Ontem · {tab.yesterdayDate}
      </text>
      <text x="850" y="124" textAnchor="end" fontSize="16" fontWeight="700" fill="#101828">
        {yTotal}
      </text>
      <StackedBar y={142} adult={yesterday.adult} child={yesterday.child} max={max} colors={['#89A6BD', '#EABA7D']} childText="#8B5B20" />

      <text x="38" y="242" fontSize="15" fontWeight="600" fill="#475467">
        Hoje · {tab.todayDate}
      </text>
      <text x="850" y="242" textAnchor="end" fontSize="16" fontWeight="700" fill="#101828">
        {tTotal}
      </text>
      <StackedBar y={260} adult={today.adult} child={today.child} max={max} colors={[BLUE, '#F39A28']} childText="#5F3A0C" />

      <line x1="38" y1="344" x2="850" y2="344" stroke="#EAECF0" strokeWidth="1" />
      {(
        [
          [38, 'Diferença total', tTotal - yTotal],
          [310, 'Adulto', today.adult - yesterday.adult],
          [575, 'Infantil', today.child - yesterday.child],
        ] as [number, string, number][]
      ).map(([x, label, diff]) => (
        <g key={label}>
          <text x={x} y="375" fontSize="13" fill="#98A2B3">
            {label}
          </text>
          <text x={x} y="405" fontSize="24" fontWeight="700" fill="#101828">
            {signed(diff)}
          </text>
        </g>
      ))}
    </Place>
  )
}

/* ------------------------------------------------------------ convênio */

/** Cor por posição, como no original: o primeiro forte, o segundo médio, o resto claro. */
const RANK = ['#295E8A', '#5F87A7']

function ByPayer({ tab }: { tab: DashTab }) {
  const total = tab.convenios.reduce((a, [, n]) => a + n, 0)
  const max = Math.max(...tab.convenios.map(([, n]) => n))
  return (
    <Place box={[948, 267, 912, 445]} viewBox="0 0 900 430">
      <rect x="2" y="2" width="896" height="426" rx="18" fill="#FFFFFF" stroke="#DDE3E8" strokeWidth="1.5" />
      <text x="38" y="48" fontSize="22" fontWeight="700" fill="#101828">
        Atendimentos por convênio
      </text>
      <text x="38" y="76" fontSize="14" fill="#667085">
        {total} atendimentos no período
      </text>
      {tab.convenios.map(([name, n], i) => {
        const y = 128 + i * 55
        return (
          <g key={name}>
            <text x="38" y={y + 19} fontSize="16" fontWeight="600" fill="#101828">
              {name}
            </text>
            <rect x="225" y={y} width="430" height="26" rx="8" fill="#F0F2F4" />
            <rect x="225" y={y} width={(430 * n) / max} height="26" rx="8" fill={RANK[i] ?? '#9AB3C7'} />
            <text x="705" y={y + 19} fontSize="16" fontWeight="700" fill="#101828">
              {n}
            </text>
            <text x="835" y={y + 19} textAnchor="end" fontSize="15" fill="#667085">
              {pct(n, total)}
            </text>
          </g>
        )
      })}
    </Place>
  )
}

/* ------------------------------------------------------------ por hora */

function ByHour({ tab }: { tab: DashTab }) {
  const W = 1867
  const H = 364
  const x0 = 46.675
  const x1 = 1820.325
  const base = 298.48
  const slot = (x1 - x0) / 24
  /* 1 atendimento = 1,5652 px, a escala do original; hora sem dado fica com
     o toco mínimo de 3,13 px, para a grade de horas continuar legível. */
  const unit = 1.5652
  return (
    <Place box={[20, 709, W, H]} viewBox={`0 0 ${W} ${H}`}>
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="14" fill="#FFFFFF" stroke="#DDE3E8" strokeWidth="1" />
      <text x={x0} y="44.3" fontSize="26" fontWeight="700" fill="#101828">
        Atendimentos por hora · hoje
      </text>
      <text x={x0} y="84.34" fontSize="15" fontWeight="500" fill="#667085">
        Entradas no Pronto Socorro por faixa horária
      </text>
      <rect x="1600.325" y="27.3" width="220" height="34" rx="17" fill="#FFFFFF" stroke="#D0D5DD" strokeWidth="1" strokeDasharray="4 4" />
      <text x="1710.325" y="50.42" textAnchor="middle" fontSize="15" fontWeight="500" fill="#667085">
        aguardando dados horários
      </text>
      <line x1={x0} y1={base} x2={x1} y2={base} stroke="#E5EAED" strokeWidth="1" />
      {tab.hourly.map((v, h) => {
        const cx = x0 + slot * h + slot / 2
        const bh = Math.max(3.1304, v * unit)
        return (
          <g key={h}>
            <rect x={cx - 17} y={base - bh} width="34" height={bh} rx="5" fill="#E1E6E9" />
            <text x={cx} y="336.7" textAnchor="middle" fontSize="13" fontWeight="600" fill="#667085">
              {String(h).padStart(2, '0')}
            </text>
          </g>
        )
      })}
    </Place>
  )
}

/* --------------------------------------------------------------- painel */

export function AtendimentosCanvas({ tab }: { tab: DashTab }) {
  const total = tab.today.adult + tab.today.child
  return (
    <div className="relative overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H, background: '#FFFFFF' }}>
      <ByPayer tab={tab} />
      <ByHour tab={tab} />
      <TodayVsYesterday tab={tab} />
      <TodayCard tab={tab} />
      <AgeCard
        box={[495, 0, 448, 282]}
        title="Adulto (≥ 15 anos)"
        count={tab.today.adult}
        total={total}
        color={BLUE}
        tint="#EFF4FF"
        noteColor={BLUE}
      />
      <AgeCard
        box={[960, 11, 473, 261]}
        title="Infantil (< 15 anos)"
        count={tab.today.child}
        total={total}
        color={ORANGE}
        tint="#FFF4E5"
        noteColor="#B54708"
        child
      />
      <YesterdayCard tab={tab} />
    </div>
  )
}
