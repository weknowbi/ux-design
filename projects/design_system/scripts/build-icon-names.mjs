/**
 * Gera src/lib/iconNames.ts: o nome de cada símbolo do Material Symbols
 * Outlined, do mais usado para o menos usado.
 *
 * A fonte é o catálogo que o próprio Google Fonts usa na página dos ícones.
 * Ele lista as famílias antigas (Material Icons) junto, então fica de fora o
 * que não existe no Outlined dos Symbols, que é a família que o app carrega.
 *
 *   node scripts/build-icon-names.mjs
 *
 * Rode de novo quando o Google publicar ícones novos; o arquivo gerado vai
 * para o repositório, então o build não depende da rede.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const URL_METADATA = 'https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true'
const FAMILY = 'Material Symbols Outlined'
const OUT = fileURLToPath(new URL('../src/lib/iconNames.ts', import.meta.url))

const res = await fetch(URL_METADATA)
if (!res.ok) throw new Error(`catálogo respondeu ${res.status}`)
// O JSON vem com um prefixo anti-XSSI na primeira linha: )]}'
const text = (await res.text()).replace(/^\)\]\}'\s*/, '')
const { icons } = JSON.parse(text)

const names = icons
  .filter((i) => !(i.unsupported_families ?? []).includes(FAMILY))
  .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
  .map((i) => i.name)

const body = `/**
 * Nomes do Material Symbols Outlined, do mais usado para o menos usado.
 * ${names.length} símbolos. GERADO por scripts/build-icon-names.mjs: não edite à mão.
 *
 * Uma string só, separada por espaço, em vez de um array: é o formato mais
 * curto para o arquivo, que só é baixado quando a busca de ícones abre.
 */
export const ICON_NAMES = '${names.join(' ')}'
`

writeFileSync(OUT, body)
console.log(`${names.length} ícones em ${OUT}`)
