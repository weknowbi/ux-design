# Como montar uma tela

Esta página é o ponto de entrada. Ela não descreve nenhum componente: ela diz
em que ordem as decisões acontecem e para onde ir em cada uma.

## Onde está cada verdade

Três fontes, e elas não se sobrepõem:

| Pergunta | Fonte |
| --- | --- |
| Quanto mede, qual variante existe, como o nó está montado | MCP do Figma |
| Qual o valor exato de uma variável, nos dois temas | `/tokens.json` |
| Qual componente usar, por quê, o que evitar | este documento |

Quando as três discordam, o documento perde para o Figma em medida e ganha
dele em julgamento. Medida errada se corrige lendo o nó; escolha errada de
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

A faixa de topo e o menu são dados. Uma tela nova decide o que entra **dentro
da folha**, e nada mais. Menu e faixa não rolam, não mudam de altura e não
recebem conteúdo da tela.

Dentro da folha, a ordem é sempre a mesma: título da tela, barra de ações
quando houver, conteúdo. Largura de leitura corrida fica em torno de 72
caracteres; conversa trava em 896.

## Qual peça para qual trabalho

| Preciso de | Use | Não use |
| --- | --- | --- |
| A ação que a tela existe para receber | [Botão](#/botao) primário, **um** por tela | Dois primários |
| Ação de apoio ao lado dela | Botão secundário ou fantasma | Primário rebaixado por tamanho |
| Ação em linha de tabela ou cabeçalho | `IconBtn`, com dica | Botão de texto pequeno |
| Entrada de texto, escolha em lista | [Campo e seletor](#/campo) | `<select>` nativo |
| Ligar e desligar uma coisa só | [Chave](#/controles) | Dois botões de rádio |
| Marcar vários numa lista | Caixa de seleção | Chave |
| Mostrar o contexto ativo da tela | [Chip](#/chip) | Chip como botão |
| Marcar tipo ou contagem dentro de célula | `TableChip`, sempre neutro | Chip colorido por tipo |
| Lista de dados comparáveis | [Tabela](#/tabela) | Grade de cartões |
| Objeto que a pessoa abre, renomeia, favorita | [Cartão](#/cartao) | Linha de tabela |
| Ações secundárias de um item | [Menu suspenso](#/menu) | Fileira de ícones na linha |
| Decisão que precisa parar a tela | [Modal](#/modal) | Painel que empurra o conteúdo |
| Revelar um nome cortado | [Dica](#/dica) | `title` do navegador |
| Confirmar que algo deu certo | Aviso temporário, em [Estados](#/estados) | Modal de sucesso |
| Explicar uma limitação permanente | [Aviso](#/aviso) | Modal na abertura |

Se a linha não existe nesta tabela, a peça não existe no sistema. Pare e
pergunte: inventar o componente é criar uma segunda linguagem dentro do mesmo
produto, e ela nunca volta sozinha.

## As seis regras que valem em qualquer tela

1. **Use o nome da cor, nunca o valor.** Hexadecimal copiado à mão não vira no
   tema escuro. Toda cor está em `/tokens.json` nos dois temas.
2. **Uma ação primária.** Se duas parecem igualmente importantes, nenhuma é a
   primária.
3. **Cor sozinha não indica estado.** Item ativo muda fundo, cor do texto e
   preenchimento do ícone, os três juntos.
4. **Espaço na grade de 4.** Valor fora dela precisa de um motivo escrito, e às
   vezes há: os 6 de respiro do chip são consequência do ícone de 24.
5. **O anel de foco não se remove.** É a única pista de quem navega por
   teclado.
6. **Toda tela existe nos dois temas.** Se você só conferiu no claro, conferiu
   metade.

## O que ainda não é regra

[Vazio, carregando e erro](#/estados) está declarado como lacuna de propósito.
Um agente que precise desses padrões deve perguntar, não deduzir, e o estado
no topo de cada página diz quando isso vale.
