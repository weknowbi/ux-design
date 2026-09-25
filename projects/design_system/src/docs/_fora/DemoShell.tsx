import { COLOR, FONT, LAYOUT, RADIUS, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { Example } from '@docs/blocks/Example'

/**
 * Maquete da casca em escala reduzida.
 *
 * As proporções saem dos tokens (`LAYOUT`, `TOPBAR`) divididos por um fator
 * único, então a maquete não pode discordar do produto: mudar `sidebarWidth`
 * muda o desenho aqui também.
 */
const K = 3.4

const px = (v: number) => Math.round(v / K)

function Cota({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[11px]"
      style={{ fontFamily: 'ui-monospace, monospace', color: COLOR.textMuted }}
    >
      {children}
    </span>
  )
}

export function DemoShell() {
  return (
    <Example
      title="A moldura"
      note="Menu e barra ficam parados; só a folha rola."
      align="center"
    >
      <div className="flex flex-col gap-3">
        <div
          className="flex overflow-hidden"
          style={{
            width: px(1920),
            height: px(1080),
            background: COLOR.canvas,
            border: `1px solid ${COLOR.border}`,
            borderRadius: RADIUS.md,
          }}
        >
          {/* Menu lateral */}
          <div
            className="shrink-0 flex flex-col"
            style={{ width: px(LAYOUT.sidebarWidth), padding: px(LAYOUT.sidebarPad) }}
          >
            <div
              className="flex items-center"
              style={{ height: px(TOPBAR.height), gap: 4, color: COLOR.primary }}
            >
              <Icon name="hexagon" size={12} filled />
              <span style={{ width: 28, height: 4, borderRadius: 2, background: COLOR.textIcon }} />
            </div>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  height: px(LAYOUT.navItemHeight),
                  marginBottom: 3,
                  borderRadius: 3,
                  background: i === 1 ? COLOR.navActive : 'transparent',
                  border: i === 1 ? 'none' : `1px dashed ${COLOR.border}`,
                }}
              />
            ))}
            <span className="flex-1" />
            {[0, 1].map((i) => (
              <span
                key={i}
                style={{
                  height: px(LAYOUT.navItemHeight),
                  marginTop: 3,
                  borderRadius: 3,
                  border: `1px dashed ${COLOR.border}`,
                }}
              />
            ))}
          </div>

          {/* Barra + folha */}
          <div className="flex-1 flex flex-col min-w-0" style={{ paddingRight: px(LAYOUT.sheetMarginRight) }}>
            <div
              className="flex items-center justify-between shrink-0"
              style={{ height: px(TOPBAR.height), paddingInline: px(TOPBAR.padX) }}
            >
              <span style={{ width: 46, height: 4, borderRadius: 2, background: COLOR.textIcon }} />
              <div className="flex items-center" style={{ gap: 4 }}>
                <span
                  style={{
                    width: px(TOPBAR.search.width),
                    height: px(TOPBAR.search.height),
                    borderRadius: 999,
                    background: COLOR.searchPill,
                  }}
                />
                <span
                  style={{
                    width: px(TOPBAR.avatarSize),
                    height: px(TOPBAR.avatarSize),
                    borderRadius: 999,
                    background: COLOR.border,
                  }}
                />
              </div>
            </div>

            <div
              className="flex-1"
              style={{
                background: 'var(--wk-surface)',
                borderTopLeftRadius: px(LAYOUT.sheetRadius) + 2,
                borderTopRightRadius: px(LAYOUT.sheetRadius) + 2,
                border: `1px solid ${COLOR.border}`,
                borderBottom: 'none',
              }}
            >
              <div
                className="mx-auto flex flex-col"
                style={{ width: px(LAYOUT.threadMaxWidth), paddingTop: 18, gap: 6 }}
              >
                <span style={{ height: 8, width: '55%', borderRadius: 2, background: COLOR.border }} />
                {[100, 92, 96, 70].map((w, i) => (
                  <span
                    key={i}
                    style={{ height: 4, width: `${w}%`, borderRadius: 2, background: COLOR.hoverStrong }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ fontFamily: FONT }}>
          <Cota>menu {LAYOUT.sidebarWidth}</Cota>
          <Cota>barra {TOPBAR.height}</Cota>
          <Cota>folha raio {LAYOUT.sheetRadius} (só no topo)</Cota>
          <Cota>margem {LAYOUT.sheetMarginRight}</Cota>
        </div>
      </div>
    </Example>
  )
}
