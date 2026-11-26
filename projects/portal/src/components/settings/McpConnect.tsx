import { useState, type ReactNode } from 'react'
import { COLOR, FONT, RADIUS, TABLE } from '@/design/tokens'
import { Btn, IconBtn } from '@ds/Btn'
import { FIELD, FormField, fieldBoxStyle, fieldTextStyle } from '@ds/Field'
import { FilterChip } from '@/components/Hero'
import { Icon } from '@/components/icons'
import { MCP_CONNECTION } from '@/data/settings'

/**
 * Conectar assistentes de IA (MCP) — a tela `#/mcp-connect` do Weknow, refeita
 * com as peças do design system.
 *
 * O conteúdo e a ordem são os da produção (a versão do Leonel, com três
 * clientes no modo local e o remoto sem instalação): os mesmos passos, os
 * mesmos comandos gerados, o mesmo texto. O que muda é o vocabulário visual,
 * que lá era o de outra biblioteca:
 *
 *   abas         viraram os chips que as telas irmãs de Configurações já usam
 *                para alternar entre si. Aba sublinhada não existe no sistema.
 *   subabas      o cliente (Claude, ChatGPT, outro) virou uma fileira de
 *                chips compactos com rótulo; ver o comentário em `LocalSteps`.
 *   faixa cinza  a explicação do modo era uma faixa permanente; virou texto
 *                normal logo abaixo dos chips, onde a pessoa decide o modo.
 *   campos       rótulo flutuante na borda virou o `FormField`: rótulo em
 *                cima, sempre visível, caixa de 38.
 *   dados        URL, conta e usuário eram código solto ao lado de um rótulo.
 *                Viraram linhas de leitura com o copiar na ponta, porque são
 *                exatamente o que a pessoa vai colar em outro lugar.
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

/**
 * Linha de leitura: rótulo, valor e copiar.
 *
 * Na mesa é uma linha só, com o rótulo numa coluna fixa. No celular o rótulo
 * sobe para cima do valor: com 104px de rótulo sobravam ~150 para o valor, e
 * a conta e as variáveis de ambiente apareciam cortadas no meio.
 */
function InfoRow({
  label,
  value,
  what,
  monoLabel,
  labelWidth = 'md:w-[112px]',
  copy = true,
}: {
  label: string
  value: string
  /** Complemento da dica do copiar: "Copiar a conta". */
  what?: string
  /** Rótulo que é nome técnico (variável de ambiente): vai em monoespaçada. */
  monoLabel?: boolean
  labelWidth?: string
  /** Sem copiar quando o valor não é para colar em lugar nenhum: "(nenhum)". */
  copy?: boolean
}) {
  return (
    <div className="flex items-center gap-3 min-h-[44px] px-4" style={{ borderTop: `1px solid ${TABLE.border}` }}>
      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-0.5 md:gap-3 py-2 md:py-0">
        <span
          className={`shrink-0 ${labelWidth}`}
          style={monoLabel ? { fontFamily: MONO, fontSize: 12, lineHeight: '20px', color: COLOR.textSecondary } : { ...MUTED, color: COLOR.textSecondary }}
        >
          {label}
        </span>
        <span
          className="min-w-0 truncate"
          style={copy ? { fontFamily: MONO, fontSize: 12.5, lineHeight: '20px', color: COLOR.text } : MUTED}
          title={value}
        >
          {value}
        </span>
      </div>
      {copy && <CopyButton text={value} what={what ?? label} />}
    </div>
  )
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full outline-none"
      style={{ ...fieldBoxStyle({ focused }), ...fieldTextStyle, height: FIELD.height }}
    />
  )
}

/** Moldura com título: a mesma borda e o mesmo raio da tabela. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col"
      style={{ border: `1px solid ${TABLE.border}`, borderRadius: TABLE.radius }}
    >
      <h3 className="px-4 pt-3 pb-2 text-[13px] font-semibold leading-[20px]" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Subtítulo dentro do painel, separando um grupo de linhas do anterior. */
function PanelGroup({ label }: { label: string }) {
  return (
    <p
      className="px-4 pt-3 pb-1 text-[12px] font-medium leading-[16px]"
      style={{ fontFamily: FONT, color: COLOR.textMuted, borderTop: `1px solid ${TABLE.border}` }}
    >
      {label}
    </p>
  )
}

/** Revela o caminho manual. O fantasma do sistema, mas com quebra de linha: o
 *  `Btn` não quebra o rótulo, e estas frases passam de 375px no celular. */
function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="self-start -ml-3 flex items-start gap-1.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[var(--wk-btn-ghost-hover)] focus-visible:shadow-[var(--wk-btn-focus-ring)] outline-none"
        style={{ fontFamily: FONT, fontSize: 14, lineHeight: '20px', color: COLOR.textSecondary }}
      >
        <Icon name={open ? 'expand_less' : 'expand_more'} size={20} color="currentColor" className="shrink-0" />
        {label}
      </button>
      {open && (
        <div className="flex flex-col gap-3" style={TEXT}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ local */

type Client = 'claude' | 'chatgpt' | 'outro'

const CLIENTS: { id: Client; label: string }[] = [
  { id: 'claude', label: 'Claude Desktop' },
  { id: 'chatgpt', label: 'ChatGPT (aplicativo desktop)' },
  { id: 'outro', label: 'Outro cliente MCP' },
]

/**
 * O que se digita no cadastro STDIO do cliente (ChatGPT e outros): comando,
 * argumentos e as três variáveis. Na produção é uma lista de definição com
 * código solto; aqui são as mesmas linhas de leitura dos dados da conexão,
 * cada valor com o seu copiar, porque é campo por campo que a pessoa cola.
 */
function StdioPanel({ exe, env }: { exe: string; env: Record<string, string> }) {
  return (
    <Panel title="Preencha no cadastro do servidor">
      <InfoRow label="Comando" value={exe} what="o comando" labelWidth="md:w-[184px]" />
      <InfoRow label="Argumentos" value="(nenhum)" copy={false} labelWidth="md:w-[184px]" />
      <PanelGroup label="Variáveis de ambiente" />
      {Object.entries(env).map(([k, v]) => (
        <InfoRow key={k} label={k} value={v} what={k} monoLabel labelWidth="md:w-[184px]" />
      ))}
    </Panel>
  )
}

function LocalSteps() {
  const { baseUrl, account, user } = MCP_CONNECTION
  const [client, setClient] = useState<Client>('claude')
  const [folder, setFolder] = useState('C:\\weknow-mcp')
  const [name, setName] = useState('weknow')

  const dir = folder.replace(/[\\/]+$/, '') || 'C:\\weknow-mcp'
  const exe = `${dir}\\weknow-mcp.exe`
  const server = name.trim() || 'weknow'
  const env = { WEKNOW_BASE_URL: baseUrl, WEKNOW_ACCOUNT_TOKEN: account, WEKNOW_USER: user }

  const setupBase = `"${exe}" setup --base-url "${baseUrl}" --account "${account}" --user "${user}"`
  const json = JSON.stringify({ mcpServers: { [server]: { command: exe, args: [], env } } }, null, 2)
  /* TOML aceita a mesma escrita de string do JSON: aspas duplas e a barra
     invertida dobrada. */
  const toml = [
    `[mcp_servers.${server}]`,
    `command = ${JSON.stringify(exe)}`,
    'args = []',
    '',
    `[mcp_servers.${server}.env]`,
    ...Object.entries(env).map(([k, v]) => `${k} = ${JSON.stringify(v)}`),
    '',
  ].join('\n')

  const stdio = client !== 'claude'

  return (
    <>
      {/* O cliente em chips, as três opções à vista, como nas subabas da
          produção. Já foi um seletor: ele escondia duas das três, e com só
          três opções curtas esconder não economiza nada.

          O que impede de ler esta fileira como continuação dos modos lá em
          cima é a diferença entre as duas: esta tem rótulo ("Cliente MCP",
          na voz dos campos do formulário), fica dentro do conteúdo do modo e
          usa o chip compacto, sem ícone. Os modos são navegação; o cliente é
          uma escolha que muda os passos abaixo. */}
      <div className="flex flex-col gap-2">
        <span id="mcp-client-label" style={fieldTextStyle}>
          Cliente MCP
        </span>
        <div
          role="group"
          aria-labelledby="mcp-client-label"
          className="flex gap-2 overflow-x-auto wk-no-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
        >
          {CLIENTS.map((c) => (
            <FilterChip key={c.id} icon="" compact label={c.label} active={c.id === client} onSelect={() => setClient(c.id)} />
          ))}
        </div>
      </div>

      <Panel title="Dados da conexão">
        <InfoRow label="URL do Weknow" value={baseUrl} what="a URL do Weknow" />
        <InfoRow label="Conta" value={account} what="a conta" />
        <InfoRow label="Usuário" value={user} what="o usuário" />
        <div className="grid gap-x-4 px-4 pt-4 grid-cols-1 md:grid-cols-2" style={{ borderTop: `1px solid ${TABLE.border}` }}>
          <FormField label="Pasta onde o MCP foi extraído">
            <TextInput value={folder} onChange={setFolder} />
          </FormField>
          <FormField label="Nome do servidor MCP">
            <TextInput value={name} onChange={setName} />
          </FormField>
        </div>
      </Panel>

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
          {stdio ? (
            <p>
              Abra o Prompt de Comando (cmd) e execute o comando abaixo. Ele pede a sua senha do Weknow, testa o login,
              guarda a senha protegida no Windows (DPAPI), que o MCP usa ao ser iniciado pelo cliente, e mostra o
              comando e as variáveis de ambiente para cadastrar o servidor no cliente. O cadastro no cliente é feito no
              passo seguinte.
            </p>
          ) : (
            <p>
              Abra o Prompt de Comando (cmd) e execute o comando abaixo. Ele pede a sua senha do Weknow, testa o login,
              guarda a senha protegida no Windows (DPAPI) e grava a configuração no Claude Desktop, mantendo uma cópia
              do arquivo anterior (.bak).
            </p>
          )}
          <CodeBlock label="Prompt de Comando" code={stdio ? `${setupBase} --print-only` : `${setupBase} --name "${server}"`} />
        </Step>

        {client === 'claude' && (
          <Step n={4}>
            <p>Feche o Claude Desktop pelo ícone da bandeja do Windows (Sair; fechar a janela não basta) e abra-o de novo.</p>
          </Step>
        )}

        {stdio && (
          <Step n={4}>
            {client === 'chatgpt' ? (
              <p>
                No ChatGPT, abra Settings &gt; Plugins &gt; Adicionar &gt; Adicionar servidor MCP, informe o nome{' '}
                <Code>{server}</Code>, escolha o tipo STDIO e preencha:
              </p>
            ) : (
              <p>
                No seu cliente de IA, cadastre um servidor MCP local (STDIO) com o nome <Code>{server}</Code> e preencha:
              </p>
            )}
            <StdioPanel exe={exe} env={env} />
            <p>Não informe argumentos nem a senha: ela já está guardada no cofre DPAPI.</p>
            {client === 'chatgpt' && (
              <p style={MUTED}>Em versões anteriores do aplicativo, o cadastro fica em Settings &gt; MCP servers &gt; Add server.</p>
            )}
          </Step>
        )}

        {stdio && (
          <Step n={5}>
            <p>
              {client === 'chatgpt'
                ? 'Salve o servidor. As ferramentas do Weknow passam a aparecer nas conversas do aplicativo desktop do ChatGPT.'
                : 'Salve o servidor e, se o cliente pedir, reinicie-o. As ferramentas do Weknow passam a aparecer nas conversas.'}
            </p>
          </Step>
        )}
      </ol>

      {client === 'claude' && (
        <Disclosure key="claude" label="Prefiro editar a configuração do Claude Desktop manualmente">
          <p>
            Inclua o servidor abaixo em <Code>mcpServers</Code> no arquivo{' '}
            <Code>%APPDATA%\Claude\claude_desktop_config.json</Code>. A senha não vai no arquivo: rode o comando do
            passo 3 uma vez para guardá-la, ou inclua <Code>WEKNOW_PASSWORD</Code> em <Code>env</Code> só na primeira
            execução e remova depois (a senha passa a ficar no cofre DPAPI).
          </p>
          <CodeBlock
            label="claude_desktop_config.json"
            code={json}
            file={{ name: 'claude_desktop_config.json', type: 'application/json' }}
          />
        </Disclosure>
      )}
      {client === 'chatgpt' && (
        <Disclosure key="chatgpt" label="Prefiro editar a configuração do ChatGPT manualmente">
          <p>
            O aplicativo desktop do ChatGPT compartilha a configuração de MCP com o Codex. Inclua o trecho abaixo no
            arquivo <Code>%USERPROFILE%\.codex\config.toml</Code> (crie o arquivo se ele não existir) e reinicie o
            ChatGPT. A senha não vai no arquivo: rode o comando do passo 3 uma vez para guardá-la.
          </p>
          <CodeBlock label="config.toml" code={toml} />
        </Disclosure>
      )}
      {client === 'outro' && (
        <Disclosure key="outro" label="Meu cliente usa um arquivo de configuração JSON">
          <p>
            Vários clientes MCP aceitam o servidor no formato <Code>mcpServers</Code> abaixo. Consulte a documentação
            do cliente para saber o nome e a pasta do arquivo. A senha não vai no arquivo: rode o comando do passo 3 uma
            vez para guardá-la.
          </p>
          <CodeBlock label="JSON" code={json} />
        </Disclosure>
      )}

      <p style={MUTED}>Os nomes dos menus podem mudar entre versões do Claude, do ChatGPT e dos outros clientes.</p>
    </>
  )
}

/* ----------------------------------------------------------------- remoto */

/**
 * Remoto: sem instalação. O MCP já roda publicado junto do Weknow, então a
 * tela só entrega a URL do conector e diz onde cadastrá-la em cada cliente.
 */
function RemoteSteps() {
  return (
    <>
      <ol className="flex flex-col gap-6">
        <Step n={1}>
          <p>Copie a URL do conector:</p>
          <CodeBlock label="URL do conector" code={MCP_CONNECTION.connectorUrl} />
        </Step>
        <Step n={2}>
          <p>Cadastre o conector no seu cliente de IA com essa URL:</p>
          <ul className="flex flex-col gap-2 list-disc pl-5 marker:text-[var(--wk-text-muted)]">
            <li>
              <strong className="font-semibold">Claude:</strong> Customize &gt; Connectors &gt; + Add &gt; Add custom
              connector, com a URL acima. Nos planos Team e Enterprise, quem cadastra é o Owner da organização, em
              Organization settings &gt; Connectors.
            </li>
            <li>
              <strong className="font-semibold">ChatGPT:</strong> Settings &gt; Plugins (ou chatgpt.com/plugins) &gt;
              "+" &gt; Adicionar servidor MCP personalizado, com a URL acima e autenticação OAuth; crie como plugin.
            </li>
            <li>
              <strong className="font-semibold">Outros clientes:</strong> cadastre um servidor MCP remoto (Streamable
              HTTP) com autenticação OAuth e a URL acima.
            </li>
          </ul>
        </Step>
        <Step n={3}>
          <p>Ao conectar, o navegador abre a página de login do Weknow: entre com o seu usuário e senha do Weknow.</p>
        </Step>
      </ol>
      <p style={MUTED}>
        O cadastro do cliente OAuth é automático: não há client id nem secret para informar. Os nomes dos menus podem
        mudar entre versões do Claude, do ChatGPT e dos outros clientes.
      </p>
    </>
  )
}

/**
 * Nota da tela: um recado que vale para o modo inteiro, como "o remoto não
 * está habilitado nesta instalação".
 *
 * Na produção era a faixa de aviso amarela. Não há erro de quem lê nem nada
 * a corrigir ali, e o amarelo cheio chamava mais atenção do que qualquer
 * outra coisa da tela, sobretudo no escuro. O âmbar continua, mas só no tom:
 * fundo quase branco (véu de 6% no escuro), borda clara e o ícone. O texto
 * fica em `textSecondary`, como o resto da tela, e não em marrom sobre
 * amarelo. As cores são as `--wk-warn-*` do `index.css`.
 */
function Note({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 px-4 py-3"
      style={{ background: 'var(--wk-warn-bg)', border: '1px solid var(--wk-warn-border)', borderRadius: TABLE.radius }}
    >
      <Icon name="info" size={20} color="var(--wk-warn-icon)" className="shrink-0 mt-px" />
      <p style={{ ...TEXT, color: COLOR.textSecondary }}>{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------- tela */

/**
 * O protótipo mostra o remoto habilitado. Para ver a tela de uma instalação
 * sem ele, como a do link de produção, abra com `?remoto=desabilitado` antes
 * do `#`.
 */
const REMOTE_ENABLED = new URLSearchParams(window.location.search).get('remoto') !== 'desabilitado'

const MODES: { id: Mode; label: string; icon: string; lead: string }[] = [
  {
    id: 'local',
    label: 'Local (aplicativo desktop)',
    icon: 'computer',
    lead:
      'O MCP local roda no próprio computador e só é aceito pelos aplicativos desktop que executam servidores MCP locais. Para usar o Weknow pelo navegador ou pelo celular, use a aba "Conector remoto (HTTPS)".',
  },
  {
    id: 'remoto',
    label: 'Conector remoto (HTTPS)',
    icon: 'cloud',
    lead:
      'Para usar o Weknow no Claude, no ChatGPT ou em outro cliente compatível com MCP, inclusive pelo navegador e pelo celular, sem instalar nada no computador. Cada pessoa entra com o próprio usuário e senha do Weknow ao conectar.',
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
        Conecte o Claude, o ChatGPT ou outro cliente de IA compatível com o MCP (Model Context Protocol) ao Weknow. O
        assistente passa a consultar metadados e componentes com as suas permissões de acesso no Weknow.
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

      {/* Os dois modos ficam montados: quem escolhe o aplicativo e preenche a
          pasta, vai olhar o remoto e volta, encontra tudo como deixou. */}
      <div hidden={mode !== 'local'} className="flex flex-col gap-8">
        <LocalSteps />
      </div>
      <div hidden={mode !== 'remoto'} className="flex flex-col gap-8">
        {REMOTE_ENABLED ? (
          <RemoteSteps />
        ) : (
          <Note>O conector remoto não está habilitado nesta instalação do Weknow. Procure o administrador.</Note>
        )}
      </div>
    </div>
  )
}
