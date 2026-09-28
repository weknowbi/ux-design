/** "3 dashboards · 1 subpasta" — só o que existe, dashboards primeiro. */
export function describeCounts({ folders, dashboards }: { folders: number; dashboards: number }): string {
  const parts: string[] = []
  if (dashboards) parts.push(`${dashboards} ${dashboards === 1 ? 'dashboard' : 'dashboards'}`)
  if (folders) parts.push(`${folders} ${folders === 1 ? 'subpasta' : 'subpastas'}`)
  return parts.length ? parts.join(' · ') : 'Vazia'
}

/** Busca sem acento e sem caixa: "cirurgico" encontra "Cirúrgico". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}
