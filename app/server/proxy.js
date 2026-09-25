import { createProxyMiddleware } from "http-proxy-middleware";

const COOKIE_NAME = "wsActiveProject";

// Le um cookie simples do cabecalho Cookie (sem depender de lib externa).
function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

// Extrai o id do projeto a partir do cabecalho Referer -- usado apenas como
// fallback secundario (ver comentario mais abaixo sobre o cookie).
function extractProjectIdFromReferer(referer) {
  if (!referer) return null;
  const match = referer.match(/\/projeto\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Devolve a URL interna (localhost:porta) para onde o proxy deve mandar a
// requisicao. So inicia o projeto quando "autoStart" -- ou seja, quando alguem
// abriu explicitamente /projeto/:id. Pedidos automaticos (arquivos da pagina,
// reconexao do Vite) nunca religam um projeto: antes, uma aba aberta religava
// o projeto logo depois de "Parar", criando um servidor que o usuario nao pediu
// e que disputava a porta com o proximo inicio.
async function resolveTarget(id, { findProject, getState, startProject }, { autoStart = false } = {}) {
  if (!id) return { error: "Projeto nao identificado." };
  const project = findProject(id);
  if (!project) return { error: "Projeto nao encontrado." };

  let state = getState(project.id);
  if (state.status !== "rodando") {
    if (!autoStart) return { error: "Projeto parado. Abra-o novamente pelo workspace." };
    state = await startProject(project);
  }
  if (state.status === "rodando" && state.port) {
    return { target: `http://127.0.0.1:${state.port}` };
  }
  return { error: state.error || "Nao foi possivel iniciar o projeto." };
}

// Monta duas camadas de proxy no app Express:
//
// 1) "/projeto/:id" -- rota principal. O iframe do workspace aponta pra ca
//    (caminho relativo, mesma origem), em vez de "http://localhost:porta".
//    Isso faz o mesmo link funcionar tanto local quanto atras de um tunel
//    (Tailscale, etc.), porque "localhost" nunca aparece pro navegador remoto
//    -- o proxy resolve o hop real dentro da propria maquina que roda o
//    workspace. Ao servir essa rota, gravamos um cookie (ver camada 2).
//
// 2) Fallback por cookie -- ferramentas como o Vite servem TODOS os seus
//    arquivos com caminho absoluto ("/@vite/client", "/src/main.tsx", etc),
//    entao praticamente toda requisicao de um app assim "escapa" do prefixo
//    "/projeto/:id" da pagina que os carregou. Um fallback baseado so no
//    cabecalho Referer nao e confiavel (nem todo navegador/tipo de
//    requisicao de modulo JS manda Referer). Por isso, ao servir "/projeto/:id"
//    a primeira vez, gravamos um cookie "qual projeto esta ativo agora" --
//    e esse cookie sim acompanha toda requisicao subsequente da mesma aba
//    (scripts, modulos, etc), permitindo resolver os pedidos "perdidos"
//    de forma confiavel. Referer fica como fallback extra, caso o cookie
//    nao esteja disponivel por algum motivo.
export function mountProjectProxy(app, deps) {
  const stripFrameHeaders = {
    proxyRes: (proxyRes) => {
      delete proxyRes.headers["x-frame-options"];
      delete proxyRes.headers["content-security-policy"];
    },
  };

  // Erros de upgrade de WebSocket (ex: o cliente HMR do Vite tentando
  // reconectar) chegam aqui com "res" sendo um net.Socket bruto, NAO uma
  // resposta Express -- chamar res.status()/res.send() nesse caso lanca uma
  // excecao sincrona dentro de um handler de evento, o que derruba o
  // processo Node inteiro (nao e so um request falhando, e o servidor
  // inteiro caindo). Por isso sempre verificamos o tipo antes de responder.
  function safeErrorResponse(res, statusCode, message) {
    if (typeof res?.status === "function" && typeof res?.send === "function") {
      if (!res.headersSent) res.status(statusCode).send(message);
      return;
    }
    // Provavelmente um socket (upgrade de WebSocket) -- so fecha a conexao.
    if (typeof res?.destroy === "function") res.destroy();
    else if (typeof res?.end === "function") res.end();
  }

  const primaryProxy = createProxyMiddleware({
    changeOrigin: true,
    ws: true,
    logger: undefined,
    router: async (req) => {
      // Upgrades de WebSocket nao passam pelo roteador do Express, entao
      // req.params pode nao existir -- nesse caso caimos pro cookie tambem.
      const explicitId = req.params?.id;
      const id = explicitId || getCookie(req, COOKIE_NAME);
      const { target, error } = await resolveTarget(id, deps, { autoStart: !!explicitId });
      if (error) {
        req.projectProxyError = error;
        return undefined;
      }
      return target;
    },
    on: {
      ...stripFrameHeaders,
      error: (err, req, res) => {
        safeErrorResponse(
          res,
          502,
          `Nao foi possivel abrir o projeto "${req.params?.id}": ${req.projectProxyError || err.message}`
        );
      },
    },
  });

  app.use(
    "/projeto/:id",
    (req, res, next) => {
      res.cookie(COOKIE_NAME, req.params.id, { path: "/", sameSite: "lax" });
      next();
    },
    primaryProxy
  );

  function resolveFallbackId(req) {
    return getCookie(req, COOKIE_NAME) || extractProjectIdFromReferer(req.headers.referer);
  }

  const fallbackProxy = createProxyMiddleware({
    changeOrigin: true,
    router: async (req) => {
      const { target } = await resolveTarget(resolveFallbackId(req), deps);
      return target;
    },
    on: {
      ...stripFrameHeaders,
      error: (err, req, res) => {
        safeErrorResponse(res, 404, "Not found");
      },
    },
  });

  app.use((req, res, next) => {
    const id = resolveFallbackId(req);
    // Projeto parado: segue o fluxo normal (sem religar e sem pagina de erro)
    if (!id || deps.getState(id).status !== "rodando") return next();
    fallbackProxy(req, res, next);
  });
}
