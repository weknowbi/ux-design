import { useState, type ReactNode } from 'react'
import { COLOR, FONT, RADIUS, TABLE } from '@/design/tokens'
import { Btn, IconBtn } from '@ds/Btn'
import { FIELD, FormField, fieldBoxStyle, fieldTextStyle } from '@ds/Field'
import { Switch } from '@ds/Switch'
import { FilterChip } from '@/components/Hero'
import { Icon } from '@/components/icons'
import { MCP_CONNECTION } from '@/data/settings'

/**
 * Conectar ao Claude/ChatGPT — a tela `#/mcp-connect` do Weknow, refeita com
 * as peças do design system.
 *
 * O conteúdo e a ordem são os da produção: os mesmos passos, os mesmos
 * comandos gerados, o mesmo texto. O que muda é o vocabulário visual, que lá
 * era o de outra biblioteca:
 *
 *   abas         viraram os chips que as telas irmãs de Configurações já usam
 *                para alternar entre si. Aba sublinhada não existe no sistema.
 *   faixa cinza  o aviso "O ChatGPT não aceita MCP local" era uma faixa
 *                permanente; virou a linha de explicação do modo escolhido,
 *                que é o lugar onde a pessoa decide entre os dois.
 *   campos       rótulo flutuante na borda virou o `FormField`: rótulo em
 *                cima, sempre visível, caixa de 38.
 *   dados        URL, conta e usuário eram código solto ao lado de um rótulo.
 *                Viraram linhas de leitura com o copiar na ponta, porque são
 *                exatamente o que a pessoa vai colar em outro lugar.
 *   checkbox     "Fixar a conta" muda o conteúdo gerado na hora: é switch.
 *   copiar       os botões contornados soltos abaixo de cada bloco viraram o
 *                ícone de copiar na barra do próprio bloco, junto do nome do
 *                arquivo. Assim fica claro O QUE está sendo copiado.
 */

type Mode = 'local' | 'remoto'

const MONO = "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Consolas, monospace"

const TEXT: React.CSSProperties = { fontFamily: FONT, fontSize: 14, lineHeight: '22px', color: COLOR.text }
const MUTED: React.CSSProperties = { fontFamily: FONT, fontSize: 13, lineHeight: '20px', color: COLOR.textMuted }

/** Trecho de código dentro de uma frase: nome de arquivo, caminho, comando curto. */
function Code({ children }: { children: ReactNode }) {
  return (
    <code
      className="inline-block max-w-full align-baseline px-1 rounded-[4px] [overflow-wrap:anywhere]"
      style={{ fontFamily: MONO, fontSize: 12.5, background: COLOR.surfaceSubtle, border: `1px solid ${TABLE.border}` }}
    >
      {children}
    </code>
  )
}

function useCopied() {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return { copied, copy }
}

/**
 * Copiar, sempre o mesmo: o `IconBtn` do sistema, que é a peça para ação em
 * cabeçalho e em linha. Já foi o botão fantasma com rótulo na barra do bloco
 * de código, e ao lado do ícone solto das linhas de dados a tela tinha dois
 * "copiar" de desenhos diferentes. O fantasma também não é para isso: ele é a
 * ação de menor peso ao lado de uma primária, o "Cancelar" de um "Salvar".
 *
 * O retorno é o ícone virando confirmação em verde por um instante; a dica
 * diz o que vai ser copiado.
 */
function CopyButton({ text, what }: { text: string; what: string }) {
  const { copied, copy } = useCopied()
  return (
    <IconBtn title={copied ? 'Copiado' : `Copiar ${what}`} onClick={() => copy(text)}>
      <Icon name={copied ? 'check' : 'content_copy'} size={20} color={copied ? COLOR.ok : COLOR.navLabel} />
    </IconBtn>
  )
}

function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Bloco de código com barra própria: o nome do que está ali à esquerda, as
 * ações à direita. Sem conteúdo (a URL pública ainda vazia), o bloco continua
 * no lugar e diz o que falta, em vez de sumir e deslocar os passos de baixo.
 */
function CodeBlock({
  label,
  code,
  file,
  empty,
}: {
  label: string
  code?: string
  /** Nome do arquivo para o botão Baixar. Sem ele, só há Copiar. */
  file?: { name: string; type?: string }
  empty?: string
}) {
  return (
    <div className="overflow-hidden" style={{ border: `1px solid ${TABLE.border}`, borderRadius: RADIUS.md }}>
      <div
        className="flex items-center gap-1 pl-4 pr-1"
        style={{ height: 40, borderBottom: `1px solid ${TABLE.border}`, background: COLOR.surface }}
      >
        <span className="flex-1 min-w-0 truncate text-[12px] leading-[16px] font-medium" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
          {label}
        </span>
        {code && file && (
          <IconBtn title={`Baixar ${file.name}`} onClick={() => download(file.name, code, file.type)}>
            <Icon name="download" size={20} color={COLOR.navLabel} />
          </IconBtn>
        )}
        {code && <CopyButton text={code} what={label.startsWith('Prompt') ? 'o comando' : label} />}
      </div>
      {code ? (
        <pre
          className="m-0 px-4 py-3 overflow-x-auto whitespace-pre-wrap [overflow-wrap:anywhere]"
          style={{ fontFamily: MONO, fontSize: 12.5, lineHeight: '20px', color: COLOR.text, background: COLOR.surfaceSubtle }}
        >
          {code}
        </pre>
      ) : (
        <p className="px-4 py-4" style={{ ...MUTED, background: COLOR.surfaceSubtle }}>
          {empty}
        </p>
      )}
    </div>
  )
}

/**
 * Um passo de lista numerada.
 *
 * O número é texto, na mesma letra do passo: não é componente, é tipografia
 * de lista. Já foi uma pastilha azul de 24px, e ela era uma peça que o sistema
 * não declara — com cor de marca, ainda por cima, que aqui não marca estado
 * nenhum (regra: cor sozinha não indica estado, e cor sem estado é enfeite).
 * O que ordena a leitura é a coluna recuada, e ela continua: o número fica
 * pendurado à esquerda e o texto de todos os passos alinha num eixo só.
 */
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span
        aria-hidden
        className="shrink-0 text-right tabular-nums font-semibold"
        style={{ ...TEXT, width: 18, color: COLOR.textSecondary }}
      >
        {n}.
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-3" style={TEXT}>
        {children}
      </div>
    </li>
  )
}

/** Linha de leitura dos dados da conta: rótulo, valor e copiar. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-3 min-h-[44px] px-4"
      style={{ borderTop: `1px solid ${TABLE.border}` }}
    >
      <span className="shrink-0 w-[104px] md:w-[112px]" style={{ ...MUTED, color: COLOR.textSecondary }}>
        {label}
      </span>
      <span className="flex-1 min-w-0 truncate" style={{ fontFamily: MONO, fontSize: 12.5, color: COLOR.text }} title={value}>
        {value}
      </span>
      <CopyButton text={value} what={label === 'Conta' ? 'a conta' : label === 'Usuário' ? 'o usuário' : `a ${label}`} />
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full outline-none"
      style={{ ...fieldBoxStyle({ focused }), ...fieldTextStyle, height: FIELD.height }}
    />
  )
}

/** Moldura dos dados que alimentam os comandos: lido em cima, editável embaixo. */
function ConnectionPanel({
  children,
  rows,
  columns = 'md:grid-cols-2',
}: {
  children: ReactNode
  rows: { label: string; value: string }[]
  /** Grade dos campos na mesa; no celular é sempre uma coluna. */
  columns?: string
}) {
  return (
    <section
      aria-label="Dados da conexão"
      className="flex flex-col"
      style={{ border: `1px solid ${TABLE.border}`, borderRadius: TABLE.radius }}
    >
      <h3 className="px-4 pt-3 pb-2 text-[13px] font-semibold leading-[20px]" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
        Dados da conexão
      </h3>
      {rows.map((r) => (
        <InfoRow key={r.label} {...r} />
      ))}
      <div
        className={`grid gap-x-4 px-4 pt-4 grid-cols-1 ${columns}`}
        style={{ borderTop: `1px solid ${TABLE.border}` }}
      >
        {children}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ local */

function LocalSteps() {
  const { baseUrl, account, user } = MCP_CONNECTION
  const [folder, setFolder] = useState('C:\\weknow-mcp')
  const [name, setName] = useState('weknow')
  const [manual, setManual] = useState(false)

  const dir = folder.replace(/[\\/]+$/, '') || 'C:\\weknow-mcp'
  const exe = `${dir}\\weknow-mcp.exe`
  const server = name.trim() || 'weknow'

  const setup = `"${exe}" setup --base-url "${baseUrl}" --account "${account}" --user "${user}" --name "${server}"`
  const json = JSON.stringify(
    {
      mcpServers: {
        [server]: {
          command: exe,
          args: [],
          env: { WEKNOW_BASE_URL: baseUrl, WEKNOW_ACCOUNT_TOKEN: account, WEKNOW_USER: user },
        },
      },
    },
    null,
    2,
  )

  return (
    <>
      <ConnectionPanel
        rows={[
          { label: 'URL do Weknow', value: baseUrl },
          { label: 'Conta', value: account },
          { label: 'Usuário', value: user },
        ]}
      >
        <FormField label="Pasta onde o MCP foi extraído">
          <TextInput value={folder} onChange={setFolder} />
        </FormField>
        <FormField label="Nome do servidor no Claude Desktop">
          <TextInput value={name} onChange={setName} />
        </FormField>
      </ConnectionPanel>

      <ol className="flex flex-col gap-6">
        <Step n={1}>
          <p>Baixe o MCP do Weknow (Windows):</p>
          <div>
            <Btn iconLeft="download">Baixar o MCP</Btn>
          </div>
        </Step>
        <Step n={2}>
          <p>
            Extraia o conteúdo do zip na pasta informada acima, de forma que exista o arquivo <Code>{exe}</Code>.
          </p>
        </Step>
        <Step n={3}>
          <p>
            Abra o Prompt de Comando (cmd) e execute o comando abaixo. Ele pede a sua senha do Weknow, testa o login,
            guarda a senha protegida no Windows (DPAPI) e grava a configuração no Claude Desktop, mantendo uma cópia
            do arquivo anterior (.bak).
          </p>
          <CodeBlock label="Prompt de Comando" code={setup} />
        </Step>
        <Step n={4}>
          <p>Feche o Claude Desktop pelo ícone da bandeja do Windows (Sair; fechar a janela não basta) e abra-o de novo.</p>
        </Step>
      </ol>

      <div className="flex flex-col gap-3">
        {/* O fantasma do sistema, mas com quebra de linha: o `Btn` não quebra
            o rótulo, e esta frase passa de 375px no celular. */}
        <button
          type="button"
          aria-expanded={manual}
          onClick={() => setManual((v) => !v)}
          className="self-start -ml-3 flex items-start gap-1.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--wk-btn-ghost-hover)] focus-visible:shadow-[var(--wk-btn-focus-ring)] outline-none"
          style={{ fontFamily: FONT, fontSize: 14, lineHeight: '20px', color: COLOR.textSecondary }}
        >
          <Icon name={manual ? 'expand_less' : 'expand_more'} size={20} color="currentColor" className="shrink-0" />
          Prefiro editar a configuração do Claude Desktop manualmente
        </button>
        {manual && (
          <div className="flex flex-col gap-3" style={TEXT}>
            <p>
              Inclua o servidor abaixo em <Code>mcpServers</Code> no arquivo{' '}
              <Code>%APPDATA%\Claude\claude_desktop_config.json</Code>. A senha não vai no arquivo: rode o comando do
              passo 3 uma vez para guardá-la, ou inclua <Code>WEKNOW_PASSWORD</Code> em <Code>env</Code> só na
              primeira execução e remova depois (a senha passa a ficar no cofre DPAPI).
            </p>
            <CodeBlock
              label="claude_desktop_config.json"
              code={json}
              file={{ name: 'claude_desktop_config.json', type: 'application/json' }}
            />
          </div>
        )}
      </div>
    </>
  )
}

/* ----------------------------------------------------------------- remoto */

function RemoteSteps() {
  const { baseUrl, account } = MCP_CONNECTION
  const [publicUrl, setPublicUrl] = useState('')
  const [port, setPort] = useState('8000')
  const [folder, setFolder] = useState('C:\\weknow-mcp')
  const [pinAccount, setPinAccount] = useState(false)

  const dir = folder.replace(/[\\/]+$/, '') || 'C:\\weknow-mcp'
  const exe = `${dir}\\weknow-mcp.exe`
  const url = publicUrl.trim().replace(/\/+$/, '').replace(/\/mcp$/i, '')
  const ready = Boolean(url && port.trim())
  const pending = 'Preencha a URL pública e a porta acima para gerar este conteúdo.'

  const env = ready
    ? [
        'WEKNOW_MCP_TRANSPORT=http',
        `WEKNOW_BASE_URL=${baseUrl}`,
        `WEKNOW_MCP_PUBLIC_URL=${url}`,
        ...(pinAccount ? [`WEKNOW_ACCOUNT_TOKEN=${account}`] : []),
        'WEKNOW_MCP_HOST=127.0.0.1',
        `WEKNOW_MCP_PORT=${port.trim()}`,
        '',
      ].join('\n')
    : undefined

  return (
    <>
      {/* A porta é um número de quatro dígitos: meia linha para ela deixava a
          URL, que é o campo longo, com a mesma largura de um número. */}
      <ConnectionPanel rows={[{ label: 'URL do Weknow', value: baseUrl }]} columns="md:grid-cols-[1fr_160px]">
        <FormField label="URL pública do MCP (sem /mcp)" hint="Endereço HTTPS pelo qual o Claude e o ChatGPT acessam o MCP.">
          <TextInput value={publicUrl} onChange={setPublicUrl} placeholder="https://mcp.empresa.com.br" />
        </FormField>
        <FormField label="Porta local">
          <TextInput type="number" value={port} onChange={setPort} />
        </FormField>
        <div className="col-span-full">
          <FormField label="Pasta onde o MCP foi extraído (na máquina do MCP)">
            <TextInput value={folder} onChange={setFolder} />
          </FormField>
        </div>
        {/* Linha de preferência com o switch na ponta: a linha não é clicável
            inteira, porque o controle já é um botão (regra 2 dos controles). */}
        <div className="col-span-full flex items-start gap-4 pb-4">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span style={TEXT}>Fixar a conta</span>
            <span style={MUTED}>
              A página de login do MCP não pede a conta. Fixada, ela vai no <Code>.env</Code>: <Code>{account}</Code>
            </span>
          </div>
          <div className="pt-0.5">
            <Switch checked={pinAccount} onChange={setPinAccount} label="Fixar a conta" />
          </div>
        </div>
      </ConnectionPanel>

      <ol className="flex flex-col gap-6">
        <Step n={1}>
          <p>Na máquina que vai rodar o MCP, baixe e extraia o MCP do Weknow:</p>
          <div>
            <Btn iconLeft="download">Baixar o MCP</Btn>
          </div>
          <p style={MUTED}>
            Extraia o conteúdo do zip na pasta informada acima, de forma que exista o arquivo <Code>{exe}</Code>.
          </p>
        </Step>
        <Step n={2}>
          <p>
            Salve o arquivo abaixo com o nome <Code>.env</Code> na pasta do <Code>weknow-mcp.exe</Code> (se o navegador
            mudar o nome ao baixar, renomeie para <Code>.env</Code>). O serviço do MCP lê a configuração desse arquivo.
          </p>
          <CodeBlock label=".env" code={env} file={{ name: '.env' }} empty={pending} />
        </Step>
        <Step n={3}>
          <p>
            Abra o Prompt de Comando (cmd) como administrador e execute o comando abaixo. Ele instala o MCP como
            serviço Windows (<Code>weknow-mcp</Code>, início automático, conta LocalSystem) e o inicia. A instalação é
            recusada se o <Code>.env</Code> não estiver na pasta ou se a configuração for inválida.
          </p>
          <CodeBlock label="Prompt de Comando (administrador)" code={`"${exe}" service install && "${exe}" service start`} />
          <p style={MUTED}>
            Para conferir o estado do serviço, rode <Code>"{exe}" service status</Code>. O log fica em{' '}
            <Code>%ProgramData%\weknow-mcp\weknow-mcp\logs\weknow-mcp.log</Code>. Para atualizar o MCP, pare o serviço
            (<Code>service stop</Code>), extraia o zip novo por cima da pasta mantendo o <Code>.env</Code> e inicie-o de
            novo (<Code>service start</Code>). Para remover, use <Code>service uninstall</Code>.
          </p>
        </Step>
        <Step n={4}>
          <p>
            Publique o MCP em HTTPS na URL pública informada acima: por um túnel (Cloudflare Tunnel, recomendado), por
            um proxy reverso (Apache ou IIS) ou com TLS direto no MCP. Os detalhes estão no README do MCP (
            <Code>serverapps\mcpserver\README.md</Code>, seção "Expor o MCP em HTTPS").
          </p>
        </Step>
        <Step n={5}>
          <p>Cadastre o conector no Claude ou no ChatGPT com a URL abaixo:</p>
          <CodeBlock label="URL do conector" code={ready ? `${url}/mcp` : undefined} empty={pending} />
          <ul className="flex flex-col gap-2">
            <li>
              <strong className="font-semibold">Claude:</strong> Settings &gt; Connectors &gt; Add custom connector,
              com a URL acima. Ao conectar, o navegador abre a página de login do Weknow.
            </li>
            <li>
              <strong className="font-semibold">ChatGPT:</strong> ative o Developer Mode (Settings &gt; Apps &amp;
              Connectors &gt; Advanced settings) e crie o conector em Settings &gt; Connectors, com a URL acima e
              autenticação OAuth.
            </li>
          </ul>
          <p style={MUTED}>
            O cadastro do cliente OAuth é automático: não há client id nem secret para informar. Os nomes dos menus
            podem mudar entre versões do Claude e do ChatGPT.
          </p>
        </Step>
      </ol>
    </>
  )
}

/* ------------------------------------------------------------------- tela */

const MODES: { id: Mode; label: string; icon: string; lead: string }[] = [
  {
    id: 'local',
    label: 'Claude Desktop (local)',
    icon: 'computer',
    lead: 'O ChatGPT não aceita MCP local: para conectá-lo, use "Conector remoto (HTTPS)".',
  },
  {
    id: 'remoto',
    label: 'Conector remoto (HTTPS)',
    icon: 'cloud',
    lead:
      'Para o Claude (web, desktop e celular) e o ChatGPT. O MCP roda em modo http numa máquina da empresa, publicado em HTTPS e acessível pela internet, e cada pessoa entra com o próprio usuário e senha do Weknow ao conectar.',
  },
]

export function McpConnect() {
  const [mode, setMode] = useState<Mode>('local')
  const current = MODES.find((m) => m.id === mode)!

  /* Texto corrido trava perto de 72 caracteres (regra da moldura): numa folha
     de 1159 os parágrafos dos passos passavam de 150 por linha. */
  return (
    <div className="flex flex-col gap-6 max-w-[760px]">
      <p style={{ ...TEXT, color: COLOR.textSecondary }}>
        Conecte o Claude ou o ChatGPT ao Weknow pelo MCP (Model Context Protocol). O assistente passa a consultar
        metadados e componentes com as suas permissões de acesso no Weknow.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 md:gap-3 overflow-x-auto wk-no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {MODES.map((m) => (
            <FilterChip key={m.id} icon={m.icon} label={m.label} active={m.id === mode} onSelect={() => setMode(m.id)} />
          ))}
        </div>
        {/* Texto normal, não o cinza pequeno de aviso: é a explicação do modo
            escolhido, que a pessoa lê para decidir se está no modo certo. */}
        <p style={TEXT}>{current.lead}</p>
      </div>

      {/* Os dois modos ficam montados: quem preenche a URL pública, vai olhar
          o modo local e volta, encontra o que digitou. */}
      <div hidden={mode !== 'local'} className="flex flex-col gap-8">
        <LocalSteps />
      </div>
      <div hidden={mode !== 'remoto'} className="flex flex-col gap-8">
        <RemoteSteps />
      </div>
    </div>
  )
}
