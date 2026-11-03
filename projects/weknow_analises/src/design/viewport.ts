import { useEffect, useState } from 'react'

/**
 * O portal tem dois layouts, não um layout que encolhe.
 *
 * Até 767px não cabe menu lateral (255px) ao lado de conteúdo: o que sobra
 * são ~120px de coluna, e a folha inteira sai da tela. Acima disso o layout
 * de mesa funciona — medido a 760px, onde a coluna de cards ainda respira.
 *
 * 768 é o `md` do Tailwind, então o que este hook decide em JavaScript e o
 * que as classes `md:` decidem em CSS falam sempre do mesmo limite. Mudar um
 * sem o outro descasa o layout do componente.
 */
/**
 * A segunda condição é o celular deitado. Ali a largura passa de 767 — um
 * iPhone deitado tem 812 —, mas a altura cai para ~375: no layout de mesa, a
 * saudação, a busca grande e os chips comem 250px e sobra espaço para uma
 * linha de lista. `pointer: coarse` é o que separa esse caso de uma janela de
 * navegador baixa e larga, onde o layout de mesa continua sendo o certo.
 */
export const MOBILE_QUERY =
  '(max-width: 767px), (max-height: 500px) and (orientation: landscape) and (pointer: coarse)'

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return mobile
}

/**
 * Consulta de mídia avulsa — para o que muda de forma em larguras que não são
 * o corte entre celular e mesa. A tabela usa isto para *tirar colunas da
 * grade* em vez de escondê-las com `hidden`: coluna escondida por CSS continua
 * ocupando uma faixa do `grid-template-columns`, e a tabela de cadastro tem
 * sete delas — o buraco somava mais que o conteúdo.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setMatches(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])

  return matches
}
