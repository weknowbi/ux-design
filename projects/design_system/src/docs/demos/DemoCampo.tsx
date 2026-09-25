import { useState } from 'react'
import { FormField, Select, fieldBoxStyle, fieldTextStyle } from '@/components/Field'
import { Example, Specimen } from '@docs/blocks/Example'

const PASTAS = [
  { id: 'financeiro', label: 'Financeiro Hospitalar' },
  { id: 'atendimento', label: 'Atendimento e Triagem' },
  { id: 'materiais', label: 'Materiais e Medicamentos' },
]

/** Entrada de texto com a caixa do design system, o `fieldBoxStyle` real. */
function TextInput({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  invalid?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className="w-full outline-none"
      style={{ ...fieldBoxStyle({ focused, invalid }), ...fieldTextStyle }}
    />
  )
}

export function DemoCampo() {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('Prontuário')
  const [pasta, setPasta] = useState('financeiro')

  return (
    <>
      <Example
        title="Campo, auxílio e erro"
        note="Rótulo sempre visível. O erro muda a borda e escreve o motivo."
      >
        <Specimen label="com auxílio">
          <div style={{ width: 320 }}>
            <FormField label="Nome da conversa" hint="Aparece no histórico">
              <TextInput value={nome} onChange={setNome} placeholder="Ex.: Ocupação de leitos" />
            </FormField>
          </div>
        </Specimen>
        <Specimen label="com erro">
          <div style={{ width: 320 }}>
            <FormField label="Nome da conversa" error="Já existe uma conversa com esse nome.">
              <TextInput value={erro} onChange={setErro} invalid />
            </FormField>
          </div>
        </Specimen>
      </Example>

      <Example
        title="Seletor"
        note="Não é o select nativo. Fecha por Escape e por clique fora."
      >
        <div style={{ width: 320 }}>
          <FormField label="Pasta">
            <Select value={pasta} onChange={setPasta} options={PASTAS} ariaLabel="Pasta" />
          </FormField>
        </div>
      </Example>
    </>
  )
}
