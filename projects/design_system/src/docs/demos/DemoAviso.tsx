import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { ExperimentalNotice } from '@/components/ExperimentalNotice'
import { Example, DoDont, DoDontCard } from '@docs/blocks/Example'

/**
 * O aviso de produção, o mesmo que fica abaixo do campo de pergunta do ASK.
 * Clique no trecho sublinhado: a explicação abre para cima, porque no produto
 * o aviso mora na borda de baixo da tela.
 */

/** O contra-exemplo é desenhado aqui porque o sistema não tem faixa colorida — e essa é a questão. */
function FaixaInventada() {
  return (
    <div
      className="flex items-center gap-2 w-full"
      style={{
        padding: '10px 14px',
        borderRadius: RADIUS.md,
        background: 'color-mix(in srgb, #e8a33d 18%, var(--wk-surface))',
        border: '1px solid color-mix(in srgb, #e8a33d 45%, transparent)',
        fontFamily: FONT,
        fontSize: 13,
        color: COLOR.text,
      }}
    >
      Esta funcionalidade é experimental.
    </div>
  )
}

export function DemoAviso() {
  return (
    <>
      <Example
        title="O aviso do produto"
        note="Texto de 12/16 na cor terciária. Clique no trecho sublinhado: a explicação abre para cima, e o vazio acima do aviso é o espaço que ela ocupa."
        align="center"
      >
        <div style={{ maxWidth: 520, paddingTop: 108 }}>
          <ExperimentalNotice />
        </div>
      </Example>

      <DoDont>
        <DoDontCard kind="do" label="Cinza e pequeno: quem já sabe passa direto, quem quer saber tem onde clicar.">
          <div style={{ maxWidth: 360 }}>
            <ExperimentalNotice short />
          </div>
        </DoDontCard>
        <DoDontCard kind="dont" label="Faixa colorida permanente. Em dois dias a pessoa aprende a não ler aquele retângulo, e o espaço continua ocupado.">
          <FaixaInventada />
        </DoDontCard>
      </DoDont>
    </>
  )
}
