import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * Palco de demonstração.
 *
 * O que está dentro é o componente de produção, importado de `weknow_ask/src`.
 * Não é uma reprodução: o palco só lhe dá uma moldura e um rótulo.
 *
 * Não há bloco de código junto. Este projeto é um protótipo: a assinatura que
 * o `Btn` daqui expõe não é a que o desenvolvedor tem no produto, e publicar
 * uma ao lado da peça convidaria a copiar a errada. O que a página promete é
 * o comportamento e a regra de uso, não a chamada.
 *
 * O fundo é a própria superfície da página. Um tom cinza atrás dos exemplos
 * mudava o contraste dos componentes e mostrava o botão sobre um fundo em que
 * ele nunca aparece, a borda basta para dizer onde o palco começa.
 */

export function Example({
  title,
  note,
  align = 'start',
  children,
}: {
  title?: string
  /** Uma linha, quando o exemplo não se explica sozinho. */
  note?: string
  align?: 'start' | 'center'
  children: React.ReactNode
}) {
  return (
    <section style={{ marginTop: 32 }}>
      {title && (
        <h3
          className="text-[16px] font-semibold"
          style={{ fontFamily: FONT, color: COLOR.text, marginBottom: note ? 4 : 12 }}
        >
          {title}
        </h3>
      )}
      {note && (
        <p
          className="text-[14px]"
          style={{
            fontFamily: FONT,
            color: COLOR.textSecondary,
            marginBottom: 12,
            maxWidth: '72ch',
          }}
        >
          {note}
        </p>
      )}

      <div
        className="flex flex-wrap items-center gap-4"
        style={{
          background: 'var(--wk-surface)',
          border: `1px solid ${COLOR.border}`,
          borderRadius: RADIUS.lg,
          padding: 24,
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        }}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * Espécime com legenda.
 *
 * Serve para quando o rótulo da peça é conteúdo e não identidade, um chip
 * escrito "Financeiro" não diz se é o informativo ou o acionável, e dois
 * ícones lado a lado não dizem qual é o preenchido. Onde o rótulo PODE ser a
 * identidade, como no botão, ele vai dentro da peça e a legenda não existe.
 */
export function Specimen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center" style={{ minHeight: 38 }}>
        {children}
      </div>
      <span
        className="text-[11.5px] text-center"
        style={{ fontFamily: FONT, color: COLOR.textMuted }}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Par de acerto e erro.
 *
 * Duas colunas lado a lado, porque a regra fica clara na comparação e não na
 * descrição. A cor da borda é a única pista colorida: primária para o que
 * fazer, `danger` para o que evitar.
 */
export function DoDont({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 32 }}
    >
      {children}
    </div>
  )
}

export function DoDontCard({
  kind,
  label,
  children,
}: {
  kind: 'do' | 'dont'
  label: string
  children: React.ReactNode
}) {
  const ok = kind === 'do'
  const accent = ok ? COLOR.primary : COLOR.danger

  return (
    <div
      style={{
        border: `1px solid ${COLOR.border}`,
        borderTop: `2px solid ${accent}`,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ padding: 24, minHeight: 108 }}
      >
        {children}
      </div>
      <p
        className="flex items-start gap-2 text-[13px]"
        style={{
          fontFamily: FONT,
          color: COLOR.textSecondary,
          padding: '12px 16px',
          borderTop: `1px solid ${COLOR.border}`,
        }}
      >
        <Icon name={ok ? 'check' : 'close'} size={18} color={accent} />
        <span style={{ flex: 1 }}>{label}</span>
      </p>
    </div>
  )
}
