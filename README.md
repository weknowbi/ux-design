# Workspace de Protótipos — Weknow

Um "Figma" para os protótipos web da equipe. Em vez de cada protótipo virar um link
avulso que alguém manda por chat, todos ficam num só lugar: você abre o link do
workspace, vê a lista de projetos como se fossem arquivos, clica no que quer ver, e
o protótipo abre ali mesmo, rodando de verdade — não é uma imagem nem uma gravação.

## Como usar

1. Abra o link do workspace (peça a quem administra, caso ainda não tenha).
2. Você cai em **Todos os projetos** — a grade com todos os protótipos disponíveis,
   com miniatura, nome e quando foi aberto/atualizado pela última vez.
3. Clique num projeto para abrir. Se ele não estiver rodando naquele momento, o
   workspace inicia sozinho (leva alguns segundos na primeira vez); se já estiver
   rodando, abre na hora.
4. Use **← Voltar ao workspace** (o logo, no canto superior) para sair do protótipo
   e voltar para a lista.

Isso substitui mandar um link de protótipo do Figma: quem recebe já cai direto na
aplicação web funcionando, sem precisar rodar nada na própria máquina.

### Navegando

- **Todos os projetos** — tudo que existe no workspace.
- **Recentes** — os projetos abertos mais recentemente, do mais novo pro mais antigo.
- **Rodando** — só os que estão com o processo ativo agora.
- **Pastas** — organização por assunto/time. Clique numa pasta na barra lateral para
  ver só os projetos dela.
- **Busca** (`/` ou `Ctrl+K`) — procura por nome, descrição ou pasta.
- Setas do teclado navegam entre os cards, `Enter` abre o selecionado, `Shift+F10`
  abre o menu `•••` (reiniciar, parar, mover de pasta, editar informações...).

### Sobre o acesso

Hoje o link de acesso é o que a pessoa que mantém o workspace compartilhar com você.
A forma definitiva de publicação — um link sempre ativo, sem depender de um
computador específico ligado — ainda está sendo definida pelo time (ver
[Próximos passos](#próximos-passos-e-decisões-em-aberto)).

## Para quem mantém o workspace

### Rodar localmente

```bash
cd app
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Adicionar um novo protótipo

1. Coloque a pasta do projeto dentro de `projects/` (ex: `projects/meu-prototipo`).
2. Garanta que ela tenha um `package.json` com um script `dev` ou `start`.
3. Pronto — o workspace verifica a pasta a cada poucos segundos e o projeto aparece
   sozinho na lista (o ícone ↻ força uma atualização imediata). Não precisa reiniciar
   nada nem editar código.

### Metadata opcional do projeto

Crie um `workspace.config.json` na raiz do projeto para controlar como ele aparece e roda:

```json
{
  "name": "Recuperaí",
  "description": "Fluxo de recuperação de carrinho abandonado",
  "category": "vendas",
  "thumbnail": "thumbnail.png",
  "devCommand": "npm run dev",
  "port": 5173
}
```

Todos os campos são opcionais. Sem eles, o workspace infere o nome pela pasta, a
descrição/comando pelo `package.json`, e detecta a porta automaticamente lendo a
saída do processo (a maioria das ferramentas — Vite, Next, CRA — imprime a URL local
ao iniciar).

**Thumbnails** seguem esta ordem de prioridade:

1. `thumbnail` definido no `workspace.config.json`;
2. imagem na raiz do projeto: `thumbnail`, `screenshot`, `preview` ou `cover`
   (`.png`, `.jpg`, `.webp`, `.gif`, `.svg`);
3. captura automática em `app/server/data/thumbnails/<id-do-projeto>.png` — a leitura
   já está ligada; um futuro job de screenshot só precisa gravar o arquivo ali;
4. placeholder neutro.

Pastas e histórico de acesso (quem abriu o quê) ficam em
`app/server/data/workspace-state.json` — local na máquina que hospeda o workspace,
fora do git. É organização do workspace, não metadata do projeto, então não altera
nada dentro das pastas dos projetos.

### Como funciona por baixo

- **Descoberta**: a cada consulta, o backend varre `projects/*` procurando pastas com
  `package.json`. Não há registro manual no código.
- **Execução**: ao abrir um projeto, o backend roda `npm install` (se necessário) e depois
  o comando de dev configurado, num processo filho isolado (`cwd` = pasta do projeto).
- **Detecção de porta**: em vez de forçar uma porta, o backend lê o `stdout`/`stderr` do
  processo procurando o padrão `http://localhost:PORTA`. Isso evita acoplar a arquitetura
  a um framework específico.
- **Isolamento**: cada projeto roda no seu próprio processo Node e é exibido num `iframe`
  apontando para `http://localhost:PORTA` — origem de navegador separada, sem
  compartilhar CSS, JS, dependências ou estado com outros projetos.
- **Encerramento**: os processos ficam em memória enquanto o workspace estiver aberto;
  fechar o servidor do workspace (`Ctrl+C`) encerra todos os processos filhos.
- **Persistência**: a lista de projetos vem sempre do filesystem (fonte da verdade); o
  status de execução vive em memória no servidor do workspace.

## Próximos passos e decisões em aberto

- **Publicação permanente**: hoje o workspace só fica acessível enquanto a máquina que
  o hospeda estiver ligada e conectada (via Tailscale). Para um link "sempre no ar",
  independente de qualquer computador específico, as opções em avaliação são:
  tornar este repositório público + GitHub Pages (grátis, mas o código e os
  protótipos ficam visíveis a qualquer pessoa da internet), GitHub Enterprise
  (mantém tudo privado à empresa, é pago), ou hospedar o workspace real num servidor
  próprio na nuvem (roda igual está hoje, com custo pequeno de hospedagem).
- Banco de dados leve (SQLite) para metadata e histórico.
- Geração automática de thumbnail a partir do projeto em execução.
- Autenticação por usuário (hoje quem tem o link tem acesso completo ao workspace).
- Integração com Git/Jira, comentários, versionamento.

A API HTTP (`/api/projects`, `/api/projects/:id/start`, etc.) já foi desenhada para
não depender de acesso direto ao filesystem do cliente, o que facilita essa evolução
para um servidor compartilhado no futuro.
