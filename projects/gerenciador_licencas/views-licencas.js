/* =========================================================
   Licenças: Lista/Pesquisa, Emissão, Visão 360º,
   Renovação, Alteração de Status, Observações
   ========================================================= */

function filtrarLicencas(key){
  const st=listState(key), q=norm(st.q);
  return DB.licencas.filter(l=>{
    const c = clienteDe(l);
    if(q && !(norm(l.identificador).includes(q)||norm(l.chave).includes(q)||norm(c.razaoSocial).includes(q)||norm(c.nomeFantasia).includes(q))) return false;
    if(st.f.cliente   && String(l.clienteId)!==st.f.cliente) return false;
    if(st.f.produto   && !l.produtos.includes(Number(st.f.produto))) return false;
    if(st.f.tipo      && String(l.tipoLicencaId)!==st.f.tipo) return false;
    if(st.f.categoria && String(l.categoriaId)!==st.f.categoria) return false;
    if(st.f.sit       && situacao(l).key!==st.f.sit) return false;
    if(st.f.ambiente  && !instalacoesDe(l).some(i=>String(i.ambienteId)===st.f.ambiente)) return false;
    if(st.f.de  && l.expiracao < st.f.de) return false;
    if(st.f.ate && l.expiracao > st.f.ate) return false;
    return true;
  });
}
function rotulosFiltroLicenca(key){
  const st=listState(key), r=[];
  if(st.q) r.push('Busca: '+st.q);
  if(st.f.cliente)   r.push('Cliente: '+get('clientes',st.f.cliente).nomeFantasia);
  if(st.f.produto)   r.push('Produto: '+get('produtos',st.f.produto).nome);
  if(st.f.tipo)      r.push('Tipo: '+get('tiposLicenca',st.f.tipo).sigla);
  if(st.f.categoria) r.push('Categoria: '+get('categorias',st.f.categoria).descricao);
  if(st.f.ambiente)  r.push('Ambiente: '+get('ambientes',st.f.ambiente).descricao);
  if(st.f.sit)       r.push('Situação: '+(SITUACOES_EFETIVAS.find(x=>x.v===st.f.sit)||{}).t);
  if(st.f.de)        r.push('Expira após '+fmtDate(st.f.de));
  if(st.f.ate)       r.push('Expira antes de '+fmtDate(st.f.ate));
  return r;
}
const COLUNAS_EXPORT_LICENCA = [
  {label:'Identificador', valor:l=>l.identificador},
  {label:'Chave',         valor:l=>l.chave},
  {label:'Cliente',       valor:l=>clienteDe(l).razaoSocial},
  {label:'CNPJ',          valor:l=>clienteDe(l).cnpj},
  {label:'Parceiro',      valor:l=>parceiroDe(clienteDe(l)).nome},
  {label:'Produtos',      valor:l=>produtosDe(l).map(p=>p.sigla).join(' / ')},
  {label:'Tipo',          valor:l=>tipoLicDe(l).sigla},
  {label:'Categoria',     valor:l=>categoriaDe(l).descricao},
  {label:'Situação',      valor:l=>l.situacao},
  {label:'Situação efetiva', valor:l=>situacao(l).label},
  {label:'Emissão',       valor:l=>fmtDate(l.emissao)},
  {label:'Início',        valor:l=>fmtDate(l.inicio)},
  {label:'Expiração',     valor:l=>fmtDate(l.expiracao)},
  {label:'Usuários',      valor:l=>fmtLimite(limiteUsuarios(l))},
  {label:'Instalações',   valor:l=>fmtLimite(limiteInstalacoes(l))},
  {label:'Instalações ativas', valor:l=>instalacoesDe(l).filter(i=>i.ativo).length},
  {label:'Motivo',        valor:l=>l.motivoId?get('motivos',l.motivoId).descricao:''},
  {label:'Observações',   valor:l=>l.obs||''}
];

VIEWS['licencas'] = function(parts){
  if(parts[1]==='nova') return licencaNova();
  if(parts[2]==='editar') return licencaEditar(Number(parts[1]));
  if(parts[1]) return licenca360(Number(parts[1]), parts[2]||'resumo');

  const key='lic', st=listState(key);
  const rows = filtrarLicencas(key);
  const hasF = rotulosFiltroLicenca(key).length>0;

  return pageHead('Licenças','Autorização comercial de uso. Um cliente pode ter várias licenças independentes.',
      '<button class="btn btn-ghost" onclick="exportar(\'licencas\',COLUNAS_EXPORT_LICENCA,filtrarLicencas(\'lic\'),rotulosFiltroLicenca(\'lic\'))">'+IC.download+'Exportar</button>'+
      btnNew('Nova Licença','#/licencas/nova'))+
    '<div class="filters">'+
      searchBox(key,'Identificador, chave ou cliente')+
      filterSelect(key,'cliente','CLIENTE (TODOS)',vivos('clientes').map(c=>({v:c.id,t:c.nomeFantasia})),'w-240')+
      filterSelect(key,'produto','Produto',vivos('produtos').map(p=>({v:p.id,t:p.nome})),'w-200')+
      filterSelect(key,'tipo','Tipo',vivos('tiposLicenca').map(t=>({v:t.id,t:t.sigla})),'w-200')+
      filterSelect(key,'categoria','Categoria',vivos('categorias').map(c=>({v:c.id,t:c.descricao})),'w-180')+
      filterSelect(key,'ambiente','Ambiente',vivos('ambientes').map(a=>({v:a.id,t:a.descricao})),'w-180')+
      filterSelect(key,'sit','Situação',SITUACOES_EFETIVAS,'w-200')+
      filterInput(key,'de','Expira após','date','w-180')+
      filterInput(key,'ate','Expira antes','date','w-180')+
      (hasF?btnClear(key):'')+
    '</div>'+
    dataTable({key, rows, hasFilters:hasF, perPage:10, emptyAction:btnNew('Nova Licença','#/licencas/nova'),
      columns:[
        {label:'Licença', key:'num', width:'185px', cls:'strong', sortVal:r=>r.identificador,
          render:r=>'<span class="linkcell" onclick="go(\'#/licencas/'+r.id+'\')">'+esc(r.identificador)+'</span>'+
            '<span class="cell-sub">'+esc(r.chave)+'</span>'},
        {label:'Cliente', key:'cli', sortVal:r=>clienteDe(r).nomeFantasia,
          render:r=>esc(clienteDe(r).nomeFantasia)+'<span class="cell-sub">'+esc(parceiroDe(clienteDe(r)).nome||'')+'</span>'},
        {label:'Produtos', key:'prod', width:'165px',
          render:r=>{ const ps=produtosDe(r); return ps.slice(0,2).map(p=>badge(p.sigla,'b-ref')).join(' ')+(ps.length>2?' <span class="muted">+'+(ps.length-2)+'</span>':''); }},
        {label:'Tipo / Categoria', key:'tp', width:'175px', sortVal:r=>tipoLicDe(r).sigla,
          render:r=>badge(tipoLicDe(r).sigla,'b-ref')+'<span class="cell-sub">'+esc(categoriaDe(r).descricao||'—')+'</span>'},
        {label:'Usuários', key:'us', width:'110px', cls:'num', sortVal:r=>limiteUsuarios(r).ilimitado?1e9:limiteUsuarios(r).valor,
          render:r=>{ const u=limiteUsuarios(r);
            return (u.ilimitado?badgeIlimitado():esc(String(u.valor)))+(u.liberado?'<span class="cell-sub">liberação ativa</span>':''); }},
        {label:'Instalações', key:'in', width:'115px', cls:'num',
          render:r=>{ const i=limiteInstalacoes(r); return instalacoesDe(r).filter(x=>x.ativo).length+' / '+(i.ilimitado?'∞':i.valor); }},
        {label:'Expira em', key:'exp', width:'155px', cls:'num', sortVal:r=>r.expiracao,
          render:r=>{ const d=diasAte(r.expiracao);
            return fmtDate(r.expiracao)+'<span class="cell-sub">'+(d<0?Math.abs(d)+' dia(s) atrás':'em '+d+' dia(s)')+'</span>'; }},
        {label:'Situação', key:'st', width:'130px', sortVal:r=>r.situacao,
          render:r=>badge(situacao(r).label, situacao(r).cls)},
        {label:'', key:'a', width:'215px', align:true, render:r=>'<div class="rowactions">'+
          actView('#/licencas/'+r.id)+
          actCustom(IC.refresh,'Renovar','openRenovar('+r.id+')')+
          actCustom(IC.swap,'Alterar situação','openAlterarStatus('+r.id+')')+
          actCustom(IC.server,'Ver instalações desta licença','verInstalacoesDaLicenca('+r.id+')')+
          actCustom(IC.sliders,'Liberação temporária','openLiberacao(null,'+r.id+')')+
          actEdit('#/licencas/'+r.id+'/editar')+'</div>'}
      ]});
};

/* abre a tela de Instalações já filtrada pela licença escolhida */
function verInstalacoesDaLicenca(id){
  clearList('inst');
  setListF('inst','licenca', String(id));
  go('#/instalacoes');
}

/* =========================================================
   EMISSÃO — Cliente > Produtos > Tipo > Vigência e usuários > Emissão
   ========================================================= */
const PASSOS = ['Cliente','Produtos','Tipo de Licença','Vigência e usuários','Emissão'];

function licencaNova(){
  const f = useForm('licenca','nova', ()=>({
    step:1, clienteId:S.novaLicClienteId||'', produtos:[], tipoLicencaId:'', categoriaId:1, brandingId:'',
    situacao:'Ativa', emissao:hojeISO(), inicio:hojeISO(), expiracao:'',
    qtdUsuarios:'', usuariosIlimitados:false, qtdInstalacoes:'', instalacoesIlimitadas:false,
    obs:'', busca:'', selDisp:[], selSel:[]
  }));
  const step = f.step;

  const steps = '<div class="steps">'+PASSOS.map((p,i)=>{
    const n=i+1, cls = n===step?'on':(n<step?'done':'');
    return (i?'<div class="step-line"></div>':'')+'<div class="step '+cls+'"><div class="n">'+(n<step?'✓':n)+'</div><div class="t">'+esc(p)+'</div></div>';
  }).join('')+'</div>';

  const body = [passoCliente, passoProdutos, passoTipo, passoVigencia, passoRevisao][step-1](f);
  const podeAvancar = validarPasso(f, step)===true;

  return pageHead('Nova Licença','Identificador e chave são gerados automaticamente na emissão.',
      '<button class="btn btn-ghost" onclick="go(\'#/licencas\')">'+IC.x+'Cancelar</button>',
      [{t:'Licenças',href:'#/licencas'},{t:'Nova Licença'}])+
    steps+'<div class="card"><div class="card-body">'+body+'</div></div>'+
    '<div class="form-footer">'+
      '<button class="btn btn-ghost" onclick="'+(step===1?'go(\'#/licencas\')':'setF(\'form.licenca.step\','+(step-1)+')')+'">'+(step===1?'Cancelar':'Voltar')+'</button>'+
      (step<5
        ? '<button class="btn btn-primary" '+(podeAvancar?'':'disabled')+' onclick="setF(\'form.licenca.step\','+(step+1)+')">Avançar'+IC.chev+'</button>'
        : '<button class="btn btn-primary" onclick="emitirLicenca()">'+IC.key+'Emitir Licença</button>')+
    '</div>';
}
function validarPasso(f, step){
  if(step===1) return f.clienteId?true:'Selecione o cliente.';
  if(step===2) return f.produtos.length?true:'Selecione ao menos um produto.';
  if(step===3) return (f.tipoLicencaId&&f.categoriaId)?true:'Selecione o tipo e a categoria da licença.';
  if(step===4){
    if(!f.inicio||!f.expiracao) return 'Informe a vigência.';
    if(f.expiracao<=f.inicio) return 'A data de expiração deve ser posterior à data de início.';
    if(!f.usuariosIlimitados && !num(f.qtdUsuarios)) return 'Informe a quantidade de usuários ou marque Ilimitado.';
    if(!f.instalacoesIlimitadas && !num(f.qtdInstalacoes)) return 'Informe a quantidade de instalações ou marque Ilimitado.';
    const t=get('tiposLicenca',f.tipoLicencaId);
    const dias=difDias(f.inicio,f.expiracao);
    if(t.duracaoMaxDias && dias>t.duracaoMaxDias) return 'A vigência ('+dias+' dias) excede a duração máxima do tipo '+t.sigla+' ('+t.duracaoMaxDias+' dias).';
    return true;
  }
  return true;
}
function passoCliente(f){
  const q = norm(f.busca||'');
  const lista = vivos('clientes').filter(c=>!q||norm(c.razaoSocial).includes(q)||norm(c.nomeFantasia).includes(q)||norm(c.cnpj).includes(q));
  return '<h3 class="section-title">1. Selecione o cliente</h3>'+
    '<div class="filters"><div class="search">'+IC.search+'<input class="input" data-f="lic-busca-cli" placeholder="Buscar razão social, fantasia ou CNPJ" value="'+esc(f.busca||'')+'" oninput="setF(\'form.licenca.busca\',this.value)"></div>'+
    '<button class="btn btn-ghost" onclick="go(\'#/clientes/novo\')">'+IC.plus+'Cadastrar novo cliente</button></div>'+
    (lista.length? '<div class="tr-list" style="height:320px">'+lista.map(c=>
        '<div class="tr-item" style="'+(String(f.clienteId)===String(c.id)?'background:var(--primary-50)':'')+'" onclick="setF(\'form.licenca.clienteId\','+c.id+')">'+
        '<div class="between"><div><div class="t">'+esc(c.nomeFantasia)+'</div>'+
        '<div class="s">'+esc(c.razaoSocial)+' · '+esc(c.cnpj)+' · '+esc(parceiroDe(c).nome)+'</div></div>'+
        (String(f.clienteId)===String(c.id)?badge('Selecionado','b-green'):(c.ativo?'':badge('Inativo','b-gray')))+'</div></div>').join('')+'</div>'
      : '<div class="empty">'+IC.users+'<h3>Nenhum cliente encontrado</h3><p>Ajuste a busca ou cadastre um novo cliente.</p></div>')+
    (f.clienteId?(function(){ const c=get('clientes',f.clienteId), p=parceiroDe(c);
      return '<div class="alert alert-info mt16">'+IC.info+'<div>Cliente <b>'+esc(c.razaoSocial)+'</b> — parceiro <b>'+esc(p.nome)+'</b>. '+
      'Este cliente já possui <b>'+licencasDe(c).length+'</b> licença(s); a nova será independente das demais.</div></div>'; })():'');
}
function passoProdutos(f){
  const disp = vivos('produtos').filter(p=>!f.produtos.includes(p.id));
  const sel  = vivos('produtos').filter(p=>f.produtos.includes(p.id));
  const item = (p, grupo) => '<div class="tr-item" onclick="toggleInArray(\'form.licenca.'+grupo+'\','+p.id+')">'+
    '<div class="between"><div><div class="t">'+esc(p.nome)+'</div><div class="s">'+esc(p.sigla)+' · versão '+esc(p.versao)+'</div></div>'+
    ((getF('form.licenca.'+grupo)||[]).includes(p.id)?badge('✓','b-green'):(p.ativo?'':badge('Inativo','b-gray')))+'</div></div>';
  return '<h3 class="section-title">2. Selecione o(s) produto(s)</h3>'+
    '<div class="transfer">'+
      '<div><div class="tr-head"><span>Produtos disponíveis</span><span class="muted">'+disp.length+'</span></div>'+
        '<div class="tr-list">'+(disp.length?disp.map(p=>item(p,'selDisp')).join(''):'<div class="empty" style="padding:30px">'+IC.box+'<p>Todos os produtos já foram vinculados.</p></div>')+'</div></div>'+
      '<div class="tr-mid">'+
        '<button title="Adicionar" onclick="moverProdutos(\'add\')">&raquo;</button>'+
        '<button title="Remover" onclick="moverProdutos(\'rem\')">&laquo;</button>'+
      '</div>'+
      '<div><div class="tr-head"><span>Produtos da licença</span><span class="muted">'+sel.length+'</span></div>'+
        '<div class="tr-list">'+(sel.length?sel.map(p=>item(p,'selSel')).join(''):'<div class="empty" style="padding:30px">'+IC.box+'<p>Nenhum produto vinculado ainda.</p></div>')+'</div></div>'+
    '</div>'+
    '<p class="muted mt16" style="font-size:12.5px">Marque os itens e use as setas para transferir entre as listas.</p>';
}
function moverProdutos(dir){
  const f=S.form.licenca;
  if(dir==='add'){ (f.selDisp||[]).forEach(id=>{ if(!f.produtos.includes(id)) f.produtos.push(id); }); f.selDisp=[]; }
  else { f.produtos = f.produtos.filter(id=>!(f.selSel||[]).includes(id)); f.selSel=[]; }
  render();
}
function passoTipo(f){
  const cli = get('clientes', f.clienteId), par = parceiroDe(cli);
  const permitidos = (par.tiposLicenca&&par.tiposLicenca.length)?par.tiposLicenca:vivos('tiposLicenca').map(t=>t.id);
  return '<h3 class="section-title">3. Tipo, categoria e branding</h3>'+
    '<div class="alert alert-info mb20" style="margin-top:0">'+IC.info+'<div>O parceiro <b>'+esc(par.nome)+'</b> está habilitado a emitir apenas os tipos destacados abaixo.</div></div>'+
    '<div class="grid g2 mb20">'+vivos('tiposLicenca').map(t=>{
      const ok = permitidos.includes(t.id) && t.ativo, on = String(f.tipoLicencaId)===String(t.id);
      return '<div class="box" style="cursor:'+(ok?'pointer':'not-allowed')+';opacity:'+(ok?1:.45)+';'+(on?'border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-ring)':'')+'" '+
        (ok?'onclick="setF(\'form.licenca.tipoLicencaId\','+t.id+')"':'')+'>'+
        '<div class="between"><div class="flex">'+badge(t.sigla,'b-ref')+'</div>'+
        (on?badge('Selecionado','b-green'):(ok?'':badge(t.ativo?'Não permitido':'Inativo','b-gray')))+'</div>'+
        '<div style="font-size:13px;color:var(--slate-600);margin-top:8px">'+esc(t.descricao)+'</div>'+
        '<div class="dl mt16" style="gap:10px 20px">'+
          '<div><div class="k">Duração máxima</div><div class="v">'+t.duracaoMaxDias+' dias</div></div>'+
          '<div><div class="k">Acessos concorrentes</div><div class="v">'+t.qtdConcorrentes+'</div></div>'+
          '<div><div class="k">Instalações</div><div class="v">'+t.qtdInstalacoes+'</div></div>'+
          '<div><div class="k">Managers / Contatos</div><div class="v">'+t.qtdManagers+' / '+t.qtdContatos+'</div></div>'+
        '</div>'+
        (t.cancelaParceiro?'<div class="mt16">'+badge('Cancelamento pelo parceiro','b-violet')+'</div>':'')+'</div>';
    }).join('')+'</div>'+
    '<div class="grid g2">'+
      field('Categoria da licença', selectF('form.licenca.categoriaId', f.categoriaId,
        vivos('categorias').filter(c=>c.ativo).map(c=>({v:c.id,t:c.descricao})), null), {req:true,
        hint:'Classifica a licença como Cliente, Parceiro Comercial ou Uso Interno.'})+
      field('Branding', selectF('form.licenca.brandingId', f.brandingId,
        vivos('brandings').filter(b=>b.ativo).map(b=>({v:b.id,t:b.descricao})),'Herdar do cliente'),
        {hint:'Se vazio, usa o branding do cliente. As instalações herdam da licença.'})+
    '</div>';
}
function passoVigencia(f){
  const t = get('tiposLicenca', f.tipoLicencaId);
  const erro = validarPasso(f,4);
  const quick = n => '<button class="btn btn-ghost btn-sm" onclick="setVigencia('+n+')">+'+n+' dias</button>';
  return '<h3 class="section-title">4. Vigência e limites</h3>'+
    '<div class="grid g3">'+
      field('Data de emissão', inputRO(fmtDate(f.emissao)), {hint:'Preenchida automaticamente pelo sistema.'})+
      field('Data de início', inputF('form.licenca.inicio', f.inicio,'','date'), {req:true})+
      field('Data de expiração', inputF('form.licenca.expiracao', f.expiracao,'','date'), {req:true,
        hint:'Duração máxima do tipo '+t.sigla+': '+t.duracaoMaxDias+' dias.'})+
    '</div>'+
    '<div class="flex mt16" style="flex-wrap:wrap">'+quick(30)+quick(90)+quick(180)+quick(365)+
      '<button class="btn btn-ghost btn-sm" onclick="setVigencia('+t.duracaoMaxDias+')">Máximo do tipo ('+t.duracaoMaxDias+' dias)</button></div>'+
    '<h3 class="section-title mt24">Limites</h3>'+
    '<div class="grid g2">'+
      limiteF('form.licenca.qtdUsuarios', f.qtdUsuarios, 'form.licenca.usuariosIlimitados', f.usuariosIlimitados,
        'Quantidade de usuários', 'Acessos concorrentes do tipo: '+t.qtdConcorrentes+'. Marque Ilimitado em vez de usar um número alto.')+
      limiteF('form.licenca.qtdInstalacoes', f.qtdInstalacoes, 'form.licenca.instalacoesIlimitadas', f.instalacoesIlimitadas,
        'Quantidade de instalações', 'Instalações previstas no tipo: '+t.qtdInstalacoes+'.')+
    '</div>'+
    '<div class="grid g2 mt24">'+
      field('Situação inicial', selectF('form.licenca.situacao', f.situacao, SITUACOES_LICENCA.map(s=>({v:s,t:s})), null))+
      field('Observações', textareaF('form.licenca.obs', f.obs,'Informações adicionais sobre a licença',3))+
    '</div>'+
    (erro!==true?'<div class="alert alert-warn mt20">'+IC.alert+'<div>'+esc(erro)+'</div></div>':
      '<div class="alert alert-info mt20">'+IC.info+'<div>Vigência de <b>'+difDias(f.inicio,f.expiracao)+' dias</b> — dentro do limite do tipo '+esc(t.sigla)+'.</div></div>');
}
function setVigencia(dias){
  const f=S.form.licenca;
  setF('form.licenca.expiracao', addDias(f.inicio||hojeISO(), Number(dias)));
}
function passoRevisao(f){
  const c=get('clientes',f.clienteId), t=get('tiposLicenca',f.tipoLicencaId);
  const br = f.brandingId?get('brandings',f.brandingId):brandingDe(c);
  const linha=(k,v)=>'<div><div class="k">'+esc(k)+'</div><div class="v">'+v+'</div></div>';
  return '<h3 class="section-title">5. Conferência dos dados</h3>'+
    '<div class="dl">'+
      linha('Identificador', '<span class="muted">gerado na emissão</span>')+
      linha('Chave', '<span class="muted">gerada na emissão</span>')+
      linha('Cliente', esc(c.razaoSocial)+'<span class="cell-sub">'+esc(c.cnpj)+' · '+esc(parceiroDe(c).nome)+'</span>')+
      linha('Produtos', produtosDe({produtos:f.produtos}).map(p=>badge(p.sigla,'b-ref')).join(' '))+
      linha('Tipo de Licença', badge(t.sigla,'b-ref')+' '+esc(t.descricao))+
      linha('Categoria', esc(get('categorias',f.categoriaId).descricao||'—'))+
      linha('Branding', esc(br.descricao||'—'))+
      linha('Situação inicial', badge(f.situacao, situacaoBadgeCls(f.situacao)))+
      linha('Vigência', fmtDate(f.inicio)+' até '+fmtDate(f.expiracao)+' <span class="muted">('+difDias(f.inicio,f.expiracao)+' dias)</span>')+
      linha('Quantidade de usuários', f.usuariosIlimitados?badgeIlimitado():esc(String(f.qtdUsuarios)))+
      linha('Quantidade de instalações', f.instalacoesIlimitadas?badgeIlimitado():esc(String(f.qtdInstalacoes)))+
      linha('Data de emissão', fmtDate(f.emissao))+
      linha('Observações', esc(f.obs||'—'))+
    '</div>'+
    '<div class="alert alert-info mt24">'+IC.info+'<div>Ao emitir, o sistema gera <b>identificador</b> e <b>chave</b>, registra o evento no histórico e abre a <b>Visão 360º</b>.</div></div>';
}
function emitirLicenca(){
  const f=S.form.licenca;
  for(let s=1;s<=4;s++){ const v=validarPasso(f,s); if(v!==true){ setF('form.licenca.step',s); return toast('Não foi possível emitir', v, true); } }
  const id = nextId('licencas');
  const ultimo = Math.max(0, ...DB.licencas.map(x=>Number(String(x.identificador).split('-').pop())||0));
  const identificador = 'LIC-2026-'+String(ultimo+1).padStart(4,'0');
  const cli = get('clientes', f.clienteId);
  DB.licencas.unshift({
    id, identificador, chave:chaveLic(id*7+13), clienteId:num(f.clienteId), produtos:f.produtos.slice(),
    tipoLicencaId:num(f.tipoLicencaId), categoriaId:num(f.categoriaId), brandingId:num(f.brandingId)||cli.brandingId||null,
    qtdUsuarios:num(f.qtdUsuarios), usuariosIlimitados:!!f.usuariosIlimitados,
    qtdInstalacoes:num(f.qtdInstalacoes), instalacoesIlimitadas:!!f.instalacoesIlimitadas,
    emissao:f.emissao, inicio:f.inicio, expiracao:f.expiracao, situacao:f.situacao, motivoId:null,
    obs:f.obs, renovacoes:[]
  });
  log({entidade:'Licença', entidadeId:id, rotulo:identificador, tipo:'Emissão', rotuloEvento:'Licença emitida',
       para:identificador, obs:'Cliente: '+cli.razaoSocial});
  S.form.licenca=null; S.novaLicClienteId=null;
  go('#/licencas/'+id);
  toast('Licença emitida', identificador+' criada com sucesso.');
}

/* =========================================================
   EDIÇÃO
   ========================================================= */
function licencaEditar(id){
  const l = get('licencas', id);
  if(!l.id) return VIEWS['404']();
  const f = useForm('licEdit','e'+id, ()=>({
    produtos:l.produtos.slice(), tipoLicencaId:l.tipoLicencaId, categoriaId:l.categoriaId, brandingId:l.brandingId||'',
    qtdUsuarios:l.qtdUsuarios, usuariosIlimitados:l.usuariosIlimitados,
    qtdInstalacoes:l.qtdInstalacoes, instalacoesIlimitadas:l.instalacoesIlimitadas,
    inicio:l.inicio, expiracao:l.expiracao, obs:l.obs
  }));
  const bloqueada = ['Expirada','Inativa'].includes(l.situacao);
  return pageHead('Editar licença', l.identificador+' · '+clienteDe(l).razaoSocial,
      '<button class="btn btn-ghost" onclick="go(\'#/licencas/'+id+'\')">'+IC.x+'Cancelar</button>'+
      '<button class="btn btn-primary" '+(bloqueada?'disabled':'')+' onclick="salvarEdicaoLicenca('+id+')">'+IC.save+'Salvar</button>',
      [{t:'Licenças',href:'#/licencas'},{t:l.identificador,href:'#/licencas/'+id},{t:'Editar'}])+
    (bloqueada?'<div class="alert alert-danger mb20" style="margin-top:0">'+IC.ban+'<div>Licenças <b>expiradas ou inativas</b> não podem ser editadas. Use <b>Renovar</b> ou <b>Alterar Situação</b>.</div></div>':'')+
    '<div class="card"><div class="card-body" style="'+(bloqueada?'opacity:.55;pointer-events:none':'')+'">'+
      '<h3 class="section-title">Identificação</h3>'+
      '<div class="grid g3">'+
        field('Identificador', inputRO(l.identificador), {hint:'Gerado pelo sistema — não editável.'})+
        field('Chave', inputRO(l.chave), {hint:'Gerada pelo sistema — não editável.'})+
        field('Cliente', inputRO(clienteDe(l).razaoSocial), {hint:'O cliente não pode ser alterado após a emissão.'})+
      '</div>'+
      '<h3 class="section-title mt24">Configuração comercial</h3>'+
      '<div class="grid g3">'+
        field('Tipo de Licença', selectF('form.licEdit.tipoLicencaId', f.tipoLicencaId, vivos('tiposLicenca').map(t=>({v:t.id,t:t.sigla})), null))+
        field('Categoria', selectF('form.licEdit.categoriaId', f.categoriaId, vivos('categorias').map(c=>({v:c.id,t:c.descricao})), null))+
        field('Branding', selectF('form.licEdit.brandingId', f.brandingId, vivos('brandings').map(b=>({v:b.id,t:b.descricao})),'Herdar do cliente'))+
        field('Data de início', inputF('form.licEdit.inicio', f.inicio,'','date'))+
        field('Data de expiração', inputF('form.licEdit.expiracao', f.expiracao,'','date'), {hint:'Para prorrogar prefira o fluxo de Renovação.'})+
      '</div>'+
      '<h3 class="section-title mt24">Limites</h3>'+
      '<div class="grid g2">'+
        limiteF('form.licEdit.qtdUsuarios', f.qtdUsuarios, 'form.licEdit.usuariosIlimitados', f.usuariosIlimitados, 'Quantidade de usuários')+
        limiteF('form.licEdit.qtdInstalacoes', f.qtdInstalacoes, 'form.licEdit.instalacoesIlimitadas', f.instalacoesIlimitadas, 'Quantidade de instalações')+
      '</div>'+
      '<h3 class="section-title mt24">Produtos vinculados</h3>'+
      '<div class="grid g3">'+vivos('produtos').map(p=>checkF('toggleInArray(\'form.licEdit.produtos\','+p.id+')', f.produtos.includes(p.id), p.nome, p.sigla+' · '+p.versao)).join('')+'</div>'+
      '<div class="mt24">'+field('Observações', textareaF('form.licEdit.obs', f.obs,'',3))+'</div>'+
      '<div class="form-footer"><button class="btn btn-ghost" onclick="go(\'#/licencas/'+id+'\')">Cancelar</button>'+
      '<button class="btn btn-primary" onclick="salvarEdicaoLicenca('+id+')">'+IC.save+'Salvar alterações</button></div>'+
    '</div></div>';
}
function salvarEdicaoLicenca(id){
  const l=get('licencas',id), f=S.form.licEdit;
  if(!f.produtos.length) return toast('Não foi possível salvar','Selecione ao menos um produto.',true);
  if(f.expiracao<=f.inicio) return toast('Não foi possível salvar','A data de expiração deve ser posterior à de início.',true);
  const antes = fmtLimite(limiteUsuarios(l))+' usuário(s), '+produtosDe(l).length+' produto(s)';
  Object.assign(l,{produtos:f.produtos.slice(), tipoLicencaId:num(f.tipoLicencaId), categoriaId:num(f.categoriaId),
    brandingId:num(f.brandingId)||null, qtdUsuarios:num(f.qtdUsuarios), usuariosIlimitados:!!f.usuariosIlimitados,
    qtdInstalacoes:num(f.qtdInstalacoes), instalacoesIlimitadas:!!f.instalacoesIlimitadas,
    inicio:f.inicio, expiracao:f.expiracao, obs:f.obs});
  const depois = fmtLimite(limiteUsuarios(l))+' usuário(s), '+f.produtos.length+' produto(s)';
  log({entidade:'Licença', entidadeId:id, rotulo:l.identificador, tipo:'Alteração', rotuloEvento:'Dados da licença alterados', de:antes, para:depois});
  S.form.licEdit=null; go('#/licencas/'+id); toast('Licença atualizada', l.identificador+' foi alterada.');
}

/* =========================================================
   VISÃO 360º (seção 7)
   ========================================================= */
function licenca360(id, tab){
  const l = get('licencas', id);
  if(!l.id) return VIEWS['404']();
  const c = clienteDe(l), p = parceiroDe(c), t = tipoLicDe(l), s = situacao(l);
  const dias = diasAte(l.expiracao);
  const inst = instalacoesDe(l), libs = liberacoesDe(l);
  const libsAtivas = libs.filter(x=>['Ativa','Agendada'].includes(x.status));
  const hist = auditoriaDe('Licença', id);
  const u = limiteUsuarios(l), i = limiteInstalacoes(l);

  const abas = [['resumo','Resumo'],['cliente','Cliente'],['produtos','Produtos'],['instalacoes','Instalações'],
                ['branding','Branding'],['liberacoes','Liberações'],['renovacoes','Renovações'],['historico','Histórico'],['observacoes','Observações']];
  const cont = {instalacoes:inst.length, liberacoes:libsAtivas.length, renovacoes:l.renovacoes.length, historico:hist.length};
  const tabsHtml = '<div class="tabs">'+abas.map(a=>'<button class="'+(tab===a[0]?'on':'')+'" onclick="go(\'#/licencas/'+id+'/'+a[0]+'\')">'+esc(a[1])+
    (cont[a[0]]?' <span class="badge b-gray" style="margin-left:6px">'+cont[a[0]]+'</span>':'')+'</button>').join('')+'</div>';

  const motivo = l.motivoId?get('motivos',l.motivoId):null;
  const aviso = s.key==='expirada'
    ? '<div class="alert alert-danger">'+IC.alert+'<div><b>Licença expirada</b> há '+Math.abs(dias)+' dia(s)'+(motivo?' — motivo: <b>'+esc(motivo.descricao)+'</b>':'')+'. Use <b>Renovar</b> para restabelecer a vigência.</div></div>'
    : s.key==='tolerancia'
    ? '<div class="alert alert-warn">'+IC.clock+'<div><b>Vencida há '+Math.abs(dias)+' dia(s)</b>, dentro da tolerância de '+TOLERANCIA_DIAS+' dias. A rotina automática expira a licença ao fim da tolerância.</div></div>'
    : s.key==='bloqueada'
    ? '<div class="alert alert-danger">'+IC.ban+'<div><b>Licença bloqueada</b>'+(motivo?' — motivo: <b>'+esc(motivo.descricao)+'</b>':'')+'. O bloqueio é independente da data de vencimento ('+fmtDate(l.expiracao)+').</div></div>'
    : s.key==='aexpirar'
    ? '<div class="alert alert-warn">'+IC.clock+'<div><b>Licença próxima da expiração</b> — restam '+dias+' dia(s).</div></div>'
    : s.key==='inativa'
    ? '<div class="alert alert-warn">'+IC.ban+'<div><b>Licença inativa</b>'+(motivo?' — motivo: <b>'+esc(motivo.descricao)+'</b>':'')+'. Somente consulta.</div></div>' : '';

  const hero = '<div class="hero">'+
    '<div class="hero-top">'+
      '<div><div class="lic">Licença · '+esc(l.chave)+'</div>'+
        '<div class="num">'+esc(l.identificador)+badge(s.label, s.cls)+badge(t.sigla,'b-ref')+badge(categoriaDe(l).descricao||'—','b-violet')+'</div>'+
        '<div class="cli"><span class="linkcell" onclick="go(\'#/clientes/'+c.id+'\')">'+esc(c.razaoSocial)+'</span> · '+esc(c.cnpj)+
        ' · parceiro <span class="linkcell" onclick="go(\'#/parceiros/'+p.id+'\')">'+esc(p.nome)+'</span></div></div>'+
      '<div class="hero-actions">'+
        '<button class="btn btn-primary" onclick="openRenovar('+id+')">'+IC.refresh+'Renovar</button>'+
        '<button class="btn btn-ghost" onclick="openAlterarStatus('+id+')">'+IC.swap+'Alterar Situação</button>'+
        '<button class="btn btn-ghost" onclick="openInstalacao(null,'+id+')">'+IC.server+'Nova Instalação</button>'+
        '<button class="btn btn-ghost" onclick="openLiberacao(null,'+id+')">'+IC.sliders+'Liberação Temporária</button>'+
        '<button class="btn btn-ghost" '+(['Inativa'].includes(l.situacao)?'disabled':'')+' onclick="go(\'#/licencas/'+id+'/editar\')">'+IC.edit+'Editar</button>'+
      '</div>'+
    '</div>'+
    '<div class="hero-meta">'+
      '<div class="meta"><div class="k">Vigência</div><div class="v">'+fmtDate(l.inicio)+' – '+fmtDate(l.expiracao)+'</div></div>'+
      '<div class="meta"><div class="k">'+(dias<0?'Vencida há':'Expira em')+'</div><div class="v">'+Math.abs(dias)+' dia(s)</div></div>'+
      '<div class="meta"><div class="k">Usuários</div><div class="v">'+(u.ilimitado?'Ilimitado':u.valor)+(u.liberado?' <span class="badge b-amber">liberação</span>':'')+'</div></div>'+
      '<div class="meta"><div class="k">Instalações</div><div class="v">'+inst.filter(x=>x.ativo).length+' / '+(i.ilimitado?'∞':i.valor)+'</div></div>'+
      '<div class="meta"><div class="k">Produtos</div><div class="v">'+produtosDe(l).length+' vinculado(s)</div></div>'+
    '</div>'+ aviso + '</div>';

  const conteudo = {
    resumo:      ()=>tab360Resumo(l,c,t,hist),
    cliente:     ()=>tab360Cliente(l,c,p),
    produtos:    ()=>tab360Produtos(l),
    instalacoes: ()=>tab360Instalacoes(l,inst),
    branding:    ()=>tab360Branding(l,c,inst),
    liberacoes:  ()=>tab360Liberacoes(l,libs),
    renovacoes:  ()=>tab360Renovacoes(l),
    historico:   ()=>tab360Historico(l,hist),
    observacoes: ()=>tab360Observacoes(l)
  }[tab] || (()=>tab360Resumo(l,c,t,hist));

  return pageHead('Visão 360º da Licença','Consulte e opere a licença sem perder o contexto.', '',
      [{t:'Licenças',href:'#/licencas'},{t:l.identificador}])+
    hero + tabsHtml + conteudo();
}
function tab360Resumo(l,c,t,hist){
  const dl=(k,v)=>'<div><div class="k">'+esc(k)+'</div><div class="v">'+v+'</div></div>';
  const u=limiteUsuarios(l), i=limiteInstalacoes(l), motivo=l.motivoId?get('motivos',l.motivoId):null;
  const inst=instalacoesDe(l);
  return '<div class="two-col">'+
    '<div class="card"><div class="card-head"><h2>Resumo da licença</h2>'+badge(l.situacao, situacaoBadgeCls(l.situacao))+'</div><div class="card-body">'+
      '<div class="dl">'+
        dl('Identificador', esc(l.identificador))+
        dl('Chave', '<span style="font-family:Consolas,monospace">'+esc(l.chave)+'</span>')+
        dl('Categoria', badge(categoriaDe(l).descricao||'—','b-violet'))+
        dl('Tipo de licença', badge(t.sigla,'b-ref')+'<span class="cell-sub">'+esc(t.descricao)+'</span>')+
        dl('Data de emissão', fmtDate(l.emissao))+
        dl('Vigência', fmtDate(l.inicio)+' – '+fmtDate(l.expiracao))+
        dl('Usuários', u.ilimitado?badgeIlimitado():esc(String(u.valor))+(u.liberado?' <span class="badge b-amber">liberação ativa</span>':''))+
        dl('Instalações', (i.ilimitado?badgeIlimitado():esc(String(i.valor)))+' <span class="muted">('+inst.filter(x=>x.ativo).length+' ativa(s))</span>')+
        dl('Produtos', produtosDe(l).map(x=>badge(x.sigla,'b-ref')).join(' '))+
        dl('Renovações', l.renovacoes.length)+
      '</div>'+
      '<h3 class="section-title mt24">Situação, vencimento e motivo</h3>'+
      '<div class="dl">'+
        dl('Situação registrada', badge(l.situacao, situacaoBadgeCls(l.situacao)))+
        dl('Situação efetiva', badge(situacao(l).label, situacao(l).cls))+
        dl('Data de vencimento', fmtDate(l.expiracao))+
        dl('Motivo', motivo?esc(motivo.descricao):'<span class="muted">Nenhum motivo registrado</span>')+
      '</div>'+
    '</div></div>'+
    '<div>'+
      '<div class="card mb16"><div class="card-head"><h2>Operações</h2></div><div class="card-body">'+
        '<button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="openRenovar('+l.id+')">'+IC.refresh+'Renovar Licença</button>'+
        '<button class="btn btn-ghost" style="width:100%;margin-bottom:8px" onclick="openAlterarStatus('+l.id+')">'+IC.swap+'Alterar Situação</button>'+
        '<button class="btn btn-ghost" style="width:100%;margin-bottom:8px" onclick="openInstalacao(null,'+l.id+')">'+IC.server+'Nova Instalação</button>'+
        '<button class="btn btn-ghost" style="width:100%;margin-bottom:8px" onclick="openLiberacao(null,'+l.id+')">'+IC.sliders+'Liberação Temporária</button>'+
        '<button class="btn btn-ghost" style="width:100%" onclick="go(\'#/licencas/'+l.id+'/historico\')">'+IC.history+'Consultar Histórico</button>'+
      '</div></div>'+
      '<div class="card"><div class="card-head"><h2>Últimos eventos</h2></div><div class="card-body">'+
        (hist.length?'<div class="timeline">'+hist.slice(0,3).map(h=>itemTimeline(h)).join('')+'</div>':'<p class="muted">Sem eventos.</p>')+
        '<button class="btn btn-ghost btn-sm" onclick="go(\'#/licencas/'+l.id+'/historico\')">Ver histórico completo</button>'+
      '</div></div>'+
    '</div></div>';
}
function tab360Cliente(l,c,p){
  const dl=(k,v)=>'<div><div class="k">'+esc(k)+'</div><div class="v">'+v+'</div></div>';
  const outras = licencasDe(c).filter(x=>x.id!==l.id);
  return '<div class="two-col">'+
    '<div class="card"><div class="card-head"><h2>Dados do cliente</h2>'+
      '<button class="btn btn-ghost btn-sm" onclick="go(\'#/clientes/'+c.id+'\')">'+IC.link+'Abrir cliente</button></div><div class="card-body">'+
      '<div class="dl">'+dl('Razão Social',esc(c.razaoSocial))+dl('Nome Fantasia',esc(c.nomeFantasia))+dl('CNPJ',esc(c.cnpj))+
      dl('Situação',badgeSituacao(c.ativo))+dl('Contato principal',esc(c.contatoPrincipal.nome))+
      dl('E-mail',esc(c.contatoPrincipal.email))+dl('Telefone',esc(c.contatoPrincipal.telefone||'—'))+
      dl('Branding',esc(brandingDe(c).descricao||'—'))+'</div>'+
      '<h3 class="section-title mt24">Outras licenças deste cliente</h3>'+
      (outras.length?'<div class="table-wrap"><table class="mini-table"><tbody>'+
        outras.map(x=>'<tr><td class="strong">'+esc(x.identificador)+'</td>'+
          '<td>'+badge(tipoLicDe(x).sigla,'b-ref')+'</td><td class="num">'+fmtDate(x.expiracao)+'</td>'+
          '<td>'+badge(situacao(x).label,situacao(x).cls)+'</td>'+
          '<td class="right"><button class="btn btn-ghost btn-sm" onclick="go(\'#/licencas/'+x.id+'\')">Abrir</button></td></tr>').join('')+
        '</tbody></table></div>':'<p class="muted">Nenhuma outra licença para este cliente.</p>')+
    '</div></div>'+
    '<div class="card"><div class="card-head"><h2>Parceiro comercial</h2></div><div class="card-body">'+
      '<div style="font-weight:700;color:var(--slate-900)">'+esc(p.nome)+'</div>'+
      '<div class="muted" style="font-size:12.5px">'+esc(p.cnpj)+' · '+esc(p.cidade+'/'+p.uf)+'</div>'+
      '<div class="mt16">'+badge(get('tiposParceiro',p.tipoParceiroId).descricao||'—','b-ref')+'</div>'+
      (p.contatos&&p.contatos[0]?'<div class="box mt16"><div class="box-title">Contato</div><b style="color:var(--slate-900)">'+esc(p.contatos[0].nome)+'</b>'+
        '<div class="muted" style="font-size:12.5px">'+esc(p.contatos[0].cargo)+'</div><div class="mt8" style="font-size:13px">'+esc(p.contatos[0].email)+'<br>'+esc(p.contatos[0].telefone)+'</div></div>':'')+
      '<button class="btn btn-ghost btn-sm mt16" onclick="go(\'#/parceiros/'+p.id+'\')">'+IC.link+'Abrir parceiro</button>'+
    '</div></div></div>';
}
function tab360Produtos(l){
  const ps=produtosDe(l);
  return '<div class="card"><div class="card-head"><h2>Produtos vinculados</h2>'+
    '<button class="btn btn-ghost btn-sm" onclick="go(\'#/licencas/'+l.id+'/editar\')">'+IC.edit+'Gerenciar produtos</button></div>'+
    (ps.length?'<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Sigla</th><th>Versão</th><th>Situação</th></tr></thead><tbody>'+
      ps.map(p=>'<tr><td class="strong">'+esc(p.nome)+'</td><td>'+badge(p.sigla,'b-ref')+'</td><td class="num">'+esc(p.versao)+'</td>'+
        '<td>'+badgeSituacao(p.ativo)+'</td></tr>').join('')+
      '</tbody></table></div>'
    :'<div class="empty">'+IC.box+'<h3>Nenhum produto vinculado</h3><p>Edite a licença para vincular produtos.</p></div>')+'</div>';
}
function tab360Instalacoes(l, inst){
  const lim = limiteInstalacoes(l), ativas = inst.filter(i=>i.ativo).length;
  const excedido = !lim.ilimitado && ativas > lim.valor;
  return '<div class="card"><div class="card-head"><h2>Instalações e ambientes</h2>'+
    '<div class="flex"><span class="muted" style="font-size:12.5px">'+ativas+' ativa(s) de '+(lim.ilimitado?'ilimitadas':lim.valor)+'</span>'+
    '<button class="btn btn-primary btn-sm" onclick="openInstalacao(null,'+l.id+')">'+IC.plus+'Nova Instalação</button></div></div>'+
    (excedido?'<div style="padding:0 20px"><div class="alert alert-warn">'+IC.alert+'<div>O número de instalações ativas excede o limite da licença. Registre uma <b>liberação temporária</b> de instalações.</div></div></div>':'')+
    (inst.length?'<div class="table-wrap"><table><thead><tr><th>Instalação</th><th>Ambiente</th><th>Finalidade</th><th>Período</th><th>Tipo</th><th>Situação</th><th></th></tr></thead><tbody>'+
      inst.map(i=>'<tr><td class="strong"><span class="linkcell" onclick="go(\'#/instalacoes/'+i.id+'\')">'+esc(i.descricao)+'</span>'+
        '<span class="cell-sub">'+esc(i.identificador)+'</span></td>'+
        '<td>'+badge(get('ambientes',i.ambienteId).sigla,'b-ref')+'<span class="cell-sub">'+esc(get('ambientes',i.ambienteId).descricao)+'</span></td>'+
        '<td>'+esc(i.finalidade)+'</td>'+
        '<td class="num">'+fmtDate(i.inicio)+(i.termino?' – '+fmtDate(i.termino):'')+'</td>'+
        '<td>'+(i.temporaria?badge('Temporária','b-amber'):badge('Permanente','b-gray'))+'</td>'+
        '<td>'+badgeSituacao(i.ativo, true)+'</td>'+
        '<td class="right"><div class="rowactions">'+actView('#/instalacoes/'+i.id)+actEdit('openInstalacao('+i.id+')')+
          actSituacao('alternarInstalacao('+i.id+')', i.ativo)+'</div></td></tr>').join('')+
      '</tbody></table></div>'
    :'<div class="empty">'+IC.server+'<h3>Nenhuma instalação registrada</h3>'+
      '<p>Instalações representam o uso técnico da licença. Ambientes diferentes não geram novas licenças.</p>'+
      '<button class="btn btn-primary" onclick="openInstalacao(null,'+l.id+')">'+IC.plus+'Nova Instalação</button></div>')+'</div>';
}
function tab360Branding(l,c,inst){
  const br = l.brandingId?get('brandings',l.brandingId):brandingDe(c);
  const herdadas = inst.filter(i=>i.brandingId===br.id).length;
  const distintas = inst.filter(i=>i.brandingId!==br.id);
  return '<div class="two-col">'+
    '<div class="card"><div class="card-head"><h2>Branding aplicado</h2>'+
      '<button class="btn btn-ghost btn-sm" onclick="go(\'#/branding/'+(br.id||'')+'\')">'+IC.palette+'Abrir branding</button></div><div class="card-body">'+
      '<div class="preview mb20"><div class="ph" style="background:'+(br.cor||'#94a3b8')+';height:170px">'+esc(br.descricao||'Sem branding')+'</div>'+
      '<div class="bar"><span>Imagem de fundo do login</span><span>'+esc(br.loginBg||'não enviada')+'</span></div>'+
      '<div class="bar"><span>Logo das janelas internas</span><span>'+esc(br.logo||'não enviada')+'</span></div></div>'+
      '<div class="dl">'+
        '<div><div class="k">Origem</div><div class="v">'+(l.brandingId?'Definido na licença':'Herdado do cliente')+'</div></div>'+
        '<div><div class="k">Instalações que herdam</div><div class="v">'+herdadas+' de '+inst.length+'</div></div>'+
      '</div>'+
    '</div></div>'+
    '<div class="card"><div class="card-head"><h2>Instalações com branding próprio</h2></div>'+
      (distintas.length?'<div class="table-wrap"><table class="mini-table"><tbody>'+
        distintas.map(i=>'<tr><td class="strong">'+esc(i.descricao)+'</td>'+
          '<td><span class="flex"><span style="width:14px;height:14px;border-radius:4px;background:'+(get('brandings',i.brandingId).cor||'#cbd5e1')+'"></span>'+
          esc(get('brandings',i.brandingId).descricao||'—')+'</span></td>'+
          '<td class="right"><button class="btn btn-ghost btn-sm" onclick="go(\'#/instalacoes/'+i.id+'\')">Abrir</button></td></tr>').join('')+
        '</tbody></table></div>'
      :'<div class="empty">'+IC.palette+'<h3>Todas herdam da licença</h3><p>Nenhuma instalação sobrescreve o branding.</p></div>')+
    '</div></div>';
}
function tab360Liberacoes(l, libs){
  return '<div class="card"><div class="card-head"><h2>Liberações temporárias</h2>'+
    '<button class="btn btn-primary btn-sm" onclick="openLiberacao(null,'+l.id+')">'+IC.plus+'Nova Liberação</button></div>'+
    (libs.length?'<div class="table-wrap"><table><thead><tr><th>Recurso</th><th>Original</th><th>Liberado</th><th>Período</th><th>Motivo</th><th>Solicitante</th><th>Status</th><th></th></tr></thead><tbody>'+
      libs.map(x=>'<tr><td class="strong">'+(x.recurso==='usuarios'?'Usuários':'Instalações')+'</td>'+
        '<td class="num">'+x.valorOriginal+'</td>'+
        '<td class="num">'+(x.ilimitado?badgeIlimitado():x.valorNovo)+'</td>'+
        '<td class="num">'+fmtDate(x.inicio)+' – '+fmtDate(x.termino)+'</td>'+
        '<td>'+esc(x.motivo)+'</td><td>'+esc(x.usuario)+'</td>'+
        '<td>'+badge(x.status, statusLiberacaoCls(x.status))+'</td>'+
        '<td class="right"><div class="rowactions">'+acoesLiberacao(x)+'</div></td></tr>').join('')+
      '</tbody></table></div>'
    :'<div class="empty">'+IC.sliders+'<h3>Nenhuma liberação registrada</h3>'+
      '<p>Liberações alteram temporariamente os limites e são restauradas automaticamente ao expirar.</p>'+
      '<button class="btn btn-primary" onclick="openLiberacao(null,'+l.id+')">'+IC.plus+'Nova Liberação</button></div>')+'</div>';
}
function tab360Renovacoes(l){
  return '<div class="card"><div class="card-head"><h2>Renovações</h2>'+
    '<button class="btn btn-primary btn-sm" onclick="openRenovar('+l.id+')">'+IC.refresh+'Nova renovação</button></div>'+
    (l.renovacoes.length?'<div class="table-wrap"><table><thead><tr><th>Data</th><th>Vigência anterior</th><th>Nova vigência</th><th>Responsável</th><th>Observações</th></tr></thead><tbody>'+
      l.renovacoes.map(r=>'<tr><td class="num strong">'+fmtDate(r.data)+'</td>'+
        '<td class="num muted">'+fmtDate(r.deInicio)+' – '+fmtDate(r.deFim)+'</td>'+
        '<td class="num">'+fmtDate(r.paraInicio)+' – '+fmtDate(r.paraFim)+'</td>'+
        '<td>'+esc(r.usuario)+'</td><td>'+esc(r.obs||'—')+'</td></tr>').join('')+
      '</tbody></table></div>'
    :'<div class="empty">'+IC.refresh+'<h3>Nenhuma renovação registrada</h3><p>As renovações aparecerão aqui com a vigência anterior e a nova.</p>'+
      '<button class="btn btn-primary" onclick="openRenovar('+l.id+')">'+IC.refresh+'Renovar Licença</button></div>')+'</div>';
}
function tab360Historico(l, hist){
  const relacionado = DB.auditoria.filter(a=>
    (a.entidade==='Instalação' && instalacoesDe(l).some(i=>i.id===a.entidadeId)) ||
    (a.entidade==='Liberação temporária' && liberacoesDe(l).some(x=>x.id===a.entidadeId)));
  const todos = hist.concat(relacionado);
  return '<div class="card"><div class="card-head"><h2>Histórico de alterações</h2>'+
    '<div class="flex"><span class="muted" style="font-size:12.5px">'+todos.length+' evento(s), incluindo instalações e liberações</span>'+
    '<button class="btn btn-ghost btn-sm" onclick="setListF(\'aud\',\'busca\',\''+l.identificador+'\');go(\'#/auditoria\')">Abrir na Auditoria</button></div></div>'+
    '<div class="card-body"><div class="timeline">'+todos.map(h=>itemTimeline(h)).join('')+'</div></div></div>';
}
function tab360Observacoes(l){
  const coments = DB.auditoria.filter(a=>a.entidade==='Licença'&&a.entidadeId===l.id&&a.tipo==='Observação');
  return '<div class="two-col">'+
    '<div class="card"><div class="card-head"><h2>Observações</h2>'+
      '<span class="muted" style="font-size:12.5px">Armazenadas como histórico — sem alteração silenciosa</span></div><div class="card-body">'+
      '<div class="box mb20"><div class="box-title">Observação do cadastro</div>'+
        '<p style="margin:0;color:var(--slate-600)">'+esc(l.obs||'Nenhuma observação registrada no cadastro.')+'</p></div>'+
      field('Nova observação', textareaF('form.obsLic', getF('form.obsLic')||'','Registre um comentário — ele fica no histórico com usuário, data e hora.',3))+
      '<div class="right mt16"><button class="btn btn-primary" onclick="addObservacao('+l.id+')">'+IC.plus+'Adicionar observação</button></div>'+
    '</div></div>'+
    '<div class="card"><div class="card-head"><h2>Comentários registrados</h2></div><div class="card-body">'+
      (coments.length?'<div class="timeline">'+coments.map(h=>itemTimeline(h)).join('')+'</div>'
        :'<div class="empty" style="padding:30px">'+IC.history+'<h3>Nenhum comentário</h3><p>Os comentários adicionados aparecem aqui em ordem cronológica.</p></div>')+
    '</div></div></div>';
}
function addObservacao(id){
  const txt = (getF('form.obsLic')||'').trim();
  if(!txt) return toast('Observação vazia','Escreva o comentário antes de adicionar.',true);
  const l=get('licencas',id);
  log({entidade:'Licença', entidadeId:id, rotulo:l.identificador, tipo:'Observação', rotuloEvento:'Observação adicionada', obs:txt});
  setQ('form.obsLic','');
  render(); toast('Observação registrada','O comentário foi gravado no histórico.');
}

/* =========================================================
   ALTERAÇÃO DE SITUAÇÃO (3.11)
   ========================================================= */
function openAlterarStatus(id){
  const l=get('licencas',id);
  S.form.status = {id, atual:l.situacao, nova:'', motivoId:'', obs:'', etapa:'form'};
  renderAlterarStatus();
}
function renderAlterarStatus(){
  setModalRender(renderAlterarStatus);
  const f=S.form.status, l=get('licencas',f.id);
  const motivo = f.motivoId?get('motivos',f.motivoId):null;
  const opcoes = SITUACOES_LICENCA.filter(s=>s!==f.atual);

  if(f.etapa==='confirmacao'){
    return openModal(
      '<div class="modal-icon" style="background:var(--primary-50);color:var(--primary)">'+IC.swap+'</div>'+
      '<h2>Confirmar alteração de situação</h2>'+
      '<div class="dl">'+
        '<div><div class="k">Licença</div><div class="v">'+esc(l.identificador)+'</div></div>'+
        '<div><div class="k">Cliente</div><div class="v">'+esc(clienteDe(l).nomeFantasia)+'</div></div>'+
        '<div><div class="k">Situação atual</div><div class="v">'+badge(f.atual, situacaoBadgeCls(f.atual))+'</div></div>'+
        '<div><div class="k">Nova situação</div><div class="v">'+badge(f.nova, situacaoBadgeCls(f.nova))+'</div></div>'+
        '<div class="span2"><div class="k">Motivo</div><div class="v">'+esc(motivo.descricao)+'</div></div>'+
        (f.obs?'<div class="span2"><div class="k">Observações</div><div class="v">'+esc(f.obs)+'</div></div>':'')+
      '</div>'+
      (motivo.notifica?'<div class="box mt20"><div class="box-title">Notificação que será enviada</div>'+
        '<b style="color:var(--slate-900)">'+esc(motivo.titulo)+'</b>'+
        '<p style="margin:8px 0 0;font-size:13px">'+esc(motivo.mensagem)+'</p>'+
        '<div class="mt16">'+(motivo.somenteAdmin?badge('Somente administradores','b-amber'):badge('Todos os usuários','b-gray'))+'</div></div>'
        :'<div class="alert alert-info mt20">'+IC.info+'<div>Este motivo não dispara notificação ao cliente.</div></div>')+
      '<div class="alert alert-warn mt16">'+IC.alert+'<div>A alteração registra valores anterior e novo no histórico, de forma imutável.</div></div>'+
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="setF(\'form.status.etapa\',\'form\')">Voltar</button>'+
      '<button class="btn btn-primary" onclick="confirmarAlteracaoStatus()">'+IC.check+'Confirmar</button></div>','md');
  }

  openModal('<h2>Alterar situação da licença</h2>'+
    '<div class="grid g2">'+
      field('Licença', inputRO(l.identificador+' · '+clienteDe(l).nomeFantasia), {span2:true, hint:'Campo bloqueado.'})+
      field('Situação atual', '<div style="padding-top:8px">'+badge(f.atual, situacaoBadgeCls(f.atual))+'</div>')+
      field('Nova situação', selectF('form.status.nova', f.nova, opcoes.map(s=>({v:s,t:s})),'Selecione'), {req:true})+
      field('Motivo da alteração', selectF('form.status.motivoId', f.motivoId,
        vivos('motivos').filter(m=>m.ativo).map(m=>({v:m.id,t:m.descricao})),'Selecione o motivo'), {span2:true, req:true})+
      field('Observações', textareaF('form.status.obs', f.obs,'Comentário registrado junto da alteração (opcional)',2), {span2:true})+
    '</div>'+
    (motivo?(motivo.notifica
      ? '<div class="box mt20"><div class="box-title">Notificação associada</div>'+
        '<b style="color:var(--slate-900)">'+esc(motivo.titulo)+'</b>'+
        '<p style="margin:8px 0 0;font-size:13px">'+esc(motivo.mensagem)+'</p>'+
        '<div class="mt16">'+(motivo.somenteAdmin?badge('Somente administradores','b-amber'):badge('Todos os usuários','b-gray'))+'</div></div>'
      : '<div class="alert alert-info mt20">'+IC.info+'<div>O motivo <b>'+esc(motivo.descricao)+'</b> não envia notificação ao cliente.</div></div>')
     : '<div class="alert alert-info mt20">'+IC.info+'<div>Selecione a nova situação e o motivo para ver a notificação associada.</div></div>')+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" '+((f.nova&&f.motivoId)?'':'disabled')+' onclick="setF(\'form.status.etapa\',\'confirmacao\')">Continuar'+IC.chev+'</button></div>','md');
}
function confirmarAlteracaoStatus(){
  const f=S.form.status, l=get('licencas',f.id), m=get('motivos',f.motivoId);
  const antes=l.situacao;
  l.situacao=f.nova;
  l.motivoId=['Bloqueada','Inativa','Expirada'].includes(f.nova)?m.id:null;
  log({entidade:'Licença', entidadeId:l.id, rotulo:l.identificador, tipo:'Alteração de status',
       rotuloEvento:'Situação alterada', de:antes, para:f.nova, obs:m.descricao+(f.obs?' — '+f.obs:'')});
  closeModal(); S.form.status=null; render();
  toast('Situação alterada', l.identificador+': '+antes+' → '+f.nova+'.');
}

/* =========================================================
   RENOVAÇÃO (5.4)
   ========================================================= */
function openRenovar(id){
  const l=get('licencas',id), t=tipoLicDe(l);
  const novoInicio = diasAte(l.expiracao)<0 ? hojeISO() : addDias(l.expiracao,1);
  const dur = Math.min(t.duracaoMaxDias, 365);
  S.form.renov = {id, etapa:'form', inicio:novoInicio, expiracao:addDias(novoInicio, dur), tipoLicencaId:l.tipoLicencaId, obs:''};
  renderRenovar();
}
function renderRenovar(){
  setModalRender(renderRenovar);
  const f=S.form.renov, l=get('licencas',f.id), t=get('tiposLicenca',f.tipoLicencaId);
  const dias = difDias(f.inicio, f.expiracao);
  const erro = (!f.inicio||!f.expiracao) ? 'Informe a nova vigência.'
    : (f.expiracao<=f.inicio) ? 'A nova expiração deve ser posterior ao início.'
    : (dias>t.duracaoMaxDias) ? 'A vigência ('+dias+' dias) excede a duração máxima do tipo '+t.sigla+' ('+t.duracaoMaxDias+' dias).' : null;

  if(f.etapa==='resumo'){
    return openModal(
      '<div class="modal-icon" style="background:var(--primary-50);color:var(--primary)">'+IC.refresh+'</div>'+
      '<h2>Conferir renovação</h2>'+
      '<div class="dl">'+
        '<div><div class="k">Licença</div><div class="v">'+esc(l.identificador)+'</div></div>'+
        '<div><div class="k">Cliente</div><div class="v">'+esc(clienteDe(l).nomeFantasia)+'</div></div>'+
        '<div><div class="k">Vigência atual</div><div class="v" style="color:var(--slate-500)"><s>'+fmtDate(l.inicio)+' – '+fmtDate(l.expiracao)+'</s></div></div>'+
        '<div><div class="k">Nova vigência</div><div class="v">'+fmtDate(f.inicio)+' – '+fmtDate(f.expiracao)+'</div></div>'+
        '<div><div class="k">Tipo de licença</div><div class="v">'+badge(t.sigla,'b-ref')+'</div></div>'+
        '<div><div class="k">Duração</div><div class="v">'+dias+' dias</div></div>'+
        '<div class="span2"><div class="k">Observações</div><div class="v">'+esc(f.obs||'—')+'</div></div>'+
      '</div>'+
      '<div class="alert alert-info mt20">'+IC.info+'<div>A renovação preserva a vigência anterior no histórico e reativa a licença se estiver expirada.</div></div>'+
      '<div class="modal-actions"><button class="btn btn-ghost" onclick="setF(\'form.renov.etapa\',\'form\')">Voltar</button>'+
      '<button class="btn btn-primary" onclick="confirmarRenovacao()">'+IC.check+'Confirmar renovação</button></div>','md');
  }

  const quick = n=>'<button class="btn btn-ghost btn-sm" onclick="setF(\'form.renov.expiracao\',addDias(S.form.renov.inicio,'+n+'))">+'+n+' dias</button>';
  openModal('<h2>Renovar licença</h2>'+
    '<div class="box mb20"><div class="box-title">Dados atuais</div>'+
      '<div class="dl">'+
        '<div><div class="k">Identificador</div><div class="v">'+esc(l.identificador)+'</div></div>'+
        '<div><div class="k">Cliente</div><div class="v">'+esc(clienteDe(l).nomeFantasia)+'</div></div>'+
        '<div><div class="k">Vigência atual</div><div class="v">'+fmtDate(l.inicio)+' – '+fmtDate(l.expiracao)+'</div></div>'+
        '<div><div class="k">Situação</div><div class="v">'+badge(situacao(l).label, situacao(l).cls)+'</div></div>'+
      '</div></div>'+
    '<div class="grid g2">'+
      field('Novo início da vigência', inputF('form.renov.inicio', f.inicio,'','date'), {req:true})+
      field('Nova expiração', inputF('form.renov.expiracao', f.expiracao,'','date'), {req:true})+
      field('Tipo de Licença', selectF('form.renov.tipoLicencaId', f.tipoLicencaId, vivos('tiposLicenca').map(x=>({v:x.id,t:x.sigla})), null), {span2:true,
        hint:'Duração máxima do tipo selecionado: '+t.duracaoMaxDias+' dias.'})+
      field('Observações', textareaF('form.renov.obs', f.obs,'Ex.: renovação anual conforme contrato',2), {span2:true})+
    '</div>'+
    '<div class="flex mt16" style="flex-wrap:wrap">'+quick(30)+quick(90)+quick(365)+quick(t.duracaoMaxDias)+'</div>'+
    (erro?'<div class="alert alert-warn mt20">'+IC.alert+'<div>'+esc(erro)+'</div></div>'
         :'<div class="alert alert-info mt20">'+IC.info+'<div>Nova vigência de <b>'+dias+' dias</b>, encerrando em <b>'+fmtDate(f.expiracao)+'</b>.</div></div>')+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" '+(erro?'disabled':'')+' onclick="setF(\'form.renov.etapa\',\'resumo\')">Continuar'+IC.chev+'</button></div>','md');
}
function confirmarRenovacao(){
  const f=S.form.renov, l=get('licencas',f.id);
  const deInicio=l.inicio, deFim=l.expiracao;
  l.renovacoes.unshift({data:hojeISO(), deInicio, deFim, paraInicio:f.inicio, paraFim:f.expiracao, usuario:USUARIO_ATUAL, obs:f.obs});
  l.inicio=f.inicio; l.expiracao=f.expiracao; l.tipoLicencaId=num(f.tipoLicencaId);
  if(['Expirada'].includes(l.situacao)){ l.situacao='Ativa'; l.motivoId=null; }
  log({entidade:'Licença', entidadeId:l.id, rotulo:l.identificador, tipo:'Renovação', rotuloEvento:'Vigência alterada',
       de:fmtDate(deInicio)+' – '+fmtDate(deFim), para:fmtDate(f.inicio)+' – '+fmtDate(f.expiracao), obs:f.obs});
  closeModal(); S.form.renov=null;
  go('#/licencas/'+l.id+'/renovacoes');
  toast('Licença renovada', l.identificador+' vigente até '+fmtDate(f.expiracao)+'.');
}
