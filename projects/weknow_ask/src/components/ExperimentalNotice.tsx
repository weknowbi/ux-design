import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { MENU_PANEL } from '@/components/browser/Menu'

/**
 * Aviso de funcionalidade experimental, sob o campo de pergunta.
 *
 * Fica na tela o tempo todo, então é só texto pequeno e cinza: "Saiba mais"
 * leva tracejado em vez de cor de link, para avisar que dá para clicar sem
 * chamar atenção. O clique abre uma explicação curta, para cima, porque o
 * aviso mora na borda de baixo da tela.
 */
export function ExperimentalNotice() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <p
      className="relative text-center"
      style={{ fontFamily: FONT, fontSize: 12, lineHeight: '16px', color: COLOR.textMuted }}
    >
      O Weknow Ask é uma{' '}
      {/* O popover se ancora na linha inteira, e não no botão: o botão fica
          fora do centro do texto e a caixa, centrada nele, poderia sair da tela. */}
      <span ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          style={{
            font: 'inherit',
            /* Texto e sublinhado na mesma cor do aviso do produto
               (--wk-text-muted, #8C98A8 no tema claro), sem escurecer no hover.
               Só o traço do sublinhado fica a 60% de opacidade. */
            color: COLOR.textMuted,
            textDecoration: 'underline',
            textDecorationColor: `color-mix(in srgb, ${COLOR.textMuted} 60%, transparent)`,
            textUnderlineOffset: 2,
          }}
        >
          funcionalidade experimental
        </button>

        {open && (
          <div
            role="dialog"
            aria-label="Funcionalidade experimental"
            className="absolute left-1/2 bottom-full z-30 text-left"
            style={{
              ...MENU_PANEL,
              transform: 'translateX(-50%)',
              marginBottom: 8,
              width: 400,
              maxWidth: 'calc(100vw - 32px)',
              padding: '12px 14px',
            }}
          >
            <span className="block" style={{ fontSize: 14, fontWeight: 600, lineHeight: '20px', color: COLOR.text }}>
              Funcionalidade experimental
            </span>
            {[
              'Recursos experimentais funcionam como um ambiente de testes dentro do software, onde novas ideias são exploradas e evoluídas.',
              'Essas funcionalidades estão em fase de desenvolvimento e são disponibilizadas para que os usuários possam testar, fornecer feedback e contribuir diretamente para a evolução do produto, antes de uma possível incorporação oficial.',
              'Por se tratarem de recursos em teste, podem passar por ajustes, mudanças ou ser removidos sem aviso prévio, sem garantia de lançamento definitivo.',
            ].map((text) => (
              <span
                key={text}
                className="block mt-2"
                style={{ fontSize: 13, lineHeight: 1.5, color: COLOR.textSecondary }}
              >
                {text}
              </span>
            ))}
          </div>
        )}
      </span>
      . Por favor, verifique as respostas.
    </p>
  )
}
