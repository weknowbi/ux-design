/**
 * Escalas de cores, na mesma organização do seletor de escalas que o produto
 * já tem (o "..." do editor de gráfico):
 *
 *   Escalas do tema       as do tema ativo, nomeadas pelo uso
 *   Escalas do sistema    as que vêm com o Weknow
 *   Escalas cadastradas   as que a empresa criou
 *
 * Os nomes e a quantidade de cores são os de produção. As cores são
 * ilustrativas: no produto, a lista vem da API de escalas, não deste arquivo.
 * É justamente o ponto da proposta: o explorador lê as escalas que já
 * existem, em vez de carregar uma cópia de cinco paletas fixas.
 */

export type ScaleGroup = 'padrao' | 'tema' | 'sistema' | 'cadastrada'

export type Scale = {
  id: string
  name: string
  group: ScaleGroup
  colors: string[]
}

export const GROUP_LABEL: Record<Exclude<ScaleGroup, 'padrao'>, string> = {
  tema: 'Escalas do tema',
  sistema: 'Escalas do sistema',
  cadastrada: 'Escalas cadastradas',
}

/** A cor que o explorador usa hoje, em todas as barras. */
export const DEFAULT_BLUE = '#3E83B7'

function hex(n: number) {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
}

function hsl(h: number, s: number, l: number) {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + hex(f(0) * 255) + hex(f(8) * 255) + hex(f(4) * 255)
}

function spread(n: number, s: number, l: number, start = 0) {
  return Array.from({ length: n }, (_, i) => hsl((start + (i * 360) / n) % 360, s, l)).map((c) => c.toUpperCase())
}

function ramp(from: string, to: string, n: number) {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const [a, b] = [p(from), p(to)]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return ('#' + a.map((v, j) => hex(v + (b[j] - v) * t)).join('')).toUpperCase()
  })
}

const s = (group: ScaleGroup, name: string, colors: string[]): Scale => ({
  id: group + ':' + name,
  name,
  group,
  colors,
})

export const DEFAULT_SCALE: Scale = s('padrao', 'Cor padrão do explorador', [DEFAULT_BLUE])

export const THEME_SCALES: Scale[] = [
  s('tema', 'Gráfico - Séries', ['#3E83B7', '#F28E2B', '#59A14F', '#E15759', '#76B7B2', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC']),
  s('tema', 'Gráfico - Pontos', ['#2F6FA8', '#5DB0D9', '#2A9D8F', '#8AB17D', '#E9C46A', '#F4A261', '#E76F51', '#B5838D', '#6D597A', '#355070']),
  s('tema', 'Cartão - Fundo DownUp', ['#D64545', '#F2F2F2', '#5A9E3A']),
  s('tema', 'Cartão - Frente DownUp', ['#111111']),
  s('tema', 'Cartão - Frente Fixo', ['#111111']),
  s('tema', 'Cartão - Fundo Fixo', ['#FFFFFF']),
  s('tema', 'Termômetro - Faixas', ['#1A9850', '#66BD63', '#A6D96A', '#FEE08B', '#FDAE61', '#F46D43', '#D73027']),
  s('tema', 'Seleção - Fundo', ['#8A8F98']),
  s('tema', 'Seleção - Frente', ['#FFFFFF']),
  s('tema', 'Seleção - Borda', ['#5C6370']),
  s('tema', 'Mapa - Lista', ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF']),
  s('tema', 'Mapa - Escala', ['#EFF3FF', '#C6DBEF', '#9ECAE1', '#6BAED6', '#4292C6', '#2171B5', '#084594']),
]

export const SYSTEM_SCALES: Scale[] = [
  s('sistema', 'weKnow', ['#3366CC', '#5ADBDB', '#30A7E2', '#1F3F7A', '#8FB3F0', '#2A9D8F', '#F2A541']),
  s('sistema', 'Excel', ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#264478', '#9E480E', '#636363', '#997300', '#255E91', '#43682B', '#698ED0', '#F1975A', '#B7B7B7', '#FFCD33', '#7CAFDD', '#8CC168', '#335AA1', '#D26012', '#848484', '#CC9A00']),
  s('sistema', 'Victorian', ['#5C2E2E', '#8B4A3C', '#B5835A', '#D9B48F', '#6B705C', '#3F4E4F', '#A27B5C', '#7D5A50', '#B4846C', '#E5B299', '#4E3D42']),
  s('sistema', 'Pastels', spread(14, 62, 80, 10)),
  s('sistema', 'Solid', ['#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', '#911EB4', '#46F0F0', '#F032E6']),
  s('sistema', 'Classic', ['#1F4E79', '#C00000', '#548235', '#7030A0', '#BF8F00', '#2E75B6', '#C55A11', '#7F7F7F', '#375623', '#843C0C', '#203864', '#7B7B7B']),
  s('sistema', 'Web', ['#0066CC', '#FF6600', '#339933', '#CC0033', '#9933CC', '#FFCC00', '#00CCCC', '#666666', '#FF3399']),
  s('sistema', 'Modern', ['#264653', '#2A9D8F', '#8AB17D', '#E9C46A', '#F4A261', '#E76F51', '#6D597A', '#B56576', '#355070', '#EAAC8B', '#457B9D', '#1D3557', '#A8DADC', '#E63946']),
  s('sistema', 'Rainbow', spread(25, 82, 54)),
  s('sistema', 'Win. XP', ['#0054E3', '#3D95FF', '#73A94F', '#3A8C26', '#F6A01A', '#D0471F', '#ECE9D8', '#7A96DF', '#245EDB', '#C3D3F7', '#ACA899', '#FFCC33', '#A0522D']),
  s('sistema', 'Mac OS', ['#FF5F57', '#FEBC2E', '#28C840', '#0A84FF', '#BF5AF2', '#FF375F', '#64D2FF', '#FF9F0A', '#30D158', '#5E5CE6', '#AC8E68', '#8E8E93', '#66D4CF', '#FFD60A', '#DA8FFF', '#6AC4DC']),
  s('sistema', 'Win. Vista', ['#1C6EA4', '#3D9BD1', '#7FC4EA', '#2F7F3A', '#5DB34A', '#A3D977', '#C1471F', '#E8743B', '#F5B05C', '#5C2D91', '#8E5CBF', '#BFA3E0', '#3B3B3B', '#7A7A7A', '#B5B5B5']),
  s('sistema', 'Gray scale', ramp('#1A1A1A', '#E6E6E6', 15)),
  s('sistema', 'Opera', ['#FF1B2D', '#CC0F16', '#FF6F61', '#7D0A0A', '#FF9E80', '#B71C1C', '#E57373', '#4A0404', '#FFCDD2', '#D32F2F', '#9A1B1B', '#F44336']),
  s('sistema', 'Warm', ['#7F0000', '#B30000', '#D7301F', '#EF6548', '#FC8D59', '#FDBB84', '#FDD49E', '#FEE8C8']),
  s('sistema', 'Cool', ['#081D58', '#253494', '#225EA8', '#1D91C0', '#41B6C4', '#7FCDBB', '#C7E9B4', '#EDF8B1']),
  s('sistema', 'BlackIsBack', ['#000000', '#3A3A3A', '#6E6E6E', '#A8A8A8']),
  s('sistema', 'Metro', ['#00ABA9', '#8CBF26', '#A200FF', '#FF0097', '#A05000', '#E671B8', '#F09609', '#1BA1E2', '#E51400', '#339933']),
  s('sistema', 'iOS', ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55', '#8E8E93', '#34AADC', '#C7C7CC', '#FF6482']),
  s('sistema', 'Android', ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800']),
  s('sistema', 'Lookout', ['#2E4057', '#048BA8', '#16DB93', '#EFEA5A', '#F29E4C', '#83BCA9', '#C5283D', '#255F85', '#E9724C', '#481D24', '#FFC857', '#4B7F52']),
  s('sistema', 'Seawash', ['#03045E', '#023E8A', '#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF', '#ADE8F4', '#CAF0F8', '#5E8B7E', '#A7C4BC', '#2F5D62']),
  s('sistema', 'Activity', ['#FA114F', '#92E82A', '#1EEAEF', '#FF9500', '#5856D6', '#FFCC00', '#34C759', '#AF52DE', '#FF2D55', '#00C7BE']),
]

/*
 * Em produção, "Escalas cadastradas" lista cinco cópias idênticas de cada uma
 * destas três (mesmo nome, mesmas cores). Aqui aparecem uma vez só: ver o
 * README, é um ponto a resolver nos dados, não na tela.
 */
export const REGISTERED_SCALES: Scale[] = [
  s('cadastrada', 'Padrão - Alternado', ['#1F5FA8', '#8DB8E8', '#1F5FA8', '#8DB8E8', '#1F5FA8', '#8DB8E8', '#1F5FA8', '#8DB8E8', '#1F5FA8', '#8DB8E8']),
  s('cadastrada', 'Padrão - alto contraste', ['#000000', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#332288', '#882255']),
  s('cadastrada', 'Padrão - Termômetro', ['#C62828', '#F9A825', '#2E7D32']),
]

/** Uma cor por categoria: com menos cores que categorias, a escala recomeça. */
export function colorsFor(scale: Scale, count: number) {
  return Array.from({ length: count }, (_, i) => scale.colors[i % scale.colors.length])
}
