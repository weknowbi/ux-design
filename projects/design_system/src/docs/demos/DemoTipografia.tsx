import { COLOR, FONT } from '@/design/tokens'
import { Example } from '@docs/blocks/Example'

const ESCALA: { uso: string; size: number; height: number; weight: number; color?: string }[] = [
  { uso: 'Título de tela', size: 28, height: 1.2, weight: 600 },
  { uso: 'Título de seção', size: 20, height: 1.35, weight: 600 },
  { uso: 'Corpo e campo', size: 16, height: 1.5, weight: 400 },
  { uso: 'Corpo de documento', size: 15, height: 1.7, weight: 400 },
  { uso: 'Item de menu', size: 14, height: 1.5, weight: 400 },
  { uso: 'Corpo de tabela', size: 13, height: 1.5, weight: 400 },
  { uso: 'Cabeçalho de tabela', size: 12, height: 1.5, weight: 600, color: COLOR.textSecondary },
  { uso: 'Legenda', size: 11, height: 1.5, weight: 400, color: COLOR.textMuted },
]

export function DemoTipografia() {
  return (
    <>
      <Example
        title="A escala inteira"
        note="Uma família, quatro pesos. O cabeçalho de tabela é menor que o corpo: o peso é que o distingue."
      >
        <div className="flex flex-col gap-4 w-full">
          {ESCALA.map((e) => (
            <div key={e.uso} className="flex items-baseline gap-6">
              <span
                className="shrink-0 text-[11.5px]"
                style={{ fontFamily: 'ui-monospace, monospace', color: COLOR.textMuted, width: 96 }}
              >
                {e.size}/{e.height} · {e.weight}
              </span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: e.size,
                  lineHeight: e.height,
                  fontWeight: e.weight,
                  color: e.color ?? COLOR.text,
                }}
              >
                {e.uso}
              </span>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Hierarquia por peso, não por cor"
        note="O item atual se distingue só pelo peso 600."
      >
        <div className="flex items-center gap-2" style={{ fontFamily: FONT, fontSize: 15 }}>
          <span style={{ color: COLOR.textSecondary }}>Portal</span>
          <span style={{ color: COLOR.textIcon }}>/</span>
          <span style={{ color: COLOR.textSecondary }}>Pastas</span>
          <span style={{ color: COLOR.textIcon }}>/</span>
          <span style={{ color: COLOR.textSecondary, fontWeight: 600 }}>Financeiro Hospitalar</span>
        </div>
      </Example>
    </>
  )
}
