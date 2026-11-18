# Weknow Ask com MCP

O Weknow Ask como a IA única do Weknow, decidida na reunião de 11/11/2026:

- **sem escolher metadado**: a pessoa pergunta ou pede, e a IA escolhe os
  metadados e as ferramentas pelo MCP do Weknow, mostrando cada chamada;
- **faz, além de responder**: cria dashboard, alerta no WhatsApp e muda
  cadastro, pedindo confirmação quando atinge outra pessoa;
- **absorve a Análise inteligente**: o botão "Análise inteligente" da barra do
  dashboard abre o Ask com o *momento* do dashboard (aba, filtros e hora); a
  análise sai na conversa e fica salva no dashboard, com texto editável,
  comentários e compartilhamento.

## Não tem código próprio

Este projeto é só a porta de entrada do workspace. O protótipo é o mesmo de
`projects/weknow_analises` (o portal com a criação de dashboards), aberto
direto no Weknow Ask: `vite --mode ask` faz a página começar em `#/ia`.

```bash
npm run dev     # roda o weknow_analises em modo ask, na porta 5185
npm run build   # builda o weknow_analises em modo ask para ./dist
```

Para mexer no Ask, edite `projects/weknow_analises` (`src/screens/IaScreen.tsx`,
`src/lib/conversations.ts`, `src/engine/mcp.ts`, `src/engine/moment.ts`). A
cola de prompts de teste fica no canto de baixo à direita.
