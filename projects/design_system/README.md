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

Cada exemplo da página é o componente de produção sendo renderizado, não uma
reprodução dele, nem uma captura de tela. Se o botão mudar, ele muda aqui,
inclusive para pior: documentação que não quebra junto com o código não está
documentando o código.

As peças vêm de dois lugares, e a diferença importa:

| Alias | Aponta para | O que é |
| --- | --- | --- |
| `@ds` | `./src/lib` | A biblioteca. Uma cópia só, consumida também pelo ASK e pelo portal. |
| `@` | `../weknow_ask/src` | O resto do produto, que ainda não se mudou. |

O `@ds` é a mudança que este README prometia: **os componentes começaram a se
mudar para cá, e os dois produtos passaram a consumi-los.** Botão, campo,
tokens e ícones já vieram; `src/lib/LEIA-ME.md` lista o que falta e por quê.

O `@` continua existindo porque a mudança é parcial, e este projeto ainda
**precisa** de `../weknow_ask` no disco para rodar.

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
    _fora/              páginas tiradas do índice, nada depende delas
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
  build-agent-docs.mjs  gera public/llms.txt, public/docs/, tokens.json, api.json
  read-api.mjs          lê a assinatura dos componentes no TypeScript real
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
| `/llms.txt` | O documento inteiro em texto, com índice. ~45 KB. |
| `/docs/<id>.md` | Uma página isolada. |
| `/tokens.json` | As variáveis `--wk-*` nos dois temas. |
| `/api.json` | A assinatura dos componentes: propriedades, tipos, constantes. |

Os quatro são **gerados**, nunca escritos à mão: o texto vem dos mesmos `.md`
que a página renderiza, os tokens saem de `weknow_ask/src/index.css` e as
assinaturas saem do TypeScript de produção, lido com o compilador. É essa
derivação que impede a versão para agentes de divergir da versão para gente, o
modo de falha clássico de documentação de design system.

O gerador também avisa quando um token existe no tema claro e some no escuro.

### Por que o `api.json` existe e o bloco de código não

A página **não** mostra a chamada ao lado do exemplo, de propósito: ver o
código junto da peça convida a copiá-lo, e enquanto o design system não for
pacote essa chamada é a do protótipo, não um contrato publicado.

Um agente, porém, não compõe tela nenhuma sem os nomes das propriedades. O
`api.json` resolve os dois lados — o dado existe, rotulado pelo que é, e não
aparece onde seria copiado sem ler o rótulo.

O extrator não adivinha: quando não consegue ler as propriedades de um
componente, ele devolve `props: null` em vez de uma lista incompleta. Lista
pela metade é pior do que ausência, porque a ausência manda perguntar.

## Estado das páginas

`pronto` é regra vigente. `rascunho` descreve o que o produto já faz, mas não
passou por decisão. `pendente` é lacuna declarada de propósito, um agente deve
perguntar, não deduzir.

O estado aparece no menu, no topo da página e no `llms.txt`. Rascunho citado
como regra é pior do que página ausente, porque inventa uma autoridade que
ninguém deu.
