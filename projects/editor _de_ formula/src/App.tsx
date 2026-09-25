import { useState } from 'react'
import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import FormulaEditor from '@/components/FormulaEditor'
import bgExplorador from '@/imports/explorador-de-dados.png'

/**
 * Palco da tela: o editor de fórmula sobre o produto.
 *
 * O fundo é uma captura do Explorador de dados do Weknow, a tela de onde o
 * editor de fórmula é aberto de verdade. É imagem estática, só para dar
 * contexto — o véu do modal (`--wk-backdrop`) escurece ela o suficiente para
 * o diálogo se destacar, então ela entra em opacidade cheia.
 *
 * O tema escuro está desligado por ora, para a revisão do desenho acontecer
 * uma vez só. As variáveis dele continuam em `index.css` e o `design/theme.ts`
 * segue no lugar: religar é chamar `initTheme()` no `main.tsx` e devolver o
 * alternador aqui.
 */
export default function App() {
  const [editorOpen, setEditorOpen] = useState(true)
  const [savedFormula, setSavedFormula] = useState<string | null>(null)

  return (
    <div className="relative size-full overflow-hidden" style={{ background: COLOR.canvas, fontFamily: FONT }}>
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-top pointer-events-none select-none"
        style={{ backgroundImage: `url(${bgExplorador})` }}
        aria-hidden="true"
      />

      {editorOpen && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'var(--wk-backdrop)' }}
        >
          <FormulaEditor
            /* Reabrir continua de onde parou, senão salvar e voltar para
               ajustar uma vírgula significa reescrever tudo. */
            initialFormula={savedFormula ?? undefined}
            onClose={() => setEditorOpen(false)}
            onSave={(formula) => {
              setSavedFormula(formula)
              setEditorOpen(false)
            }}
          />
        </div>
      )}

      {!editorOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4">
            {savedFormula && (
              <div
                style={{
                  background: COLOR.surface,
                  border: `1px solid ${COLOR.border}`,
                  borderRadius: RADIUS.lg,
                  padding: 16,
                  minWidth: 320,
                  boxShadow: 'var(--wk-shadow-menu)',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: COLOR.textSecondary, paddingBottom: 8 }}>
                  Fórmula salva
                </p>
                <pre
                  className="whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--wk-mono)', fontSize: 13, color: COLOR.text, margin: 0 }}
                >
                  {savedFormula}
                </pre>
              </div>
            )}
            <Btn variant="primary" size="lg" onClick={() => setEditorOpen(true)}>
              Abrir o editor de fórmula
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
