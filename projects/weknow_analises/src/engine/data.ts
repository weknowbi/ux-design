import type { IndicatorId } from '@/engine/semantic'

/**
 * Os dois metadados de exemplo, já agregados por mês e corte, como o Weknow
 * entrega para um painel. Tudo fictício e gerado com semente fixa: o
 * repositório é público, e o mesmo número tem de aparecer a cada visita.
 *
 * Cada metadado carrega uma história, para a investigação ter o que achar:
 *
 *   Internações  em outubro de 2026 a Clínica médica recebe muito mais idosos
 *                pela urgência. A permanência média do hospital sobe quase
 *                toda por MIX (mais saídas no setor de permanência longa), e
 *                um pedaço menor por TAXA (os de 80+ ficam mais tempo).
 *   Glosas       a Bradesco Saúde passa a glosar muito mais materiais. Aqui é
 *                o contrário: quase toda a alta é TAXA, com o faturamento de
 *                cada convênio estável.
 *
 * Os dois casos existem para mostrar que a conclusão sai da conta, e não do
 * texto: o mesmo motor diz "mix" num e "taxa" no outro.
 */

export type Cell = { mes: string } & Record<string, string | number>

/** Meses na ordem, de outubro de 2025 a outubro de 2026. */
export const MONTHS = Array.from({ length: 13 }, (_, i) => {
  const d = new Date(2025, 9 + i, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})
export const CURRENT = MONTHS[MONTHS.length - 1]
export const PREVIOUS = MONTHS[MONTHS.length - 2]
export const YEAR_AGO = MONTHS[0]

/**
 * O histórico inteiro, de outubro de 2024 a outubro de 2026: o painel
 * executivo compara 12 meses com os 12 anteriores. Os blocos continuam nos
 * 13 meses de `MONTHS`. Os meses mais antigos saem de outra semente, para os
 * 13 de sempre continuarem com os mesmos números.
 */
export const HISTORY = Array.from({ length: 25 }, (_, i) => {
  const d = new Date(2024, 9 + i, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})
const OLDER = HISTORY.slice(0, HISTORY.length - MONTHS.length)

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/* ─────────────────────────────────────────────── 21 - Internações */

const SETORES: { name: string; saidas: number; los: number; faixa: number[]; urg: number }[] = [
  { name: 'Clínica médica', saidas: 240, los: 6.2, faixa: [0, 0.3, 0.42, 0.28], urg: 0.82 },
  { name: 'Cirurgia geral', saidas: 290, los: 3.2, faixa: [0.04, 0.56, 0.32, 0.08], urg: 0.45 },
  { name: 'Obstetrícia', saidas: 220, los: 2.5, faixa: [0.04, 0.96, 0, 0], urg: 0.6 },
  { name: 'Ortopedia', saidas: 150, los: 3.8, faixa: [0.08, 0.5, 0.3, 0.12], urg: 0.55 },
  { name: 'Pediatria', saidas: 150, los: 3.3, faixa: [1, 0, 0, 0], urg: 0.75 },
  { name: 'Cardiologia', saidas: 130, los: 5.2, faixa: [0, 0.25, 0.5, 0.25], urg: 0.7 },
]
export const FAIXAS = ['0 a 17 anos', '18 a 59 anos', '60 a 79 anos', '80 anos ou mais']
const FAIXA_LOS = [0.85, 0.8, 1.05, 1.4]
const CONVENIOS = ['SUS', 'Unimed', 'Bradesco Saúde', 'Particular']
const CONV_SHARE = [0.55, 0.25, 0.12, 0.08]

function internacoes(): Cell[] {
  const cells: Cell[] = []
  const r0 = seeded(21)
  const r1 = seeded(2121)
  // Os meses mais antigos com índice negativo, para a sazonalidade seguir a mesma curva.
  ;[...MONTHS.map((mes, mi) => [mes, mi, r0] as const), ...OLDER.map((mes, i) => [mes, i - OLDER.length, r1] as const)].forEach(([mes, mi, r]) => {
    const isCur = mes === CURRENT
    SETORES.forEach((s) => {
      const vol = s.saidas * (1 + 0.03 * Math.sin(mi * 0.9 + s.saidas))
      const avgMult = s.faixa.reduce((a, p, i) => a + p * FAIXA_LOS[i], 0)
      // Oscilação do mês no setor inteiro: sem ela, o ruído célula a célula se
      // cancela na soma e o hospital parece uma linha reta.
      const monthLos = 0.975 + r() * 0.05
      s.faixa.forEach((pf, fi) => {
        if (pf === 0) return
        ;(['Urgência', 'Eletiva'] as const).forEach((entrada) => {
          const pe = entrada === 'Urgência' ? s.urg : 1 - s.urg
          CONVENIOS.forEach((conv, ci) => {
            let n = vol * pf * pe * CONV_SHARE[ci] * (0.94 + r() * 0.12)
            let los = (s.los * FAIXA_LOS[fi]) / avgMult * (entrada === 'Urgência' ? 1.06 : 0.86) * monthLos * (0.97 + r() * 0.06)
            // A história de outubro: idosos pela urgência na Clínica médica.
            if (isCur && s.name === 'Clínica médica' && entrada === 'Urgência') {
              if (fi === 2) n *= 1.55
              if (fi === 3) n *= 1.9
            }
            if (isCur && s.name === 'Clínica médica' && fi === 3) los *= 1.08
            const saidas = Math.max(1, Math.round(n))
            cells.push({
              mes,
              setor: s.name,
              faixa: FAIXAS[fi],
              entrada,
              convenio: conv,
              saidas,
              paciente_dias: Math.round(saidas * los),
            })
          })
        })
      })
    })
  })
  return cells
}

/* ─────────────────────────────────────────── 32 - Faturamento e glosas */

const ITENS: { name: string; share: number; glosa: number }[] = [
  { name: 'Materiais', share: 0.28, glosa: 0.042 },
  { name: 'Medicamentos', share: 0.24, glosa: 0.031 },
  { name: 'Diárias e taxas', share: 0.22, glosa: 0.018 },
  { name: 'Honorários', share: 0.14, glosa: 0.026 },
  { name: 'Exames (SADT)', share: 0.12, glosa: 0.035 },
]
const CONV_FAT: { name: string; fat: number; mult: number }[] = [
  { name: 'Unimed', fat: 4_100_000, mult: 0.9 },
  { name: 'Bradesco Saúde', fat: 2_300_000, mult: 1.05 },
  { name: 'SUS', fat: 3_200_000, mult: 1.2 },
  { name: 'Particular', fat: 600_000, mult: 0.3 },
]
const SETORES_FAT = [
  { name: 'Cirurgia geral', share: 0.34 },
  { name: 'Clínica médica', share: 0.26 },
  { name: 'Ortopedia', share: 0.18 },
  { name: 'Cardiologia', share: 0.14 },
  { name: 'Obstetrícia', share: 0.08 },
]

function glosas(): Cell[] {
  const cells: Cell[] = []
  const r0 = seeded(32)
  const r1 = seeded(3232)
  ;[...MONTHS.map((mes, mi) => [mes, mi, r0] as const), ...OLDER.map((mes, i) => [mes, i - OLDER.length, r1] as const)].forEach(([mes, mi, r]) => {
    const isCur = mes === CURRENT
    CONV_FAT.forEach((c) => {
      const monthRate = 0.92 + r() * 0.16
      ITENS.forEach((it) => {
        SETORES_FAT.forEach((st) => {
          const fat = c.fat * it.share * st.share * (1 + 0.04 * Math.sin(mi * 1.3 + c.fat)) * (0.95 + r() * 0.1)
          let rate = it.glosa * c.mult * monthRate * (0.9 + r() * 0.2)
          // A história de outubro: a Bradesco Saúde glosa materiais.
          if (isCur && c.name === 'Bradesco Saúde' && it.name === 'Materiais') rate *= 3.1
          cells.push({
            mes,
            convenio: c.name,
            item: it.name,
            setor: st.name,
            valor_faturado: Math.round(fat),
            valor_glosado: Math.round(fat * rate),
          })
        })
      })
    })
  })
  return cells
}

export const DATA: Record<IndicatorId, Cell[]> = {
  permanencia: internacoes(),
  glosa: glosas(),
}
