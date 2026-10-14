import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from './tokens'
import { Icon } from './icons'
import { Btn } from './Btn'
import { FIELD, FormField, fieldBoxStyle, fieldTextStyle } from './Field'

/**
 * Trocar a própria senha.
 *
 * A tela de hoje no Weknow erra em quatro pontos, e cada um deles é uma
 * decisão tomada aqui:
 *
 * 1. Ela pede "Usuário" num campo editável, ao lado da senha atual. Duas
 *    caixas lado a lado, uma com login e outra com senha, é a anatomia de uma
 *    tela de ENTRAR — e quem já entrou não entende por que precisa se
 *    identificar de novo. Pior: campo editável sugere que dá para trocar a
 *    senha de outra pessoa ali. Aqui a conta aparece como texto, não como
 *    campo: ela informa, não pergunta.
 *
 * 2. Os quatro campos vêm em grade 2×2. Trocar senha é uma sequência — a
 *    atual, a nova, a nova de novo — e sequência se lê de cima para baixo. Na
 *    grade, "Repita a nova senha" fica ao LADO da nova, e o olho tem de
 *    descobrir a ordem.
 *
 * 3. "Confirmar" nasce desabilitado e não diz por quê. Aqui as regras da
 *    senha ficam à vista desde o começo e vão sendo marcadas enquanto se
 *    digita: o botão desligado deixa de ser enigma e passa a ser o resumo de
 *    uma lista que a pessoa está vendo.
 *
 * 4. O olho de ver a senha aparece em campo vazio, onde não há o que revelar.
 *    Ele só entra quando há texto.
 *
 * E um quinto ponto, que não é erro da tela antiga mas falta nela: o fim do
 * caminho. Trocar senha é das poucas ações que a pessoa não consegue conferir
 * depois — não há onde olhar para saber se pegou. Por isso o diálogo não some
 * ao confirmar: ele vira o aviso de que deu certo, e só então fecha.
 *
 * As regras conferidas aqui são as de uma maquete. As do produto vêm do
 * servidor, e é lá que elas valem — esta lista é que precisa passar a refletir
 * aquelas, não o contrário.
 */

/**
 * Marca de "feito" em azul, e não em verde: a lista fica a um palmo do botão
 * primário, e dois sinais coloridos disputando a mesma área cansam. Verde
 * também só existe no portal (`--wk-ok`), e isto aqui é da biblioteca.
 */
function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Icon
        name={ok ? 'check_circle' : 'radio_button_unchecked'}
        size={18}
        color={ok ? COLOR.primary : COLOR.textMuted}
        className="shrink-0"
      />
      <span
        style={{ fontFamily: FONT, fontSize: 13, lineHeight: '18px', color: ok ? COLOR.text : COLOR.textMuted }}
      >
        {children}
      </span>
    </li>
  )
}

/** Campo de senha: a caixa do `form-item` com o olho por dentro, à direita. */
function PasswordField({
  value,
  onChange,
  invalid,
  inputRef,
  autoFocus,
  onEnter,
  label,
}: {
  value: string
  onChange: (v: string) => void
  invalid?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  onEnter?: () => void
  /** Entra no título do olho ("Mostrar nova senha"), que é o que o leitor de tela anuncia. */
  label: string
}) {
  const [shown, setShown] = useState(false)
  const [focused, setFocused] = useState(false)
  const verbo = shown ? 'Ocultar' : 'Mostrar'

  return (
    <div className="flex items-center" style={{ ...fieldBoxStyle({ focused, invalid }), gap: FIELD.gap }}>
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        type={shown ? 'text' : 'password'}
        /* O rótulo do `FormField` é um <span>, não um <label> ligado a este
           input: sem isto, o leitor de tela anuncia três campos de senha
           iguais, e aqui a diferença entre eles é a tela inteira. */
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault()
            onEnter()
          }
        }}
        className="flex-1 min-w-0 bg-transparent outline-none"
        style={fieldTextStyle}
      />
      {value && (
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          title={`${verbo} ${label}`}
          aria-label={`${verbo} ${label}`}
          className="wk-icon-btn shrink-0 flex items-center justify-center"
          style={{ width: 24, height: 24 }}
        >
          <Icon name={shown ? 'visibility_off' : 'visibility'} size={20} color={COLOR.navLabel} />
        </button>
      )}
    </div>
  )
}

export function PasswordDialog({
  account,
  onSubmit,
  onClose,
}: {
  /** Quem está trocando a senha. Texto, não campo: informa sem perguntar. */
  account: string
  /** No produto, quem fala com o servidor. Nesta maquete não há quem atenda. */
  onSubmit?: (current: string, next: string) => void
  onClose: () => void
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [done, setDone] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const longa = next.length >= 8
  const mista = /[a-zA-Z]/.test(next) && /\d/.test(next)
  const outra = next.length > 0 && next !== current
  const confere = repeat.length > 0 && repeat === next
  const pode = current.length > 0 && longa && mista && outra && confere

  const confirmar = () => {
    if (!pode) return
    onSubmit?.(current, next)
    setDone(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--wk-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Alterar senha"
    >
      <div
        className="bg-[var(--wk-surface)] flex flex-col overflow-hidden"
        style={{
          width: 420,
          maxWidth: '100%',
          borderRadius: 8,
          border: `1px solid ${COLOR.border}`,
          boxShadow: 'var(--wk-shadow-menu)',
        }}
      >
        {/* A moldura é a dos outros modais do projeto: cabeçalho de 64, título
            em Inter Medium 20/1.5, fechar de 24 na ponta. */}
        <div
          className="shrink-0 flex items-center gap-2"
          style={{ height: 64, paddingInline: 24, paddingBlock: 16 }}
        >
          <h2
            className="flex-1 min-w-0 truncate"
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}
          >
            {done ? 'Senha alterada' : 'Alterar senha'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {done ? (
          <div className="flex items-start gap-3" style={{ paddingInline: 24 }}>
            <Icon name="check_circle" size={24} color={COLOR.primary} className="shrink-0" />
            <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: '22px', color: COLOR.text }}>
              A senha de <strong style={{ fontWeight: 600 }}>{account}</strong> foi alterada. Use a nova no
              próximo acesso.
            </p>
          </div>
        ) : (
          <div style={{ paddingInline: 24 }}>
            {/* A conta, em texto: responde "a senha de quem?" sem virar uma
                pergunta que a tela já sabe responder sozinha. */}
            <p
              className="truncate"
              title={account}
              style={{
                fontFamily: FONT,
                fontSize: 13,
                lineHeight: '18px',
                color: COLOR.textSecondary,
                paddingBottom: 16,
              }}
            >
              Conta: {account}
            </p>

            <FormField label="Senha atual">
              <PasswordField
                label="senha atual"
                value={current}
                onChange={setCurrent}
                inputRef={firstRef}
                autoFocus
              />
            </FormField>

            <FormField label="Nova senha">
              <PasswordField label="nova senha" value={next} onChange={setNext} />
              {/* A lista nasce com a tela, apagada, e não depois do primeiro
                  erro: quem lê antes de digitar acerta de primeira. */}
              <ul className="flex flex-col gap-1" style={{ marginTop: 8 }}>
                <Rule ok={longa}>Pelo menos 8 caracteres</Rule>
                <Rule ok={mista}>Uma letra e um número</Rule>
                <Rule ok={outra}>Diferente da senha atual</Rule>
              </ul>
            </FormField>

            <FormField
              label="Repita a nova senha"
              error={repeat.length > 0 && repeat !== next ? 'As duas não são iguais.' : undefined}
            >
              <PasswordField
                label="repetição da nova senha"
                value={repeat}
                onChange={setRepeat}
                invalid={repeat.length > 0 && repeat !== next}
                onEnter={confirmar}
              />
            </FormField>
          </div>
        )}

        <div
          className="shrink-0 flex items-center justify-end gap-2"
          style={{ paddingInline: 24, paddingTop: 16, paddingBottom: 16 }}
        >
          {done ? (
            <Btn variant="primary" onClick={onClose}>
              Fechar
            </Btn>
          ) : (
            <>
              <Btn variant="ghost" onClick={onClose}>
                Cancelar
              </Btn>
              {/* O rótulo diz a ação, não o gesto: "Confirmar" serve para
                  qualquer coisa, e é justamente numa troca de senha que a
                  pessoa quer ler o que vai acontecer. */}
              <Btn variant="primary" disabled={!pode} onClick={confirmar}>
                Alterar senha
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
