# Tipografia

O sistema usa uma família só, a **Inter**, nos pesos 400, 500, 600 e 700. Uma
segunda família seria a primeira coisa a fazer o produto parecer montado por
partes.

O design system original pede Roboto nas tabelas, por herança do Bootstrap 5,
mas o redesign usa Inter em tudo, tabelas inclusive. Quando as duas
especificações discordam, vale o redesign.

## Escala em uso

| Uso | Tamanho / linha | Peso |
| --- | --- | --- |
| Título de tela | 28 / 1.2 | 600 |
| Título de seção | 20 / 1.35 | 600 |
| Rótulo de seção no menu | 12 / 1.5, caixa alta | 600 |
| Item de menu | 14 / 1.5 | 400 |
| Caminho (breadcrumb) | 15 / 1.2 | 400, e o item atual em 600 |
| Corpo e campo | 16 / 1.5 | 400 |
| Corpo de documento | 15 / 1.7 | 400 |
| Botão médio | 14 | 400 |
| Chip | 14 / 20px | 400 |
| Cabeçalho de tabela | 12 | 600 |
| Corpo de tabela | 13 | 400 |
| Legenda | 11 a 13 | 400 |

Note que o cabeçalho da tabela é **menor** que o corpo. Rótulo de coluna serve
para sinalizar, e não para ser lido como conteúdo, então quem o destaca é o
peso 600 e não o tamanho.

## Regras

1. Peso antes de cor, e cor antes de tamanho. Só aumente o tamanho quando peso
   e cor já não resolverem.
2. Texto de leitura longa fica em torno de 72 caracteres de largura. Acima
   disso o olho se perde ao voltar para a linha seguinte.
3. Botão usa peso 400. O contorno e o fundo já dizem que ali é um botão, e peso
   a mais só engorda o traço.
4. No tema escuro o corpo recebe suavização em escala de cinza. Sem ela, o
   texto claro sobre fundo escuro irradia e parece mais pesado, mesmo com o
   peso igual ao do tema claro.
