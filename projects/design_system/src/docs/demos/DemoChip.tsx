import { Chip } from '@/components/Chip'
import { TableChip } from '@/components/Table'
import { Example, Specimen, DoDont, DoDontCard } from '@docs/blocks/Example'

export function DemoChip() {
  return (
    <>
      <Example title="Chip de contexto">
        <Specimen label="informativo">
          <Chip icon="folder">Financeiro Hospitalar</Chip>
        </Specimen>
        <Specimen label="acionável, com realce no hover">
          <Chip icon="task_alt" onClick={() => {}} title="Remover filtro">
            Tarefas
          </Chip>
        </Specimen>
      </Example>

      <Example title="Chip dentro de tabela" note="Outro componente: 22 de altura, neutro.">
        <TableChip>texto</TableChip>
        <TableChip>número</TableChip>
        <TableChip>data</TableChip>
        <TableChip>12 colunas</TableChip>
      </Example>

      <DoDont>
        <DoDontCard kind="do" label="Rótulo curto, uma ou duas palavras.">
          <Chip icon="folder">Financeiro</Chip>
        </DoDontCard>
        <DoDontCard
          kind="dont"
          label="Frase inteira dentro do chip: virou parágrafo em forma de pílula."
        >
          <Chip icon="folder">Financeiro Hospitalar do trimestre passado</Chip>
        </DoDontCard>
      </DoDont>
    </>
  )
}
