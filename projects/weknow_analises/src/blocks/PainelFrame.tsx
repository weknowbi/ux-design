import { useEffect, useMemo, useRef } from 'react'
import type { IndicatorId } from '@/engine/semantic'
import { lookOf, type Op, type PainelState, type Widget } from '@/engine/board'
import { painelSpec } from '@/engine/painel'

type Painel = Extract<Widget, { kind: 'painel' }>

/**
 * O painel executivo, desenhado pela página do modelo de referência
 * (`public/modelos/painel-executivo.html`) numa moldura, com os números do
 * metadado do dashboard.
 *
 * O estado mora no documento do dashboard, como o de qualquer bloco, e as
 * duas pontas conversam por mensagem:
 *
 *   painel → editor   "carreguei": o editor manda a base e o estado
 *   editor → painel   o que a conversa ou o desfazer mudou
 *   painel → editor   o que a pessoa mudou clicando (período, filtro,
 *                     destaque, tema), que vira operação e entra no desfazer
 *
 * O visual (paleta, cor própria, densidade, cantos, linhas, seções) só vem
 * da conversa: dentro do painel não há controle para ele.
 *
 * A moldura só carrega uma vez: trocar de tema ou de filtro não pisca.
 */
export function PainelFrame({
  w,
  ind,
  onOps,
  onKey,
  padBottom = 0,
}: {
  w: Painel
  ind: IndicatorId
  onOps: (o: Op[]) => void
  /** Atalho apertado com o foco dentro do painel (F e Esc), que a moldura engoliria. */
  onKey?: (key: 'f' | 'escape') => void
  padBottom?: number
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const spec = useMemo(() => painelSpec(ind), [ind])
  const state: PainelState = { period: w.period, filter: w.filter ?? 'all', highlight: w.highlight ?? null, theme: w.theme, ...lookOf(w) }
  const lookKey = JSON.stringify(lookOf(w))
  const latest = useRef({ w, onOps, onKey, spec, state })
  latest.current = { w, onOps, onKey, spec, state }

  // Só o id: a moldura carrega uma vez por painel; o resto vai por mensagem.
  const src = useMemo(() => `${import.meta.env.BASE_URL}modelos/painel-executivo.html?embed=1&theme=${w.theme}&pad=${padBottom}`, [w.id])

  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ type: 'painel:set', state }, location.origin)
  }, [state.period, state.filter, state.highlight, state.theme, lookKey])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== ref.current?.contentWindow) return
      const cur = latest.current
      if (e.data?.type === 'painel:ready') {
        ref.current?.contentWindow?.postMessage({ type: 'painel:spec', spec: cur.spec, state: cur.state }, location.origin)
        return
      }
      if (e.data?.type === 'painel:key') {
        if (e.data.key === 'f' || e.data.key === 'escape') cur.onKey?.(e.data.key)
        return
      }
      if (e.data?.type !== 'painel:state') return
      const s = e.data.state as PainelState
      const set: Partial<PainelState> = {}
      if (s.period !== cur.state.period) set.period = s.period
      if (s.filter !== cur.state.filter) set.filter = s.filter
      if (s.highlight !== cur.state.highlight) set.highlight = s.highlight
      if (s.theme !== cur.state.theme) set.theme = s.theme
      if (Object.keys(set).length) cur.onOps([{ op: 'painel', id: cur.w.id, set }])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return <iframe ref={ref} src={src} title="Painel executivo" className="block w-full h-full border-0" />
}
