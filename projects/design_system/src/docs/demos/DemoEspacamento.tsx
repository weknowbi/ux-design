import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Example } from '@docs/blocks/Example'

const PASSOS = [4, 8, 12, 16, 24, 32, 48, 64]

const RAIOS: [string, number, string][] = [
  ['sm', RADIUS.sm, 'Campo, botão pequeno'],
  ['md', RADIUS.md, 'Botão médio, item de menu'],
  ['lg', RADIUS.lg, 'Tabela, bloco de código'],
  ['xl', RADIUS.xl, 'Cartão, folha'],
  ['composer', RADIUS.composer, 'Caixa de pergunta'],
  ['pill', RADIUS.pill, 'Chip, busca'],
]

export function DemoEspacamento() {
  return (
    <>
      <Example title="Grade de 4" note="Os oito passos em uso.">
        <div className="flex items-end gap-4 flex-wrap">
          {PASSOS.map((p) => (
            <div key={p} className="flex flex-col items-center gap-2">
              <div
                style={{
                  width: p,
                  height: 40,
                  /* Neutro, não a secundária: a régua é diagrama, e a página
                     de Cor diz que fundo colorido decorativo não existe no
                     sistema. A secundária é do botão secundário. */
                  background: 'var(--wk-chip-bg)',
                  borderRadius: 2,
                }}
              />
              <span
                className="text-[11.5px]"
                style={{ fontFamily: 'ui-monospace, monospace', color: COLOR.textMuted }}
              >
                {p}
              </span>
            </div>
          ))}
        </div>
      </Example>

      <Example
        title="Raio"
        note="O raio cresce com o tamanho do bloco."
      >
        {RAIOS.map(([nome, valor, onde]) => (
          <div key={nome} style={{ width: 148 }}>
            <div
              style={{
                height: 56,
                background: 'var(--wk-hover-strong)',
                border: `1px solid ${COLOR.border}`,
                borderRadius: valor,
              }}
            />
            <p className="text-[13px]" style={{ fontFamily: FONT, color: COLOR.text, marginTop: 8 }}>
              {nome} · {valor === RADIUS.pill ? 'total' : valor}
            </p>
            <p className="text-[11.5px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
              {onde}
            </p>
          </div>
        ))}
      </Example>

      <Example
        title="Elevação"
        note="Duas sombras, nenhuma decorativa."
      >
        {[
          ['--wk-shadow-composer', 'Caixa de pergunta'],
          ['--wk-shadow-menu', 'Painel flutuante'],
        ].map(([token, uso]) => (
          <div key={token} style={{ width: 220 }}>
            <div
              className="flex items-center justify-center"
              style={{
                height: 72,
                background: 'var(--wk-surface)',
                border: `1px solid ${COLOR.border}`,
                borderRadius: RADIUS.lg,
                boxShadow: `var(${token})`,
                fontFamily: FONT,
                fontSize: 13,
                color: COLOR.textSecondary,
              }}
            >
              {uso}
            </div>
            <p
              className="text-[11.5px]"
              style={{ fontFamily: 'ui-monospace, monospace', color: COLOR.textMuted, marginTop: 8 }}
            >
              {token}
            </p>
          </div>
        ))}
      </Example>
    </>
  )
}
