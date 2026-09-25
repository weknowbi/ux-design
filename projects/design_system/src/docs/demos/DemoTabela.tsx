import { useState } from 'react'
import { Table, TableChip, type Column, type SortDir } from '@/components/Table'
import { Example } from '@docs/blocks/Example'

type Fonte = { nome: string; tipo: string; linhas: string; atualizada: string }

const FONTES: Fonte[] = [
  { nome: 'Ocupação de leitos', tipo: 'tabela', linhas: '12.480', atualizada: 'há 2 horas' },
  { nome: 'Atendimentos por turno', tipo: 'consulta', linhas: '3.117', atualizada: 'há 1 dia' },
  { nome: 'Materiais em falta', tipo: 'tabela', linhas: '204', atualizada: 'há 12 minutos' },
]

const COLUNAS: Column<Fonte>[] = [
  { key: 'nome', header: 'Fonte', sortable: true },
  { key: 'tipo', header: 'Tipo', width: 120, render: (r) => <TableChip>{r.tipo}</TableChip> },
  { key: 'linhas', header: 'Linhas', width: 110, align: 'right', sortable: true },
  { key: 'atualizada', header: 'Atualizada', width: 160, nowrap: true },
]

export function DemoTabela() {
  const [sortKey, setSortKey] = useState('nome')
  const [dir, setDir] = useState<SortDir>('asc')

  const ordenar = (key: string) => {
    if (key === sortKey) setDir(dir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setDir('asc')
    }
  }

  const linhas = [...FONTES].sort((a, b) => {
    const [x, y] = [String(a[sortKey as keyof Fonte]), String(b[sortKey as keyof Fonte])]
    return dir === 'asc' ? x.localeCompare(y) : y.localeCompare(x)
  })

  return (
    <>
      <Example
        title="Com moldura (boxed)"
        note="Quando a tabela está dentro de outro conteúdo. Clique no cabeçalho para ordenar."
      >
        <div className="w-full">
          <Table
            columns={COLUNAS}
            rows={linhas}
            rowKey={(r) => r.nome}
            sortKey={sortKey}
            sortDir={dir}
            onSort={ordenar}
          />
        </div>
      </Example>

      <Example
        title="Sem moldura (plain)"
        note="Quando a tabela é o conteúdo da tela."
      >
        <div className="w-full">
          <Table variant="plain" columns={COLUNAS} rows={linhas} rowKey={(r) => r.nome} />
        </div>
      </Example>
    </>
  )
}
