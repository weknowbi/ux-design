# Weknow ASK — Conversa

Tela de conversa com IA do Weknow ASK, reconstruída em React/TypeScript com o
**design system do redesign** (o mesmo aplicado no projeto `figma_export`).

O layout e a arquitetura de informação vêm do export do Figma (`Chat.svg`);
cores, tipografia, componentes e estados vêm do redesign.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4

## Rodar localmente

Requisitos: Node.js 20+.

```bash
npm install
npm run dev
```

Abra `http://localhost:5174`.

## Build de produção

```bash
npm run build
npm run preview
```

## Design system aplicado

Todos os tokens ficam em [`src/design/tokens.ts`](src/design/tokens.ts):

| Papel | Token | Valor |
| --- | --- | --- |
| Primária (ações/links) | `COLOR.primary` | `#3366cc` |
| Primária forte (chat/envio) | `COLOR.primaryStrong` | `#2563eb` |
| Tint / tint suave | `COLOR.tint` / `COLOR.tintSoft` | `#dbeafe` / `#eff6ff` |
| Texto | `COLOR.text` | `#363E49` |
| Texto secundário / apagado | `COLOR.textSecondary` / `COLOR.textMuted` | `#475569` / `#8C98A8` |
| Linhas | `COLOR.border` | `#e8eaed` |
| Fundo da página | `COLOR.canvas` | `#f8fafc` |
| Pill de busca | `COLOR.searchPill` | `#eaecef` |
| Item de navegação ativo | `COLOR.navActive` | `#eef2ff` |
| Aba ativa (nav-pill) | `COLOR.pillActive` | `#e9ecef` |

Tipografia: **Inter** 400/500/600/700.

Métricas do shell: header 48px, sidebar 248px, coluna de conversa 896px,
janela com margem de 16px, raio 12px e borda `#e8eaed`.

## Componentes

```text
src/
  App.tsx                     shell da janela, abas e estado da conversa
  design/tokens.ts            tokens do design system Weknow
  components/
    Btn.tsx                   botão (primary/secondary/outlined/ghost/danger) + IconBtn
    Header.tsx                topo: menu, logo, busca global, créditos, conta
    Sidebar.tsx               nova conversa, busca, pastas, histórico, configurações
    Thread.tsx                mensagens do usuário e da IA, tabelas, ações da resposta
    Composer.tsx              caixa de pergunta, chips de filtro, ações rápidas
    DataTab.tsx               aba "Dados": fontes e tabelas da conversa
    WeknowLogo.tsx            marca (paths originais do export do Figma)
    icons.tsx                 conjunto de ícones
  data/conversation.ts        conteúdo mock das conversas
```

## O que é mock

Os dados são locais. Para integrar ao produto real é preciso substituir
`src/data/conversation.ts` e o `setTimeout` de resposta em `App.tsx` por:

- histórico e pastas de conversas;
- envio da pergunta e streaming da resposta da IA;
- filtros/contexto (chips) vindos do painel;
- busca global e busca no histórico;
- usuário, créditos e permissões.
