/**
 * O croqui do dashboard, copiado do card do portal (`DashboardSketch` em
 * components/browser/Items.tsx de lá): quadro de 250×170, células claras com
 * 2 de vão e, no meio de cada uma, o ícone do tipo de componente. Na escolha
 * da fonte o dashboard tem a mesma cara que tem no portal.
 */

export type SketchKind = 'bar' | 'line' | 'pie' | 'map' | 'gauge' | 'table' | 'text' | 'label' | 'image' | 'filter'
/** Posição na grade de 12 × 6 e o tipo do componente. */
export type SketchBlock = [x: number, y: number, w: number, h: number, kind: SketchKind]

const SKETCH_ICONS: Record<SketchKind, { d: string; box: number }> = {
  bar: { box: 30, d: 'M5,11H9.286V25H5Zm8-6h4V25H13Zm8,11.429h4V25H21Z' },
  line: { box: 24, d: 'M3.5,18.5L9.5,12.5L13.5,16.5L22,6.92L20.59,5.5L13.5,13.5L9.5,9.5L2,17L3.5,18.5Z' },
  pie: { box: 24, d: 'M11,2V22C5.9,21.5 2,17.2 2,12C2,6.8 5.9,2.5 11,2M13,2V11H22C21.5,6.2 17.8,2.5 13,2M13,13V22C17.7,21.5 21.5,17.8 22,13H13Z' },
  map: { box: 24, d: 'M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,20.97L9,18.9L15,21L20.64,19.1C20.85,19 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z' },
  gauge: { box: 24, d: 'M12,16A3,3 0 0,1 9,13C9,11.88 9.61,10.9 10.5,10.39L20.21,4.77L14.68,14.35C14.18,15.33 13.17,16 12,16M12,3C13.81,3 15.5,3.5 16.97,4.32L14.87,5.53C14,5.19 13,5 12,5A8,8 0 0,0 4,13C4,15.21 4.89,17.21 6.34,18.65H6.35C6.74,19.04 6.74,19.67 6.35,20.06C5.96,20.45 5.32,20.45 4.93,20.07V20.07C3.12,18.26 2,15.76 2,13A10,10 0 0,1 12,3M22,13C22,15.76 20.88,18.26 19.07,20.07V20.07C18.68,20.45 18.05,20.45 17.66,20.06C17.27,19.67 17.27,19.04 17.66,18.65V18.65C19.11,17.2 20,15.21 20,13C20,12 19.81,11 19.46,10.1L20.67,8C21.5,9.5 22,11.18 22,13Z' },
  table: { box: 24, d: 'M8,10h9V21H8Zm9,11h3a2.006,2.006,0,0,0,2-2V10H17ZM20,3H5A2.006,2.006,0,0,0,3,5V8H22V5A2.006,2.006,0,0,0,20,3ZM3,19a2.006,2.006,0,0,0,2,2H8V10H3Z' },
  text: { box: 24, d: 'M20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20M5,13V15H16V13H5M5,9V11H19V9H5Z' },
  label: { box: 24, d: 'M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z' },
  image: { box: 24, d: 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z' },
  filter: { box: 18, d: 'M16,18H2a2,2,0,0,1-2-2V2A2,2,0,0,1,2,0H16a2,2,0,0,1,2,2V16A2,2,0,0,1,16,18ZM4.77,3.561a.623.623,0,0,0-.374.132.605.605,0,0,0-.226.4.592.592,0,0,0,.124.443L7.773,9h.018v3.547a.6.6,0,0,0,.176.5l1.214,1.214a.6.6,0,0,0,.852,0,.58.58,0,0,0,.175-.5V9h.018l3.48-4.459a.592.592,0,0,0,.124-.443.605.605,0,0,0-.226-.4.623.623,0,0,0-.374-.132Z' },
}

const SKETCH_W = 250
const SKETCH_H = 170

export function DashboardSketch({ layout }: { layout: SketchBlock[] }) {
  const col = SKETCH_W / 12
  const row = SKETCH_H / 6
  return (
    <svg viewBox={`0 0 ${SKETCH_W} ${SKETCH_H}`} className="h-[80%] w-auto max-w-[90%]" aria-hidden="true">
      {layout.map(([x, y, w, h, kind], i) => {
        const icon = SKETCH_ICONS[kind]
        const cx = (x + w / 2) * col
        const cy = (y + h / 2) * row
        return (
          <g key={i}>
            <rect x={x * col + 1} y={y * row + 1} width={w * col - 2} height={h * row - 2} rx={2} fill="var(--wk-surface-subtle)" />
            <path d={icon.d} transform={`translate(${cx - icon.box / 2} ${cy - icon.box / 2})`} fill="var(--wk-nav-label)" />
          </g>
        )
      })}
    </svg>
  )
}
