# Site Weknow Healthtech — redesign

Landing page institucional da Weknow Healthtech, reconstruída em HTML, CSS e JavaScript
puros, com a estrutura de seções inspirada em [aura.com](https://www.aura.com/) e as cores
da marca Weknow.

## Como rodar

Na pasta do projeto:

```bash
npm.cmd install
```

```bash
npm.cmd run dev
```

O site abre em `http://localhost:5173`.

Outros comandos:

- `npm.cmd run build` gera a versão de produção na pasta `dist`
- `npm.cmd run preview` serve a versão já compilada

## Estrutura

```
index.html               página completa, uma seção por bloco comentado
public/
  logo-weknow.svg        logo oficial (fundo claro)
  logo-weknow-light.svg  versão com wordmark branco (fundo escuro)
  favicon.svg
src/
  styles/
    main.css             importa as folhas abaixo
    tokens.css           cores, raios, sombras, espaçamentos
    base.css             reset, tipografia, container, seções
    components.css       botões, header, banner, listas, marca
    sections.css         cada bloco da página
    responsive.css       ajustes de tablet e celular
  js/
    main.js              menu, abas, acordeões, contadores, formulários
```

## Narrativa da página

A ordem das seções segue a história: conectamos os dados, provamos o resultado,
mostramos a operação, avisamos o que exige atenção e aprofundamos com IA.

1. Header fixo, transparente sobre o hero e escuro translúcido ao rolar
2. Hero em card arredondado dentro de moldura escura, ocupando a altura da tela
3. Faixa de clientes dentro da moldura
4. Resultados reais, com os quatro números do case Unimed Litoral
5. O problema do setor, em dois números
6. O que resolvemos, em oito cartões
7. Integrações com os sistemas de gestão
8. Command Centers, com a tela grande e a jornada do paciente
9. Alertas proativos, com simulação de alerta no celular
10. Análise Inteligente, do indicador à análise
11. Indicadores por área, em doze cartões expansíveis
12. O que fazemos: software, consultoria, treinamento e rede de apoio
13. Depoimentos
14. Como começar, em três passos
15. Área de teste grátis com formulário
16. Perguntas frequentes
17. Chamada final para demonstração
18. Rodapé

## Áreas reservadas para imagem

Onde entra imagem real existe um bloco desfocado com a classe `media-slot` e um
rótulo em `data-slot`. Para publicar, troque a div inteira por uma `<img>`:

```html
<img src="/produto/command-center.png" alt="Tela do Command Center Weknow" />
```

Hoje há três: a imagem do produto no hero, a tela do Command Center e o recorte do
dashboard na seção de Análise Inteligente.

## Pontos de atenção antes de publicar

- Os números do case Unimed Litoral vieram do material da própria Weknow. Os nomes de
  clientes da faixa rolante, os depoimentos e os dois números de mercado ainda são
  **exemplos de preenchimento**.
- A faixa de clientes já está pronta para logos em imagem. Troque cada `<span>` por
  `<img>` que a altura sai padronizada.
- Os formulários apenas validam os campos no navegador. Falta conectar ao CRM ou ao
  endpoint de e-mail que a Weknow usa.
- Eventos, Blog e Trabalhe conosco ainda apontam para `#`.
- A tipografia usa Inter, carregada do Google Fonts.
