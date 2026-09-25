const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const search = document.getElementById("search");

// Papel definido pela senha digitada na cortina (gate.js): "edit" ou "view".
const ROLE = document.documentElement.dataset.wsRole || "view";
const CAN_EDIT = ROLE === "edit";

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function relativeTime(iso) {
  if (!iso) return "";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  if (Math.abs(seconds) < 45) return "agora";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === "minute") return rtf.format(Math.round(seconds / size), unit);
  }
  return "";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

const PLACEHOLDER_SVG = `<svg class="thumb-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
  <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>`;
const PENCIL_SVG = `<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5Z"/></svg>`;
const EYE_SVG = `<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="2"/></svg>`;

function metaText(p) {
  if (p.pending) return "Nome salvo · publicando no site…";
  return p.updatedAt ? `Atualizado ${relativeTime(p.updatedAt)}` : "";
}

function cardHtml(p) {
  const thumb = p.thumbnail ? `<img src="${escapeHtml(p.thumbnail)}" alt="" loading="lazy" />` : PLACEHOLDER_SVG;
  const edit = CAN_EDIT && p.dir
    ? `<button type="button" class="card-edit" data-dir="${escapeHtml(p.dir)}" aria-label="Renomear ${escapeHtml(p.name)}" title="Renomear">${PENCIL_SVG}</button>`
    : "";
  return `
    <article class="card${p.pending ? " pending" : ""}">
      <a class="card-link" href="${escapeHtml(p.href)}" aria-label="${escapeHtml(p.name)}"></a>
      <div class="thumb">${thumb}</div>
      <div class="card-footer">
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div class="card-meta">${escapeHtml(metaText(p))}</div>
        ${edit}
      </div>
    </article>`;
}

let projects = [];

function render(term) {
  const t = (term || "").trim().toLowerCase();
  const filtered = t
    ? projects.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(t))
    : projects;
  grid.innerHTML = filtered.map(cardHtml).join("");
  empty.classList.toggle("hidden", filtered.length > 0);
  count.textContent = `${filtered.length} projeto${filtered.length === 1 ? "" : "s"}`;
}

search.addEventListener("input", () => render(search.value));

/* ---------------------------------------------------------------------------
   Sessao (papel + sair)
   ------------------------------------------------------------------------- */
const session = document.getElementById("session");
const roleEl = document.getElementById("role");
roleEl.className = `role ${ROLE}`;
roleEl.innerHTML = CAN_EDIT ? `${PENCIL_SVG}<span>Editor</span>` : `${EYE_SVG}<span>Visualização</span>`;
roleEl.title = CAN_EDIT ? "Você pode renomear projetos" : "Acesso só de visualização";
session.classList.remove("hidden");
document.getElementById("logout").addEventListener("click", () => window.wsGate?.logout());

const toastEl = document.getElementById("toast");
let toastTimer;
function toast(message, { error = false } = {}) {
  toastEl.textContent = message;
  toastEl.classList.toggle("error", error);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), error ? 6000 : 4000);
}

/* ---------------------------------------------------------------------------
   Renomear projeto (so papel "edit").

   O site e estatico, entao o nome novo e gravado direto no repositorio pela
   API do GitHub (projects/<pasta>/workspace.config.json) -- o commit dispara
   o workflow do Pages e o site republica sozinho em ~2 min. A protecao real
   e o token: sem permissao de escrita no repo a API recusa, nao importa o
   que diga o localStorage.
   ------------------------------------------------------------------------- */
const REPO = "weknowbi/ux-design";
const BRANCH = "main";
const TOKEN_KEY = "wsgh-token";
// Renomeacoes feitas aqui que ainda nao chegaram no manifest publicado --
// mantidas por um tempo pra um F5 antes do deploy nao "desfazer" o nome.
const PENDING_KEY = "wsrenames";
const PENDING_TTL = 20 * 60 * 1000;

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* sem storage: so nao persiste */ }
}

function readPending() {
  try { return JSON.parse(storageGet(PENDING_KEY)) || {}; } catch { return {}; }
}

function applyPending(list) {
  const pending = readPending();
  const now = Date.now();
  for (const [dir, entry] of Object.entries(pending)) {
    const p = list.find((x) => x.dir === dir);
    if (!p || p.name === entry.name || now - entry.at > PENDING_TTL) {
      delete pending[dir];
      continue;
    }
    p.name = entry.name;
    p.pending = true;
  }
  storageSet(PENDING_KEY, JSON.stringify(pending));
}

function rememberPending(dir, name) {
  const pending = readPending();
  pending[dir] = { name, at: Date.now() };
  storageSet(PENDING_KEY, JSON.stringify(pending));
}

function utf8ToBase64(text) {
  let bin = "";
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin);
}
function base64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function gh(apiPath, token, { method = "GET", body } = {}) {
  return fetch(`https://api.github.com${apiPath}`, {
    method,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function errorFor(res) {
  if (res.status === 401) return new GitHubError(401, "Token do GitHub inválido ou expirado.");
  // O GitHub responde 404 (e nao 403) quando o token nao enxerga o repo.
  if (res.status === 403 || res.status === 404) {
    return new GitHubError(res.status, "Esse token não tem permissão de escrita no repositório ux-design.");
  }
  return new GitHubError(res.status, `O GitHub recusou a alteração (erro ${res.status}).`);
}

async function saveProjectName(project, newName, token) {
  const filePath = `projects/${project.dir}/workspace.config.json`;
  const apiPath = `/repos/${REPO}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}`;

  // Duas tentativas: se alguem commitou no arquivo entre o GET e o PUT, o
  // GitHub devolve 409 -- basta reler e tentar de novo.
  for (let attempt = 0; attempt < 2; attempt++) {
    let config = {};
    let sha;
    const current = await gh(`${apiPath}?ref=${BRANCH}`, token);
    if (current.ok) {
      const file = await current.json();
      sha = file.sha;
      config = JSON.parse(base64ToUtf8(file.content));
    } else if (current.status !== 404) {
      throw errorFor(current);
    }

    config.name = newName;
    // Congela o slug atual: o link /p/<slug>/ continua valendo com o nome novo.
    if (!config.slug) config.slug = project.slug;

    const put = await gh(apiPath, token, {
      method: "PUT",
      body: {
        message: `Renomeia projeto "${project.name}" para "${newName}"`,
        content: utf8ToBase64(JSON.stringify(config, null, 2) + "\n"),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      },
    });
    if (put.ok) return;
    if (put.status === 409 && attempt === 0) continue;
    throw errorFor(put);
  }
}

// Modal do token -- resolve com o token (ja validado) ou null se cancelar.
const tokenModal = document.getElementById("token-modal");
const tokenForm = document.getElementById("token-form");
const tokenInput = document.getElementById("token-input");
const tokenError = document.getElementById("token-error");
const tokenSave = document.getElementById("token-save");
const tokenCancel = document.getElementById("token-cancel");

function askForToken() {
  return new Promise((resolve) => {
    tokenInput.value = "";
    tokenError.classList.add("hidden");
    tokenSave.disabled = false;
    tokenSave.textContent = "Conectar";

    const cleanup = (value) => {
      tokenForm.removeEventListener("submit", onSubmit);
      tokenCancel.removeEventListener("click", onCancel);
      tokenModal.removeEventListener("cancel", onCancel);
      if (tokenModal.open) tokenModal.close();
      resolve(value);
    };
    const showError = (msg) => {
      tokenError.textContent = msg;
      tokenError.classList.remove("hidden");
      tokenSave.disabled = false;
      tokenSave.textContent = "Conectar";
      tokenInput.select();
    };
    const onCancel = (e) => {
      e.preventDefault();
      cleanup(null);
    };
    const onSubmit = async (e) => {
      e.preventDefault();
      const token = tokenInput.value.trim();
      if (!token) return tokenInput.focus();
      tokenSave.disabled = true;
      tokenSave.textContent = "Verificando…";
      try {
        const res = await gh(`/repos/${REPO}`, token);
        if (res.status === 401) return showError("Token inválido ou expirado.");
        if (!res.ok) return showError(`Não foi possível acessar o repositório (erro ${res.status}).`);
        const repo = await res.json();
        if (repo.permissions && !repo.permissions.push) {
          return showError("Esse token não tem permissão de escrita no repositório.");
        }
        storageSet(TOKEN_KEY, token);
        cleanup(token);
      } catch {
        showError("Sem conexão com o GitHub. Tente de novo.");
      }
    };

    tokenForm.addEventListener("submit", onSubmit);
    tokenCancel.addEventListener("click", onCancel);
    tokenModal.addEventListener("cancel", onCancel);
    tokenModal.showModal();
    tokenInput.focus();
  });
}

function startRename(card, project) {
  const title = card.querySelector(".card-title");
  const meta = card.querySelector(".card-meta");
  const input = document.createElement("input");
  input.className = "title-input";
  input.value = project.name;
  input.maxLength = 80;
  input.setAttribute("aria-label", "Novo nome do projeto");
  title.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = () => {
    done = true;
    render(search.value);
  };

  const commit = async () => {
    if (done) return;
    const newName = input.value.trim().replace(/\s+/g, " ");
    if (!newName || newName === project.name) return finish();
    done = true;

    let token = storageGet(TOKEN_KEY);
    if (!token) {
      token = await askForToken();
      if (!token) return finish();
    }

    input.disabled = true;
    card.classList.add("saving");
    meta.textContent = "Salvando…";
    try {
      await saveProjectName(project, newName, token);
      project.name = newName;
      project.pending = true;
      rememberPending(project.dir, newName);
      toast("Nome salvo. O site atualiza para todos em cerca de 2 minutos.");
    } catch (err) {
      if (err instanceof GitHubError && err.status === 401) storageSet(TOKEN_KEY, null);
      toast(err instanceof GitHubError ? err.message : "Sem conexão com o GitHub. Tente de novo.", { error: true });
    }
    finish();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (!done) finish();
    }
  });
  // Sem mudanca, sair do campo so cancela; com mudanca, salva (como num
  // gerenciador de arquivos). O modal do token rouba o foco -- ignorar.
  input.addEventListener("blur", () => {
    if (!done && !tokenModal.open) commit();
  });
}

if (CAN_EDIT) {
  grid.classList.add("can-edit");
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".card-edit");
    if (!btn) return;
    e.preventDefault();
    const project = projects.find((p) => p.dir === btn.dataset.dir);
    if (project) startRename(btn.closest(".card"), project);
  });
}

fetch("manifest.json", { cache: "no-cache" })
  .then((r) => r.json())
  .then((data) => {
    projects = data;
    applyPending(projects);
    render("");
  })
  .catch(() => {
    count.textContent = "";
    empty.textContent = "Não foi possível carregar a lista de projetos.";
    empty.classList.remove("hidden");
  });
