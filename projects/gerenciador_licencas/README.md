# Gerenciador de Licenças Weknow — protótipo navegável

Protótipo HTML construído a partir do documento **Projeto Novo Gerenciador de Licenças v12**,
seguindo o padrão visual das telas de referência do Message Manager.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o protótipo em http://localhost:5175 e abre o navegador |
| `npm run share` | Publica na internet via Tailscale Funnel (escolhe porta pública livre) |
| `npm run build` | Regenera `gerenciador-licencas.html` (arquivo único) a partir dos módulos |

Também é possível abrir **`gerenciador-licencas.html`** direto no navegador, sem servidor.
Todos os dados são mock em memória — recarregar a página restaura o estado inicial.

## Arquivos

| Arquivo | Papel |
|---|---|
| `gerenciador-licencas.html` | **Entregável**: protótipo completo em arquivo único |
| `index.html` | Mesma tela, versão modular (desenvolvimento) |
| `data.js` | Modelo de domínio, massa de dados, situação/limites e rotinas automáticas |
| `ui.js` | Shell, menu, rotas, tabela genérica, modais, inativação/exclusão lógica, exportação |
| `views-cadastros.js` | Tipos de Parceiro, Parceiros, Clientes, Produtos, Tipos de Licença, Categorias, Ambientes, Branding, Motivos |
| `views-licencas.js` | Lista, emissão em 5 etapas, Visão 360º, renovação, alteração de situação, observações |
| `views-operacoes.js` | Instalações, Liberações Temporárias, Auditoria, Consultas e Exportação |
| `views-dashboard.js` | Dashboard (seção 11) e boot da aplicação |
| `server.js` / `share.js` / `build.js` | Servidor local, publicação e geração do arquivo único |

## Estrutura de telas (seção 6 do documento)

- **Dashboard** — panorama, saúde da carteira, distribuição empilhada por situação, licenças por tipo e categoria, usuários licenciados, resumo e tabela de ação
- **Licenças** — pesquisa com 9 filtros, emissão (Cliente → Produtos → Tipo → Vigência e usuários → Emissão), Visão 360º, renovação e alteração de situação
- **Instalações** — lista geral e por licença, cadastro, detalhes, ativação/inativação e encerramento
- **Liberações Temporárias** — lista, cadastro, aprovação, cancelamento, restauração e histórico. Sem entrada no menu por decisão de projeto: é acessada pela grid de Licenças, pela Visão 360º ou pela rota `#/liberacoes`
- **Clientes / Parceiros Comerciais / Produtos / Branding** — lista, cadastro e detalhes
- **Configurações** — Tipos de Parceiro Comercial, Tipos de Licença, Categorias de Licença, Ambientes e Motivos de Alteração de Status
- **Consultas e Exportação** — 4 conjuntos de dados com indicadores, filtros reaproveitados e exportação CSV
- **Histórico e Auditoria** — registro imutável de todas as alterações, com filtros por entidade, tipo, origem e usuário

## Visão 360º (seção 7)

Abas: Resumo · Cliente · Produtos · Instalações · Branding · Liberações · Renovações · Histórico · Observações.
Operações no cabeçalho: Renovar, Alterar Situação, Nova Instalação, Liberação Temporária e Editar.

## Regras de negócio implementadas (seção 4)

| Regra | Como aparece no protótipo |
|---|---|
| 1–3 | Cliente com várias licenças independentes; licença com várias instalações em ambientes diferentes |
| 4 | Ambiente e finalidade obrigatórios no cadastro de instalação |
| 5–6 | Instalação temporária exige data de término e não consome licença comercial |
| 7 | Expiração automática com política de tolerância (5 dias) |
| 8 | Situação, data de vencimento e motivo de bloqueio separados e exibidos lado a lado |
| 9–10 | "Ilimitado" como atributo explícito (switch), sem uso do valor 999 |
| 11–13 | Liberação temporária grava configuração original e nova, sem apagar a anterior |
| 12 | Restauração automática ao expirar a liberação |
| 14–15 | Alterações automáticas e manuais registradas com usuário, data, hora e origem |
| 16 | Rotina de expiração/restauração executável pelo raio na barra superior |
| 17 | Inativação impede novas associações sem alterar vínculos existentes |
| 18 | Sem exclusão física: inativação ou exclusão lógica, com bloqueio quando há vínculos |
| 19 | Cadastros de apoio agrupados no menu Configurações |

## Automação (seção 8)

O botão de raio na barra superior executa as rotinas: expira licenças vencidas além da tolerância,
encerra instalações temporárias vencidas, ativa liberações agendadas e restaura as vencidas.
Cada execução registra os eventos no histórico e é **idempotente** — rodar de novo não duplica alterações.

## Pontos em aberto para o time de UX

1. **Menu lateral x superior** — a seção 11.5 cita "menu lateral"; o protótipo mantém o menu superior das telas de referência, com os cadastros de apoio agrupados em *Configurações* (regra 19) e os demais módulos como itens diretos.
2. **Branding** — o documento detalha apenas a aba *Cliente desktop*; a estrutura de abas já está pronta caso seja necessária uma aba para o cliente web.
3. **Categorias de Licença** — listadas como módulo próprio na seção 6 e posicionadas dentro de *Configurações*, junto aos demais cadastros de apoio.
