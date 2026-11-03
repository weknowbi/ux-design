/**
 * O dashboard de exemplo, no visual do painel "Cenário Atendimentos (Foco
 * Hoje/Semana)" do Weknow (dashboard 19). Todo dashboard do portal abre este
 * mesmo painel: o protótipo existe para testar a barra inferior, e um
 * conteúdo só economiza desenvolvimento sem mudar nada no que se testa.
 *
 * O original tem uma página só. As abas foram acrescentadas para a barra ter
 * o que navegar, e seguem a história de um painel de pronto-socorro: do dia
 * de hoje aos recortes. Cada aba reaproveita os mesmos componentes com
 * outros números, como os consultores costumam montar.
 */

export type DashTab = {
  id: string
  name: string
  /** Hora de corte da comparação com ontem ("até 15:00"). */
  cutoff: string
  todayDate: string
  yesterdayDate: string
  today: { adult: number; child: number }
  yesterday: { adult: number; child: number }
  convenios: [nome: string, atendimentos: number][]
  /** Atendimentos por hora, de 00 a 23. Hora que ainda não chegou é 0. */
  hourly: number[]
}

/** Números estáveis por aba: a mesma aba mostra os mesmos valores a cada visita. */
function seeded(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/* O desenho de um dia de pronto-socorro: madrugada baixa, pico no fim da
   manhã e no começo da tarde. */
const DAY_SHAPE = [18, 13, 10, 8, 8, 12, 20, 34, 55, 63, 69, 66, 63, 66, 74, 72, 70, 66, 60, 52, 44, 36, 28, 22]

function tab(i: number, name: string, scale: number): DashTab {
  const r = seeded(i * 17 + 3)
  const vary = (n: number, spread = 0.3) => Math.max(1, Math.round(n * scale * (1 - spread / 2 + r() * spread)))
  const today = { adult: vary(103), child: vary(16, 0.6) }
  const yesterday = { adult: vary(110), child: vary(32, 0.5) }
  // Do maior para o menor, e "Outros" sempre por último, como no original.
  const convenios: [string, number][] = [
    ...(
      [
        ['SUS', vary(134)],
        ['Unimed', vary(35, 0.5)],
        ['Bradesco', vary(3, 1)],
        ['Gratuidade', vary(3, 1)],
      ] as [string, number][]
    ).sort((a, b) => b[1] - a[1]),
    ['Outros', vary(6, 1)],
  ]
  // Até as 15h há números; dali em diante a hora ainda não chegou.
  const hourly = DAY_SHAPE.map((v, h) => (h < 16 ? Math.max(1, Math.round(v * (0.85 + r() * 0.3) * Math.min(1.2, scale + 0.2))) : 0))
  return { id: `aba-${i + 1}`, name, cutoff: '15:00', todayDate: '23/09', yesterdayDate: '22/09', today, yesterday, convenios, hourly }
}

/** A primeira aba repete os números do painel original, para comparar lado a lado. */
const ORIGINAL: DashTab = {
  id: 'aba-1',
  name: 'Visão geral',
  cutoff: '15:00',
  todayDate: '23/09',
  yesterdayDate: '22/09',
  today: { adult: 103, child: 16 },
  yesterday: { adult: 110, child: 32 },
  convenios: [['SUS', 134], ['Unimed', 35], ['Bradesco', 3], ['Gratuidade', 3], ['Outros', 6]],
  hourly: [...DAY_SHAPE.slice(0, 16), ...Array(8).fill(0)],
}

export const DASH_TABS: DashTab[] = [
  ORIGINAL,
  tab(1, 'Semana', 1.08),
  tab(2, 'Adulto', 0.92),
  tab(3, 'Infantil', 0.4),
  tab(4, 'Por convênio', 1),
  tab(5, 'Faixa horária', 0.96),
  tab(6, 'Classificação de risco', 0.88),
  tab(7, 'Tempo de espera', 0.8),
  tab(8, 'Comparativo mensal', 1.12),
]
