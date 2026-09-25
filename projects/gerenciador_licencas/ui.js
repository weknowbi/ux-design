/* =========================================================
   Núcleo de UI: shell, rotas, componentes, listagens
   ========================================================= */

const VIEWS = {};
const S = { route:'', lists:{}, form:{}, openMenu:null, modalRender:null };

/* ---------- utils ---------- */
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $ = sel => document.querySelector(sel);
function go(hash){ S.route = hash; try{ location.hash = hash; }catch(e){} closeModal(); render(); }
const nextId = col => Math.max(0,...DB[col].map(x=>x.id))+1;
const norm = s => String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const pct = (n,total) => total? Math.round(n/total*100) : 0;

/* registros não excluídos logicamente (regra 18) */
const vivos = col => DB[col].filter(x=>!x.excluido);

function toast(title, msg, err){
  const el = document.createElement('div');
  el.className = 'toast'+(err?' err':'');
  el.innerHTML = '<div style="color:'+(err?'#dc2626':'#16a34a')+';width:18px;height:18px;flex:none">'+(err?IC.alert:IC.check)+'</div>'+
                 '<div><strong>'+esc(title)+'</strong>'+(msg?'<p>'+esc(msg)+'</p>':'')+'</div>';
  $('#toasts').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .25s'; setTimeout(()=>el.remove(),260); }, 3600);
}

/* ---------- foco preservado entre re-renderizações ---------- */
function preserveFocus(mutate){
  const ae = document.activeElement;
  const fk = ae && ae.getAttribute ? ae.getAttribute('data-f') : null;
  let pos = null; try{ pos = ae ? ae.selectionStart : null; }catch(e){}
  mutate();
  if(fk){
    const el = document.querySelector('[data-f="'+fk+'"]');
    if(el){ el.focus(); try{ el.setSelectionRange(pos,pos); }catch(e){} }
  }
}

/* ---------- modal ---------- */
function openModal(html, size){
  preserveFocus(()=>{
    $('#modal-root').innerHTML = '<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="modal '+(size||'')+'">'+html+'</div></div>';
  });
  document.body.style.overflow='hidden';
}
function closeModal(){ $('#modal-root').innerHTML=''; document.body.style.overflow=''; S.modalRender=null; }
function setModalRender(fn){ S.modalRender = fn; }
function confirmDialog(o){
  const tom = o.tom || 'danger';
  const cores = { danger:['#fee2e2','#dc2626'], warn:['#fffbeb','#b45309'], info:['#e9effb','#3366cc'] }[tom];
  openModal(
    '<div class="modal-icon" style="background:'+cores[0]+';color:'+cores[1]+'">'+(tom==='info'?IC.info:IC.alert)+'</div>'+
    '<h2 style="margin-bottom:8px">'+esc(o.title)+'</h2>'+
    '<p style="margin:0;color:var(--slate-500);font-size:13.5px">'+o.message+'</p>'+
    (o.extra||'')+
    '<div class="modal-actions">'+
      '<button class="btn btn-ghost" onclick="closeModal()">'+esc(o.cancelLabel||'Cancelar')+'</button>'+
      '<button class="btn '+(tom==='danger'?'btn-danger-solid':'btn-primary')+'" onclick="'+o.onConfirm+'">'+esc(o.confirmLabel||'Confirmar')+'</button>'+
    '</div>', o.size);
}

/* ---------- componentes de formulário ---------- */
function field(label, inner, opts){
  opts = opts||{};
  return '<div class="field'+(opts.span2?' span2':'')+(opts.span3?' span3':'')+'">'+
    (label?'<label>'+esc(label)+(opts.req?' <span class="req">*</span>':'')+'</label>':'')+inner+
    (opts.hint?'<span class="hint">'+esc(opts.hint)+'</span>':'')+'</div>';
}
function inputF(path, value, ph, type){
  return '<input class="input" data-f="'+esc(path)+'" type="'+(type||'text')+'" value="'+esc(value==null?'':value)+'" placeholder="'+esc(ph||'')+'" oninput="setQ(\''+path+'\',this.value)">';
}
function inputRO(value, hint){
  return '<input class="input" value="'+esc(value==null?'':value)+'" disabled style="background:var(--slate-50);color:var(--slate-500)">';
}
function textareaF(path, value, ph, rows){
  return '<textarea class="input" data-f="'+esc(path)+'" rows="'+(rows||4)+'" placeholder="'+esc(ph||'')+'" oninput="setQ(\''+path+'\',this.value)">'+esc(value||'')+'</textarea>';
}
function selectF(path, value, options, ph){
  return '<select class="input" onchange="setF(\''+path+'\',this.value)">'+
    (ph!==null?'<option value="">'+esc(ph||'Selecione')+'</option>':'')+
    options.map(o=>'<option value="'+esc(o.v)+'"'+(String(o.v)===String(value)?' selected':'')+'>'+esc(o.t)+'</option>').join('')+
    '</select>';
}
function switchF(path, on, label, sub){
  return '<div class="switch'+(on?' on':'')+'" onclick="toggleF(\''+path+'\')"><div class="track"></div>'+
    '<span>'+esc(label)+(sub?'<small>'+esc(sub)+'</small>':'')+'</span></div>';
}
function checkF(onclick, on, title, sub){
  return '<div class="check'+(on?' on':'')+'" onclick="'+onclick+'"><i></i><div><div style="font-size:13px;color:var(--slate-900);font-weight:600">'+esc(title)+'</div>'+
    (sub?'<div style="font-size:11.5px;color:var(--slate-400);margin-top:2px">'+esc(sub)+'</div>':'')+'</div></div>';
}
function segmentedF(path, cur, options){
  return '<div class="segmented">'+options.map(o=>'<button class="'+(String(o.v)===String(cur)?'on':'')+'" onclick="setF(\''+path+'\',\''+o.v+'\')">'+esc(o.t)+'</button>').join('')+'</div>';
}
/* campo numérico com switch "Ilimitado" (regra 9/10) */
function limiteF(pathQtd, valorQtd, pathIlim, ilimitado, label, hint){
  return '<div class="field">'+
    '<label>'+esc(label)+'</label>'+
    '<div class="limite">'+
      (ilimitado
        ? '<div class="limite-ilim">'+IC.infinity+'<span>Ilimitado</span></div>'
        : '<input class="input" data-f="'+esc(pathQtd)+'" type="number" min="0" value="'+esc(valorQtd==null?'':valorQtd)+'" oninput="setQ(\''+pathQtd+'\',this.value)">')+
      switchF(pathIlim, ilimitado, 'Ilimitado')+
    '</div>'+
    (hint?'<span class="hint">'+esc(hint)+'</span>':'')+
  '</div>';
}
function setQ(path, value){
  const parts = path.split('.'); let ref = S;
  for(let i=0;i<parts.length-1;i++){ ref[parts[i]] = ref[parts[i]]||{}; ref = ref[parts[i]]; }
  ref[parts[parts.length-1]] = value;
}
function setF(path, value){
  setQ(path, value);
  render();
  if(S.modalRender) S.modalRender();
}
function getF(path){
  const parts = path.split('.'); let ref = S;
  for(const p of parts){ if(ref==null) return undefined; ref = ref[p]; }
  return ref;
}
function toggleF(path){ setF(path, !getF(path)); }
function toggleInArray(path, val){
  const arr = (getF(path)||[]).slice(); val = Number(val);
  const i = arr.indexOf(val); if(i>=0) arr.splice(i,1); else arr.push(val);
  setF(path, arr);
}

/* ---------- badges ---------- */
const badge = (txt, cls) => '<span class="badge '+cls+'">'+esc(txt)+'</span>';
const badgeDot = (txt, cls) => '<span class="badge '+cls+'"><i class="dot"></i>'+esc(txt)+'</span>';
const badgeSituacao = (ativo, fem) => badge(ativo?(fem?'Ativa':'Ativo'):(fem?'Inativa':'Inativo'), ativo?'b-green':'b-gray');
const badgeIlimitado = () => '<span class="badge b-violet">Ilimitado</span>';
/* marcador do ambiente, usando a cor do cadastro */
function marcadorAmbiente(a, texto, pequeno){
  if(!a || !a.id) return '<span class="muted">—</span>';
  return '<span class="amb'+(pequeno?' sm':'')+'"><i style="background:'+(a.cor||'#94a3b8')+'"></i>'+esc(texto||a.sigla)+'</span>';
}

/* ---------- listagem genérica ---------- */
function listState(key){
  if(!S.lists[key]) S.lists[key] = { q:'', page:1, sort:null, dir:1, f:{} };
  return S.lists[key];
}
function setList(key, prop, val){ const st=listState(key); st[prop]=val; if(prop!=='page') st.page=1; render(); }
function setListF(key, prop, val){ const st=listState(key); st.f[prop]=val; st.page=1; render(); }
function toggleListF(key, prop){ const st=listState(key); st.f[prop]=!st.f[prop]; st.page=1; render(); }
function clearList(key){ S.lists[key] = { q:'', page:1, sort:null, dir:1, f:{} }; render(); }
function sortList(key, col){
  const st = listState(key);
  if(st.sort===col) st.dir = -st.dir; else { st.sort=col; st.dir=1; }
  render();
}

function dataTable(cfg){
  const st = listState(cfg.key);
  let rows = cfg.rows.slice();
  if(st.sort){
    const col = cfg.columns.find(c=>c.key===st.sort);
    if(col && col.sortVal) rows.sort((a,b)=>{
      const x=col.sortVal(a), y=col.sortVal(b);
      return (x>y?1:x<y?-1:0)*st.dir;
    });
  }
  const per = cfg.perPage||10;
  const pages = Math.max(1, Math.ceil(rows.length/per));
  if(st.page>pages) st.page=pages;
  const view = rows.slice((st.page-1)*per, st.page*per);

  if(!rows.length){
    return '<div class="card"><div class="empty">'+IC.inbox+
      '<h3>'+esc(cfg.emptyTitle || (cfg.hasFilters?'Nenhum resultado encontrado':'Nenhum registro cadastrado'))+'</h3>'+
      '<p>'+esc(cfg.emptyMsg || (cfg.hasFilters?'Ajuste a busca ou os filtros para tentar novamente.':'Cadastre o primeiro registro para começar.'))+'</p>'+
      (cfg.hasFilters?'<button class="btn btn-ghost" onclick="clearList(\''+cfg.key+'\')">Limpar filtros</button>':(cfg.emptyAction||''))+
      '</div></div>';
  }

  const th = cfg.columns.map(c=>{
    const cls = [c.sortVal?'sortable':'', c.align?'right':''].filter(Boolean).join(' ');
    const arrow = st.sort===c.key ? '<span class="arrow">'+(st.dir>0?'▲':'▼')+'</span>' : '';
    return '<th'+(c.width?' style="width:'+c.width+'"':'')+(cls?' class="'+cls+'"':'')+
      (c.sortVal?' onclick="sortList(\''+cfg.key+'\',\''+c.key+'\')"':'')+'>'+esc(c.label)+arrow+'</th>';
  }).join('');

  const tb = view.map(r=>'<tr'+(r.excluido?' class="row-excluido"':'')+'>'+
    cfg.columns.map(c=>'<td class="'+(c.cls||'')+'">'+c.render(r)+'</td>').join('')+'</tr>').join('');

  return '<div class="card">'+
    (cfg.toolbar?'<div class="card-head">'+cfg.toolbar+'</div>':'')+
    '<div class="table-wrap"><table><thead><tr>'+th+'</tr></thead><tbody>'+tb+'</tbody></table></div>'+
    pagination(cfg.key, st.page, pages, rows.length, per)+'</div>';
}
function pagination(key, page, pages, total, per){
  const btn = (label, target, dis, on) =>
    '<button '+(dis?'disabled':'onclick="setList(\''+key+'\',\'page\','+target+')"')+(on?' class="on"':'')+'>'+label+'</button>';
  let nums = '';
  const from = Math.max(1, Math.min(page-2, pages-4)), to = Math.min(pages, Math.max(page+2,5));
  for(let i=from;i<=to;i++) nums += btn(i, i, false, i===page);
  return '<div style="padding:6px 0 16px">'+
    '<div class="pagination">'+btn('&laquo;',1,page===1)+btn('&lsaquo;',page-1,page===1)+nums+
    btn('&rsaquo;',page+1,page===pages)+btn('&raquo;',pages,page===pages)+'</div>'+
    '<div class="pag-info">Exibindo '+((page-1)*per+1)+'–'+Math.min(page*per,total)+' de '+total+' registro(s)</div></div>';
}

/* ---------- ações de linha ---------- */
function actView(href){ return '<button class="icon-btn" title="Visualizar" onclick="go(\''+href+'\')">'+IC.eye+'</button>'; }
function actEdit(alvo){ return '<button class="icon-btn" title="Editar" onclick="'+(alvo.indexOf('(')>0?alvo:'go(\''+alvo+'\')')+'">'+IC.edit+'</button>'; }
function actSituacao(fn, ativo){
  return '<button class="icon-btn '+(ativo?'':'muted')+'" title="'+(ativo?'Inativar':'Reativar')+'" onclick="'+fn+'">'+IC.power+'</button>';
}
function actExcluir(fn){ return '<button class="icon-btn danger" title="Exclusão lógica" onclick="'+fn+'">'+IC.archive+'</button>'; }
function actCustom(icon, title, fn, cls){ return '<button class="icon-btn '+(cls||'')+'" title="'+esc(title)+'" onclick="'+fn+'">'+icon+'</button>'; }

/* ---------- inativação e exclusão lógica (regra 18) ---------- */
const ENTIDADES = {
  tiposParceiro:{rotulo:'Tipo de Parceiro Comercial', nome:r=>r.descricao, entidade:'Tipo de Parceiro'},
  parceiros:    {rotulo:'Parceiro Comercial',        nome:r=>r.nome,      entidade:'Parceiro Comercial'},
  clientes:     {rotulo:'Cliente',                   nome:r=>r.razaoSocial, entidade:'Cliente'},
  produtos:     {rotulo:'Produto',                   nome:r=>r.nome,      entidade:'Produto'},
  tiposLicenca: {rotulo:'Tipo de Licença',           nome:r=>r.sigla,     entidade:'Tipo de Licença'},
  categorias:   {rotulo:'Categoria de Licença',      nome:r=>r.descricao, entidade:'Categoria de Licença'},
  ambientes:    {rotulo:'Ambiente',                  nome:r=>r.sigla+' — '+r.descricao, entidade:'Ambiente'},
  brandings:    {rotulo:'Branding',                  nome:r=>r.descricao, entidade:'Branding'},
  motivos:      {rotulo:'Motivo de Alteração',       nome:r=>r.descricao, entidade:'Motivo de Alteração'}
};
function pedirSituacao(col, id){
  const meta=ENTIDADES[col], r=get(col,id), nome=meta.nome(r);
  if(r.ativo) return confirmDialog({ tom:'warn', title:'Inativar '+meta.rotulo.toLowerCase()+'?',
    message:'<b>'+esc(nome)+'</b> deixará de aparecer para novas associações. Os registros já vinculados '+
            '<b>não são alterados</b> — conforme a regra de inativação.',
    confirmLabel:'Inativar', onConfirm:'aplicarSituacao(\''+col+'\','+id+')' });
  aplicarSituacao(col, id);
}
function aplicarSituacao(col, id){
  const meta=ENTIDADES[col], r=get(col,id), antes=r.ativo?'Ativo':'Inativo';
  r.ativo = !r.ativo;
  log({entidade:meta.entidade, entidadeId:id, rotulo:meta.nome(r), tipo:'Ativação/Desativação',
       rotuloEvento:r.ativo?'Registro reativado':'Registro inativado', de:antes, para:r.ativo?'Ativo':'Inativo'});
  closeModal(); render();
  toast(r.ativo?'Registro reativado':'Registro inativado', meta.nome(r));
}
function pedirExclusao(col, id, vinculos){
  const meta=ENTIDADES[col], r=get(col,id), nome=meta.nome(r);
  const usos = vinculos||[];
  if(usos.length) return confirmDialog({ tom:'warn', title:'Exclusão não permitida',
    message:'<b>'+esc(nome)+'</b> está em uso: '+usos.map(u=>'<b>'+u+'</b>').join(', ')+'.<br><br>'+
            'Registros utilizados em licenças, instalações ou histórico não podem ser removidos. Use a <b>inativação</b> para impedir novas associações.',
    confirmLabel:'Inativar em vez disso', onConfirm:'closeModal();pedirSituacao(\''+col+'\','+id+')' });
  confirmDialog({ title:'Confirmar exclusão lógica?',
    message:'<b>'+esc(nome)+'</b> será marcado como excluído e sai das listagens, mas o registro é <b>preservado</b> para rastreabilidade e continua visível no histórico.',
    confirmLabel:'Excluir logicamente', onConfirm:'aplicarExclusao(\''+col+'\','+id+')' });
}
function aplicarExclusao(col, id){
  const meta=ENTIDADES[col], r=get(col,id);
  r.excluido = true; r.ativo = false;
  log({entidade:meta.entidade, entidadeId:id, rotulo:meta.nome(r), tipo:'Exclusão lógica',
       rotuloEvento:'Registro excluído logicamente', de:'Ativo', para:'Excluído'});
  closeModal(); render();
  toast('Exclusão lógica aplicada', meta.nome(r)+' foi preservado no histórico.');
}
function restaurarRegistro(col, id){
  const meta=ENTIDADES[col], r=get(col,id);
  r.excluido = false;
  log({entidade:meta.entidade, entidadeId:id, rotulo:meta.nome(r), tipo:'Exclusão lógica',
       rotuloEvento:'Exclusão lógica revertida', de:'Excluído', para:'Inativo'});
  render(); toast('Registro restaurado', meta.nome(r)+' voltou para a listagem como inativo.');
}
/* ações padrão de um cadastro de apoio */
function acoesCadastro(col, id, opts){
  opts = opts||{};
  const r = get(col,id);
  if(r.excluido) return '<div class="rowactions">'+actCustom(IC.refresh,'Restaurar','restaurarRegistro(\''+col+'\','+id+')')+'</div>';
  return '<div class="rowactions">'+
    (opts.ver?actView(opts.ver):'')+
    actEdit(opts.editar)+
    actSituacao('pedirSituacao(\''+col+'\','+id+')', r.ativo)+
    actExcluir('pedirExclusao(\''+col+'\','+id+',['+(opts.vinculos||[]).map(v=>'\''+v+'\'').join(',')+'])')+
  '</div>';
}

/* ---------- cabeçalho de página ---------- */
function pageHead(title, subtitle, actions, crumbs){
  return (crumbs?'<div class="breadcrumb">'+crumbs.map((c,i)=>(i?'<span>›</span>':'')+(c.href?'<a onclick="go(\''+c.href+'\')">'+esc(c.t)+'</a>':'<span>'+esc(c.t)+'</span>')).join('')+'</div>':'')+
    '<div class="page-head"><div><h1>'+esc(title)+'</h1>'+(subtitle?'<p class="subtitle">'+esc(subtitle)+'</p>':'')+'</div>'+
    '<div class="flex">'+(actions||'')+'</div></div>';
}
const btnNew = (label, href) => '<button class="btn btn-primary" onclick="go(\''+href+'\')">'+IC.plus+esc(label)+'</button>';
const searchBox = (key, ph) => '<div class="search">'+IC.search+'<input class="input" data-f="q:'+key+'" placeholder="'+esc(ph)+'" value="'+esc(listState(key).q)+'" oninput="setList(\''+key+'\',\'q\',this.value)"></div>';
const filterInput = (key, prop, ph, type, cls) => '<input class="input '+(cls||'w-180')+'" data-f="f:'+key+':'+prop+'" type="'+(type||'text')+'" placeholder="'+esc(ph)+'" value="'+esc(listState(key).f[prop]||'')+'" oninput="setListF(\''+key+'\',\''+prop+'\',this.value)">';
const filterSelect = (key, prop, ph, options, cls) => '<select class="input '+(cls||'w-180')+'" onchange="setListF(\''+key+'\',\''+prop+'\',this.value)"><option value="">'+esc(ph)+'</option>'+
  options.map(o=>'<option value="'+esc(o.v)+'"'+(String(o.v)===String(listState(key).f[prop]||'')?' selected':'')+'>'+esc(o.t)+'</option>').join('')+'</select>';
const btnClear = key => '<button class="btn btn-ghost btn-sm" onclick="clearList(\''+key+'\')" style="color:var(--slate-500)">'+IC.filterOff+'Limpar</button>';
const filtroExcluidos = (key, col) => DB[col].some(x=>x.excluido)
  ? '<div class="check inline'+(listState(key).f.excl?' on':'')+'" onclick="toggleListF(\''+key+'\',\'excl\')"><i></i><span style="font-size:12.5px">Mostrar excluídos</span></div>' : '';

/* ---------- exportação (seção 10) ---------- */
function csvEscape(v){
  const s = String(v==null?'':v);
  return /[";\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function exportar(nome, colunas, linhas, filtros){
  const cab = colunas.map(c=>csvEscape(c.label)).join(';');
  const corpo = linhas.map(r=>colunas.map(c=>csvEscape(c.valor(r))).join(';'));
  const csv = '﻿'+[cab].concat(corpo).join('\r\n');
  const previa = [cab].concat(corpo.slice(0,6)).join('\n');
  S.csv = {nome, csv};
  openModal('<h2>Exportar '+esc(nome)+'</h2>'+
    '<p class="muted" style="margin:0 0 16px;font-size:13px">'+linhas.length+' registro(s) · separador ponto e vírgula · UTF-8 com BOM (abre direto no Excel)</p>'+
    (filtros&&filtros.length
      ? '<div class="box mb16"><div class="box-title">Filtros aplicados</div><div class="list-inline">'+
        filtros.map(f=>badge(f,'b-blue')).join('')+'</div></div>'
      : '<div class="alert alert-info mb16" style="margin-top:0">'+IC.info+'<div>Nenhum filtro aplicado — a exportação inclui todos os registros da consulta.</div></div>')+
    '<div class="field"><label>Prévia</label><pre class="previa">'+esc(previa)+(corpo.length>6?'\n… mais '+(corpo.length-6)+' linha(s)':'')+'</pre></div>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fechar</button>'+
    '<button class="btn btn-ghost" onclick="copiarCSV()">Copiar CSV</button>'+
    '<button class="btn btn-primary" onclick="baixarCSV()">'+IC.download+'Baixar CSV</button></div>','md');
}
/* alternativa ao download — funciona também onde o navegador bloqueia salvar arquivo */
function copiarCSV(){
  const csv = (S.csv||{}).csv;
  if(!csv) return;
  const fallback = ()=>{
    const ta=document.createElement('textarea');
    ta.value=csv; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
    ta.remove();
    if(ok){ closeModal(); toast('CSV copiado','Cole em uma planilha ou editor de texto.'); }
    else toast('Não foi possível copiar','Selecione o conteúdo da prévia manualmente.',true);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(csv)
      .then(()=>{ closeModal(); toast('CSV copiado','Cole em uma planilha ou editor de texto.'); })
      .catch(fallback);
  } else fallback();
}
function baixarCSV(){
  const {nome, csv} = S.csv||{};
  if(!csv) return;
  const arquivo = 'weknow-'+norm(nome).replace(/[^a-z0-9]+/g,'-')+'-'+hojeISO()+'.csv';
  try{
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = arquivo;
    document.body.appendChild(a); a.click(); a.remove();
    toast('Exportação gerada', arquivo);
  }catch(e){
    toast('Download bloqueado', 'O navegador impediu o download neste contexto.', true);
  }
  closeModal();
}

/* ---------- menu ---------- */
const MENU = [
  {t:'Dashboard', h:'#/dashboard', k:'dashboard'},
  {t:'Licenças',  h:'#/licencas',  k:'licencas'},
  {t:'Clientes',  h:'#/clientes',  k:'clientes'},
  {t:'Parceiros Comerciais', h:'#/parceiros', k:'parceiros'},
  {t:'Produtos',  h:'#/produtos',  k:'produtos'},
  {t:'Branding',  h:'#/branding',  k:'branding'},
  {t:'Consultas', h:'#/consultas', k:'consultas'},
  {t:'Auditoria', h:'#/auditoria', k:'auditoria'},
  {t:'Configurações', k:'config', filhos:[
    {t:'Tipos de Parceiro Comercial',     h:'#/tipos-parceiro', k:'tipos-parceiro'},
    {t:'Tipos de Licença',                h:'#/tipos-licenca',  k:'tipos-licenca'},
    {t:'Categorias de Licença',           h:'#/categorias',     k:'categorias'},
    {t:'Ambientes',                       h:'#/ambientes',      k:'ambientes'},
    {t:'Motivos de Alteração de Status',  h:'#/motivos',         k:'motivos'}
  ]}
];
function abrirMenu(k, botao){
  if(S.openMenu===k) return fecharMenu();
  const r = botao.getBoundingClientRect();
  const largura = 260;
  S.openMenu = k;
  S.menuPos = {
    left: Math.round(Math.min(r.left, window.innerWidth - largura - 12)),
    top: Math.round(r.bottom + 6)
  };
  render();
}
function fecharMenu(){ S.openMenu=null; S.menuPos=null; render(); }

function shell(content, active){
  const seta = '<svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
  const itens = MENU.map(m=>{
    if(!m.filhos) return '<button class="navitem'+(m.k===active?' active':'')+'" onclick="go(\''+m.h+'\')">'+esc(m.t)+'</button>';
    const ativo = m.filhos.some(f=>f.k===active);
    const aberto = S.openMenu===m.k;
    /* posição fixa: a barra rola na horizontal e recortaria um menu posicionado nela */
    const pos = aberto && S.menuPos ? ' style="position:fixed;left:'+S.menuPos.left+'px;top:'+S.menuPos.top+'px"' : '';
    return '<div class="dropdown">'+
      '<button class="navitem'+(ativo?' active':'')+'" onclick="event.stopPropagation();abrirMenu(\''+m.k+'\',this)">'+esc(m.t)+seta+'</button>'+
      '<div class="dropdown-menu'+(aberto?' open':'')+'"'+pos+'>'+
        m.filhos.map(f=>'<a onclick="fecharMenu();go(\''+f.h+'\')" class="'+(f.k===active?'on':'')+'">'+esc(f.t)+'</a>').join('')+
      '</div></div>';
  }).join('');

  return '<div class="topbar">'+
    '<div class="brand" onclick="go(\'#/dashboard\')">'+LOGO_WEKNOW+'<span>Gerenciador de <b>Licenças</b></span></div>'+
    '<nav class="nav">'+itens+'</nav>'+
    '<div class="topicons">'+
      '<button title="Executar rotinas automáticas" onclick="executarRotinas()">'+IC.bolt+'</button>'+
      '<button title="Busca global" onclick="globalSearch()">'+IC.search+'</button>'+
      '<button title="Sair" onclick="toast(\'Sessão encerrada\',\'Protótipo — sem back-end.\')">'+IC.logout+'<span>Sair</span></button>'+
    '</div>'+
  '</div>'+
  '<div class="page">'+content+'</div>';
}

/* ---------- rotinas automáticas (seção 8) ---------- */
function executarRotinas(){
  const eventos = rodarRotinas('Rotina automática');
  render();
  openModal('<div class="modal-icon" style="background:var(--primary-50);color:var(--primary)">'+IC.bolt+'</div>'+
    '<h2>Rotinas automáticas executadas</h2>'+
    '<p class="muted" style="margin:0 0 16px;font-size:13px">Expiração de licenças, encerramento de instalações temporárias e restauração de liberações vencidas.</p>'+
    (eventos.length
      ? '<div class="box"><div class="box-title">'+eventos.length+' alteração(ões) aplicada(s)</div>'+
        '<ul class="lista-eventos">'+eventos.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></div>'
      : '<div class="alert alert-info" style="margin-top:0">'+IC.check+'<div>Nada a fazer — nenhuma licença, instalação ou liberação vencida pendente. '+
        'Executar novamente não duplica alterações (idempotência).</div></div>')+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fechar</button>'+
    '<button class="btn btn-primary" onclick="closeModal();go(\'#/auditoria\')">Ver no histórico</button></div>','md');
}

/* ---------- router ---------- */
function parseRoute(){
  const h = S.route || location.hash || '#/dashboard';
  return h.replace(/^#\/?/,'').split('/').filter(Boolean);
}
function render(){
  const parts = parseRoute();
  const key = parts[0] || 'dashboard';
  const view = VIEWS[key] || VIEWS['404'];
  const rota = S.route || location.hash;
  const routeChanged = S.rendered !== rota;
  const scroll = window.scrollY;
  S.rendered = rota;

  preserveFocus(()=>{ $('#app').innerHTML = shell(view(parts), key); });

  if(routeChanged) window.scrollTo(0,0); else window.scrollTo(0, scroll);
}
window.addEventListener('hashchange', ()=>{
  if(location.hash && location.hash!==S.route){ S.route=location.hash; S.openMenu=null; closeModal(); render(); }
});
document.addEventListener('click', ()=>{ if(S.openMenu) fecharMenu(); });
window.addEventListener('resize', ()=>{ if(S.openMenu) fecharMenu(); });

VIEWS['404'] = () => '<div class="empty">'+IC.inbox+'<h3>Tela não encontrada</h3><p>Volte para o Dashboard.</p>'+
  '<button class="btn btn-primary" onclick="go(\'#/dashboard\')">Ir para o Dashboard</button></div>';

function globalSearch(){
  openModal('<h2>Busca global</h2>'+
    field('', '<div class="search">'+IC.search+'<input class="input" placeholder="Buscar licença, chave, cliente, instalação ou parceiro..." autofocus></div>')+
    '<p class="muted mt16" style="font-size:12.5px">Atalhos: <a onclick="closeModal();go(\'#/licencas/1\')">LIC-2026-0148</a> · '+
    '<a onclick="closeModal();go(\'#/clientes/1\')">Hospital de Câncer de Pernambuco</a> · '+
    '<a onclick="closeModal();go(\'#/instalacoes\')">Instalações</a> · '+
    '<a onclick="closeModal();go(\'#/auditoria\')">Auditoria</a></p>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fechar</button></div>');
}
