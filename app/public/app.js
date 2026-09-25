/* =========================================================================
   Workspace de Prototipos -- interface
   JS puro, sem build. Organizacao:
     1. utilitarios        5. menus / tooltip / toast / dialogos
     2. estado + API       6. sidebar (pastas)
     3. rotas              7. navegacao de projetos (grade/lista)
     4. dados derivados    8. projeto aberto
   ========================================================================= */

const $ = (sel, root = document) => root.querySelector(sel);

// ---------------------------------------------------------------- 1. utils

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalize(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function icon(name, cls = "icon") {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const TIME_UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

// "agora", "há 5 minutos", "ontem", "há 3 dias"...
function relativeTime(iso) {
  if (!iso) return "";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  if (Math.abs(seconds) < 45) return "agora";
  for (const [unit, size] of TIME_UNITS) {
    if (Math.abs(seconds) >= size || unit === "minute") {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return "";
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function pref(key, fallback, allowed) {
  try {
    const value = localStorage.getItem(`ws.${key}`);
    return value && (!allowed || allowed.includes(value)) ? value : fallback;
  } catch {
    return fallback;
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(`ws.${key}`, value);
  } catch {
    // preferencia visual apenas -- ignorar
  }
}

// ------------------------------------------------------- 2. estado + API

const ACTIVE_STATUSES = ["rodando", "iniciando", "instalando"];
const SORTS = {
  recent: "Mais recentes",
  name: "Nome A–Z",
  updated: "Última atualização",
};

const state = {
  projects: [],
  folders: [],
  loaded: false,
  signature: "",
  route: { view: "all" },
  search: "",
  sort: pref("sort", "recent", Object.keys(SORTS)),
  layout: pref("layout", "grid", ["grid", "list"]),
  selectedId: null,
  editingFolder: false,
  dragging: false,
};

async function api(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = null;
    try {
      message = (await res.json()).error;
    } catch {
      // resposta sem JSON
    }
    throw new Error(message || `Erro ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const enc = encodeURIComponent;
const projectHash = (id) => `#/p/${enc(id)}`;
const folderHash = (id) => `#/pasta/${enc(id)}`;

const findProject = (id) => state.projects.find((p) => p.id === id);
const findFolder = (id) => state.folders.find((f) => f.id === id);
const isActive = (p) => ACTIVE_STATUSES.includes(p?.runtime?.status);

// Assinatura dos dados relevantes para a interface (sem logs), usada para so
// re-renderizar quando algo mudou de fato. O minuto atual entra para que os
// tempos relativos ("ha 2 minutos") nao fiquem congelados.
function computeSignature(projects, folders) {
  return JSON.stringify([
    Math.floor(Date.now() / 60000),
    folders,
    projects.map(({ runtime, ...rest }) => [rest, runtime?.status, runtime?.error]),
  ]);
}

async function loadData() {
  const [projects, folders] = await Promise.all([
    api("/api/projects"),
    api("/api/folders").catch(() => []),
  ]);
  const signature = computeSignature(projects, folders);
  const changed = signature !== state.signature || !state.loaded;
  state.projects = projects;
  state.folders = Array.isArray(folders) ? folders : [];
  state.signature = signature;
  state.loaded = true;
  return changed;
}

// Durante interacoes em andamento (menu aberto, arrastando, renomeando pasta)
// o polling nao re-renderiza -- apenas marca para renderizar no proximo ciclo.
function isInteracting() {
  return Menu.isOpen() || state.dragging || state.editingFolder;
}

async function refresh({ force = false } = {}) {
  try {
    const changed = await loadData();
    if (!force && changed && isInteracting()) state.signature = "";
    else if (changed || force) renderAll();
    else renderProjectBarStatus();
  } catch (err) {
    console.error(err);
  }
}

// Descoberta automatica: o backend le o filesystem a cada consulta, entao um
// polling leve mantem a lista (e o estado "rodando") sempre atual, sem o
// usuario precisar clicar em "Atualizar". Acelera enquanto algo esta iniciando.
let pollTimer = null;
function schedulePoll() {
  clearTimeout(pollTimer);
  const busy = state.projects.some((p) => ["iniciando", "instalando"].includes(p.runtime?.status));
  pollTimer = setTimeout(async () => {
    if (document.visibilityState === "visible") await refresh();
    schedulePoll();
  }, busy ? 1200 : 4000);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refresh();
});

// ------------------------------------------------------------- 3. rotas

let lastBrowseHash = "#/";

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  let path;
  try {
    path = decodeURIComponent(raw);
  } catch {
    path = raw;
  }
  if (path === "recentes") return { view: "recent" };
  if (path === "rodando") return { view: "running" };
  if (path.startsWith("pasta/")) return { view: "folder", folderId: path.slice(6) };
  if (path.startsWith("p/")) return { view: "project", projectId: path.slice(2) };
  return { view: "all" };
}

function handleRoute() {
  Menu.closeAll({ restoreFocus: false });
  const route = parseRoute();
  if (route.view === "project") {
    showProject(route.projectId);
    return;
  }
  const leftProjectId = leaveProject();
  state.route = route;
  lastBrowseHash = location.hash || "#/";
  if (leftProjectId) state.selectedId = leftProjectId;
  renderAll();
  if (leftProjectId) focusItem(leftProjectId);
}

window.addEventListener("hashchange", handleRoute);

// --------------------------------------------------- 4. dados derivados

function viewTitle(route = state.route) {
  switch (route.view) {
    case "recent":
      return "Recentes";
    case "running":
      return "Rodando";
    case "folder":
      return findFolder(route.folderId)?.name ?? "Pasta";
    default:
      return "Todos os projetos";
  }
}

function effectiveSort() {
  return state.route.view === "recent" ? "recent" : state.sort;
}

function matchesSearch(project, tokens) {
  const haystack = normalize(
    [project.name, project.description, findFolder(project.folderId)?.name, project.id, project.category]
      .filter(Boolean)
      .join(" ")
  );
  return tokens.every((t) => haystack.includes(t));
}

const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base", numeric: true });
const byUpdated = (a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || "");

function sortProjects(list, sort) {
  const sorted = [...list];
  if (sort === "name") return sorted.sort(byName);
  if (sort === "updated") return sorted.sort((a, b) => byUpdated(a, b) || byName(a, b));
  // "Mais recentes": abertos primeiro (ultimo acesso), depois por atualizacao
  return sorted.sort((a, b) => {
    if (a.lastOpened || b.lastOpened) {
      const diff = (b.lastOpened || "").localeCompare(a.lastOpened || "");
      if (diff) return diff;
    }
    return byUpdated(a, b) || byName(a, b);
  });
}

function visibleProjects() {
  const { view, folderId } = state.route;
  let list = state.projects;
  if (view === "recent") list = list.filter((p) => p.lastOpened);
  if (view === "running") list = list.filter(isActive);
  if (view === "folder") list = list.filter((p) => p.folderId === folderId);

  const tokens = normalize(state.search).split(/\s+/).filter(Boolean);
  if (tokens.length) list = list.filter((p) => matchesSearch(p, tokens));

  return sortProjects(list, effectiveSort());
}

function metaText(project) {
  if (effectiveSort() === "updated" || !project.lastOpened) {
    return `Atualizado ${relativeTime(project.lastUpdated)}`;
  }
  return `Aberto ${relativeTime(project.lastOpened)}`;
}

const STATUS_LABELS = {
  rodando: "Rodando",
  iniciando: "Iniciando…",
  instalando: "Instalando…",
  erro: "Erro ao iniciar",
};

// Parado nao tem indicador: o estado neutro eh a ausencia de status.
function statusHtml(runtime) {
  const status = runtime?.status;
  if (!STATUS_LABELS[status]) return "";
  const title = status === "erro" && runtime.error ? ` title="${escapeHtml(runtime.error)}"` : "";
  return `<span class="status status-${status}"${title}><span class="status-dot" aria-hidden="true"></span>${STATUS_LABELS[status]}</span>`;
}

// Placeholder neutro: uma "janela" abstrata. Tres variacoes escolhidas pelo id
// para a grade nao parecer uma parede de cards identicos.
function placeholderSvg(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const fill = "#efefef";
  const soft = "#f5f5f5";
  const variants = [
    `<rect x="8" y="21" width="28" height="71" rx="2" fill="${soft}"/>
     <rect x="44" y="22" width="52" height="5" rx="1.5" fill="${fill}"/>
     <rect x="44" y="33" width="108" height="26" rx="2" fill="${soft}"/>
     <rect x="44" y="65" width="51" height="27" rx="2" fill="${soft}"/>
     <rect x="101" y="65" width="51" height="27" rx="2" fill="${soft}"/>`,
    `<rect x="8" y="22" width="60" height="5" rx="1.5" fill="${fill}"/>
     <rect x="8" y="33" width="44" height="20" rx="2" fill="${soft}"/>
     <rect x="58" y="33" width="44" height="20" rx="2" fill="${soft}"/>
     <rect x="108" y="33" width="44" height="20" rx="2" fill="${soft}"/>
     <rect x="8" y="59" width="144" height="33" rx="2" fill="${soft}"/>
     <path d="M16 84l18-9 16 5 20-13 18 7 22-10 18 6 20-8" stroke="#e2e2e2" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<rect x="50" y="26" width="60" height="6" rx="1.5" fill="${fill}"/>
     <rect x="50" y="40" width="60" height="9" rx="2" fill="${soft}" stroke="#ececec"/>
     <rect x="50" y="54" width="60" height="9" rx="2" fill="${soft}" stroke="#ececec"/>
     <rect x="50" y="71" width="60" height="10" rx="2" fill="#e5f4ff"/>`,
  ];
  return `<svg viewBox="0 0 160 100" fill="none" aria-hidden="true">
    <rect x="0.5" y="0.5" width="159" height="99" rx="5" fill="#fff" stroke="#e3e3e3"/>
    <path d="M0.5 13.5h159" stroke="#ececec"/>
    <circle cx="8" cy="7" r="1.6" fill="#e3e3e3"/><circle cx="14" cy="7" r="1.6" fill="#e3e3e3"/><circle cx="20" cy="7" r="1.6" fill="#e3e3e3"/>
    ${variants[hash % variants.length]}
  </svg>`;
}

function placeholderHtml(id) {
  return `<div class="thumb-placeholder">${placeholderSvg(id)}</div>`;
}

// Prioridade (resolvida no backend): thumbnail configurada -> imagem no projeto
// -> captura automatica (futuro) -> placeholder.
function thumbHtml(project) {
  if (!project.thumbnail) return placeholderHtml(project.id);
  const src = `/api/projects/${enc(project.id)}/thumbnail?v=${project.thumbnail.version ?? ""}`;
  return `<img src="${src}" alt="" loading="lazy" decoding="async" draggable="false" data-thumb-for="${escapeHtml(project.id)}" />`;
}

// ------------------------------------- 5. menus / tooltip / toast / dialogos

const Menu = (() => {
  const stack = []; // [{ el, anchor, restoreTo }]

  function build(items) {
    const el = document.createElement("div");
    el.className = "menu";
    el.setAttribute("role", "menu");
    el.tabIndex = -1;
    const hasChecks = items.some((i) => i && i.checked !== undefined);

    for (const item of items) {
      if (!item) continue;
      if (item.separator) {
        el.insertAdjacentHTML("beforeend", `<div class="menu-separator" role="separator"></div>`);
        continue;
      }
      if (item.heading) {
        el.insertAdjacentHTML("beforeend", `<div class="menu-heading">${escapeHtml(item.heading)}</div>`);
        continue;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.className = "menu-item" + (item.danger ? " menu-item-danger" : "");
      btn.setAttribute("role", item.checked !== undefined ? "menuitemradio" : "menuitem");
      if (item.checked !== undefined) btn.setAttribute("aria-checked", String(item.checked));
      if (item.submenu) btn.setAttribute("aria-haspopup", "menu");
      btn.disabled = !!item.disabled;
      btn.innerHTML = `
        ${hasChecks ? (item.checked ? icon("check", "icon menu-item-check") : `<span class="menu-item-check"></span>`) : ""}
        ${item.icon ? icon(item.icon) : ""}
        <span class="menu-item-label">${escapeHtml(item.label)}</span>
        ${item.hint ? `<span class="menu-item-hint">${escapeHtml(item.hint)}</span>` : ""}
        ${item.submenu ? icon("chevron-right", "icon icon-xs") : ""}`;
      btn._item = item;
      el.appendChild(btn);
    }
    return el;
  }

  function place(el, { anchor, point, parentItem, align = "start" }) {
    const pad = 8;
    const { innerWidth: vw, innerHeight: vh } = window;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x;
    let y;
    if (parentItem) {
      const r = parentItem.getBoundingClientRect();
      x = r.right + 2;
      y = r.top - 5;
      if (x + w > vw - pad) x = r.left - w - 2;
    } else if (anchor) {
      const r = anchor.getBoundingClientRect();
      x = align === "end" ? r.right - w : r.left;
      y = r.bottom + 4;
      if (y + h > vh - pad) y = r.top - h - 4;
    } else {
      x = point.x;
      y = point.y;
      if (x + w > vw - pad) x = point.x - w;
      if (y + h > vh - pad) y = point.y - h;
    }
    el.style.left = `${Math.max(pad, Math.min(x, vw - w - pad))}px`;
    el.style.top = `${Math.max(pad, Math.min(y, vh - h - pad))}px`;
  }

  const enabledItems = (el) => [...el.querySelectorAll(".menu-item:not(:disabled)")];

  function levelOf(el) {
    return stack.findIndex((m) => m.el === el);
  }

  function closeFrom(level, { restoreFocus = true } = {}) {
    while (stack.length > level) {
      const entry = stack.pop();
      entry.el.remove();
      entry.anchor?.setAttribute("aria-expanded", "false");
      entry.parentItem?.classList.remove("is-active");
      if (stack.length === level && restoreFocus) entry.restoreTo?.focus({ preventScroll: true });
    }
  }

  function closeAll(opts) {
    closeFrom(0, opts);
  }

  function open(items, opts = {}) {
    const level = opts.parentItem ? levelOf(opts.parentItem.closest(".menu")) + 1 : 0;
    closeFrom(level, { restoreFocus: false });
    Tooltip.hide();

    const el = build(typeof items === "function" ? items() : items);
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    place(el, opts);
    el.style.visibility = "";

    const restoreTo = opts.parentItem || opts.restoreTo || opts.anchor || document.activeElement;
    stack.push({ el, anchor: opts.anchor, parentItem: opts.parentItem, restoreTo });
    opts.anchor?.setAttribute("aria-expanded", "true");
    opts.parentItem?.classList.add("is-active");

    const first = enabledItems(el)[0];
    (first || el).focus({ preventScroll: true });

    el.addEventListener("keydown", (e) => onKeydown(e, el));
    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".menu-item");
      if (btn) activate(btn);
    });
    el.addEventListener("mouseover", (e) => {
      const btn = e.target.closest(".menu-item");
      if (!btn || btn.disabled) return;
      if (document.activeElement !== btn) btn.focus({ preventScroll: true });
      const lvl = levelOf(el);
      if (btn._item.submenu) {
        if (stack[lvl + 1]?.parentItem !== btn) openSubmenu(btn, { focusFirst: false });
      } else {
        closeFrom(lvl + 1, { restoreFocus: false });
      }
    });
    return el;
  }

  function openSubmenu(btn, { focusFirst = true } = {}) {
    const sub = open(btn._item.submenu, { parentItem: btn });
    if (!focusFirst) btn.focus({ preventScroll: true });
    return sub;
  }

  function activate(btn) {
    if (btn.disabled) return;
    const item = btn._item;
    if (item.submenu) {
      openSubmenu(btn);
      return;
    }
    closeAll({ restoreFocus: item.restoreFocus !== false });
    item.onSelect?.();
  }

  function onKeydown(e, el) {
    const items = enabledItems(el);
    const index = items.indexOf(document.activeElement);
    const level = levelOf(el);
    const move = (i) => items[(i + items.length) % items.length]?.focus({ preventScroll: true });

    switch (e.key) {
      case "ArrowDown":
        move(index + 1);
        break;
      case "ArrowUp":
        move(index < 0 ? -1 : index - 1);
        break;
      case "Home":
        move(0);
        break;
      case "End":
        move(-1);
        break;
      case "ArrowRight":
        if (items[index]?._item.submenu) openSubmenu(items[index]);
        break;
      case "ArrowLeft":
        if (level > 0) closeFrom(level);
        break;
      case "Escape":
        closeFrom(level);
        break;
      case "Tab":
        closeAll({ restoreFocus: false });
        return;
      case "Enter":
      case " ":
        if (items[index]) activate(items[index]);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  document.addEventListener(
    "mousedown",
    (e) => {
      if (!stack.length) return;
      if (e.target.closest(".menu")) return;
      // clicar de novo no gatilho fecha (tratado no proprio gatilho)
      if (stack[0].anchor && stack[0].anchor.contains(e.target)) return;
      closeAll({ restoreFocus: false });
    },
    true
  );
  window.addEventListener("resize", () => closeAll({ restoreFocus: false }));
  window.addEventListener("blur", () => closeAll({ restoreFocus: false }));
  document.addEventListener(
    "scroll",
    (e) => {
      if (stack.length && !(e.target instanceof Element && e.target.closest(".menu"))) closeAll({ restoreFocus: false });
    },
    true
  );

  // Gatilho padrao: alterna o menu ancorado neste botao.
  function toggle(anchor, items, opts = {}) {
    if (stack[0]?.anchor === anchor) {
      closeAll();
      return;
    }
    open(items, { anchor, ...opts });
  }

  return { open, toggle, closeAll, isOpen: () => stack.length > 0 };
})();

const Tooltip = (() => {
  const el = $("#tooltip");
  let timer = null;
  let current = null;

  function show(target) {
    const text = target.dataset.tooltip;
    if (!text || target.getAttribute("aria-expanded") === "true") return;
    el.textContent = text;
    el.hidden = false;
    const r = target.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    let y = r.bottom + 6;
    if (y + h > window.innerHeight - 8) y = r.top - h - 6;
    el.style.left = `${Math.max(8, Math.min(x, window.innerWidth - w - 8))}px`;
    el.style.top = `${y}px`;
  }

  function hide() {
    clearTimeout(timer);
    current = null;
    el.hidden = true;
  }

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest?.("[data-tooltip]");
    if (target === current) return;
    hide();
    if (!target) return;
    current = target;
    timer = setTimeout(() => show(target), 450);
  });
  document.addEventListener("focusin", (e) => {
    const target = e.target.closest?.("[data-tooltip]");
    hide();
    if (target && target.matches(":focus-visible")) {
      current = target;
      show(target);
    }
  });
  document.addEventListener("focusout", hide);
  document.addEventListener("mousedown", hide, true);
  document.addEventListener("keydown", (e) => e.key === "Escape" && hide());
  document.addEventListener("scroll", hide, true);

  return { hide };
})();

const toast = (() => {
  const el = $("#toast");
  let timer = null;
  return (message) => {
    clearTimeout(timer);
    el.textContent = message;
    el.hidden = false;
    timer = setTimeout(() => (el.hidden = true), 2600);
  };
})();

// Fecha dialogos pelos botoes [data-dialog-close]
document.addEventListener("click", (e) => {
  const closer = e.target.closest("[data-dialog-close]");
  if (closer) closer.closest("dialog")?.close("cancel");
});

// Clique no backdrop fecha
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("mousedown", (e) => {
    if (e.target === dialog) dialog.close("cancel");
  });
}

// Dialogo generico: pede um nome ou confirma uma acao destrutiva.
// Resolve com o texto digitado (ou true, para confirmacoes) / null se cancelado.
function promptDialog({ title, text = "", label = "Nome", value = "", confirmLabel = "Confirmar", danger = false, input = true }) {
  const dialog = $("#prompt-dialog");
  const form = $("#prompt-form");
  const field = $("#prompt-field");
  const inputEl = $("#prompt-input");
  const confirm = $("#prompt-confirm");

  $("#prompt-dialog-title").textContent = title;
  $("#prompt-dialog-text").innerHTML = text;
  $("#prompt-dialog-text").classList.toggle("hidden", !text);
  $("#prompt-label").textContent = label;
  field.classList.toggle("hidden", !input);
  inputEl.value = value;
  confirm.textContent = confirmLabel;
  confirm.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;

  return new Promise((resolve) => {
    // Resolve direto no submit (nao depende do evento "close", que pode
    // chegar atrasado); o "close" cobre cancelamentos (Esc, X, backdrop).
    const settle = (result) => {
      form.removeEventListener("submit", onSubmit);
      dialog.removeEventListener("close", onClose);
      if (dialog.open) dialog.close();
      resolve(result);
    };
    const onSubmit = (e) => {
      e.preventDefault();
      if (!input) return settle(true);
      const v = inputEl.value.trim();
      if (!v) {
        inputEl.focus();
        return;
      }
      settle(v);
    };
    const onClose = () => settle(null);
    form._settle?.(null); // descarta uma chamada anterior que nao tenha finalizado
    form._settle = settle;
    form.addEventListener("submit", onSubmit);
    dialog.addEventListener("close", onClose);
    dialog.showModal();
    if (input) {
      inputEl.focus();
      inputEl.select();
    } else {
      confirm.focus();
    }
  });
}

function openEditDialog(project) {
  const dialog = $("#edit-dialog");
  const form = $("#edit-form");
  const nameInput = $("#edit-name");
  const descInput = $("#edit-description");
  nameInput.value = project.name || "";
  descInput.value = project.description || "";

  const onSubmit = async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    try {
      await api(`/api/projects/${enc(project.id)}`, {
        method: "PATCH",
        body: { name, description: descInput.value.trim() },
      });
      cleanup();
      dialog.close("ok");
      await refresh({ force: true });
      toast("Informações atualizadas");
    } catch (err) {
      toast(`Não foi possível salvar: ${err.message}`);
    }
  };
  const cleanup = () => {
    form.removeEventListener("submit", onSubmit);
    dialog.removeEventListener("close", cleanup);
  };
  form._cleanup?.();
  form._cleanup = cleanup;
  form.addEventListener("submit", onSubmit);
  dialog.addEventListener("close", cleanup);
  dialog.showModal();
  nameInput.focus();
  nameInput.select();
}

// ------------------------------------------------------ acoes de projeto

async function startInBackground(project) {
  try {
    await api(`/api/projects/${enc(project.id)}/start`, { method: "POST" });
    toast(`Iniciando “${project.name}”…`);
    await refresh();
    schedulePoll();
  } catch (err) {
    toast(`Não foi possível iniciar: ${err.message}`);
  }
}

async function stopAllFlow() {
  const active = state.projects.filter(isActive);
  if (!active.length) return;
  const ok = await promptDialog({
    title: "Parar todos os projetos",
    text:
      active.length === 1
        ? `O servidor de <strong>${escapeHtml(active[0].name)}</strong> será encerrado. Abrir o projeto de novo o inicia normalmente.`
        : `Os servidores de <strong>${active.length} projetos</strong> serão encerrados e deixam de usar memória. Abrir um projeto de novo o inicia normalmente.`,
    input: false,
    confirmLabel: active.length === 1 ? "Parar projeto" : `Parar ${active.length} projetos`,
    danger: true,
  });
  if (!ok) return;

  const btn = $("#stop-all-btn");
  btn.disabled = true;
  btn.querySelector("span").textContent = "Parando…";
  const results = await Promise.allSettled(
    active.map((p) => api(`/api/projects/${enc(p.id)}/stop`, { method: "POST" }))
  );
  btn.disabled = false;
  btn.querySelector("span").textContent = "Parar todos";

  const failed = results.filter((r) => r.status === "rejected").length;
  const stopped = active.length - failed;
  toast(failed ? `${plural(stopped, "projeto parado", "projetos parados")} · ${failed} com erro` : plural(stopped, "projeto parado", "projetos parados"));
  await refresh({ force: true });
}

$("#stop-all-btn").addEventListener("click", stopAllFlow);

async function stopProjectAction(project) {
  try {
    await api(`/api/projects/${enc(project.id)}/stop`, { method: "POST" });
    toast(`“${project.name}” foi parado`);
    if (openProjectState.id === project.id) location.hash = lastBrowseHash;
    await refresh();
  } catch (err) {
    toast(`Não foi possível parar: ${err.message}`);
  }
}

async function restartProject(project) {
  try {
    await api(`/api/projects/${enc(project.id)}/stop`, { method: "POST" });
    if (openProjectState.id === project.id) {
      openProjectState.id = null;
      showProject(project.id);
      return;
    }
    await api(`/api/projects/${enc(project.id)}/start`, { method: "POST" });
    toast(`Reiniciando “${project.name}”…`);
    await refresh();
    schedulePoll();
  } catch (err) {
    toast(`Não foi possível reiniciar: ${err.message}`);
  }
}

async function revealProject(project) {
  try {
    await api(`/api/projects/${enc(project.id)}/reveal`, { method: "POST" });
  } catch (err) {
    toast(`Não foi possível abrir a pasta: ${err.message}`);
  }
}

function openInNewTab(project) {
  // /projeto/:id inicia o projeto sob demanda (ver server/proxy.js)
  api(`/api/projects/${enc(project.id)}/start`, { method: "POST", body: { open: true } }).catch(() => {});
  window.open(`/projeto/${enc(project.id)}/`, "_blank", "noopener");
}

async function moveToFolder(project, folderId) {
  const previous = project.folderId;
  if (previous === folderId) return;
  project.folderId = folderId; // otimista
  renderAll();
  try {
    await api(`/api/projects/${enc(project.id)}/folder`, { method: "PUT", body: { folderId } });
    toast(folderId ? `Movido para “${findFolder(folderId)?.name}”` : `“${project.name}” removido da pasta`);
    await refresh({ force: true });
  } catch (err) {
    project.folderId = previous;
    renderAll();
    toast(`Não foi possível mover: ${err.message}`);
  }
}

async function createFolderFlow({ assignProject } = {}) {
  const name = await promptDialog({ title: "Nova pasta", label: "Nome da pasta", confirmLabel: "Criar pasta" });
  if (!name) return null;
  try {
    const folder = await api("/api/folders", { method: "POST", body: { name } });
    state.folders.push(folder);
    if (assignProject) await moveToFolder(assignProject, folder.id);
    else renderAll();
    return folder;
  } catch (err) {
    toast(`Não foi possível criar a pasta: ${err.message}`);
    return null;
  }
}

function projectMenuItems(project, { inProjectView = false } = {}) {
  const active = isActive(project);
  const folderItems = state.folders.map((f) => ({
    label: f.name,
    icon: "folder",
    checked: project.folderId === f.id,
    onSelect: () => moveToFolder(project, f.id),
  }));

  return [
    !inProjectView && { label: "Abrir projeto", icon: "open", onSelect: () => (location.hash = projectHash(project.id)), restoreFocus: false },
    { label: "Abrir em nova aba", icon: "external", onSelect: () => openInNewTab(project) },
    { separator: true },
    active
      ? { label: "Reiniciar", icon: "restart", onSelect: () => restartProject(project) }
      : { label: "Iniciar em segundo plano", icon: "running", onSelect: () => startInBackground(project) },
    active && { label: "Parar", icon: "stop", onSelect: () => stopProjectAction(project) },
    { separator: true },
    {
      label: "Mover para pasta",
      icon: "move",
      submenu: () => [
        ...(folderItems.length ? folderItems : [{ heading: "Nenhuma pasta criada" }]),
        { separator: true },
        project.folderId && { label: "Remover da pasta", icon: "close", onSelect: () => moveToFolder(project, null) },
        { label: "Nova pasta…", icon: "plus", onSelect: () => createFolderFlow({ assignProject: project }), restoreFocus: false },
      ],
    },
    { label: "Editar informações", icon: "edit", onSelect: () => openEditDialog(project), restoreFocus: false },
    { label: "Abrir pasta local", icon: "folder-open", onSelect: () => revealProject(project) },
  ];
}

// ------------------------------------------------ 6. sidebar (pastas)

const sidebar = $("#sidebar");
const folderList = $("#folder-list");

function renderSidebar() {
  const { view, folderId } = state.route;
  for (const link of sidebar.querySelectorAll("[data-route]")) {
    const current = link.dataset.route === view;
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  const running = state.projects.filter(isActive).length;
  $("#running-count").textContent = running ? String(running) : "";

  if (state.editingFolder) return;
  folderList.innerHTML = state.folders
    .map(
      (f) => `
      <li class="folder-item" data-folder-id="${escapeHtml(f.id)}">
        <a class="nav-item" href="${folderHash(f.id)}" ${view === "folder" && folderId === f.id ? 'aria-current="page"' : ""}>
          ${icon("folder")}
          <span class="nav-label">${escapeHtml(f.name)}</span>
        </a>
        <button class="icon-btn icon-btn-sm folder-more" aria-label="Opções da pasta ${escapeHtml(f.name)}" aria-haspopup="menu">${icon("more")}</button>
      </li>`
    )
    .join("");
}

function folderMenuItems(folder) {
  return [
    { label: "Renomear", icon: "edit", onSelect: () => startFolderRename(folder), restoreFocus: false },
    { separator: true },
    { label: "Excluir pasta", icon: "trash", danger: true, onSelect: () => deleteFolderFlow(folder), restoreFocus: false },
  ];
}

// Edicao inline na propria sidebar (criar e renomear), como num gerenciador de arquivos.
function inlineFolderInput({ li, initial, onCommit, onCancel }) {
  state.editingFolder = true;
  const input = document.createElement("input");
  input.className = "nav-input";
  input.value = initial;
  input.maxLength = 60;
  input.setAttribute("aria-label", "Nome da pasta");
  let done = false;

  const finish = async (commit) => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    state.editingFolder = false;
    if (commit && value && value !== initial) await onCommit(value);
    else onCancel?.();
    renderSidebar();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") {
      e.stopPropagation();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
  return input;
}

function startNewFolderInline() {
  if (state.editingFolder) return;
  const li = document.createElement("li");
  li.className = "folder-item";
  li.innerHTML = `<div class="nav-item">${icon("folder")}</div>`;
  const input = inlineFolderInput({
    li,
    initial: "",
    onCommit: async (name) => {
      try {
        const folder = await api("/api/folders", { method: "POST", body: { name } });
        state.folders.push(folder);
        location.hash = folderHash(folder.id);
      } catch (err) {
        toast(`Não foi possível criar a pasta: ${err.message}`);
      }
    },
  });
  input.placeholder = "Nome da pasta";
  li.firstElementChild.appendChild(input);
  folderList.appendChild(li);
  input.focus();
}

function startFolderRename(folder) {
  const li = folderList.querySelector(`[data-folder-id="${CSS.escape(folder.id)}"]`);
  if (!li || state.editingFolder) return;
  const link = li.querySelector(".nav-item");
  const row = document.createElement("div");
  row.className = "nav-item";
  row.innerHTML = icon("folder");
  const input = inlineFolderInput({
    li,
    initial: folder.name,
    onCommit: async (name) => {
      try {
        const updated = await api(`/api/folders/${enc(folder.id)}`, { method: "PATCH", body: { name } });
        folder.name = updated.name;
        renderAll();
      } catch (err) {
        toast(`Não foi possível renomear: ${err.message}`);
      }
    },
  });
  row.appendChild(input);
  link.replaceWith(row);
  input.focus();
  input.select();
}

async function deleteFolderFlow(folder) {
  const count = state.projects.filter((p) => p.folderId === folder.id).length;
  const detail = count
    ? count === 1
      ? "1 projeto sairá desta pasta, mas continuará disponível em <strong>Todos os projetos</strong>. Nenhum arquivo é apagado."
      : `${count} projetos sairão desta pasta, mas continuarão disponíveis em <strong>Todos os projetos</strong>. Nenhum arquivo é apagado.`
    : "A pasta está vazia. Nenhum arquivo é apagado.";
  const ok = await promptDialog({
    title: "Excluir pasta",
    text: `Excluir <strong>${escapeHtml(folder.name)}</strong>? ${detail}`,
    input: false,
    confirmLabel: "Excluir pasta",
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`/api/folders/${enc(folder.id)}`, { method: "DELETE" });
    state.folders = state.folders.filter((f) => f.id !== folder.id);
    for (const p of state.projects) if (p.folderId === folder.id) p.folderId = null;
    if (state.route.view === "folder" && state.route.folderId === folder.id) location.hash = "#/";
    else renderAll();
    toast(`Pasta “${folder.name}” excluída`);
  } catch (err) {
    toast(`Não foi possível excluir: ${err.message}`);
  }
}

$("#new-folder-btn").addEventListener("click", startNewFolderInline);

folderList.addEventListener("click", (e) => {
  const more = e.target.closest(".folder-more");
  if (!more) return;
  const folder = findFolder(more.closest("[data-folder-id]").dataset.folderId);
  if (folder) Menu.toggle(more, folderMenuItems(folder));
});

folderList.addEventListener("dblclick", (e) => {
  const li = e.target.closest("[data-folder-id]");
  const folder = li && findFolder(li.dataset.folderId);
  if (folder && !e.target.closest(".folder-more")) {
    e.preventDefault();
    startFolderRename(folder);
  }
});

folderList.addEventListener("keydown", (e) => {
  if (e.key !== "F2") return;
  const li = e.target.closest("[data-folder-id]");
  const folder = li && findFolder(li.dataset.folderId);
  if (folder) startFolderRename(folder);
});

// Arrastar projetos para pastas
const DRAG_TYPE = "application/x-workspace-project";

folderList.addEventListener("dragover", (e) => {
  const link = e.target.closest(".folder-item .nav-item");
  if (!link || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  for (const el of folderList.querySelectorAll(".is-drop-target")) if (el !== link) el.classList.remove("is-drop-target");
  link.classList.add("is-drop-target");
});
folderList.addEventListener("dragleave", (e) => {
  const link = e.target.closest(".folder-item .nav-item");
  if (link && !link.contains(e.relatedTarget)) link.classList.remove("is-drop-target");
});
folderList.addEventListener("drop", (e) => {
  const li = e.target.closest("[data-folder-id]");
  for (const el of folderList.querySelectorAll(".is-drop-target")) el.classList.remove("is-drop-target");
  const projectId = e.dataTransfer.getData(DRAG_TYPE);
  const project = findProject(projectId);
  if (!li || !project) return;
  e.preventDefault();
  moveToFolder(project, li.dataset.folderId);
});

// -------------------------------------- 7. navegacao de projetos (grade/lista)

const content = $("#content");
const searchInput = $("#search-input");
const sortBtn = $("#sort-btn");

function renderToolbar() {
  const title = viewTitle();
  const context = $("#toolbar-context");
  const contextHtml =
    state.route.view === "folder" && findFolder(state.route.folderId)
      ? `<button class="view-title-btn" id="folder-title-btn" aria-haspopup="menu" aria-label="Opções da pasta ${escapeHtml(title)}">
          <h1 class="view-title">${escapeHtml(title)}</h1>${icon("chevron-down", "icon icon-xs")}
        </button>`
      : `<h1 class="view-title">${escapeHtml(title)}</h1>`;
  // Nao recria o gatilho a cada polling (manteria um menu aberto sem ancora)
  if (context.dataset.html !== contextHtml) {
    context.innerHTML = contextHtml;
    context.dataset.html = contextHtml;
  }
  document.title = `${title} · Weknow Protótipos`;

  const list = visibleProjects();
  const count = $("#view-count");
  if (!state.loaded) count.textContent = "";
  else if (state.search.trim()) count.textContent = plural(list.length, "resultado", "resultados");
  else count.textContent = plural(list.length, "projeto", "projetos");

  sortBtn.classList.toggle("hidden", state.route.view === "recent");
  const stopAllBtn = $("#stop-all-btn");
  if (!stopAllBtn.disabled) {
    stopAllBtn.classList.toggle("hidden", state.route.view !== "running" || !state.projects.some(isActive));
  }
  $("#sort-label").textContent = SORTS[state.sort];

  for (const btn of document.querySelectorAll("[data-layout]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.layout === state.layout));
  }
  return list;
}

function emptyStateHtml() {
  const term = state.search.trim();
  const { view } = state.route;
  let config;

  if (!state.projects.length) {
    config = {
      icon: "inbox",
      title: "Nenhum projeto no workspace",
      text: "Coloque uma pasta com <code>package.json</code> dentro de <code>/projects</code>. Ela aparece aqui automaticamente.",
    };
  } else if (term) {
    config = {
      icon: "search",
      title: `Nenhum resultado para “${escapeHtml(term)}”`,
      text: view === "all" ? "Tente buscar por nome, descrição ou pasta." : `Nada encontrado em ${escapeHtml(viewTitle())}.`,
      actions: [
        view !== "all" && `<button class="btn-link" data-empty-action="search-all">Buscar em todos os projetos</button>`,
        `<button class="btn-link" data-empty-action="clear-search">Limpar busca</button>`,
      ],
    };
  } else if (view === "recent") {
    config = { icon: "clock", title: "Nenhum projeto recente", text: "Os projetos que você abrir aparecem aqui, do mais recente para o mais antigo." };
  } else if (view === "running") {
    config = { icon: "running", title: "Nenhum projeto está rodando", text: "Ao abrir um projeto ele é iniciado e aparece aqui enquanto estiver em execução." };
  } else if (view === "folder") {
    config = {
      icon: "folder",
      title: "Nenhum projeto nesta pasta",
      text: "Arraste projetos até a pasta na barra lateral ou use <strong>Mover para pasta</strong> no menu de um projeto.",
      actions: [`<a class="btn-link" href="#/">Ver todos os projetos</a>`],
    };
  }

  const actions = (config.actions || []).filter(Boolean);
  return `
    <div class="empty">
      <span class="empty-icon">${icon(config.icon)}</span>
      <p class="empty-title">${config.title}</p>
      <p class="empty-text">${config.text}</p>
      ${actions.length ? `<div class="empty-actions">${actions.join("")}</div>` : ""}
    </div>`;
}

function skeletonHtml() {
  const card = `
    <div class="card skeleton-card" aria-hidden="true">
      <div class="thumb"></div>
      <div class="card-footer"><div class="card-text"><div class="skeleton-line" style="width:60%"></div><div class="skeleton-line" style="width:35%;margin-top:6px"></div></div></div>
    </div>`;
  return `<div class="grid">${card.repeat(4)}</div>`;
}

function moreButtonHtml(project, tabbable) {
  return `<button class="icon-btn card-more" data-action="menu" tabindex="${tabbable ? 0 : -1}" aria-label="Ações de ${escapeHtml(project.name)}" aria-haspopup="menu">${icon("more")}</button>`;
}

function cardHtml(project, { selected, tabbable }) {
  const status = statusHtml(project.runtime);
  const description = project.description ? ` title="${escapeHtml(project.description)}"` : "";
  return `
    <article class="card${selected ? " is-selected" : ""}" data-id="${escapeHtml(project.id)}">
      <a class="card-link" href="${projectHash(project.id)}" tabindex="${tabbable ? 0 : -1}" aria-label="${escapeHtml(project.name)}"${description}></a>
      <div class="thumb">${thumbHtml(project)}</div>
      <div class="card-footer">
        ${icon("app", "icon card-icon")}
        <div class="card-text">
          <div class="card-title">${escapeHtml(project.name)}</div>
          <div class="card-meta">
            ${status ? `${status}<span class="meta-sep" aria-hidden="true">·</span>` : ""}
            <span class="card-meta-text">${escapeHtml(metaText(project))}</span>
          </div>
        </div>
        ${moreButtonHtml(project, tabbable)}
      </div>
    </article>`;
}

function rowHtml(project, { selected, tabbable }) {
  const folder = findFolder(project.folderId);
  return `
    <div class="row${selected ? " is-selected" : ""}" data-id="${escapeHtml(project.id)}">
      <a class="card-link" href="${projectHash(project.id)}" tabindex="${tabbable ? 0 : -1}" aria-label="${escapeHtml(project.name)}"></a>
      <div class="row-main">
        <div class="row-thumb">${thumbHtml(project)}</div>
        <div class="card-text">
          <div class="card-title">${escapeHtml(project.name)}</div>
          ${project.description ? `<div class="card-desc">${escapeHtml(project.description)}</div>` : ""}
        </div>
      </div>
      <div class="row-cell">${folder ? escapeHtml(folder.name) : "—"}</div>
      <div class="row-cell col-status">${statusHtml(project.runtime) || "—"}</div>
      <div class="row-cell">${project.lastOpened ? capitalize(relativeTime(project.lastOpened)) : "—"}</div>
      <div class="row-cell col-updated">${capitalize(relativeTime(project.lastUpdated))}</div>
      ${moreButtonHtml(project, tabbable)}
    </div>`;
}

function renderContent(list) {
  if (!state.loaded) {
    content.innerHTML = skeletonHtml();
    return;
  }

  // Preserva foco/seleção entre re-renderizações do polling
  const active = document.activeElement;
  const focusedId = content.contains(active) ? active.closest("[data-id]")?.dataset.id : null;
  const focusedMore = active?.classList?.contains("card-more");

  if (!list.length) {
    content.innerHTML = emptyStateHtml();
    return;
  }

  if (state.selectedId && !list.some((p) => p.id === state.selectedId)) state.selectedId = null;
  const tabbableId = state.selectedId || list[0].id;

  if (state.layout === "list") {
    content.innerHTML = `
      <div class="list" aria-label="Projetos">
        <div class="list-header" aria-hidden="true">
          <span>Nome</span><span>Pasta</span><span class="col-status">Status</span><span>Aberto</span><span class="col-updated">Atualizado</span><span></span>
        </div>
        ${list.map((p) => rowHtml(p, { selected: p.id === state.selectedId, tabbable: p.id === tabbableId })).join("")}
      </div>`;
  } else {
    content.innerHTML = `
      <div class="grid" aria-label="Projetos">
        ${list.map((p) => cardHtml(p, { selected: p.id === state.selectedId, tabbable: p.id === tabbableId })).join("")}
      </div>`;
  }

  if (focusedId) {
    const item = content.querySelector(`[data-id="${CSS.escape(focusedId)}"]`);
    item?.querySelector(focusedMore ? ".card-more" : ".card-link")?.focus({ preventScroll: true });
  }
}

function renderAll() {
  renderSidebar();
  if (openProjectState.id) {
    renderProjectBarStatus();
    return;
  }
  if (state.loaded && state.route.view === "folder" && !findFolder(state.route.folderId)) {
    location.replace("#/");
    return;
  }
  const list = renderToolbar();
  renderContent(list);
}

// ---------- selecao e teclado

function items() {
  return [...content.querySelectorAll("[data-id]")];
}

function setSelected(id) {
  state.selectedId = id;
  for (const item of items()) {
    const selected = item.dataset.id === id;
    item.classList.toggle("is-selected", selected);
  }
  if (id) {
    // roving tabindex: apenas o item selecionado entra no Tab
    for (const item of items()) {
      const on = item.dataset.id === id;
      item.querySelector(".card-link").tabIndex = on ? 0 : -1;
      item.querySelector(".card-more").tabIndex = on ? 0 : -1;
    }
  }
}

function focusItem(id) {
  const item = content.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!item) return;
  setSelected(id);
  item.querySelector(".card-link").focus({ preventScroll: true });
  item.scrollIntoView({ block: "nearest" });
}

function gridColumns(list) {
  if (state.layout === "list" || !list.length) return 1;
  const top = list[0].offsetTop;
  let cols = 0;
  while (cols < list.length && list[cols].offsetTop === top) cols++;
  return Math.max(cols, 1);
}

function openItemMenu(item, { point, fromKeyboard = false } = {}) {
  const project = findProject(item.dataset.id);
  if (!project) return;
  setSelected(project.id);
  const link = item.querySelector(".card-link");
  const more = item.querySelector(".card-more");
  if (point) Menu.open(projectMenuItems(project), { point, restoreTo: link });
  else Menu.toggle(more, projectMenuItems(project), { align: "end", restoreTo: fromKeyboard ? link : more });
}

content.addEventListener("keydown", (e) => {
  const link = e.target.closest?.(".card-link");
  if (!link) return;
  const item = link.closest("[data-id]");
  const list = items();
  const index = list.indexOf(item);
  const cols = gridColumns(list);
  let next = null;

  switch (e.key) {
    case "ArrowRight":
      if (cols > 1) next = index + 1;
      break;
    case "ArrowLeft":
      if (cols > 1) next = index - 1;
      break;
    case "ArrowDown":
      next = index + cols;
      break;
    case "ArrowUp":
      next = index - cols;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = list.length - 1;
      break;
    case " ":
      e.preventDefault();
      link.click();
      return;
    case "ContextMenu":
      e.preventDefault();
      openItemMenu(item, { fromKeyboard: true });
      return;
    case "F10":
      if (e.shiftKey) {
        e.preventDefault();
        openItemMenu(item, { fromKeyboard: true });
      }
      return;
    default:
      return;
  }
  if (next === null) return;
  e.preventDefault();
  const target = list[Math.max(0, Math.min(next, list.length - 1))];
  if (target) focusItem(target.dataset.id);
});

content.addEventListener("focusin", (e) => {
  const item = e.target.closest?.("[data-id]");
  if (item && e.target.classList.contains("card-link")) setSelected(item.dataset.id);
});

content.addEventListener("mousedown", (e) => {
  const item = e.target.closest("[data-id]");
  if (item) setSelected(item.dataset.id);
  else if (!e.target.closest("button, a")) setSelected(null);
});

content.addEventListener("click", (e) => {
  const more = e.target.closest(".card-more");
  if (more) {
    e.preventDefault();
    openItemMenu(more.closest("[data-id]"));
    return;
  }
  const action = e.target.closest("[data-empty-action]")?.dataset.emptyAction;
  if (action === "clear-search") setSearch("");
  if (action === "search-all") location.hash = "#/";
});

content.addEventListener("contextmenu", (e) => {
  const item = e.target.closest("[data-id]");
  if (!item) return;
  e.preventDefault();
  openItemMenu(item, { point: { x: e.clientX, y: e.clientY } });
});

// Thumbnail quebrada -> placeholder
content.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (img.tagName === "IMG" && img.dataset.thumbFor) {
      img.outerHTML = placeholderHtml(img.dataset.thumbFor);
    }
  },
  true
);

content.addEventListener("dragstart", (e) => {
  const item = e.target.closest?.("[data-id]");
  if (!item) return;
  e.dataTransfer.setData(DRAG_TYPE, item.dataset.id);
  e.dataTransfer.effectAllowed = "move";
  const rect = item.getBoundingClientRect();
  e.dataTransfer.setDragImage(item, Math.min(e.clientX - rect.left, rect.width), Math.min(e.clientY - rect.top, rect.height));
  item.classList.add("is-dragging");
  state.dragging = true;
  Tooltip.hide();
});
content.addEventListener("dragend", (e) => {
  state.dragging = false;
  e.target.closest?.("[data-id]")?.classList.remove("is-dragging");
});

// ---------- busca, ordenacao, layout, atualizar

function setSearch(value) {
  state.search = value;
  if (searchInput.value !== value) searchInput.value = value;
  searchInput.closest(".search").classList.toggle("has-value", !!value);
  renderToolbar();
  renderContent(visibleProjects());
}

searchInput.addEventListener("input", () => setSearch(searchInput.value));
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    if (searchInput.value) setSearch("");
    else searchInput.blur();
  }
  if (e.key === "ArrowDown" || e.key === "Enter") {
    const first = content.querySelector("[data-id]");
    if (first) {
      e.preventDefault();
      focusItem(first.dataset.id);
    }
  }
});

sortBtn.addEventListener("click", () => {
  Menu.toggle(
    sortBtn,
    Object.entries(SORTS).map(([key, label]) => ({
      label,
      checked: state.sort === key,
      onSelect: () => {
        state.sort = key;
        savePref("sort", key);
        renderAll();
      },
    })),
    { align: "end" }
  );
});

for (const btn of document.querySelectorAll("[data-layout]")) {
  btn.addEventListener("click", () => {
    state.layout = btn.dataset.layout;
    savePref("layout", state.layout);
    renderAll();
  });
}

$("#refresh-btn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.classList.remove("is-spinning");
  void btn.offsetWidth;
  btn.classList.add("is-spinning");
  await refresh({ force: true });
});

$("#toolbar-context").addEventListener("click", (e) => {
  const btn = e.target.closest("#folder-title-btn");
  const folder = findFolder(state.route.folderId);
  if (btn && folder) Menu.toggle(btn, folderMenuItems(folder));
});

// Atalhos globais: "/" ou Ctrl/Cmd+K focam a busca; Esc limpa a selecao.
document.addEventListener("keydown", (e) => {
  if (openProjectState.id || document.querySelector("dialog[open]") || Menu.isOpen()) return;
  const typing = e.target.closest?.("input, textarea, [contenteditable]");
  if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }
  if (e.key === "Escape" && !typing && state.selectedId) {
    setSelected(null);
  }
});

// ------------------------------------------------------- 8. projeto aberto

const projectView = $("#project-view");
const browseView = $("#browse-view");
const frame = $("#project-frame");
const loadingEl = $("#project-loading");
const errorEl = $("#project-error");

const openProjectState = { id: null, timer: null, ready: false };

function stopProjectPolling() {
  clearInterval(openProjectState.timer);
  openProjectState.timer = null;
}

// Retorna o id do projeto que estava aberto (ou null).
function leaveProject() {
  const id = openProjectState.id;
  if (!id) return null;
  stopProjectPolling();
  openProjectState.id = null;
  openProjectState.ready = false;
  frame.src = "about:blank";
  frame.classList.add("hidden");
  projectView.classList.add("hidden");
  browseView.classList.remove("hidden");
  sidebar.classList.remove("hidden");
  return id;
}

function renderProjectBar(project) {
  const folder = findFolder(project?.folderId);
  const parent = $("#project-crumb-parent");
  parent.textContent = folder ? folder.name : "Todos os projetos";
  parent.href = folder ? folderHash(folder.id) : "#/";
  $("#project-crumb-name").textContent = project?.name ?? "";
  $("#project-external").href = project ? `/projeto/${enc(project.id)}/` : "#";
  document.title = `${project?.name ?? "Projeto"} · Weknow Protótipos`;
  renderProjectBarStatus();
}

function renderProjectBarStatus() {
  if (!openProjectState.id) return;
  const project = findProject(openProjectState.id);
  const el = $("#project-bar-status");
  const status = project?.runtime?.status;
  el.className = `status status-${status}`;
  el.innerHTML = STATUS_LABELS[status] ? `<span class="status-dot" aria-hidden="true"></span>${STATUS_LABELS[status]}` : "";
}

function showLoading(project, runtime) {
  errorEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  const installing = runtime?.status === "instalando";
  $("#project-loading-title").textContent = installing ? `Instalando dependências de “${project.name}”` : `Iniciando “${project.name}”`;
  $("#project-loading-text").textContent = installing
    ? "Primeira execução deste projeto — isso pode levar um minuto."
    : "Subindo o servidor de desenvolvimento. Isso costuma levar alguns segundos.";
}

function showError(project, runtime) {
  loadingEl.classList.add("hidden");
  frame.classList.add("hidden");
  errorEl.classList.remove("hidden");
  $("#project-error-title").textContent = `Não foi possível iniciar “${project.name}”`;
  $("#project-error-text").textContent = runtime?.error || "Erro desconhecido.";
  $("#project-error-back").href = lastBrowseHash;
  const logs = runtime?.logs || [];
  $("#project-logs-wrap").classList.toggle("hidden", !logs.length);
  // remove codigos ANSI de cor dos logs
  $("#project-logs").textContent = logs.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
}

function handleRuntimeUpdate(data) {
  if (!data || data.id !== openProjectState.id) return;
  const index = state.projects.findIndex((p) => p.id === data.id);
  if (index >= 0) state.projects[index] = data;
  renderProjectBarStatus();

  const runtime = data.runtime;
  if (runtime.status === "rodando" && runtime.port) {
    stopProjectPolling();
    if (!openProjectState.ready) {
      openProjectState.ready = true;
      loadingEl.classList.add("hidden");
      errorEl.classList.add("hidden");
      frame.src = `/projeto/${enc(data.id)}/`;
      frame.classList.remove("hidden");
    }
  } else if (runtime.status === "erro") {
    stopProjectPolling();
    showError(data, runtime);
  } else {
    showLoading(data, runtime);
  }
}

async function showProject(id) {
  if (openProjectState.id === id) return;
  leaveProject();
  openProjectState.id = id;
  openProjectState.ready = false;

  sidebar.classList.add("hidden");
  browseView.classList.add("hidden");
  projectView.classList.remove("hidden");
  frame.src = "about:blank";
  frame.classList.add("hidden");
  errorEl.classList.add("hidden");

  if (!state.loaded) await refresh();
  const project = findProject(id);
  if (!project) {
    showError({ name: id }, { error: "Projeto não encontrado. Ele pode ter sido removido da pasta /projects." });
    renderProjectBar(null);
    return;
  }
  renderProjectBar(project);
  if (project.runtime?.status !== "rodando") showLoading(project, project.runtime);

  try {
    const data = await api(`/api/projects/${enc(id)}/start`, { method: "POST", body: { open: true } });
    handleRuntimeUpdate(data);
  } catch (err) {
    showError(project, { error: err.message });
    return;
  }

  if (openProjectState.id !== id || openProjectState.ready) return;
  openProjectState.timer = setInterval(async () => {
    if (openProjectState.id !== id) return;
    try {
      handleRuntimeUpdate(await api(`/api/projects/${enc(id)}`));
    } catch {
      // tenta de novo no proximo ciclo
    }
  }, 1000);
}

$("#project-back").addEventListener("click", (e) => {
  e.preventDefault();
  location.hash = lastBrowseHash;
});

$("#project-retry").addEventListener("click", () => {
  const id = openProjectState.id;
  openProjectState.id = null;
  if (id) showProject(id);
});

$("#project-menu-btn").addEventListener("click", (e) => {
  const project = findProject(openProjectState.id);
  if (project) Menu.toggle(e.currentTarget, projectMenuItems(project, { inProjectView: true }), { align: "end" });
});

// ------------------------------------------------------------- inicio

(async function init() {
  renderAll(); // skeleton imediato
  await refresh({ force: true });
  handleRoute();
  schedulePoll();
})();
