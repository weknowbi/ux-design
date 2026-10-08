# Como montar uma tela

Esta é a página de entrada do documento. Ela não descreve componente nenhum:
serve para dizer em que ordem as decisões acontecem e para onde ir em cada uma
delas.

## Onde está cada verdade

São três fontes, e elas não se sobrepõem.

| Pergunta | Fonte |
| --- | --- |
| Quanto mede, quais variantes existem, como o nó está montado | MCP do Figma |
| Qual o valor exato de uma variável, nos dois temas | `/tokens.json` |
| Qual componente usar, por que ele é assim, o que evitar | este documento |

Quando as três discordam, o documento perde para o Figma em medida e ganha dele
em julgamento. Uma medida errada se corrige lendo o nó, mas a escolha errada de
componente só se corrige relendo a regra.

## A moldura, que não se reinventa

Toda tela do produto nasce com a mesma casca, do frame `home` (WP-832):

```text
┌─────────┬──────────────────────────────────────┐
│  marca  │  caminho          busca      avatar  │  56
│─────────┼──────────────────────────────────────│
│  MENU   │ ╭──────────────────────────────────╮ │
│  item   │ │                                  │ │
│  item   │ │        folha (a única que rola)  │ │
│         │ │                                  │ │
│  rodapé │ │                                  │ │
└─────────┴──────────────────────────────────────┘
   255                                        48 →
```

A faixa de topo e o menu já estão dados. Uma tela nova decide apenas o que vai
**dentro da folha**. Menu e faixa não rolam, não mudam de altura e não recebem
conteúdo da tela.

Dentro da folha a ordem é sempre a mesma: título da tela, barra de ações quando
houver, e então o conteúdo. Texto corrido fica em torno de 72 caracteres de
largura, e a conversa trava em 896.

## Qual peça serve a qual trabalho

| Preciso de | Use | Evite |
| --- | --- | --- |
| A ação que a tela existe para receber | [Botão](#/botao) primário, **um** por tela | Dois primários |
| Ação de apoio ao lado dela | Botão secundário ou fantasma | Primário rebaixado por tamanho |
| Ação em linha de tabela ou cabeçalho | `IconBtn`, com dica | Botão de texto pequeno |
| Entrada de texto ou escolha em lista | [Campo e seletor](#/campo) | `<select>` nativo |
| Ligar e desligar uma coisa só | [Switch](#/controles) | Dois botões de rádio |
| Marcar vários itens de uma lista | [Checkbox](#/controles) | Switch |
| Mostrar o contexto ativo da tela | [Chip](#/chip) | Chip como botão |
| Marcar tipo ou contagem dentro de célula | `TableChip`, sempre neutro | Chip colorido por tipo |
| Lista de dados comparáveis | [Tabela](#/tabela) | Grade de cartões |
| Objeto que a pessoa abre, renomeia, favorita | [Cartão](#/cartao) | Linha de tabela |
| Ações secundárias de um item | [Menu suspenso](#/menu) | Fileira de ícones na linha |
| Decisão que precisa parar a tela | [Modal](#/modal) | Painel que empurra o conteúdo |
| Revelar um nome cortado | [Dica](#/dica) | `title` do navegador |
| Confirmar que algo deu certo | Aviso temporário, em [Estados](#/estados) | Modal de sucesso |
| Explicar uma limitação permanente | [Aviso](#/aviso) | Modal na abertura |

Se a linha que você procura não está nesta tabela, a peça não existe no
sistema. Nesse caso, pare e pergunte, porque inventar o componente cria uma
segunda linguagem visual dentro do mesmo produto, e ela nunca sai sozinha.

## As seis regras que valem em qualquer tela

1. **Use o nome da cor, nunca o valor.** Um hexadecimal copiado à mão continua
   igual quando o tema vira, e a tela quebra no escuro. Todas as cores estão em
   `/tokens.json`, nos dois temas.
2. **Uma ação primária por tela.** Se duas parecem igualmente importantes,
   nenhuma delas é a primária.
3. **Cor sozinha não indica estado.** O item de menu selecionado muda o fundo,
   a cor do texto e o preenchimento do ícone, os três ao mesmo tempo.
4. **Espaço na grade de 4.** Um valor fora dela precisa de um motivo escrito, e
   às vezes há mesmo: os 6 de respiro do chip vêm do ícone de 24, não de uma
   escolha.
5. **O anel de foco não se remove.** Ele é a única pista de quem navega por
   teclado.
6. **Toda tela existe nos dois temas.** Conferir só no claro é conferir metade.

## O que ainda não é regra

A página [Vazio, carregando e erro](#/estados) está declarada como lacuna de
propósito. Um agente que precise desses padrões deve perguntar em vez de
deduzir, e o estado no topo de cada página diz quando isso vale.
