const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const search = document.getElementById("search");

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

function cardHtml(p) {
  const thumb = p.thumbnail ? `<img src="${escapeHtml(p.thumbnail)}" alt="" loading="lazy" />` : PLACEHOLDER_SVG;
  const meta = p.updatedAt ? `Atualizado ${relativeTime(p.updatedAt)}` : "";
  return `
    <article class="card">
      <a class="card-link" href="${escapeHtml(p.href)}" aria-label="${escapeHtml(p.name)}"></a>
      <div class="thumb">${thumb}</div>
      <div class="card-footer">
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div class="card-meta">${escapeHtml(meta)}</div>
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

fetch("manifest.json")
  .then((r) => r.json())
  .then((data) => {
    projects = data;
    render("");
  })
  .catch(() => {
    count.textContent = "";
    empty.textContent = "Não foi possível carregar a lista de projetos.";
    empty.classList.remove("hidden");
  });
