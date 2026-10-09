# A biblioteca

Os componentes que têm **uma cópia só**. Três projetos consomem este diretório:

```text
design_system/src/lib/   ← você está aqui
   ↑          ↑          ↑
weknow_ask   portal    design_system (o site de documentação)
```

Cada um resolve o alias `@ds` para cá. O site de documentação renderiza estes
arquivos, então o exemplo da página é a peça de produção, não um retrato dela.

## Por que isto existe

O portal nasceu de uma cópia do ASK, e as cópias foram se afastando sozinhas:
dois botões com medidas próprias, dois campos que discordavam no tipo do erro,
uma cor de estado que existia num e não no outro. Nada disso foi decidido:
aconteceu porque eram dois arquivos e ninguém avisa quando só um muda.

## Regras para mexer aqui

1. **Nenhuma importação com `@`.** O alias aponta para lugares diferentes em
   cada app. Dentro da biblioteca as importações são relativas: `./tokens`.
2. **Nada de dados do produto.** A biblioteca não sabe o que é uma pasta nem
   uma conversa. Quando a peça precisa disso, o dado entra por fora: foi o que
   aconteceu com a foto da conta no `MobileNav` (vem por propriedade) e com a
   ordenação em `prefs` (declara a forma mínima que compara, não o tipo do
   acervo).
3. **Classe do Tailwind só com o `@source` do consumidor.** Esta pasta está
   fora da raiz dos dois apps, então o Tailwind não a varre sozinho: o
   `index.css` de cada um declara `@source '../../design_system/src/lib'`. Sem
   essa linha a classe some do CSS e o componente perde a medida. Foi
   exatamente o que aconteceu com a altura do botão.
4. **Mudou aqui, mudou nos dois produtos.** É o ponto. Antes de alterar uma
   medida, confira os dois: `npm run dev` em `weknow_ask` e em `portal`.
5. **A página da documentação é parte do componente.** Mudou a espec., atualize
   `src/docs/content/<id>.md` no mesmo passo. O `/api.json` sai daqui sozinho.

## O que mora aqui

| Arquivo | Vinha de |
| --- | --- |
| `tokens.ts` | duas cópias, e o portal já tinha ganhado um `ok` que o ASK não tinha |
| `icons.tsx` | duas cópias idênticas |
| `theme.ts` | duas cópias idênticas |
| `sidebar.ts` | duas cópias idênticas |
| `format.ts` | duas cópias idênticas |
| `Btn.tsx` | a fusão do `Btn` do ASK com o `Button` do portal |
| `Switch.tsx` | extraído do alternador de tema, que era o único switch do produto |
| `ThemeSwitch.tsx` | duas cópias idênticas; passou a compor o `Switch` |
| `Field.tsx` | duas cópias, divergentes no tipo do erro |
| `Menu.tsx` | duas cópias idênticas |
| `Tooltip.tsx` | duas cópias idênticas |
| `WeknowLogo.tsx` | duas cópias idênticas |
| `MobileNav.tsx` | duas cópias idênticas; a conta passou a entrar por propriedade, hoje como o `AccountMenu` |
| `AccountMenu.tsx` | nasceu aqui: a foto das duas barras era um botão sem função nos dois apps |
| `account.ts` | nasceu aqui: a foto escolhida pela pessoa, no navegador |
| `BrowserControls.tsx` | duas cópias idênticas |
| `prefs.ts` | duas cópias idênticas; o tipo do acervo virou a forma mínima `Sortable` |
| `appearance.ts` | duas cópias idênticas |

Nos apps, o caminho antigo de cada um virou uma linha de reexportação, para os
`import` espalhados continuarem valendo sem um mutirão de busca e substituição.

## O que ainda está duplicado

Estes já divergiram entre os dois apps, então mudá-los é decisão de desenho e
não mudança de arquivo, e cada um pede a mesma conversa que o botão pediu:

`Header.tsx`, `PortalSidebar.tsx`, `SidebarBrand.tsx`, `FolderHeader.tsx`,
`browser/Items.tsx`, `browser/ContentBrowser.tsx`, `design/viewport.ts`,
`Hero.tsx`.

E estes continuam iguais nos dois, mas **não** são da biblioteca: `data/portal.ts`
é o acervo de maquete, `main.tsx` e `vite-env.d.ts` são partida de aplicação.
Conteúdo e inicialização pertencem a quem os usa.
