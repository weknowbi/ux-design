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

   Este arquivo e copiado (sem alteracao) para a raiz publicada e para
   dentro de cada /p/<slug>/ pelo build-pages.mjs, que tambem e quem
   desativa os <script> originais de cada pagina (ver applyGate() la).
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "wsauth";
  var HASH = "__PASSWORD_HASH__"; // substituido no build -- nunca a senha em si

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

  function reveal() {
    var style = document.getElementById("wsg-style");
    if (style) style.remove();
    document.documentElement.style.visibility = "visible";
    reactivateScripts();
  }

  function showPrompt() {
    var overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#fff;z-index:2147483647;display:flex;" +
      "align-items:center;justify-content:center;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;";
    overlay.innerHTML =
      '<form style="display:flex;flex-direction:column;gap:12px;width:260px;padding:28px;' +
      'border:1px solid #e6e6e6;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.06)">' +
      '<strong style="font-size:15px;color:#1e1e1e">Acesso restrito</strong>' +
      '<input type="password" id="wsg-pass" autocomplete="off" placeholder="Senha" ' +
      'style="height:36px;padding:0 10px;border:1px solid #d4d4d4;border-radius:6px;font-size:14px" autofocus />' +
      '<button type="submit" style="height:36px;border:none;border-radius:6px;background:#0d99ff;' +
      'color:#fff;font-weight:600;font-size:14px;cursor:pointer">Entrar</button>' +
      '<p id="wsg-err" style="display:none;color:#e03e1a;font-size:12px;margin:0">Senha incorreta.</p>' +
      "</form>";
    document.documentElement.style.visibility = "visible";
    document.body.appendChild(overlay);

    var input = overlay.querySelector("#wsg-pass");
    var err = overlay.querySelector("#wsg-err");
    overlay.querySelector("form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var typed = await sha256(input.value);
      if (typed === HASH) {
        try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) { /* modo privado sem storage: sem persistencia, tudo bem */ }
        overlay.remove();
        reveal();
      } else {
        err.style.display = "block";
        input.value = "";
        input.focus();
      }
    });
  }

  var alreadyOk = false;
  try { alreadyOk = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { /* sem storage disponivel */ }

  if (alreadyOk) reveal();
  else showPrompt();
})();
