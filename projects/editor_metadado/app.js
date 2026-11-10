/* Protótipo: editor de metadado com a fórmula do campo calculado aberta ao lado do SQL.
 *
 * A ideia que ele testa: o editor da fórmula é UM só controle. "Abrir ao lado" só
 * muda onde ele está (como trocar o Parent no Delphi): nada de segundo editor
 * para sincronizar. Ver placeFormula().
 */
(() => {
  'use strict';

  // ---------- armazenamento local (protegido: pode falhar em janela anônima) ----------
  const KEY = 'proto-editor-metadado-v1';
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(KEY + ':' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem(KEY + ':' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
    clear() {
      try { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* sem armazenamento */ }
    },
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ---------- dados fictícios ----------
  const DEFAULT_SQL = `SELECT
     OC.ID_TYPE_OCCURRENCE                    AS 'ID_Tipo_Ocorrencia'
    ,OC.TYPE_OCCURRENCE                       AS 'Nome_Tipo_Ocorrencia'
    ,OC.ID_OCCURRENCE                         AS 'ID_Ocorrencia'
    ,OC.DT_ACCEPTED                           AS 'Dt. Aceita'
    ,OC.DT_CLOSED                             AS 'dt_encerrada'
    ,OC.DT_ANALYZED                           AS 'Dt. Analisada'
    ,RI.CD_RISK                               AS 'Cod_Risco'
    ,RI.DS_RISK_SEVERITY                      AS 'Gravidade_do_risco'
    ,DA.DS_DAMAGE_SEVERITY                    AS 'Gravidade_do_dano_gerado'
    ,OC.ID_SECTOR_REGISTER                    AS 'ID_Setor_Registro'
    ,CASE WHEN TP.FL_GROUP = 'S'
          THEN 'Sim' ELSE 'Não' END           AS 'agrupa_tipo'
    ,DATEDIFF(MINUTE, OC.DT_ACCEPTED,
              COALESCE(OC.DT_ANALYZED, GETDATE())) AS 'tempo_prazo_min'
FROM OCCURRENCE OC
LEFT JOIN OCCURRENCE_TYPE TP ON TP.ID_TYPE_OCCURRENCE = OC.ID_TYPE_OCCURRENCE
LEFT JOIN RISK RI            ON RI.ID_OCCURRENCE      = OC.ID_OCCURRENCE
LEFT JOIN DAMAGE DA          ON DA.ID_OCCURRENCE      = OC.ID_OCCURRENCE
WHERE OC.DT_REGISTER BETWEEN :dt_inicio AND :dt_fim
  AND OC.ID_SECTOR_REGISTER IN (:setores)
  AND OC.FL_ACTIVE = 1`;

  const GEN_PARAMS = { ':dt_inicio': "'2026-01-01'", ':dt_fim': "'2026-10-31'", ':setores': '1, 4, 7' };

  const FIELDS = [
    { id: 'f_tipo', nome: 'ID_Tipo_Ocorrencia', titulo: 'ID Tipo Ocorrência', tipoDado: 'Número' },
    { id: 'f_nometipo', nome: 'Nome_Tipo_Ocorrencia', titulo: 'Nome Tipo Ocorrência', tipoDado: 'Texto' },
    { id: 'f_oc', nome: 'ID_Ocorrencia', titulo: 'ID Ocorrência', tipoDado: 'Número' },
    { id: 'f_dtac', nome: 'Dt. Aceita', titulo: 'Dt. Aceita', tipoDado: 'Data e hora' },
    { id: 'f_dtenc', nome: 'dt_encerrada', titulo: 'dt_encerrada', tipoDado: 'Data e hora' },
    { id: 'f_dtan', nome: 'Dt. Analisada', titulo: 'Dt. Analisada', tipoDado: 'Data e hora' },
    { id: 'f_risco', nome: 'Cod_Risco', titulo: 'Cod_Risco', tipoDado: 'Número' },
    { id: 'f_grav', nome: 'Gravidade_do_risco', titulo: 'Gravidade do risco', tipoDado: 'Texto' },
    { id: 'f_dano', nome: 'Gravidade_do_dano_gerado', titulo: 'Gravidade do dano gerado', tipoDado: 'Texto' },
    { id: 'f_setor', nome: 'ID_Setor_Registro', titulo: 'ID_Setor_Registro', tipoDado: 'Número' },
    { id: 'f_agrupa', nome: 'agrupa_tipo', titulo: 'agrupa_tipo', tipoDado: 'Texto' },
    { id: 'f_tempo', nome: 'tempo_prazo_min', titulo: 'tempo_prazo_min', tipoDado: 'Número' },
  ];

  const PRAZO_FORMULA = `case when %Dt. Aceita% is not null then
  (case when %Dt. Analisada% is not null then
    (case
      when %agrupa_tipo% = 'Sim'
        then (case when %tempo_prazo% <= 4320 then 'Dentro do Prazo'      -- 72h
                   when %tempo_prazo% > 4320 then 'Fora do Prazo' else '1' end)

      when %agrupa_tipo% = 'Não' and %Gravidade_do_risco% = 'Grave (3)' or %Gravidade_do_dano_gerado% =
'Grave - Comprometeu o resultado do processo'
        then (case when %tempo_prazo% <= 28800 then 'Dentro do Prazo'     -- 20dias
                   when %tempo_prazo% > 28800 then 'Fora do Prazo' else '2' end)

      when %agrupa_tipo% = 'Não' and %Gravidade_do_risco% = 'Grave (3)' or %Gravidade_do_dano_gerado% =
'Grave - Comprometeu o resultado do processo'
        then (case when %tempo_prazo% <= 4320 then 'Dentro do Prazo'      -- 72h
                   when %tempo_prazo% > 4320 then 'Fora do Prazo' else '3' end)

      when %agrupa_tipo% = 'Não' and %Gravidade_do_risco% in ('Moderada (2)','Leve (1)') or %Gravidade_do_dano_gerado% in
('Moderada - Comprometeu parcialmente o resultado do processo','Leve - Não comprometeu o resultado final do processo')
        then (case when %tempo_prazo% <= 28800 then 'Dentro do Prazo'     -- 20dias
                   when %tempo_prazo% > 4320 then 'Fora do Prazo' else '4' end)

      else 'Verifica' end)
  else 'Não Analisado' end)
else 'Não Aceito' end`;

  const DEFAULT_CALCS = [
    { id: 'c_qtdp', nome: 'qt_dentro_prazo', titulo: 'Qt. Dentro do Prazo', tipo: 'Expressão SQL', tipoDado: 'Número', agreg: true,
      formula: "sum(case when %prazo_analise% = 'Dentro do Prazo' then 1 else 0 end)" },
    { id: 'c_pct', nome: 'pct_prazo_analise', titulo: '% Prazo Análise', tipo: 'Expressão SQL', tipoDado: 'Número', agreg: true,
      formula: '%qt_dentro_prazo% * 100.0\n  / nullif(count(%ID_Ocorrencia%), 0)' },
    { id: 'c_tempo', nome: 'tempo_decorrido', titulo: 'Tempo Decorrido', tipo: 'Expressão SQL', tipoDado: 'Número',
      formula: 'datediff(minute, %Dt. Aceita%, coalesce(%dt_encerrada%, getdate()))' },
    { id: 'c_tprazo', nome: 'tempo_prazo', titulo: 'tempo_prazo', tipo: 'Expressão SQL', tipoDado: 'Número',
      formula: 'case when %Dt. Analisada% is null then null\n     else %tempo_prazo_min%\nend' },
    { id: 'c_prazo', nome: 'prazo_analise', titulo: 'Prazo Análise', tipo: 'Expressão SQL', tipoDado: 'Texto', formula: PRAZO_FORMULA,
      contexto: 'Classifica a ocorrência como dentro ou fora do prazo de análise. O prazo depende do tipo agrupado e da gravidade do risco ou do dano: 72h para os casos graves, 20 dias para os demais.' },
    { id: 'c_ef', nome: 'qt_efetiva', titulo: 'Qt. Efetiva', tipo: 'Expressão SQL', tipoDado: 'Número', agreg: true,
      formula: "sum(case when %Gravidade_do_dano_gerado% like 'Grave%' then 1 else 0 end)" },
    { id: 'c_nef', nome: 'qt_nao_efetiva', titulo: 'Qt. Não Efetiva', tipo: 'Expressão SQL', tipoDado: 'Número', agreg: true,
      formula: 'count(%ID_Ocorrencia%) - %qt_efetiva%' },
    { id: 'c_calc1', nome: 'calc1', titulo: '', tipo: 'Expressão SQL', tipoDado: 'Texto', formula: '' },
  ];

  // ---------- estado ----------
  const S = {
    sql: store.get('sql', DEFAULT_SQL),
    calcs: store.get('calcs', null) || clone(DEFAULT_CALCS),
    selected: store.get('selected', 'c_prazo'),
    expanded: store.get('expanded', { root: true, campos: true, calcs: true }),
    dynamic: store.get('dynamic', false),
    beside: store.get('beside', false),
    rightTab: store.get('rightTab', 'formula'),
    split: store.get('split', 0.5),
    place: store.get('place', 'ambos'),
    noF: store.get('noF', 'fechar'),
    solucao: store.get('solucao', 'abas'), // 'abas' (Alexandre) | 'lado' (fórmula ao lado do SQL)
    propTab: store.get('propTab', 'formula'),
    tabRule: store.get('tabRule', 'formula'), // 'formula' = sempre abre na Fórmula | 'ultima' = mantém a última aba
    modal: false,
    log: store.get('log', []),
  };
  const save = (...keys) => keys.forEach((k) => store.set(k, S[k]));

  const calcById = (id) => S.calcs.find((c) => c.id === id);
  const fieldById = (id) => FIELDS.find((f) => f.id === id);
  const calcLabel = (c) => c.titulo || c.nome;
  function kind(id) {
    if (calcById(id)) return 'calc';
    if (fieldById(id)) return 'field';
    if (id === 'root') return 'root';
    if (id === 'avancado') return 'avancado';
    return 'folder';
  }
  const isCalc = () => kind(S.selected) === 'calc';

  // ---------- registro de interações (para o teste de usabilidade) ----------
  function log(acao, det = '') {
    S.log.push({ t: new Date().toISOString(), acao, det: String(det) });
    if (S.log.length > 3000) S.log.shift();
    save('log');
    $('#pLogCount').textContent = S.log.length;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  // ---------- realce de sintaxe ----------
  const KW = new Set(('select from where and or not null is in case when then else end as union all distinct join left right inner outer ' +
    'on group by order having like between exists top asc desc with into values insert update delete set').split(' '));
  const FN = new Set('count sum avg min max coalesce datediff getdate cast convert isnull nullif substring minute'.split(' '));
  const TOK = /(--[^\n]*)|('(?:[^'\n]|'')*'?)|(%[^%\n']+%)|(:[A-Za-z_]\w*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
  function highlight(src) {
    let out = '';
    let last = 0;
    let m;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(src))) {
      out += esc(src.slice(last, m.index));
      let cls = null;
      if (m[1]) cls = 'c';
      else if (m[2]) cls = 's';
      else if (m[3]) cls = 'v';
      else if (m[4]) cls = 'p';
      else if (m[5]) cls = 'n';
      else if (m[6]) { const l = m[6].toLowerCase(); cls = KW.has(l) ? 'k' : FN.has(l) ? 'f' : null; }
      out += cls ? `<span class="t-${cls}">${esc(m[0])}</span>` : esc(m[0]);
      last = TOK.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  // ---------- editor de código (textarea + camada de realce) ----------
  function createEditor({ value = '', readOnly = false, onChange, onCursor } = {}) {
    const root = document.createElement('div');
    root.className = 'ed' + (readOnly ? ' ro' : '');
    root.innerHTML = '<div class="ed-gutter"><div class="ed-lines"></div></div>' +
      '<div class="ed-body"><pre class="ed-hl" aria-hidden="true"></pre><div class="ed-margin"></div>' +
      '<textarea class="ed-ta" spellcheck="false" wrap="off" autocomplete="off" autocapitalize="off"></textarea></div>';
    const lines = $('.ed-lines', root);
    const hl = $('.ed-hl', root);
    const ta = $('.ed-ta', root);
    const margin = $('.ed-margin', root);
    ta.readOnly = readOnly;
    ta.value = value;
    ta.setSelectionRange(0, 0);
    let count = 0;

    function sync() {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
      lines.style.transform = `translateY(${-ta.scrollTop}px)`;
      margin.style.transform = `translateX(${-ta.scrollLeft}px)`;
    }
    function refresh() {
      hl.innerHTML = highlight(ta.value) + '\n';
      const n = ta.value.split('\n').length;
      if (n !== count) {
        count = n;
        let s = '';
        for (let i = 1; i <= n; i++) s += `<div>${i}</div>`;
        lines.innerHTML = s;
      }
      sync();
    }
    function cursor() {
      if (!onCursor) return;
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.split('\n').length;
      const col = before.length - before.lastIndexOf('\n');
      onCursor(line, col);
    }
    ta.addEventListener('input', () => { refresh(); if (onChange) onChange(ta.value); cursor(); });
    ta.addEventListener('scroll', sync);
    ta.addEventListener('keyup', cursor);
    ta.addEventListener('click', cursor);
    ta.addEventListener('focus', cursor);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !readOnly) {
        e.preventDefault();
        const a = ta.selectionStart;
        ta.setRangeText('  ', a, ta.selectionEnd, 'end');
        ta.dispatchEvent(new Event('input'));
      }
    });
    refresh();
    return {
      root,
      ta,
      get value() { return ta.value; },
      set value(v) { ta.value = v; ta.setSelectionRange(0, 0); ta.scrollTop = 0; ta.scrollLeft = 0; refresh(); },
      focus() { ta.focus(); },
      refresh,
    };
  }

  // ---------- editores ----------
  const genSql = () => S.sql.replace(/:[A-Za-z_]\w*/g, (p) => GEN_PARAMS[p] || p);

  const sqlEd = createEditor({
    value: S.sql,
    onChange(v) { S.sql = v; save('sql'); if (S.dynamic) genEd.value = genSql(); },
    onCursor(l, c) { $('#sqlPos').textContent = `${l}: ${c}`; },
  });
  const genEd = createEditor({ value: genSql(), readOnly: true, onCursor(l, c) { $('#rPos').textContent = `${l}: ${c}`; } });
  const fEd = createEditor({
    onChange(v) { const c = calcById(fEd.calcId); if (c) { c.formula = v; save('calcs'); } },
    onCursor(l, c) { $('#rPos').textContent = `${l}: ${c}`; },
  });
  $('#sqlHost').appendChild(sqlEd.root);
  $('#genHost').appendChild(genEd.root);

  // ---------- árvore da estrutura ----------
  function treeData() {
    return [{
      id: 'root', label: 'Metadado', icon: 'meta', kids: [
        { id: 'pre', label: 'Pré-execução' },
        { id: 'campos', label: 'Campos', kids: FIELDS.map((f) => ({ id: f.id, label: f.titulo, icon: 'aa' })) },
        { id: 'filtros', label: 'Filtros', kids: [{ id: 'flt1', label: 'Período', icon: 'filter' }] },
        { id: 'calcs', label: 'Campos calculados', kids: S.calcs.map((c) => ({ id: c.id, label: calcLabel(c), icon: 'fx' })) },
        { id: 'hier', label: 'Hierarquias' },
        { id: 'param', label: 'Parâmetros' },
        { id: 'priv', label: 'Parâmetros de privacidade' },
        { id: 'pos', label: 'Pós-execução' },
        { id: 'arm', label: 'Armazenamento', kids: [{ id: 'arm1', label: 'Tabela local', icon: 'db' }] },
        { id: 'cache', label: 'Cache de dados' },
        { id: 'avancado', label: 'Avançado' },
        { id: 'ia', label: 'Inteligência artificial', icon: 'ia' },
      ],
    }];
  }
  const FOLDER_SVG = '<svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true"><path d="M1 2.5h5l1.5 1.5H15v9H1z" fill="#e9b949" stroke="#a8781c"/>' +
    '<rect x="4" y="5" width="7" height="6" fill="#fff" stroke="#9a9a9a" stroke-width=".8"/><path d="M5.2 7h4.6M5.2 8.6h4.6" stroke="#7aa7d8" stroke-width=".8"/>' +
    '<path d="M1 5.5h14v7.5H1z" fill="#f4cf6a" stroke="#a8781c" opacity=".92"/></svg>';
  const META_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1.5" y="1.5" width="11" height="11" fill="#fff" stroke="#8a8a8a"/>' +
    '<path d="M1.5 5h11M1.5 8.5h11M5 1.5v11" stroke="#b0b0b0"/></svg>';
  const ICONS = {
    folder: `<span class="tree-ico">${FOLDER_SVG}</span>`,
    meta: `<span class="tree-ico">${META_SVG}</span>`,
    aa: '<span class="tree-ico aa">aa</span>',
    fx: '<span class="tree-ico fx">√a</span>',
    filter: '<span class="tree-ico"><i class="ti ti-filter" style="color:#6b6b6b"></i></span>',
    db: '<span class="tree-ico"><i class="ti ti-table"></i></span>',
    ia: '<span class="tree-ico"><i class="ti ti-sparkles"></i></span>',
  };

  function treeRows(nodes, depth, sel, expanded, out) {
    for (const n of nodes) {
      const has = !!(n.kids && n.kids.length);
      const open = has && expanded[n.id];
      out.push(`<div class="tree-row${sel === n.id ? ' sel' : ''}" role="treeitem" data-id="${n.id}" style="padding-left:${depth * 16 + 2}px" title="${esc(n.label)}">` +
        `<span class="tree-exp"${has ? ` data-exp="${n.id}"` : ''}>${has ? `<b>${open ? '−' : '+'}</b>` : ''}</span>` +
        `${ICONS[n.icon || 'folder']}<span class="tree-lbl">${esc(n.label) || '&nbsp;'}</span></div>`);
      if (open) treeRows(n.kids, depth + 1, sel, expanded, out);
    }
    return out;
  }
  function renderTree() {
    $('#tree').innerHTML = treeRows(treeData(), 0, S.selected, S.expanded, []).join('');
  }
  function toggleExpand(id) {
    S.expanded[id] = !S.expanded[id];
    save('expanded');
    renderTree();
  }
  $('#tree').addEventListener('click', (e) => {
    const exp = e.target.closest('[data-exp]');
    if (exp) return toggleExpand(exp.dataset.exp);
    const row = e.target.closest('.tree-row');
    if (row) select(row.dataset.id);
  });
  $('#tree').addEventListener('dblclick', (e) => {
    const row = e.target.closest('.tree-row');
    if (row && !e.target.closest('[data-exp]') && $('[data-exp]', row)) toggleExpand(row.dataset.id);
  });

  $('#treeTabelas').innerHTML = treeRows([{ id: 'cx', label: '[Conexão padrão]', icon: 'meta', kids: [
    { id: 't1', label: 'OCCURRENCE', icon: 'db' }, { id: 't2', label: 'OCCURRENCE_TYPE', icon: 'db' },
    { id: 't3', label: 'RISK', icon: 'db' }, { id: 't4', label: 'DAMAGE', icon: 'db' },
  ] }], 0, null, { cx: false }, []).join('');
  $('#treeTabelas').addEventListener('click', (e) => {
    const exp = e.target.closest('[data-exp]');
    if (!exp) return;
    const open = exp.textContent === '+';
    $('#treeTabelas').innerHTML = treeRows([{ id: 'cx', label: '[Conexão padrão]', icon: 'meta', kids: [
      { id: 't1', label: 'OCCURRENCE', icon: 'db' }, { id: 't2', label: 'OCCURRENCE_TYPE', icon: 'db' },
      { id: 't3', label: 'RISK', icon: 'db' }, { id: 't4', label: 'DAMAGE', icon: 'db' },
    ] }], 0, null, { cx: open }, []).join('');
  });

  function labelOf(id) {
    const c = calcById(id); if (c) return calcLabel(c) || c.nome;
    const f = fieldById(id); if (f) return f.titulo;
    const row = $(`.tree-row[data-id="${id}"]`);
    return row ? row.title : id;
  }

  function select(id) {
    if (S.selected === id) return;
    S.selected = id;
    if (kind(id) === 'calc' && S.tabRule === 'formula') S.propTab = 'formula';
    save('selected', 'propTab');
    log('Selecionou na estrutura', labelOf(id));
    renderTree();
    renderProps();
    layout();
  }

  // ---------- propriedades ----------
  const opt = (list, v) => list.map((o) => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('');
  const TIPOS = ['Expressão SQL', 'Fórmula', 'Script'];
  const TIPOS_DADO = ['Texto', 'Número', 'Data', 'Data e hora', 'Booleano'];

  function renderProps() {
    const k = kind(S.selected);
    const el = $('#props');
    if (k === 'calc') {
      const c = calcById(S.selected);
      const lado = S.solucao === 'lado';
      const away = lado && S.beside;
      const besideBtn = lado && S.place !== 'barra'
        ? `<button class="sqbtn" id="btnBesideProps" aria-pressed="${away}" title="${away ? 'Trazer a fórmula de volta para cá' : 'Abrir ao lado do SQL (Ctrl+Shift+F)'}"><i class="ti ti-layout-sidebar-right ic-blue"></i></button>` : '';
      const campos = `
        <span class="lbl">Nome</span>
        <div class="pline"><input class="ctl w200" data-f="nome" value="${esc(c.nome)}" />
          <button class="btn">Privacidade</button>
          <button class="tbtn" title="Regras de privacidade"><i class="ti ti-shield-lock ic-blue"></i><i class="ti ti-caret-down-filled caret"></i></button></div>
        <span></span><label class="chk"><input type="checkbox" data-f="publico" ${c.publico === false ? '' : 'checked'} /> Público</label>
        <span class="lbl">Título</span><div><input class="ctl w200" data-f="titulo" value="${esc(c.titulo)}" /></div>
        <span></span><div><button class="btn wide">Formatação...</button></div>
        <span class="lbl">Categoria</span><div><select class="ctl w200" data-f="categoria">${opt(['', 'Indicadores', 'Prazos', 'Qualidade'], c.categoria || '')}</select></div>
        <span class="lbl">Tipo</span><div><select class="ctl w300" data-f="tipo">${opt(TIPOS, c.tipo)}</select></div>
        <span class="lbl">Tipo do dado</span><div><select class="ctl w200" data-f="tipoDado">${opt(TIPOS_DADO, c.tipoDado)}</select></div>
        <span class="lbl lbl-top">Contexto</span><div><textarea class="ctl ctx" data-f="contexto" rows="3" spellcheck="false">${esc(c.contexto || '')}</textarea></div>`;
      const checks = `
        <span></span><label class="chk"><input type="checkbox" data-f="agreg" ${c.agreg ? 'checked' : ''} /> Possui função de agregação</label>
        <span></span><label class="chk"><input type="checkbox" data-f="analitica" ${c.analitica ? 'checked' : ''} /> Possui função analítica</label>`;
      const formulaRow = `
        <div class="formula-row${away ? ' away' : ''}">
          ${away
            ? `<div class="formula-away"><i class="ti ti-layout-sidebar-right"></i><span>A fórmula está aberta ao lado do SQL.</span><span class="grow"></span>
                 <button class="linkbtn" id="btnBringBack"><i class="ti ti-arrow-bar-to-down"></i>Trazer de volta</button></div>`
            : '<div class="formula-host" id="propsFormulaHost"></div>'}
          <div class="side-btns"><button class="sqbtn" id="btnLupa" title="Selecionar um campo para inserir na fórmula"><i class="ti ti-search"></i></button>${besideBtn}</div>
        </div>`;
      if (lado) {
        el.innerHTML = `<div class="pgrid">${campos}<span class="lbl${away ? '' : ' lbl-top'}">Fórmula</span>${formulaRow}${checks}</div>`;
      } else {
        const tab = (id, nome) => `<span class="ptab${S.propTab === id ? ' on' : ''}" role="tab" aria-selected="${S.propTab === id}" data-ptab="${id}">${nome}</span>`;
        el.innerHTML = `<div class="ptabs" role="tablist">${tab('formula', 'Fórmula')}${tab('props', 'Propriedades')}</div>
          <div class="ptab-body">
            <div class="ptab-page${S.propTab === 'formula' ? ' on' : ''}" data-page="formula">${formulaRow}</div>
            <div class="ptab-page${S.propTab === 'props' ? ' on' : ''}" data-page="props"><div class="pgrid">${campos}${checks}</div></div>
          </div>`;
      }
    } else if (k === 'field') {
      const f = fieldById(S.selected);
      el.innerHTML = `<div class="pgrid">
        <span class="lbl">Nome</span><div class="pline"><input class="ctl w200" value="${esc(f.nome)}" /><button class="btn">Privacidade</button></div>
        <span></span><label class="chk"><input type="checkbox" checked /> Público</label>
        <span class="lbl">Título</span><div><input class="ctl w200" value="${esc(f.titulo)}" /></div>
        <span></span><div><button class="btn wide">Formatação...</button></div>
        <span class="lbl">Categoria</span><div><select class="ctl w200">${opt(['', 'Indicadores', 'Prazos'], '')}</select></div>
        <span class="lbl">Tipo do dado</span><div><select class="ctl w200">${opt(TIPOS_DADO, f.tipoDado)}</select></div>
        <span class="lbl">Coluna no SQL</span><div><input class="ctl w300" value="${esc(f.nome)}" disabled /></div>
      </div>`;
    } else if (k === 'root') {
      el.innerHTML = `<div class="pgrid">
        <span class="lbl">Nome</span><div><input class="ctl w300" value="Ocorrências - Prazo de análise" /></div>
        <span class="lbl">Descrição</span><div><input class="ctl" style="width:420px" value="Ocorrências registradas por setor, com prazos de aceite e análise" /></div>
        <span class="lbl">Pasta</span><div><input class="ctl w300" value="Qualidade / Ocorrências" /></div>
      </div>`;
    } else if (k === 'avancado') {
      el.innerHTML = `<div class="pgrid">
        <span class="lbl">Modo execução</span><div><select class="ctl w200">${opt(['Automático', 'Banco de dados', 'Em memória'], 'Automático')}</select></div>
        <span></span><label class="chk"><input type="checkbox" /> Permitir campos calculados por SQL no componente quando houver regras de privacidade de dados ativa (não recomendado)</label>
        <span class="lbl">Estratégia (conexão híbrida)</span><div><select class="ctl w200" disabled><option>Automático</option></select></div>
        <span></span><label class="chk"><input type="checkbox" id="chkDynamic" ${S.dynamic ? 'checked' : ''} /> Utilizar linguagem de modelo dinâmica (apenas SQL)</label>
        <span></span><div class="group"><span class="group-cap">DuckDB (conexão [Dados offline])</span>
          <label class="chk" style="margin-bottom:6px"><input type="checkbox" disabled /> Sobrescrever configurações globais</label>
          <div class="pgrid" style="grid-template-columns:110px 150px">
            <span class="lbl">Limite de memória</span><input class="ctl" disabled />
            <span class="lbl">Diretório temporário</span><input class="ctl" disabled />
            <span class="lbl">Threads</span><input class="ctl" disabled style="width:60px" />
          </div></div>
      </div>`;
    } else {
      el.innerHTML = '<div class="empty-props">Este item não tem propriedades para editar. Selecione um campo ou um campo calculado na Estrutura.</div>';
    }
  }

  $('#props').addEventListener('click', (e) => {
    const t = e.target.closest('[data-ptab]');
    if (!t || t.dataset.ptab === S.propTab) return;
    S.propTab = t.dataset.ptab;
    save('propTab');
    log('Trocou a aba das propriedades', t.textContent.trim());
    document.querySelectorAll('#props [data-ptab]').forEach((n) => { const on = n.dataset.ptab === S.propTab; n.classList.toggle('on', on); n.setAttribute('aria-selected', String(on)); });
    document.querySelectorAll('#props [data-page]').forEach((n) => n.classList.toggle('on', n.dataset.page === S.propTab));
    if (S.propTab === 'formula') fEd.focus();
  });
  $('#props').addEventListener('input', onPropEdit);
  $('#props').addEventListener('change', onPropEdit);
  function onPropEdit(e) {
    const t = e.target;
    if (t.id === 'chkDynamic') { if (e.type === 'change') setDynamic(t.checked, 'Avançado'); return; }
    const key = t.dataset.f;
    const c = calcById(S.selected);
    if (!key || !c) return;
    c[key] = t.type === 'checkbox' ? t.checked : t.value;
    save('calcs');
    if (key === 'titulo' || key === 'nome') { renderTree(); updateTabLabel(); }
  }

  // ---------- painel da direita e posição do editor da fórmula ----------
  function placeFormula() {
    const calc = isCalc();
    if (calc && fEd.calcId !== S.selected) {
      fEd.calcId = S.selected;
      fEd.value = calcById(S.selected).formula;
    }
    let host = null;
    if (calc && S.beside && S.solucao === 'lado') host = $('#rFormulaHost');
    else if (calc) host = $('#propsFormulaHost');
    if (host) { if (fEd.root.parentNode !== host) { host.appendChild(fEd.root); fEd.refresh(); } } else fEd.root.remove();
  }

  function rightTabs() {
    const tabs = [];
    if (S.dynamic) tabs.push('gen');
    if (S.solucao === 'lado' && S.beside && (isCalc() || S.noF === 'manter')) tabs.push('formula');
    return tabs;
  }

  function updateTabLabel() {
    const lbl = $('#rtabFormulaLbl');
    if (lbl) lbl.textContent = isCalc() ? `Fórmula · ${calcLabel(calcById(S.selected))}` : 'Fórmula';
  }

  function layout() {
    const tabs = rightTabs();
    const calc = isCalc();
    let tab = tabs.includes(S.rightTab) ? S.rightTab : tabs[tabs.length - 1];
    const area = $('#sqlArea');
    area.classList.toggle('split', tabs.length > 0);
    $('#paneLeft').style.flex = tabs.length ? `${S.split} 1 0` : '1 1 0';
    $('#paneRight').style.flex = tabs.length ? `${1 - S.split} 1 0` : '0 0 0';

    const tabHtml = tabs.map((t) => t === 'gen'
      ? `<span class="rtab${t === tab ? ' on' : ''}" data-tab="gen"><i class="ti ti-file-code"></i><span>SQL gerado</span></span>`
      : `<span class="rtab${t === tab ? ' on' : ''}" data-tab="formula"><i class="ti ti-math-function"></i><span id="rtabFormulaLbl"></span></span>`).join('');
    const actions = tab === 'formula'
      ? `<span class="rtab-actions">${calc
          ? '<button class="tbtn sm" id="btnLupa2" title="Selecionar um campo para inserir na fórmula"><i class="ti ti-search ic-gray"></i></button>' +
            '<button class="linkbtn" id="btnBringBack2" title="Trazer a fórmula de volta para as propriedades"><i class="ti ti-arrow-bar-to-down"></i>Trazer de volta</button>'
          : '<button class="linkbtn" id="btnCloseBeside" title="Fechar o painel da fórmula"><i class="ti ti-x"></i>Fechar</button>'}</span>`
      : '';
    $('#rtabs').innerHTML = tabHtml + actions;
    updateTabLabel();

    $('#genHost').classList.toggle('show', tab === 'gen');
    $('#rFormulaHost').classList.toggle('show', tab === 'formula' && calc);
    $('#rEmpty').classList.toggle('show', tab === 'formula' && !calc);
    $('#btnRunGen').hidden = tab !== 'gen';

    placeFormula();
    updateToolbar();
  }

  $('#rtabs').addEventListener('click', (e) => {
    const t = e.target.closest('.rtab');
    if (!t) return;
    S.rightTab = t.dataset.tab;
    save('rightTab');
    log('Trocou a aba do painel da direita', t.textContent.trim());
    layout();
  });

  function updateToolbar() {
    const calc = isCalc();
    const b = $('#btnBesideBar');
    b.setAttribute('aria-pressed', String(S.beside && calc));
    b.classList.toggle('off', !calc);
    b.title = !calc ? 'Abrir a fórmula ao lado do SQL (selecione um campo calculado)'
      : S.beside ? 'Trazer a fórmula de volta para as propriedades (Ctrl+Shift+F)' : 'Abrir a fórmula ao lado do SQL (Ctrl+Shift+F)';
    document.querySelectorAll('[data-place="barra"]').forEach((n) => { n.hidden = S.solucao !== 'lado' || S.place === 'lupa'; });
  }

  function setBeside(v, origem) {
    if (v && !isCalc()) {
      toast('Selecione um campo calculado na Estrutura para abrir a fórmula ao lado do SQL.');
      log('Tentou abrir a fórmula ao lado sem campo calculado', origem);
      return;
    }
    S.beside = v;
    if (v) S.rightTab = 'formula';
    save('beside', 'rightTab');
    log(v ? 'Abriu a fórmula ao lado do SQL' : 'Trouxe a fórmula de volta', origem);
    renderProps();
    layout();
    if (isCalc()) fEd.focus();
  }

  function setDynamic(v, origem) {
    S.dynamic = v;
    save('dynamic');
    if (v) genEd.value = genSql();
    log(v ? 'Ligou o SQL dinâmico' : 'Desligou o SQL dinâmico', origem);
    $('#pDynamic').checked = v;
    const chk = $('#chkDynamic');
    if (chk) chk.checked = v;
    layout();
  }

  // divisória entre o SQL e o painel da direita
  const vsplit = $('#vsplit');
  vsplit.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    vsplit.setPointerCapture(e.pointerId);
    vsplit.classList.add('drag');
    const r = $('#sqlArea').getBoundingClientRect();
    const move = (ev) => {
      S.split = Math.min(0.8, Math.max(0.2, (ev.clientX - r.left) / r.width));
      $('#paneLeft').style.flex = `${S.split} 1 0`;
      $('#paneRight').style.flex = `${1 - S.split} 1 0`;
    };
    const up = () => {
      vsplit.removeEventListener('pointermove', move);
      vsplit.classList.remove('drag');
      save('split');
      log('Redimensionou o painel da direita', `SQL com ${Math.round(S.split * 100)}%`);
    };
    vsplit.addEventListener('pointermove', move);
    vsplit.addEventListener('pointerup', up, { once: true });
  });
  vsplit.addEventListener('dblclick', () => { S.split = 0.5; save('split'); layout(); });

  // ---------- lupa: "Selecione" um campo e insere %nome% onde está o cursor da fórmula ----------
  const PK = { range: [0, 0], sel: 0, items: [] };

  function renderPicker() {
    const f = $('#pkFilter').value.trim().toLowerCase();
    PK.items = FIELDS.filter((x) => !f || x.titulo.toLowerCase().includes(f) || x.nome.toLowerCase().includes(f));
    if (PK.sel >= PK.items.length) PK.sel = Math.max(0, PK.items.length - 1);
    const rows = PK.items.map((x, i) => `<div class="tree-row${i === PK.sel ? ' sel' : ''}" role="treeitem" data-i="${i}" style="padding-left:34px" title="%${esc(x.nome)}%">` +
      `<span class="tree-ico abc">abc</span><span class="tree-lbl">${esc(x.titulo.toUpperCase())}</span></div>`).join('');
    $('#pkTree').innerHTML = '<div class="tree-row" style="padding-left:2px"><span class="tree-exp"><b>−</b></span>' +
      `<span class="tree-ico">${FOLDER_SVG}</span><span class="tree-lbl">(sem hierarquia)</span></div>` +
      (rows || '<div class="pk-empty">Nenhum campo encontrado com esse filtro.</div>');
  }
  function openModal(origem) {
    if (!isCalc()) return;
    PK.range = [fEd.ta.selectionStart, fEd.ta.selectionEnd];
    PK.sel = 0;
    $('#pkFilter').value = '';
    renderPicker();
    S.modal = true;
    $('#modal').hidden = false;
    log('Abriu a lupa (Selecione)', origem);
    $('#pkFilter').focus();
  }
  function closeModal(inserir) {
    if (!S.modal) return;
    const campo = inserir ? PK.items[PK.sel] : null;
    S.modal = false;
    $('#modal').hidden = true;
    const ta = fEd.ta;
    ta.focus();
    if (campo) {
      ta.setRangeText(`%${campo.nome}%`, PK.range[0], PK.range[1], 'end');
      ta.dispatchEvent(new Event('input'));
      log('Inseriu campo pela lupa', campo.nome);
    } else {
      ta.setSelectionRange(PK.range[0], PK.range[1]);
      log('Fechou a lupa sem inserir');
    }
  }
  $('#pkFilter').addEventListener('input', () => { PK.sel = 0; renderPicker(); });
  function pickRow(r) {
    PK.sel = +r.dataset.i;
    document.querySelectorAll('#pkTree [data-i]').forEach((n) => n.classList.toggle('sel', n === r));
  }
  $('#pkTree').addEventListener('click', (e) => { const r = e.target.closest('[data-i]'); if (r) pickRow(r); });
  $('#pkTree').addEventListener('dblclick', (e) => { const r = e.target.closest('[data-i]'); if (r) { pickRow(r); closeModal(true); } });
  $('#modal').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      PK.sel = Math.min(PK.items.length - 1, Math.max(0, PK.sel + (e.key === 'ArrowDown' ? 1 : -1)));
      renderPicker();
      const row = $(`#pkTree [data-i="${PK.sel}"]`);
      if (row) row.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (PK.items.length) closeModal(true);
    }
  });

  // ---------- painel do protótipo ----------
  function syncProto() {
    $('#pDynamic').checked = S.dynamic;
    document.querySelectorAll('[name="pPlace"]').forEach((r) => { r.checked = r.value === S.place; });
    document.querySelectorAll('[name="pNoF"]').forEach((r) => { r.checked = r.value === S.noF; });
    document.querySelectorAll('[name="pSol"]').forEach((r) => { r.checked = r.value === S.solucao; });
    document.querySelectorAll('[name="pTabRule"]').forEach((r) => { r.checked = r.value === S.tabRule; });
    document.querySelectorAll('#proto [data-sol]').forEach((g) => { g.hidden = g.dataset.sol !== S.solucao; });
    $('#pLogCount').textContent = S.log.length;
  }
  $('#proto').addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'pDynamic') setDynamic(t.checked, 'painel do protótipo');
    else if (t.name === 'pPlace') { S.place = t.value; save('place'); renderProps(); layout(); }
    else if (t.name === 'pNoF') { S.noF = t.value; save('noF'); layout(); }
    else if (t.name === 'pTabRule') { S.tabRule = t.value; save('tabRule'); }
    else if (t.name === 'pSol') {
      S.solucao = t.value;
      save('solucao');
      log('Trocou a solução', t.value === 'abas' ? 'abas Fórmula/Propriedades' : 'fórmula ao lado do SQL');
      renderProps();
      layout();
      syncProto();
    }
  });
  function logText() {
    return 'hora;ação;detalhe\n' + S.log.map((l) => `${new Date(l.t).toLocaleTimeString('pt-BR')};${l.acao};${l.det.replace(/;/g, ',')}`).join('\n');
  }

  // ---------- cliques ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, .tab, .subtab, label.chk');
    if (t && !t.closest('#proto') && !t.hasAttribute('data-nolog') && !t.matches('label.chk')) {
      log('Clique', t.title || t.getAttribute('aria-label') || t.textContent.trim().replace(/\s+/g, ' ').slice(0, 60));
    }
    const b = e.target.closest('button, a');
    if (!b) return;
    switch (b.id) {
      case 'btnBesideBar': return setBeside(!(S.beside && isCalc()), 'botão na barra do SQL');
      case 'btnBesideProps': return setBeside(!S.beside, 'botão ao lado da lupa');
      case 'btnBringBack': return setBeside(false, 'link nas propriedades');
      case 'btnBringBack2': return setBeside(false, 'link no painel da direita');
      case 'btnCloseBeside': S.beside = false; save('beside'); log('Fechou o painel da fórmula'); return layout();
      case 'btnLupa': return openModal(S.beside ? 'lupa nas propriedades (fórmula ao lado)' : 'lupa nas propriedades');
      case 'btnLupa2': return openModal('lupa no painel da direita');
      case 'modalOk': return closeModal(true);
      case 'modalX': case 'modalCancel': return closeModal(false);
      case 'btnProto': syncProto(); $('#proto').hidden = !$('#proto').hidden; return;
      case 'protoX': $('#proto').hidden = true; return;
      case 'pLogCopy':
        try { navigator.clipboard.writeText(logText()).then(() => toast('Registro copiado.'), () => toast('Não deu para copiar. Use Baixar.')); } catch (err) { toast('Não deu para copiar. Use Baixar.'); }
        return;
      case 'pLogDownload': {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + logText()], { type: 'text/csv;charset=utf-8' }));
        a.download = `teste-editor-metadado-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
        a.click();
        return;
      }
      case 'pLogClear': S.log = []; save('log'); $('#pLogCount').textContent = '0'; return toast('Registro limpo.');
      case 'pReset': { const lg = S.log; store.clear(); store.set('log', lg); location.reload(); return; }
      case 'lnkInc': e.preventDefault(); return toast('[Metadado] O SQL informado não foi testado. [Campo calculado] calc1 está sem fórmula.');
      default:
        if (b.closest('#proto') || b.disabled) return;
        if (b.closest('.tree')) return;
        if (b.tagName === 'A') e.preventDefault();
        toast('Esta função não faz parte do protótipo.');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f') && S.solucao === 'lado') {
      e.preventDefault();
      setBeside(!(S.beside && isCalc()), 'atalho Ctrl+Shift+F');
    } else if (e.key === 'Escape') {
      if (S.modal) closeModal(false);
      else $('#proto').hidden = true;
    }
  });

  // ---------- início ----------
  if (kind(S.selected) === 'folder' && !treeRows(treeData(), 0, null, { root: true, campos: true, calcs: true, filtros: true, arm: true }, []).join('').includes(`data-id="${S.selected}"`)) {
    S.selected = 'c_prazo';
  }
  renderTree();
  renderProps();
  layout();
  syncProto();
})();
