# Documentação do Design System Weknow

Site de documentação do design system, com duas saídas a partir de uma fonte
só: a página para pessoas e o texto para agentes de IA.

## O problema que este projeto resolve

O MCP do Figma entrega **estrutura viva**, variáveis, componentes, variantes,
auto layout. É a melhor fonte possível para "me dê o token exato" e "como esta
tela está montada".

O que ele não guarda é **julgamento**: qual variante usar, por que a medida é
essa, o que não pode mudar, o que ainda não foi decidido. Isso é texto, e texto
não vive em nó do Figma.

Este projeto cobre a segunda metade. Não substitui o Figma nem o MCP, os três
juntos é que respondem tudo.

```
Figma + MCP   →  estrutura: o que é, quanto mede, como está montado
este projeto  →  julgamento: quando usar, por quê, o que evitar, o que falta
```

## Os componentes não são copiados

O alias `@` aponta para `../weknow_ask/src`. Cada exemplo da página é o
componente de produção sendo renderizado, não uma reprodução dele, nem uma
captura de tela.

Consequência boa: se o botão mudar no ASK, ele muda aqui, inclusive para pior.
Documentação que não quebra junto com o código não está documentando o código.

Consequência a saber: este projeto **precisa** de `../weknow_ask` no disco para
rodar. Quando o design system virar pacote próprio, os componentes se mudam
para cá, o ASK passa a consumi-los e só o alias muda de lado.

## Rodar

Requisitos: Node.js 20+ e o projeto `weknow_ask` na pasta irmã.

```bash
npm install
npm run dev
```

Abra `http://localhost:5176`.

## Estrutura

```text
src/
  docs/
    pages.json          ÍNDICE, a única lista de páginas (menu e llms.txt)
    content/*.md        o texto, um arquivo por página
    demos/*.tsx         demonstrações ao vivo, com os componentes do ASK
    registry.ts         junta as três coisas acima
  shell/
    DocsShell.tsx       casca: menu 255 + barra 56 + folha (frame `home`)
    DocsSidebar.tsx     menu, na espec. do `sidebar white`
    DocsHeader.tsx      barra de topo, caminho e busca
    Toc.tsx             sumário da página
  blocks/
    Prose.tsx           Markdown → HTML, com âncora em cada título
    Example.tsx         palco de demonstração, bloco de código, acerto/erro
  index.css             importa o CSS do ASK e acrescenta a prosa
scripts/
  build-agent-docs.mjs  gera public/llms.txt, public/docs/, public/tokens.json
```

## Como acrescentar uma página

1. Entrada nova em `src/docs/pages.json`, com `status` honesto.
2. `src/docs/content/<id>.md` com o texto.
3. Opcional: `src/docs/demos/Demo<Id>.tsx` exportando `Demo<Id>`, o registro
   acha sozinho pelo nome.

Não há nenhuma quarta lista para atualizar. O menu, o sumário, a busca, o
`llms.txt` e os `/docs/*.md` saem todos daí.

## O que os agentes consomem

| Arquivo | O que é |
| --- | --- |
| `/llms.txt` | O documento inteiro em texto, com índice. ~33 KB. |
| `/docs/<id>.md` | Uma página isolada. |
| `/tokens.json` | As variáveis `--wk-*` nos dois temas. |

Os três são **gerados**, nunca escritos à mão: o texto vem dos mesmos `.md` que
a página renderiza, e os tokens são extraídos de `weknow_ask/src/index.css`. É
essa derivação que impede a versão para agentes de divergir da versão para
gente, o modo de falha clássico de documentação de design system.

O gerador também avisa quando um token existe no tema claro e some no escuro.

## Estado das páginas

`pronto` é regra vigente. `rascunho` descreve o que o produto já faz, mas não
passou por decisão. `pendente` é lacuna declarada de propósito, um agente deve
perguntar, não deduzir.

O estado aparece no menu, no topo da página e no `llms.txt`. Rascunho citado
como regra é pior do que página ausente, porque inventa uma autoridade que
ninguém deu.
