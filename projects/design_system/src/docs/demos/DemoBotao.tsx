import { Btn, IconBtn, type BtnVariant } from '@/components/Btn'
import { Icon } from '@/components/icons'
import { Example, Specimen, DoDont, DoDontCard } from '@docs/blocks/Example'

/* Os botões abaixo são o `Btn` de produção: hover, sombra e anel de foco são
   os do componente, não uma imitação.

   O rótulo de cada um é o nome da variante, não uma ação inventada. Cinco
   botões escritos "Salvar" mostram cinco estilos e não dizem qual é qual, e
   é o nome que a página inteira usa para falar deles. */

const VARIANTS: { id: BtnVariant; label: string }[] = [
  { id: 'primary', label: 'Primária' },
  { id: 'secondary', label: 'Secundária' },
  { id: 'outlined', label: 'Contornada' },
  { id: 'ghost', label: 'Fantasma' },
  { id: 'danger', label: 'Destrutiva' },
]

export function DemoBotao() {
  return (
    <>
      <Example title="Variantes">
        {VARIANTS.map((v) => (
          <Btn key={v.id} variant={v.id}>
            {v.label}
          </Btn>
        ))}
      </Example>

      <Example title="Tamanhos">
        <Btn size="sm">Pequeno</Btn>
        <Btn size="md">Médio</Btn>
        <Btn size="lg">Grande</Btn>
      </Example>

      <Example title="Com ícone">
        <Specimen label="à esquerda, reforça o rótulo">
          <Btn iconLeft={<Icon name="add" size={20} />}>Nova pasta</Btn>
        </Specimen>
        <Specimen label="à direita, indica direção">
          <Btn variant="outlined" iconRight={<Icon name="arrow_forward" size={20} />}>
            Continuar
          </Btn>
        </Specimen>
        <Specimen label="só ícone, com dica">
          <IconBtn title="Mais opções">
            <Icon name="more_horiz" />
          </IconBtn>
        </Specimen>
      </Example>

      <Example title="Desabilitado">
        {VARIANTS.map((v) => (
          <Btn key={v.id} variant={v.id} disabled>
            {v.label}
          </Btn>
        ))}
      </Example>

      <DoDont>
        <DoDontCard kind="do" label="Uma primária. A ação de apoio recai para outra variante.">
          <div className="flex gap-3">
            <Btn>Criar pasta</Btn>
            <Btn variant="ghost">Cancelar</Btn>
          </div>
        </DoDontCard>
        <DoDontCard kind="dont" label="Duas primárias: nenhuma das duas se destaca.">
          <div className="flex gap-3">
            <Btn>Criar pasta</Btn>
            <Btn>Cancelar</Btn>
          </div>
        </DoDontCard>
      </DoDont>
    </>
  )
}
