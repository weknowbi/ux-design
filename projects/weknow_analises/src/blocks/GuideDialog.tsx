import { useRef, useState } from 'react'
import { Btn } from '@ds/Btn'
import { fieldBoxStyle, fieldTextStyle } from '@ds/Field'
import { Modal, ModalFooter } from '@ds/Modal'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { Radio } from '@/blocks/PublishDialog'
import { guideSet } from '@/engine/assistant'
import { PAINEL_LOOK, appTheme, type Board, type Op } from '@/engine/board'
import { EXAMPLE_GUIDE, EXAMPLE_GUIDE_NAME, GUIDE_ACCEPT, GUIDE_MAX_BYTES, WEKNOW_GUIDE, WEKNOW_GUIDE_NAME } from '@/engine/guide'

/**
 * "Diretriz visual": como o dashboard deve parecer. O padrão é o do Weknow,
 * e é o que deixa todo dashboard criado aqui com a cara dos do portal. Quem
 * quer outro resultado escreve a sua ou envia um arquivo de texto.
 *
 * Trocar com o painel já montado aplica a diretriz nele na hora (tema e
 * visual); voltar ao padrão volta o visual do Weknow. Tudo entra no desfazer.
 */
export function GuideDialog({ board, onOps, onClose }: { board: Board; onOps: (o: Op[]) => void; onClose: () => void }) {
  const [own, setOwn] = useState(!!board.guide)
  const [name, setName] = useState(board.guide?.name ?? 'Diretriz própria')
  const [text, setText] = useState(board.guide?.text ?? WEKNOW_GUIDE)
  const [focused, setFocused] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const painel = board.widgets.find((w) => w.kind === 'painel')
  const changed = own ? !board.guide || board.guide.text !== text.trim() || board.guide.name !== name : !!board.guide
  const canSave = !own || !!text.trim()

  const pick = async (file: File | undefined) => {
    if (!file) return
    if (!/\.(md|txt)$/i.test(file.name)) return setFileError('Envie um arquivo de texto, em .md ou .txt.')
    if (file.size > GUIDE_MAX_BYTES) return setFileError('O arquivo passa de 100 KB. Deixe só o que a IA precisa seguir.')
    try {
      const read = (await file.text()).trim()
      if (!read) return setFileError('O arquivo está vazio.')
      setText(read)
      setName(file.name.replace(/\.(md|txt)$/i, ''))
      setFileError(null)
    } catch {
      setFileError('Não consegui ler esse arquivo. Envie um texto em .md ou .txt.')
    }
  }

  const save = () => {
    const guide = own ? { name: name.trim() || 'Diretriz própria', text: text.trim() } : undefined
    const ops: Op[] = [{ op: 'guide', guide }]
    if (painel)
      ops.push({ op: 'painel', id: painel.id, set: guide ? guideSet(board, guide.text) : { ...PAINEL_LOOK, theme: appTheme() } })
    onOps(ops)
    onClose()
  }

  return (
    <Modal title="Diretriz visual" width={720} onClose={onClose}>
      <div className="min-h-0 overflow-y-auto flex flex-col" style={{ fontFamily: FONT, padding: '0 24px 8px', maxHeight: 'min(620px, 70vh)' }}>
        <p style={{ fontSize: 14, lineHeight: '20px', color: COLOR.textSecondary, margin: '0 0 12px' }}>
          A IA segue esta diretriz para montar o visual do dashboard. A configuração do metadado continua dizendo o que mostrar.
        </p>

        <div role="radiogroup" aria-label="Diretriz" className="flex flex-col" style={{ gap: 4, marginBottom: 12 }}>
          <Radio
            checked={!own}
            onSelect={() => setOwn(false)}
            label={`${WEKNOW_GUIDE_NAME} (recomendado)`}
            hint="O mesmo resultado dos dashboards do portal: painel executivo, aberto no tema do Weknow com o botão para trocar, paleta azul."
          />
          <Radio checked={own} onSelect={() => setOwn(true)} label="Diretriz própria" hint="Escreva a sua ou envie um arquivo. Vale só para este dashboard." />
        </div>

        {own ? (
          <>
            {/* Como escrever: o formato do arquivo e o que a IA aplica no
                visual, para a diretriz dar o resultado que a pessoa espera. */}
            <div className="flex items-start rounded-lg" style={{ gap: 10, padding: '12px 14px', marginBottom: 12, background: 'var(--wk-surface-subtle)' }}>
              <Icon name="info" size={20} color={COLOR.navLabel} className="shrink-0" />
              <div className="flex flex-col" style={{ gap: 6, fontSize: 13, lineHeight: '19px', color: COLOR.textSecondary }}>
                <span style={{ fontWeight: 600, color: COLOR.text }}>Como funciona</span>
                <span>
                  Escreva aqui ou envie um arquivo <b style={{ fontWeight: 600 }}>.md</b> ou <b style={{ fontWeight: 600 }}>.txt</b> de até 100 KB. O texto do arquivo entra no campo para você revisar antes de usar.
                </span>
                <span>
                  Use frases curtas, uma por linha. Para o visual, a IA entende: tema claro ou escuro ao abrir (sem ele, abre no do Weknow); cores azul, verde, roxo ou uma cor própria em hexadecimal (como #0F766E); densidade compacta ou confortável; cantos retos, suaves ou arredondados; linhas retas ou curvas; e seções a esconder (como “sem a tabela de desempenho”).
                </span>
                <span>Vermelho, laranja e amarelo ficam reservados para piora e alerta.</span>
                <button
                  type="button"
                  onClick={() => {
                    setText(EXAMPLE_GUIDE)
                    setName(EXAMPLE_GUIDE_NAME)
                    setFileError(null)
                  }}
                  className="self-start hover:underline"
                  style={{ color: COLOR.primary, fontWeight: 500 }}
                >
                  Ver um exemplo
                </button>
              </div>
            </div>
            <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 8 }}>
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
                {board.guide || name !== 'Diretriz própria' ? name : 'Começa com o texto do padrão Weknow, para ajustar.'}
              </span>
              <Btn variant="ghost" size="sm" iconLeft="upload" onClick={() => fileRef.current?.click()}>
                Enviar arquivo
              </Btn>
              <input
                ref={fileRef}
                type="file"
                accept={GUIDE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  pick(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
            {fileError && (
              <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--an-danger-text)', marginBottom: 8 }}>
                {fileError}
              </span>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Texto da diretriz"
              className="block w-full resize-none outline-none"
              style={{ ...fieldBoxStyle({ focused }), ...fieldTextStyle, height: 280, fontSize: 14, lineHeight: '21px', padding: '12px 14px' }}
            />
          </>
        ) : (
          <>
            <span className="flex items-center" style={{ gap: 6, fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary, marginBottom: 6 }}>
              <Icon name="lock" size={14} color={COLOR.navLabel} />
              {WEKNOW_GUIDE_NAME}
            </span>
            <pre className="whitespace-pre-wrap rounded-lg" style={{ margin: 0, padding: '12px 14px', fontFamily: FONT, fontSize: 14, lineHeight: '21px', color: COLOR.text, background: 'var(--wk-surface-subtle)' }}>
              {WEKNOW_GUIDE}
            </pre>
          </>
        )}
      </div>
      <ModalFooter padTop={8}>
        {changed ? (
          <>
            <Btn variant="ghost" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn variant="primary" disabled={!canSave} onClick={save}>
              {own ? 'Usar esta diretriz' : `Voltar ao ${WEKNOW_GUIDE_NAME}`}
            </Btn>
          </>
        ) : (
          <Btn variant="outlined" onClick={onClose}>
            Fechar
          </Btn>
        )}
      </ModalFooter>
    </Modal>
  )
}
