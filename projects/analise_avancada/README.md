# Weknow — Dashboard Analysis Interface

Front-end React/TypeScript convertido a partir do protótipo exportado pelo Figma Make.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4

## Rodar localmente

Requisitos: Node.js 20+ e npm/pnpm.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

## O que já está implementado

- layout da interface de análise;
- navegação pelo histórico;
- pesquisa no histórico;
- editor de análise com toolbar;
- abas laterais;
- conversa simulada com IA;
- ficha técnica;
- modal para nova análise;
- menu de compartilhamento (convite por nome/e-mail, permissão "pode ver" / "pode comentar", gestão de acesso e acesso por link);
- estados e interações locais em React.

## O que ainda é mock/protótipo

A interface funciona no navegador, mas os dados ainda são locais. Para integrar ao produto real, é necessário substituir os mocks por APIs do Weknow, principalmente:

- histórico de análises;
- criação e persistência de análises;
- geração por IA;
- chat com IA;
- dashboards/fontes disponíveis;
- usuário, créditos e permissões;
- compartilhamento: envio de convites, lista de pessoas com acesso e geração do link público.

## Estrutura principal

```text
src/
  App.tsx                         interface e comportamento atual
  index.css                       estilos globais/Tailwind
  main.tsx                        bootstrap React
  imports/WeknowInsight/          assets exportados do Figma
```

O código específico de preview/deploy do Figma Make foi removido do `vite.config.ts`, deixando o projeto como uma aplicação Vite convencional.
