import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { useEllipsisTooltip } from '@/components/Tooltip'
import { IconBtn } from '@ds/Btn'
import { Icon } from '@/components/icons'
import { Example } from '@docs/blocks/Example'

/**
 * A dica de produção. Os dois blocos abaixo têm a MESMA largura de propósito:
 * o de cima tem nome que cabe e o de baixo não. Passe o ponteiro nos dois,
 * só o cortado arma a dica, e é essa a regra que a página descreve.
 */

/** Linha de lista com nome que pode ou não caber. */
function Nome({ texto }: { texto: string }) {
  const dica = useEllipsisTooltip<HTMLSpanElement>(texto)
  return (
    <>
      <span
        ref={dica.ref}
        onMouseEnter={dica.show}
        onMouseLeave={dica.hide}
        className="block truncate"
        style={{
          width: 220,
          padding: '8px 12px',
          borderRadius: RADIUS.sm,
          border: `1px solid ${COLOR.border}`,
          fontFamily: FONT,
          fontSize: 14,
          color: COLOR.text,
        }}
      >
        {texto}
      </span>
      {dica.tooltip}
    </>
  )
}

/** Botão de ícone: aqui a dica aparece sempre, porque não há texto para cortar. */
function Acao({ icone, rotulo }: { icone: string; rotulo: string }) {
  const dica = useEllipsisTooltip<HTMLSpanElement>(rotulo, true)
  return (
    <>
      <span ref={dica.ref} onMouseEnter={dica.show} onMouseLeave={dica.hide} className="inline-flex">
        <IconBtn title={rotulo}>
          <Icon name={icone} size={24} />
        </IconBtn>
      </span>
      {dica.tooltip}
    </>
  )
}

export function DemoDica() {
  return (
    <>
      <Example
        title="Só aparece quando o texto foi cortado"
        note="A caixa é a mesma nos dois. Passe o ponteiro e espere 400ms. O nome curto não mostra nada, porque não há nada escondido."
      >
        <div className="flex flex-col gap-3">
          <Nome texto="Glosas 2024" />
          <Nome texto="Faturamento e glosas por convênio, consolidado 2024" />
        </div>
      </Example>

      <Example
        title="Botão só de ícone"
        note="Aqui não há texto para cortar, então a dica aparece sempre. O título também vira o rótulo acessível, já que a dica serve a quem vê e o aria-label a quem ouve."
      >
        <Acao icone="share" rotulo="Compartilhar pasta" />
        <Acao icone="download" rotulo="Baixar como planilha" />
        <Acao icone="delete" rotulo="Excluir pasta" />
      </Example>
    </>
  )
}
