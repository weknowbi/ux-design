/* =========================================================================
   Cortina de acesso do site publicado (GitHub Pages).

   Isso NAO e seguranca de verdade -- e site 100% estatico, sem servidor,
   entao qualquer pessoa com paciencia e o F12 consegue contornar (ler este
   arquivo, montar o hash, ou simplesmente reativar os scripts na mao). O
   objetivo aqui e so uma camada a mais contra acesso casual/acidental:
     - a senha nunca aparece em texto puro em lugar nenhum, so o hash dela;
     - os scripts reais de cada pagina ficam desativados (nao so escondidos
       por CSS) ate a senha certa ser digitada -- entao nao basta apagar
       uma div no inspetor pra "ver por baixo", o app realmente nao rodou.

   Sao duas senhas, cada uma com um papel:
     - "edit": pode ver tudo e renomear projetos na pagina inicial;
     - "view": so visualizacao.
   O papel fica em localStorage (STORAGE_KEY) e em <html data-ws-role>,
   que e onde o app.js da pagina inicial le. Forjar o papel e trivial
   (e so editar o localStorage) -- a protecao real da edicao e o token do
   GitHub que o editor precisa colar pra salvar (ver pages-index.js).

   Este arquivo e copiado para a raiz publicada e para dentro de cada
   /p/<slug>/ pelo build-pages.mjs, que tambem e quem desativa os <script>
   originais de cada pagina (ver applyGate() la).
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "wsauth";
  // Substituidos no build -- nunca as senhas em si, so os hashes.
  var EDIT_HASH = "__EDIT_HASH__";
  var VIEW_HASH = "__VIEW_HASH__";

  function roleForHash(hash) {
    if (hash === EDIT_HASH) return "edit";
    if (hash === VIEW_HASH) return "view";
    return null;
  }

  // "1" era o valor salvo quando so existia uma senha (a de edicao).
  function storedRole() {
    var value = null;
    try { value = localStorage.getItem(STORAGE_KEY); } catch (e) { /* sem storage disponivel */ }
    if (value === "1") value = "edit";
    return value === "edit" || value === "view" ? value : null;
  }

  // Usado pelo botao "Sair" da pagina inicial -- limpa tambem o token do GitHub.
  window.wsGate = {
    logout: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("wsgh-token");
      } catch (e) { /* sem storage disponivel */ }
      location.reload();
    },
  };

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }

  async function sha256(text) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return toHex(buf);
  }

  // Recria de verdade cada <script> que o build deixou desativado --
  // criar o elemento via JS e o unico jeito de fazer um script (module ou
  // classico) executar de fato; so tirar o atributo "type" com innerHTML
  // nao dispara a execucao.
  function reactivateScripts() {
    document.querySelectorAll('script[type="disabled-module"], script[type="disabled-classic"]').forEach(function (old) {
      var isModule = old.getAttribute("type") === "disabled-module";
      var fresh = document.createElement("script");
      for (var i = 0; i < old.attributes.length; i++) {
        var attr = old.attributes[i];
        if (attr.name !== "type") fresh.setAttribute(attr.name, attr.value);
      }
      if (isModule) fresh.type = "module";
      if (!old.src) fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    });
  }

  function reveal(role) {
    document.documentElement.dataset.wsRole = role;
    window.wsGate.role = role;
    var style = document.getElementById("wsg-style");
    if (style) style.remove();
    document.documentElement.style.visibility = "visible";
    reactivateScripts();
  }

  // Logo weknow inline (os /p/<slug>/ nao tem acesso facil ao logo.svg da
  // raiz). O texto usa currentColor pra acompanhar o tema claro/escuro.
  var LOGO_SVG =
    '<svg class="logo" viewBox="0 0 92 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="weknow">' +
    '<g fill="currentColor">' +
    '<path d="M30.2651 20.4649L28.3497 12.6265L26.4344 20.4643H22.9839L19.3623 7.95872H22.926L24.8414 16.1121L27.0995 7.95872H29.6028L31.8612 16.1121L33.8531 7.95872H37.3389L33.7167 20.4658L30.2651 20.4649Z"/>' +
    '<path d="M41.2116 10.9587C43.9232 10.9587 45.8974 12.9272 45.8974 16.0024V16.6215H39.3728C39.5438 17.4651 40.3396 18.234 41.7049 18.234C42.5165 18.2327 43.3044 17.9619 43.943 17.4651L45.1748 19.2656C44.2653 20.0719 42.7478 20.4661 41.344 20.4661C38.5187 20.4661 36.3379 18.6474 36.3379 15.7031C36.3379 13.0782 38.3477 10.959 41.2126 10.959L41.2116 10.9587ZM39.3343 14.7466H43.1077C43.0315 14.109 42.558 13.1904 41.2116 13.1904C40.7578 13.1697 40.3139 13.3183 39.966 13.6065C39.618 13.8948 39.3926 14.3015 39.3343 14.7466Z"/>' +
    '<path d="M52.6643 20.4649L50.6535 17.2598L49.7816 18.2913V20.4667H46.8613V7.95872H49.7816V15.0273L52.5694 10.9313H56.0956L52.7206 15.5329L56.2676 20.464L52.6643 20.4649Z"/>' +
    '<path d="M62.9415 20.4646V14.947C62.9415 13.8398 62.3543 13.447 61.4439 13.447C61.0979 13.4446 60.7558 13.5233 60.4464 13.6764C60.137 13.8297 59.8681 14.0532 59.6624 14.3286V20.4649H56.7422V10.9319H59.6614V12.2297C60.0628 11.7962 60.5521 11.453 61.0988 11.2234C61.6455 10.9937 62.2357 10.883 62.8288 10.8986C64.9147 10.8986 65.8638 12.0991 65.8638 13.7678V20.4667H62.9445L62.9415 20.4646Z"/>' +
    '<path d="M66.9053 15.7028C66.9053 13.1525 68.7836 10.9587 71.8926 10.9587C75.0017 10.9587 76.8978 13.1525 76.8978 15.7028C76.8978 18.2531 75.0413 20.4659 71.8926 20.4659C68.744 20.4659 66.9053 18.2531 66.9053 15.7028ZM73.9034 15.7028C73.9034 14.5024 73.1827 13.5091 71.8936 13.5091C70.6045 13.5091 69.9204 14.5033 69.9204 15.7028C69.9204 16.9024 70.6223 17.9155 71.8936 17.9155C73.1639 17.9155 73.9034 16.9213 73.9034 15.7028Z"/>' +
    '<path d="M86.0778 20.4649L84.3517 14.8584L82.6454 20.4649H79.4978L76.7861 10.931H79.7825L81.2624 16.9585L83.0636 10.931H85.6616L87.4627 16.9585L88.9229 10.931H91.938L89.2273 20.4649H86.0778Z"/>' +
    "</g>" +
    '<path d="M5.18807 8.11896L9.01109 11.8992L4.50507 16.3547L0.681946 12.5745C0.501136 12.3955 0.399513 12.1529 0.399414 11.8999C0.399414 11.6469 0.50094 11.4042 0.68175 11.2253L3.82324 8.11896C4.00425 7.94003 4.24971 7.83959 4.50565 7.83959C4.7616 7.83959 5.00706 7.94003 5.18807 8.11896Z" fill="#3366CC"/>' +
    '<path d="M14.2006 8.11956L17.3412 11.225C17.5222 11.404 17.6238 11.6467 17.6238 11.8998C17.6238 12.1528 17.5222 12.3955 17.3412 12.5745L13.5182 16.3547L9.0127 11.8998L12.8358 8.11956C13.0168 7.94063 13.2623 7.84019 13.5182 7.84019C13.7742 7.84019 14.0195 7.94063 14.2006 8.11956Z" fill="#5ADBDB"/>' +
    '<path d="M9.01129 11.9004L13.5167 16.3554L9.69371 20.1356C9.5127 20.3144 9.26724 20.415 9.01129 20.415C8.75535 20.415 8.50999 20.3144 8.32888 20.1356L4.50586 16.3554L9.01129 11.9004Z" fill="#30A7E2"/>' +
    "</svg>";

  var ICON_LOCK =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
  var ICON_EYE =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="2"/></svg>';
  var ICON_EYE_OFF =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6.6 3.65A6.3 6.3 0 0 1 8 3.5c4.1 0 6.5 4.5 6.5 4.5a11 11 0 0 1-1.7 2.2M4.2 4.7C2.5 5.9 1.5 8 1.5 8s2.4 4.5 6.5 4.5c1.1 0 2.1-.3 2.9-.8"/>' +
    '<path d="M6.6 6.6a2 2 0 0 0 2.8 2.8M2 2l12 12"/></svg>';
  var ICON_ARROW =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3.5 8h9M8.5 4l4 4-4 4"/></svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3.5 8.5l3 3 6-7"/></svg>';

  // Tudo dentro de um Shadow DOM: o CSS dos prototipos nao vaza pra cortina
  // (e vice-versa), nao importa o que cada pagina faca com button/input.
  var GATE_CSS = `
    :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; }
    * { box-sizing: border-box; }

    .wrap {
      --bg: #fafafa; --card: #ffffff; --border: #e8e8e8; --border-strong: #d4d4d4;
      --text: #1e1e1e; --text-2: #6b6b6b; --text-3: #a3a3a3; --dot: #e2e2e2;
      --field: #ffffff; --btn: #1e1e1e; --btn-hover: #333333; --btn-text: #ffffff;
      --accent: #0d99ff; --ring: rgba(13, 153, 255, .18);
      --danger: #e03e1a; --danger-ring: rgba(224, 62, 26, .14);
      --shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px -6px rgba(0,0,0,.08), 0 32px 64px -24px rgba(0,0,0,.12);

      position: absolute; inset: 0; overflow: auto;
      display: grid; place-items: center; padding: 24px 16px;
      background: var(--bg); color: var(--text);
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px; line-height: 1.45;
      -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
      transition: opacity .35s ease;
    }
    @media (prefers-color-scheme: dark) {
      .wrap {
        --bg: #0e0e10; --card: #17171a; --border: #26262b; --border-strong: #34343a;
        --text: #f2f2f3; --text-2: #a1a1a8; --text-3: #6b6b73; --dot: #1f1f23;
        --field: #111113; --btn: #f2f2f3; --btn-hover: #ffffff; --btn-text: #111113;
        --ring: rgba(13, 153, 255, .28); --danger: #ff6b4a; --danger-ring: rgba(255, 107, 74, .2);
        --shadow: 0 1px 2px rgba(0,0,0,.3), 0 16px 48px -12px rgba(0,0,0,.6);
      }
    }

    /* grade de pontos (cara de canvas) + brilho suave nas cores do logo */
    .wrap::before {
      content: ""; position: fixed; inset: 0; pointer-events: none;
      background-image: radial-gradient(var(--dot) 1px, transparent 1.2px);
      background-size: 22px 22px;
      -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 100%);
              mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 100%);
    }
    .wrap::after {
      content: ""; position: fixed; left: 50%; top: 50%; width: 560px; height: 420px;
      transform: translate(-50%, -50%); pointer-events: none; filter: blur(60px); opacity: .5;
      background:
        radial-gradient(closest-side at 30% 40%, rgba(51, 102, 204, .22), transparent),
        radial-gradient(closest-side at 70% 60%, rgba(90, 219, 219, .22), transparent);
    }

    .card {
      position: relative; z-index: 1; width: 100%; max-width: 368px;
      padding: 36px 32px 32px;
      background: var(--card); border: 1px solid var(--border); border-radius: 16px;
      box-shadow: var(--shadow);
      animation: rise .55s cubic-bezier(.2, .8, .2, 1) both;
    }
    .logo { display: block; height: 26px; width: auto; margin: 0 0 28px -1px; color: var(--text); }

    h1 { margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -.015em; line-height: 1.3; }
    .sub { margin: 6px 0 24px; color: var(--text-2); font-size: 13.5px; }

    .field { position: relative; }
    .field .lead {
      position: absolute; left: 13px; top: 50%; width: 16px; height: 16px;
      transform: translateY(-50%); color: var(--text-3); pointer-events: none;
      transition: color .15s;
    }
    input {
      display: block; width: 100%; height: 44px; margin: 0;
      padding: 0 44px 0 38px;
      font: inherit; font-size: 14px; color: var(--text);
      background: var(--field); border: 1px solid var(--border-strong); border-radius: 10px;
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    input::placeholder { color: var(--text-3); }
    input:hover { border-color: var(--text-3); }
    input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--ring); }
    .field:focus-within .lead { color: var(--accent); }

    .toggle {
      position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
      display: grid; place-items: center; width: 32px; height: 32px; padding: 0;
      border: 0; border-radius: 7px; background: transparent; color: var(--text-3);
      cursor: pointer; transition: color .15s, background .15s;
    }
    .toggle:hover { color: var(--text); background: color-mix(in srgb, var(--text) 6%, transparent); }
    .toggle:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--ring); color: var(--text); }
    .toggle svg { width: 16px; height: 16px; }

    .field.invalid input { border-color: var(--danger); box-shadow: 0 0 0 4px var(--danger-ring); }
    .field.invalid .lead { color: var(--danger); }
    .field.shake { animation: shake .4s cubic-bezier(.36, .07, .19, .97) both; }

    .err {
      display: flex; align-items: center; gap: 6px;
      height: 0; margin: 0; overflow: hidden; opacity: 0;
      color: var(--danger); font-size: 12.5px;
      transition: height .2s ease, margin .2s ease, opacity .2s ease;
    }
    .err.show { height: 18px; margin-top: 10px; opacity: 1; }

    .submit {
      position: relative; display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; height: 44px; margin: 16px 0 0; padding: 0 16px;
      font: inherit; font-size: 14px; font-weight: 600; letter-spacing: -.005em;
      color: var(--btn-text); background: var(--btn);
      border: 0; border-radius: 10px; cursor: pointer;
      transition: background .15s, transform .1s, box-shadow .15s;
    }
    .submit:hover { background: var(--btn-hover); }
    .submit:active { transform: scale(.985); }
    .submit:focus-visible { outline: none; box-shadow: 0 0 0 4px var(--ring); }
    .submit svg { width: 16px; height: 16px; transition: transform .2s ease; }
    .submit:hover .arrow { transform: translateX(2px); }
    .submit.done { background: #14a660; color: #fff; }

    .foot {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      margin: 24px 0 0; padding-top: 20px; border-top: 1px solid var(--border);
      color: var(--text-3); font-size: 12px;
    }
    .foot svg { width: 12px; height: 12px; }

    .leaving { opacity: 0; }
    .leaving .card { transform: translateY(-6px) scale(.98); transition: transform .35s ease; }

    @keyframes rise { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
    @keyframes shake {
      10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(3px); }
      30%, 50%, 70% { transform: translateX(-5px); } 40%, 60% { transform: translateX(5px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .card, .field.shake { animation: none; }
      .wrap, .err, .leaving .card { transition: none; }
    }
    @media (max-width: 420px) { .card { padding: 28px 22px 24px; border-radius: 14px; } }
  `;

  // Os prototipos nem sempre carregam a Inter -- a cortina puxa sozinha
  // (e cai pro system-ui se a rede nao deixar).
  function ensureInter() {
    if (document.querySelector('link[href*="family=Inter"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }

  function showPrompt() {
    ensureInter();

    var host = document.createElement("div");
    host.id = "wsg-gate";
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML =
      "<style>" + GATE_CSS + "</style>" +
      '<div class="wrap">' +
      '<form class="card" role="dialog" aria-modal="true" aria-labelledby="t" aria-describedby="s" novalidate>' +
      LOGO_SVG +
      '<h1 id="t">Acesso restrito</h1>' +
      '<p class="sub" id="s">Este workspace de protótipos é privado. Digite a senha para continuar.</p>' +
      '<div class="field">' +
      '<span class="lead">' + ICON_LOCK + "</span>" +
      '<input type="password" id="pass" aria-label="Senha" placeholder="Senha" autocomplete="current-password" spellcheck="false" />' +
      '<button type="button" class="toggle" aria-label="Mostrar senha" aria-pressed="false">' + ICON_EYE + "</button>" +
      "</div>" +
      '<p class="err" role="alert" aria-live="polite">Senha incorreta. Tente novamente.</p>' +
      '<button type="submit" class="submit"><span class="label">Entrar</span><span class="arrow">' + ICON_ARROW + "</span></button>" +
      '<p class="foot">' + ICON_LOCK + "Acesso liberado só neste navegador</p>" +
      "</form>" +
      "</div>";

    document.documentElement.style.visibility = "visible";
    document.body.appendChild(host);

    var wrap = root.querySelector(".wrap");
    var form = root.querySelector("form");
    var field = root.querySelector(".field");
    var input = root.querySelector("#pass");
    var toggle = root.querySelector(".toggle");
    var err = root.querySelector(".err");
    var submit = root.querySelector(".submit");

    input.focus();

    toggle.addEventListener("click", function () {
      var showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.setAttribute("aria-pressed", String(!showing));
      toggle.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
      toggle.innerHTML = showing ? ICON_EYE : ICON_EYE_OFF;
      input.focus();
    });

    input.addEventListener("input", function () {
      field.classList.remove("invalid");
      err.classList.remove("show");
    });

    field.addEventListener("animationend", function () {
      field.classList.remove("shake");
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!input.value) { input.focus(); return; }

      var role = roleForHash(await sha256(input.value));
      if (role) {
        try { localStorage.setItem(STORAGE_KEY, role); } catch (e) { /* modo privado sem storage: sem persistencia, tudo bem */ }
        submit.classList.add("done");
        submit.innerHTML = ICON_CHECK + "<span>Liberado</span>";
        // Reativa a pagina por baixo ja, e so depois some com a cortina.
        reveal(role);
        setTimeout(function () {
          wrap.classList.add("leaving");
          setTimeout(function () { host.remove(); }, 360);
        }, 280);
      } else {
        field.classList.remove("shake");
        void field.offsetWidth; // reinicia a animacao em erros seguidos
        field.classList.add("invalid", "shake");
        err.classList.add("show");
        input.select();
      }
    });
  }

  var role = storedRole();
  if (role) reveal(role);
  else showPrompt();
})();
