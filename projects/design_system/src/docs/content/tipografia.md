# Tipografia

Uma família: **Inter**, nos pesos 400, 500, 600 e 700. Uma segunda família
seria a primeira coisa a fazer o produto parecer montado por partes.

O design system original pede Roboto em tabelas, herança do Bootstrap 5. O
redesign usa Inter em tudo, inclusive nas tabelas. Quando as duas
especificações discordam, vale o redesign.

## Escala em uso

| Uso | Tamanho / linha | Peso |
| --- | --- | --- |
| Título de tela | 28 / 1.2 | 600 |
| Título de seção | 20 / 1.35 | 600 |
| Rótulo de seção no menu | 12 / 1.5, caixa alta | 600 |
| Item de menu | 14 / 1.5 | 400 |
| Caminho (breadcrumb) | 15 / 1.2 | 400, atual em 600 |
| Corpo e campo | 16 / 1.5 | 400 |
| Corpo de documento | 15 / 1.7 | 400 |
| Botão médio | 14 | 400 |
| Chip | 14 / 20px | 400 |
| Cabeçalho de tabela | 12 | 600 |
| Corpo de tabela | 13 | 400 |
| Legenda | 11 a 13 | 400 |

Repare no cabeçalho da tabela: **menor** que o corpo. Rótulo de coluna é
sinalização, não conteúdo, e o que o distingue é o peso 600, não o tamanho.

## Regras

1. Peso antes de cor, cor antes de tamanho. Só suba de tamanho quando peso e
   cor já não resolverem.
2. Texto de leitura longa fica em cerca de 72 caracteres de largura. Acima
   disso o olho perde a linha seguinte.
3. Botão usa peso 400. O contorno e o fundo já dizem que é botão; peso extra só
   engorda o traço.
4. No tema escuro o corpo recebe suavização em escala de cinza. Sem isso, texto
   claro sobre fundo escuro irradia e parece mais pesado, embora o peso seja o
   mesmo dos dois lados.
