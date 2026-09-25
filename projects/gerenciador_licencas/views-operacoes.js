/* =========================================================
   Instalações, Liberações Temporárias, Auditoria e Consultas
   ========================================================= */

/* =========================================================
   3.9 INSTALAÇÕES
   ========================================================= */
function filtrarInstalacoes(key){
  const st=listState(key), q=norm(st.q);
  return DB.instalacoes.filter(i=>{
    const l=get('licencas',i.licencaId), c=clienteDe(l);
    if(q && !(norm(i.descricao).includes(q)||norm(i.identificador).includes(q)||norm(i.finalidade).includes(q)||
              norm(l.identificador).includes(q)||norm(c.nomeFantasia).includes(q))) return false;
    if(st.f.ambiente && String(i.ambienteId)!==st.f.ambiente) return false;
    if(st.f.cliente  && String(l.clienteId)!==st.f.cliente) return false;
    if(st.f.licenca  && String(i.licencaId)!==st.f.licenca) return false;
    if(st.f.tipo==='temporarias' && !i.temporaria) return false;
    if(st.f.tipo==='permanentes' &&  i.temporaria) return false;
    if(st.f.sit==='ativos'   && !i.ativo) return false;
    if(st.f.sit==='inativos' &&  i.ativo) return false;
    return true;
  });
}
function rotulosFiltroInstalacao(key){
  const st=listState(key), r=[];
  if(st.q) r.push('Busca: '+st.q);
  if(st.f.ambiente) r.push('Ambiente: '+get('ambientes',st.f.ambiente).descricao);
  if(st.f.cliente)  r.push('Cliente: '+get('clientes',st.f.cliente).nomeFantasia);
  if(st.f.licenca)  r.push('Licença: '+get('licencas',st.f.licenca).identificador);
  if(st.f.tipo)     r.push(st.f.tipo==='temporarias'?'Somente temporárias':'Somente permanentes');
  if(st.f.sit)      r.push(st.f.sit==='ativos'?'Ativas':'Inativas');
  return r;
}
const COLUNAS_EXPORT_INSTALACAO = [
  {label:'Instalação',   valor:i=>i.descricao},
  {label:'Identificador',valor:i=>i.identificador},
  {label:'Licença',      valor:i=>get('licencas',i.licencaId).identificador},
  {label:'Cliente',      valor:i=>clienteDe(get('licencas',i.licencaId)).razaoSocial},
  {label:'Ambiente',     valor:i=>get('ambientes',i.ambienteId).descricao},
  {label:'Finalidade',   valor:i=>i.finalidade},
  {label:'Início',       valor:i=>fmtDate(i.inicio)},
  {label:'Término',      valor:i=>i.termino?fmtDate(i.termino):''},
  {label:'Temporária',   valor:i=>i.temporaria?'Sim':'Não'},
  {label:'Branding',     valor:i=>get('brandings',i.brandingId).descricao||''},
  {label:'Situação',     valor:i=>i.ativo?'Ativa':'Inativa'},
  {label:'Observações',  valor:i=>i.obs||''}
];

VIEWS['instalacoes'] = function(parts){
  if(parts[1]) return instalacaoDetalhe(Number(parts[1]));
  const key='inst', st=listState(key);
  const rows = filtrarInstalacoes(key);
  const hasF = rotulosFiltroInstalacao(key).length>0;
  const temporariasVencendo = DB.instalacoes.filter(i=>i.ativo&&i.temporaria&&i.termino&&diasAte(i.termino)<=3).length;
  const lic = st.f.licenca ? get('licencas', st.f.licenca) : null;   // contexto vindo da grid de Licenças

  return pageHead('Instalações','Utilização técnica das licenças. Ambientes diferentes não geram licenças diferentes.',
      '<button class="btn btn-ghost" onclick="exportar(\'instalacoes\',COLUNAS_EXPORT_INSTALACAO,filtrarInstalacoes(\'inst\'),rotulosFiltroInstalacao(\'inst\'))">'+IC.download+'Exportar</button>'+
      '<button class="btn btn-primary" onclick="openInstalacao(null'+(lic?','+lic.id:'')+')">'+IC.plus+'Nova Instalação</button>')+
    (lic?'<div class="alert alert-info mb20" style="margin-top:0">'+IC.key+
      '<div>Mostrando apenas as instalações da licença <b>'+esc(lic.identificador)+'</b> — '+esc(clienteDe(lic).razaoSocial)+'. '+
      '<button class="kpi-link" onclick="setListF(\'inst\',\'licenca\',\'\')">Ver todas as instalações</button> · '+
      '<button class="kpi-link" onclick="go(\'#/licencas/'+lic.id+'\')">Abrir a licença</button></div></div>':'')+
    (temporariasVencendo?'<div class="alert alert-warn mb20" style="margin-top:0">'+IC.clock+'<div><b>'+temporariasVencendo+'</b> instalação(ões) temporária(s) vencem em até 3 dias. '+
      'A rotina automática encerra cada uma ao passar do término.</div></div>':'')+
    '<div class="filters">'+searchBox(key,'Buscar descrição, identificador ou finalidade')+
      filterSelect(key,'licenca','Licença',DB.licencas.map(l=>({v:l.id,t:l.identificador+' — '+clienteDe(l).nomeFantasia})),'w-240')+
      filterSelect(key,'cliente','Cliente',vivos('clientes').map(c=>({v:c.id,t:c.nomeFantasia})),'w-200')+
      filterSelect(key,'ambiente','Ambiente',vivos('ambientes').map(a=>({v:a.id,t:a.descricao})),'w-180')+
      filterSelect(key,'tipo','Tipo',[{v:'temporarias',t:'Temporárias'},{v:'permanentes',t:'Permanentes'}],'w-180')+
      filterSelect(key,'sit','Situação',[{v:'ativos',t:'Ativas'},{v:'inativos',t:'Inativas'}],'w-160')+
      (hasF?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:hasF, perPage:10,
      emptyAction:'<button class="btn btn-primary" onclick="openInstalacao()">'+IC.plus+'Nova Instalação</button>',
      columns:[
        {label:'Instalação', key:'d', cls:'strong', sortVal:r=>r.descricao,
          render:r=>'<span class="linkcell" onclick="go(\'#/instalacoes/'+r.id+'\')">'+esc(r.descricao)+'</span><span class="cell-sub">'+esc(r.identificador)+'</span>'},
        {label:'Licença / Cliente', key:'l', width:'220px', sortVal:r=>get('licencas',r.licencaId).identificador,
          render:r=>{ const l=get('licencas',r.licencaId);
            return '<span class="linkcell" onclick="go(\'#/licencas/'+l.id+'\')">'+esc(l.identificador)+'</span><span class="cell-sub">'+esc(clienteDe(l).nomeFantasia)+'</span>'; }},
        {label:'Ambiente', key:'a', width:'160px', sortVal:r=>get('ambientes',r.ambienteId).descricao,
          render:r=>{ const a=get('ambientes',r.ambienteId);
            return marcadorAmbiente(a)+'<span class="cell-sub">'+esc(a.descricao)+'</span>'; }},
        {label:'Finalidade', key:'f', width:'230px', render:r=>esc(r.finalidade)},
        {label:'Período', key:'p', width:'165px', cls:'num', sortVal:r=>r.inicio,
          render:r=>fmtDate(r.inicio)+(r.termino?'<span class="cell-sub">até '+fmtDate(r.termino)+'</span>':'')},
        {label:'Tipo', key:'t', width:'130px', sortVal:r=>r.temporaria?0:1,
          render:r=>r.temporaria?badge('Temporária','b-amber'):badge('Permanente','b-gray')},
        {label:'Situação', key:'s', width:'110px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo, true)},
        {label:'', key:'ac', width:'175px', align:true, render:r=>'<div class="rowactions">'+
          actView('#/instalacoes/'+r.id)+actEdit('openInstalacao('+r.id+')')+
          actSituacao('alternarInstalacao('+r.id+')', r.ativo)+
          (r.ativo?actCustom(IC.archive,'Encerrar instalação','encerrarInstalacao('+r.id+')','danger'):'')+'</div>'}
      ]});
};
function openInstalacao(id, licencaId){
  const r = id?get('instalacoes',id):null;
  const lic = licencaId?get('licencas',licencaId):null;
  S.form.inst = r ? Object.assign({id}, JSON.parse(JSON.stringify(r)))
    : {id:null, licencaId:licencaId||'', descricao:'', ambienteId:'', finalidade:'', identificador:'',
       inicio:hojeISO(), termino:'', brandingId:(lic?(lic.brandingId||brandingDe(clienteDe(lic)).id):''), temporaria:false, ativo:true, obs:''};
  renderInstalacaoModal();
}
function renderInstalacaoModal(){
  setModalRender(renderInstalacaoModal);
  const f=S.form.inst;
  const lic = f.licencaId?get('licencas',f.licencaId):null;
  const brandingHerdado = lic ? (lic.brandingId?get('brandings',lic.brandingId):brandingDe(clienteDe(lic))) : {};
  const lim = lic?limiteInstalacoes(lic):null;
  const ativas = lic?instalacoesDe(lic).filter(i=>i.ativo&&i.id!==f.id).length:0;
  const estouraLimite = lim && !lim.ilimitado && f.ativo && ativas >= lim.valor && !f.temporaria;

  openModal('<h2>'+(f.id?'Editar':'Nova')+' Instalação</h2>'+
    '<div class="grid g2">'+
      field('Licença', f.id?inputRO(lic.identificador+' · '+clienteDe(lic).nomeFantasia)
        :selectF('form.inst.licencaId', f.licencaId, DB.licencas.map(l=>({v:l.id,t:l.identificador+' — '+clienteDe(l).nomeFantasia})),'Selecione a licença'),
        {span2:true, req:true})+
      field('Descrição', inputF('form.inst.descricao', f.descricao,'Ex.: Servidor principal'), {req:true, span2:true})+
      field('Ambiente', selectF('form.inst.ambienteId', f.ambienteId,
        vivos('ambientes').filter(a=>a.ativo||String(a.id)===String(f.ambienteId)).map(a=>({v:a.id,t:a.sigla+' — '+a.descricao})),'Selecione o ambiente'),
        {req:true, hint:'Obrigatório em toda instalação.'})+
      field('Identificador técnico', inputF('form.inst.identificador', f.identificador,'Ex.: SRV-CLI-PRD-01'), {req:true})+
      field('Finalidade', textareaF('form.inst.finalidade', f.finalidade,'Para que esta instalação é usada',2), {req:true, span2:true})+
      field('Data de início', inputF('form.inst.inicio', f.inicio,'','date'), {req:true})+
      field('Data de término', inputF('form.inst.termino', f.termino,'','date'),
        {hint:f.temporaria?'Obrigatória para instalações temporárias.':'Opcional para instalações permanentes.'})+
      field('Branding', selectF('form.inst.brandingId', f.brandingId, vivos('brandings').map(b=>({v:b.id,t:b.descricao})),'Herdar da licença'),
        {span2:true, hint:'Herda da licença ('+(brandingHerdado.descricao||'—')+'), mas pode ser alterado.'})+
    '</div>'+
    '<div class="box mt20"><div class="box-title">Classificação</div>'+
      switchF('form.inst.temporaria', f.temporaria, 'Instalação temporária',
        'Bases restauradas, suporte e reinstalações — não consomem nem geram nova licença comercial.')+
      switchF('form.inst.ativo', f.ativo, 'Instalação ativa')+
    '</div>'+
    '<div class="mt16">'+field('Observações', textareaF('form.inst.obs', f.obs,'Informações adicionais (opcional)',2))+'</div>'+
    (estouraLimite?'<div class="alert alert-warn mt20">'+IC.alert+'<div>A licença já possui <b>'+ativas+'</b> instalação(ões) ativa(s), no limite de <b>'+lim.valor+'</b>. '+
      'Marque como <b>temporária</b> ou registre uma <b>liberação temporária de instalações</b>.</div></div>':'')+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveInstalacao()">'+IC.save+'Salvar</button></div>','md');
}
function saveInstalacao(){
  const f=S.form.inst;
  const miss=missing(f,[{k:'licencaId',t:'Licença'},{k:'descricao',t:'Descrição'},{k:'ambienteId',t:'Ambiente'},
    {k:'finalidade',t:'Finalidade'},{k:'identificador',t:'Identificador técnico'},{k:'inicio',t:'Data de início'}]);
  if(miss.length) return failValidation(miss);
  if(f.temporaria && !f.termino) return failValidation(['Data de término (instalação temporária)']);
  if(f.termino && f.termino<=f.inicio) return toast('Datas inválidas','O término deve ser posterior ao início.',true);

  const data={licencaId:num(f.licencaId), descricao:f.descricao, ambienteId:num(f.ambienteId), finalidade:f.finalidade,
    identificador:f.identificador, inicio:f.inicio, termino:f.termino||null, brandingId:num(f.brandingId)||null,
    temporaria:!!f.temporaria, ativo:!!f.ativo, obs:f.obs};
  const l=get('licencas',data.licencaId);
  if(f.id){ Object.assign(get('instalacoes',f.id), data);
    log({entidade:'Instalação', entidadeId:f.id, rotulo:data.identificador, tipo:'Alteração', rotuloEvento:'Instalação alterada',
         obs:'Licença '+l.identificador}); }
  else { const id=nextId('instalacoes'); DB.instalacoes.push(Object.assign({id},data));
    log({entidade:'Instalação', entidadeId:id, rotulo:data.identificador, tipo:'Cadastro',
         rotuloEvento:data.temporaria?'Instalação temporária registrada':'Instalação registrada',
         obs:'Licença '+l.identificador+' · ambiente '+get('ambientes',data.ambienteId).descricao}); }
  closeModal(); render(); toast('Instalação salva', data.descricao);
}
function alternarInstalacao(id){
  const i=get('instalacoes',id), antes=i.ativo?'Ativa':'Inativa';
  i.ativo=!i.ativo;
  log({entidade:'Instalação', entidadeId:id, rotulo:i.identificador, tipo:'Ativação/Desativação',
       rotuloEvento:i.ativo?'Instalação ativada':'Instalação inativada', de:antes, para:i.ativo?'Ativa':'Inativa'});
  render(); toast(i.ativo?'Instalação ativada':'Instalação inativada', i.descricao);
}
function encerrarInstalacao(id){
  const i=get('instalacoes',id);
  confirmDialog({tom:'warn', title:'Encerrar instalação?',
    message:'<b>'+esc(i.descricao)+'</b> será encerrada com data de término de hoje ('+fmtDate(hojeISO())+') e ficará inativa. O registro é preservado no histórico.',
    confirmLabel:'Encerrar', onConfirm:'aplicarEncerramento('+id+')'});
}
function aplicarEncerramento(id){
  const i=get('instalacoes',id);
  i.ativo=false; i.termino=hojeISO();
  log({entidade:'Instalação', entidadeId:id, rotulo:i.identificador, tipo:'Encerramento',
       rotuloEvento:'Instalação encerrada', de:'Ativa', para:'Encerrada em '+fmtDate(hojeISO())});
  closeModal(); render(); toast('Instalação encerrada', i.descricao);
}
function instalacaoDetalhe(id){
  const i=get('instalacoes',id);
  if(!i.id) return VIEWS['404']();
  const l=get('licencas',i.licencaId), c=clienteDe(l), a=get('ambientes',i.ambienteId);
  const br=i.brandingId?get('brandings',i.brandingId):(l.brandingId?get('brandings',l.brandingId):brandingDe(c));
  const dl=(k,v)=>'<div><div class="k">'+esc(k)+'</div><div class="v">'+v+'</div></div>';
  const vencida = i.temporaria && i.termino && diasAte(i.termino)<0;

  return pageHead(i.descricao, i.identificador+' · '+a.descricao,
      '<button class="btn btn-ghost" onclick="openInstalacao('+id+')">'+IC.edit+'Editar</button>'+
      (i.ativo?'<button class="btn btn-ghost" onclick="encerrarInstalacao('+id+')">'+IC.archive+'Encerrar</button>':'')+
      '<button class="btn btn-primary" onclick="go(\'#/licencas/'+l.id+'/instalacoes\')">'+IC.link+'Abrir licença</button>',
      [{t:'Instalações',href:'#/instalacoes'},{t:i.descricao}])+
    (vencida&&i.ativo?'<div class="alert alert-warn mb20" style="margin-top:0">'+IC.clock+'<div>Instalação temporária <b>vencida em '+fmtDate(i.termino)+'</b>. '+
      'A próxima execução das rotinas automáticas irá encerrá-la.</div></div>':'')+
    '<div class="two-col">'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Dados da instalação</h2>'+
          (i.temporaria?badge('Temporária','b-amber'):badge('Permanente','b-gray'))+badgeSituacao(i.ativo, true)+'</div><div class="card-body">'+
          '<div class="dl">'+
            dl('Descrição', esc(i.descricao))+
            dl('Identificador técnico', '<span style="font-family:Consolas,monospace">'+esc(i.identificador)+'</span>')+
            dl('Ambiente', badge(a.sigla,'b-ref')+' '+esc(a.descricao))+
            dl('Finalidade', esc(i.finalidade))+
            dl('Data de início', fmtDate(i.inicio))+
            dl('Data de término', i.termino?fmtDate(i.termino):'<span class="muted">Sem término definido</span>')+
          '</div>'+
          '<h3 class="section-title mt24">Observações</h3>'+
          '<p style="margin:0;color:var(--slate-600)">'+esc(i.obs||'Nenhuma observação registrada.')+'</p>'+
        '</div></div>'+
        cardHistorico('Instalação', id, 8)+
      '</div>'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Licença</h2></div><div class="card-body">'+
          '<div style="font-weight:700;color:var(--slate-900)">'+esc(l.identificador)+'</div>'+
          '<div class="muted" style="font-size:12.5px">'+esc(c.razaoSocial)+'</div>'+
          '<div class="mt8">'+badge(situacao(l).label, situacao(l).cls)+' '+badge(tipoLicDe(l).sigla,'b-ref')+'</div>'+
          '<div class="mt16" style="font-size:13px;color:var(--slate-500)">Instalações ativas: <b>'+
            instalacoesDe(l).filter(x=>x.ativo).length+'</b> de '+fmtLimite(limiteInstalacoes(l))+'</div>'+
          '<button class="btn btn-ghost btn-sm mt16" onclick="go(\'#/licencas/'+l.id+'\')">'+IC.link+'Visão 360º</button>'+
        '</div></div>'+
        '<div class="card"><div class="card-head"><h2>Branding aplicado</h2></div><div class="card-body">'+
          '<div class="preview"><div class="ph" style="background:'+(br.cor||'#94a3b8')+'">'+esc(br.descricao||'—')+'</div>'+
          '<div class="bar"><span>'+(i.brandingId?'Definido na instalação':'Herdado da licença')+'</span></div></div>'+
        '</div></div>'+
      '</div>'+
    '</div>';
}

/* =========================================================
   3.10 LIBERAÇÕES TEMPORÁRIAS
   ========================================================= */
function filtrarLiberacoes(key){
  const st=listState(key), q=norm(st.q);
  return DB.liberacoes.filter(x=>{
    const l=get('licencas',x.licencaId), c=clienteDe(l);
    if(q && !(norm(x.motivo).includes(q)||norm(l.identificador).includes(q)||norm(c.nomeFantasia).includes(q))) return false;
    if(st.f.recurso && x.recurso!==st.f.recurso) return false;
    if(st.f.status  && x.status!==st.f.status) return false;
    if(st.f.licenca && String(x.licencaId)!==st.f.licenca) return false;
    return true;
  });
}
function rotulosFiltroLiberacao(key){
  const st=listState(key), r=[];
  if(st.q) r.push('Busca: '+st.q);
  if(st.f.recurso) r.push('Recurso: '+(st.f.recurso==='usuarios'?'Usuários':'Instalações'));
  if(st.f.status)  r.push('Status: '+st.f.status);
  if(st.f.licenca) r.push('Licença: '+get('licencas',st.f.licenca).identificador);
  return r;
}
const COLUNAS_EXPORT_LIBERACAO = [
  {label:'Licença',        valor:x=>get('licencas',x.licencaId).identificador},
  {label:'Cliente',        valor:x=>clienteDe(get('licencas',x.licencaId)).razaoSocial},
  {label:'Recurso',        valor:x=>x.recurso==='usuarios'?'Usuários':'Instalações'},
  {label:'Valor original', valor:x=>x.valorOriginal},
  {label:'Novo valor',     valor:x=>x.ilimitado?'Ilimitado':x.valorNovo},
  {label:'Início',         valor:x=>fmtDate(x.inicio)},
  {label:'Término',        valor:x=>fmtDate(x.termino)},
  {label:'Motivo',         valor:x=>x.motivo},
  {label:'Solicitante',    valor:x=>x.usuario},
  {label:'Aprovado por',   valor:x=>x.aprovadoPor||''},
  {label:'Status',         valor:x=>x.status}
];

VIEWS['liberacoes'] = function(){
  const key='lib';
  const rows = filtrarLiberacoes(key);
  const hasF = rotulosFiltroLiberacao(key).length>0;
  const pendentes = DB.liberacoes.filter(x=>x.status==='Agendada'&&!x.aprovadoPor).length;

  return pageHead('Liberações Temporárias','Alteram limites de usuários ou instalações por um período e restauram a configuração original.',
      '<button class="btn btn-ghost" onclick="exportar(\'liberacoes\',COLUNAS_EXPORT_LIBERACAO,filtrarLiberacoes(\'lib\'),rotulosFiltroLiberacao(\'lib\'))">'+IC.download+'Exportar</button>'+
      '<button class="btn btn-primary" onclick="openLiberacao()">'+IC.plus+'Nova Liberação</button>')+
    (pendentes?'<div class="alert alert-info mb20" style="margin-top:0">'+IC.info+'<div><b>'+pendentes+'</b> liberação(ões) aguardando aprovação.</div></div>':'')+
    '<div class="filters">'+searchBox(key,'Buscar motivo, licença ou cliente')+
      filterSelect(key,'recurso','Recurso',RECURSOS_LIBERACAO,'w-180')+
      filterSelect(key,'status','Status',STATUS_LIBERACAO.map(s=>({v:s,t:s})),'w-180')+
      (hasF?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:hasF, perPage:10,
      emptyAction:'<button class="btn btn-primary" onclick="openLiberacao()">'+IC.plus+'Nova Liberação</button>',
      columns:[
        {label:'Licença / Cliente', key:'l', cls:'strong', sortVal:r=>get('licencas',r.licencaId).identificador,
          render:r=>{ const l=get('licencas',r.licencaId);
            return '<span class="linkcell" onclick="go(\'#/licencas/'+l.id+'/liberacoes\')">'+esc(l.identificador)+'</span>'+
                   '<span class="cell-sub">'+esc(clienteDe(l).nomeFantasia)+'</span>'; }},
        {label:'Recurso', key:'r', width:'130px', sortVal:r=>r.recurso,
          render:r=>badge(r.recurso==='usuarios'?'Usuários':'Instalações','b-ref')},
        {label:'Alteração', key:'v', width:'175px', cls:'num',
          render:r=>'<s class="muted">'+r.valorOriginal+'</s> → <b>'+(r.ilimitado?'Ilimitado':r.valorNovo)+'</b>'},
        {label:'Período', key:'p', width:'175px', cls:'num', sortVal:r=>r.inicio,
          render:r=>fmtDate(r.inicio)+' – '+fmtDate(r.termino)+
            (r.status==='Ativa'?'<span class="cell-sub">restaura em '+diasAte(r.termino)+' dia(s)</span>':'')},
        {label:'Motivo', key:'m', render:r=>esc(r.motivo)},
        {label:'Solicitante', key:'u', width:'165px', render:r=>esc(r.usuario)+
          (r.aprovadoPor?'<span class="cell-sub">aprovado por '+esc(r.aprovadoPor)+'</span>':'<span class="cell-sub">sem aprovação</span>')},
        {label:'Status', key:'s', width:'130px', sortVal:r=>r.status, render:r=>badge(r.status, statusLiberacaoCls(r.status))},
        {label:'', key:'a', width:'150px', align:true, render:r=>'<div class="rowactions">'+acoesLiberacao(r)+'</div>'}
      ]});
};
function acoesLiberacao(x){
  const podeAprovar  = x.status==='Agendada' && !x.aprovadoPor;
  const podeCancelar = ['Agendada','Ativa'].includes(x.status);
  return (podeAprovar?actCustom(IC.check,'Aprovar','aprovarLiberacao('+x.id+')'):'')+
    (x.status==='Ativa'?actCustom(IC.refresh,'Restaurar agora','restaurarLiberacao('+x.id+')'):'')+
    (podeCancelar?actCustom(IC.ban,'Cancelar','cancelarLiberacao('+x.id+')','danger'):'')+
    (!podeAprovar&&!podeCancelar&&x.status!=='Ativa'?'<span class="muted" style="font-size:12px">encerrada</span>':'');
}
function openLiberacao(id, licencaId){
  const r = id?get('liberacoes',id):null;
  const lic = licencaId?get('licencas',licencaId):null;
  S.form.lib = r ? Object.assign({id}, JSON.parse(JSON.stringify(r)))
    : {id:null, licencaId:licencaId||'', recurso:'usuarios', valorNovo:'', ilimitado:false,
       inicio:hojeISO(), termino:addDias(hojeISO(),30), motivo:'', usuario:USUARIO_ATUAL};
  renderLiberacaoModal();
}
function renderLiberacaoModal(){
  setModalRender(renderLiberacaoModal);
  const f=S.form.lib;
  const lic = f.licencaId?get('licencas',f.licencaId):null;
  const limite = lic ? (f.recurso==='usuarios'?limiteUsuarios(lic):limiteInstalacoes(lic)) : null;
  const original = limite ? (limite.ilimitado?'Ilimitado':limite.valor) : '—';

  openModal('<h2>'+(f.id?'Editar':'Nova')+' Liberação Temporária</h2>'+
    '<div class="grid g2">'+
      field('Licença', selectF('form.lib.licencaId', f.licencaId,
        DB.licencas.map(l=>({v:l.id,t:l.identificador+' — '+clienteDe(l).nomeFantasia})),'Selecione a licença'), {span2:true, req:true})+
      field('Recurso afetado', segmentedF('form.lib.recurso', f.recurso, RECURSOS_LIBERACAO.map(r=>({v:r.v,t:r.t}))), {span2:true})+
      field('Valor original', inputRO(original), {hint:'Configuração atual da licença — preservada para restauração.'})+
      (f.ilimitado
        ? field('Novo valor', '<div class="limite-ilim">'+IC.infinity+'<span>Ilimitado durante o período</span></div>')
        : field('Novo valor', inputF('form.lib.valorNovo', f.valorNovo,'0','number'), {req:true}))+
      field('', switchF('form.lib.ilimitado', f.ilimitado, 'Liberar como ilimitado'), {span2:true})+
      field('Data de início', inputF('form.lib.inicio', f.inicio,'','date'), {req:true})+
      field('Data de término', inputF('form.lib.termino', f.termino,'','date'), {req:true,
        hint:'Ao expirar, o sistema restaura o valor original automaticamente.'})+
      field('Motivo', textareaF('form.lib.motivo', f.motivo,'Ex.: campanha de mutirão, reinstalação de servidor, suporte',2), {span2:true, req:true})+
      field('Solicitante', inputRO(f.usuario), {span2:true, hint:'Usuário logado que realizou a ação.'})+
    '</div>'+
    '<div class="alert alert-info mt20">'+IC.info+'<div>A liberação é criada com status <b>Agendada</b>. Após a aprovação, entra em vigor no período informado '+
    'e o valor original é restaurado automaticamente ao final — sem apagar a configuração anterior.</div></div>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveLiberacao()">'+IC.save+'Salvar</button></div>','md');
}
function saveLiberacao(){
  const f=S.form.lib;
  const miss=missing(f,[{k:'licencaId',t:'Licença'},{k:'inicio',t:'Data de início'},{k:'termino',t:'Data de término'},{k:'motivo',t:'Motivo'}]);
  if(miss.length) return failValidation(miss);
  if(!f.ilimitado && !num(f.valorNovo)) return failValidation(['Novo valor']);
  if(f.termino<=f.inicio) return toast('Datas inválidas','O término deve ser posterior ao início.',true);

  const lic=get('licencas',f.licencaId);
  const limite = f.recurso==='usuarios'?limiteUsuarios(lic):limiteInstalacoes(lic);
  if(!f.ilimitado && !limite.ilimitado && num(f.valorNovo)<=limite.valor)
    return toast('Valor sem efeito','O novo valor deve ser maior que o atual ('+limite.valor+').',true);

  const data={licencaId:num(f.licencaId), recurso:f.recurso, valorOriginal:limite.ilimitado?0:limite.valor,
    valorNovo:num(f.valorNovo), ilimitado:!!f.ilimitado, inicio:f.inicio, termino:f.termino, motivo:f.motivo,
    usuario:f.usuario, status:'Agendada', aprovadoPor:null, aprovadoEm:null};
  const rotulo=(data.recurso==='usuarios'?'Usuários':'Instalações')+' — '+lic.identificador;
  if(f.id){ Object.assign(get('liberacoes',f.id), data);
    log({entidade:'Liberação temporária', entidadeId:f.id, rotulo, tipo:'Alteração', rotuloEvento:'Liberação alterada'}); }
  else { const id=nextId('liberacoes'); DB.liberacoes.push(Object.assign({id},data));
    log({entidade:'Liberação temporária', entidadeId:id, rotulo, tipo:'Liberação temporária', rotuloEvento:'Liberação temporária solicitada',
         de:String(data.valorOriginal), para:data.ilimitado?'Ilimitado':String(data.valorNovo), obs:data.motivo}); }
  closeModal(); render(); toast('Liberação registrada','Aguardando aprovação.');
}
function aprovarLiberacao(id){
  const x=get('liberacoes',id), l=get('licencas',x.licencaId);
  const rotulo=(x.recurso==='usuarios'?'Usuários':'Instalações')+' — '+l.identificador;
  confirmDialog({tom:'info', title:'Aprovar liberação temporária?',
    message:'A licença <b>'+esc(l.identificador)+'</b> passa de <b>'+x.valorOriginal+'</b> para <b>'+(x.ilimitado?'ilimitado':x.valorNovo)+'</b> '+
      (x.recurso==='usuarios'?'usuário(s)':'instalação(ões)')+' entre '+fmtDate(x.inicio)+' e '+fmtDate(x.termino)+'.',
    confirmLabel:'Aprovar', onConfirm:'aplicarAprovacao('+id+')'});
}
function aplicarAprovacao(id){
  const x=get('liberacoes',id), l=get('licencas',x.licencaId);
  x.aprovadoPor=USUARIO_ATUAL; x.aprovadoEm=hojeISO();
  const dentroPeriodo = diasAte(x.inicio)<=0 && diasAte(x.termino)>=0;
  x.status = dentroPeriodo ? 'Ativa' : 'Agendada';
  const rotulo=(x.recurso==='usuarios'?'Usuários':'Instalações')+' — '+l.identificador;
  log({entidade:'Liberação temporária', entidadeId:id, rotulo, tipo:'Liberação temporária',
       rotuloEvento:dentroPeriodo?'Liberação aprovada e ativada':'Liberação aprovada (agendada)',
       de:String(x.valorOriginal), para:x.ilimitado?'Ilimitado':String(x.valorNovo), obs:x.motivo});
  closeModal(); render();
  toast('Liberação aprovada', dentroPeriodo?'Já está ativa.':'Entra em vigor em '+fmtDate(x.inicio)+'.');
}
function cancelarLiberacao(id){
  const x=get('liberacoes',id), l=get('licencas',x.licencaId);
  confirmDialog({title:'Cancelar liberação temporária?',
    message:'A liberação da licença <b>'+esc(l.identificador)+'</b> será cancelada e o limite volta ao valor original ('+x.valorOriginal+'). O registro é preservado.',
    confirmLabel:'Cancelar liberação', onConfirm:'aplicarCancelamentoLib('+id+')'});
}
function aplicarCancelamentoLib(id){
  const x=get('liberacoes',id), l=get('licencas',x.licencaId), antes=x.status;
  x.status='Cancelada';
  log({entidade:'Liberação temporária', entidadeId:id, rotulo:(x.recurso==='usuarios'?'Usuários':'Instalações')+' — '+l.identificador,
       tipo:'Liberação temporária', rotuloEvento:'Liberação cancelada', de:antes, para:'Cancelada'});
  closeModal(); render(); toast('Liberação cancelada','O limite original foi mantido.');
}
function restaurarLiberacao(id){
  const x=get('liberacoes',id), l=get('licencas',x.licencaId);
  const rec = x.recurso==='usuarios'?'usuários':'instalações';
  x.status='Restaurada';
  log({entidade:'Liberação temporária', entidadeId:id, rotulo:(x.recurso==='usuarios'?'Usuários':'Instalações')+' — '+l.identificador,
       tipo:'Restauração', rotuloEvento:'Configuração original restaurada',
       de:(x.ilimitado?'Ilimitado':x.valorNovo)+' '+rec, para:x.valorOriginal+' '+rec});
  render(); toast('Configuração restaurada','Limite de '+rec+' voltou para '+x.valorOriginal+'.');
}

/* =========================================================
   3.12 AUDITORIA / HISTÓRICO
   ========================================================= */
function filtrarAuditoria(key){
  const st=listState(key), q=norm(st.f.busca||st.q||'');
  return DB.auditoria.filter(a=>{
    if(q && !(norm(a.rotulo).includes(q)||norm(a.rotuloEvento||'').includes(q)||norm(a.usuario).includes(q)||norm(a.obs||'').includes(q))) return false;
    if(st.f.entidade && a.entidade!==st.f.entidade) return false;
    if(st.f.tipo     && a.tipo!==st.f.tipo) return false;
    if(st.f.origem   && a.origem!==st.f.origem) return false;
    if(st.f.usuario  && a.usuario!==st.f.usuario) return false;
    return true;
  });
}
function rotulosFiltroAuditoria(key){
  const st=listState(key), r=[];
  if(st.q||st.f.busca) r.push('Busca: '+(st.f.busca||st.q));
  if(st.f.entidade) r.push('Entidade: '+st.f.entidade);
  if(st.f.tipo)     r.push('Tipo: '+st.f.tipo);
  if(st.f.origem)   r.push('Origem: '+st.f.origem);
  if(st.f.usuario)  r.push('Usuário: '+st.f.usuario);
  return r;
}
const COLUNAS_EXPORT_AUDITORIA = [
  {label:'Data e hora',  valor:a=>a.dataHora},
  {label:'Entidade',     valor:a=>a.entidade},
  {label:'Identificador',valor:a=>a.rotulo},
  {label:'Tipo',         valor:a=>a.tipo},
  {label:'Evento',       valor:a=>a.rotuloEvento||''},
  {label:'Usuário',      valor:a=>a.usuario},
  {label:'Origem',       valor:a=>a.origem},
  {label:'Valor anterior',valor:a=>a.de||''},
  {label:'Valor novo',   valor:a=>a.para||''},
  {label:'Observação',   valor:a=>a.obs||''}
];

VIEWS['auditoria'] = function(){
  const key='aud', st=listState(key);
  const rows = filtrarAuditoria(key);
  const hasF = rotulosFiltroAuditoria(key).length>0;
  const entidades = Array.from(new Set(DB.auditoria.map(a=>a.entidade)));
  const tipos     = Array.from(new Set(DB.auditoria.map(a=>a.tipo)));
  const usuarios  = Array.from(new Set(DB.auditoria.map(a=>a.usuario)));

  return pageHead('Histórico e Auditoria','Registro imutável de todas as alterações — nenhuma alteração silenciosa.',
      '<button class="btn btn-ghost" onclick="exportar(\'auditoria\',COLUNAS_EXPORT_AUDITORIA,filtrarAuditoria(\'aud\'),rotulosFiltroAuditoria(\'aud\'))">'+IC.download+'Exportar</button>'+
      '<button class="btn btn-primary" onclick="executarRotinas()">'+IC.bolt+'Executar rotinas</button>')+
    '<div class="filters">'+
      '<div class="search">'+IC.search+'<input class="input" data-f="f:aud:busca" placeholder="Buscar identificador, usuário ou observação" value="'+esc(st.f.busca||'')+'" oninput="setListF(\'aud\',\'busca\',this.value)"></div>'+
      filterSelect(key,'entidade','Entidade',entidades.map(e=>({v:e,t:e})),'w-200')+
      filterSelect(key,'tipo','Tipo de alteração',tipos.map(t=>({v:t,t:t})),'w-200')+
      filterSelect(key,'origem','Origem',ORIGENS_ALTERACAO.map(o=>({v:o,t:o})),'w-180')+
      filterSelect(key,'usuario','Usuário',usuarios.map(u=>({v:u,t:u})),'w-200')+
      (hasF?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:hasF, perPage:12,
      emptyTitle:'Nenhum evento registrado', emptyMsg:'As alterações aparecerão aqui conforme forem realizadas.',
      columns:[
        {label:'Data e hora', key:'dt', width:'155px', cls:'num', sortVal:r=>r.id, render:r=>esc(r.dataHora)},
        {label:'Entidade', key:'en', width:'170px', sortVal:r=>r.entidade,
          render:r=>badge(r.entidade,'b-gray')+'<span class="cell-sub">'+esc(r.rotulo)+'</span>'},
        {label:'Tipo', key:'tp', width:'165px', sortVal:r=>r.tipo, render:r=>esc(r.tipo)},
        {label:'Evento', key:'ev', render:r=>'<span class="strong" style="color:var(--slate-900);font-weight:600">'+esc(r.rotuloEvento||'—')+'</span>'+
          (r.obs?'<span class="cell-sub">'+esc(r.obs)+'</span>':'')},
        {label:'Valores', key:'vl', width:'250px',
          render:r=>(r.de||r.para)?'<s class="muted">'+esc(r.de||'—')+'</s> → <b>'+esc(r.para||'—')+'</b>':'<span class="muted">—</span>'},
        {label:'Usuário', key:'us', width:'175px', sortVal:r=>r.usuario, render:r=>esc(r.usuario)},
        {label:'Origem', key:'or', width:'155px', sortVal:r=>r.origem,
          render:r=>badge(r.origem, r.origem==='Rotina automática'?'b-violet':(r.origem==='API'?'b-blue':'b-gray'))}
      ]});
};

/* =========================================================
   SEÇÃO 10 — CONSULTAS, INDICADORES E EXPORTAÇÃO
   ========================================================= */
const CONSULTAS = {
  licencas:   {t:'Licenças',              colunas:()=>COLUNAS_EXPORT_LICENCA,    dados:()=>filtrarLicencas('lic'),      filtros:()=>rotulosFiltroLicenca('lic')},
  instalacoes:{t:'Instalações',           colunas:()=>COLUNAS_EXPORT_INSTALACAO, dados:()=>filtrarInstalacoes('inst'),  filtros:()=>rotulosFiltroInstalacao('inst')},
  liberacoes: {t:'Liberações Temporárias',colunas:()=>COLUNAS_EXPORT_LIBERACAO,  dados:()=>filtrarLiberacoes('lib'),    filtros:()=>rotulosFiltroLiberacao('lib')},
  auditoria:  {t:'Histórico de Alterações',colunas:()=>COLUNAS_EXPORT_AUDITORIA, dados:()=>filtrarAuditoria('aud'),     filtros:()=>rotulosFiltroAuditoria('aud')}
};
VIEWS['consultas'] = function(){
  const alvo = S.consulta || 'licencas';
  const cfg = CONSULTAS[alvo];
  const dados = cfg.dados(), filtros = cfg.filtros();
  const colunas = cfg.colunas();

  const indicadores = {
    licencas: ()=>[
      ['Licenças na consulta', dados.length],
      ['Vigentes', dados.filter(l=>situacao(l).key==='vigente').length],
      ['A expirar / em tolerância', dados.filter(l=>['aexpirar','tolerancia'].includes(situacao(l).key)).length],
      ['Usuários licenciados', dados.reduce((s,l)=>s+(limiteUsuarios(l).ilimitado?0:limiteUsuarios(l).valor),0)]
    ],
    instalacoes: ()=>[
      ['Instalações na consulta', dados.length],
      ['Ativas', dados.filter(i=>i.ativo).length],
      ['Temporárias', dados.filter(i=>i.temporaria).length],
      ['Ambientes distintos', new Set(dados.map(i=>i.ambienteId)).size]
    ],
    liberacoes: ()=>[
      ['Liberações na consulta', dados.length],
      ['Ativas', dados.filter(x=>x.status==='Ativa').length],
      ['Agendadas', dados.filter(x=>x.status==='Agendada').length],
      ['Restauradas', dados.filter(x=>x.status==='Restaurada').length]
    ],
    auditoria: ()=>[
      ['Eventos na consulta', dados.length],
      ['Por rotina automática', dados.filter(a=>a.origem==='Rotina automática').length],
      ['Alterações de status', dados.filter(a=>a.tipo==='Alteração de status').length],
      ['Usuários distintos', new Set(dados.map(a=>a.usuario)).size]
    ]
  }[alvo]();

  const previa = dados.slice(0,8);
  return pageHead('Consultas e Exportação','Consulte, analise e exporte licenças, instalações, liberações e histórico.',
      '<button class="btn btn-primary" onclick="exportarConsulta()">'+IC.download+'Exportar resultado</button>')+
    '<div class="tabs">'+Object.keys(CONSULTAS).map(k=>
      '<button class="'+(k===alvo?'on':'')+'" onclick="S.consulta=\''+k+'\';render()">'+esc(CONSULTAS[k].t)+'</button>').join('')+'</div>'+
    '<div class="stats mb20">'+indicadores.map(i=>
      '<div class="stat"><div class="lbl">'+esc(i[0])+'</div><div class="val">'+i[1]+'</div></div>').join('')+'</div>'+
    '<div class="card mb20"><div class="card-head"><h2>Filtros aplicados</h2>'+
      '<button class="btn btn-ghost btn-sm" onclick="go(\'#/'+(alvo==='auditoria'?'auditoria':alvo)+'\')">Ajustar na tela de '+esc(cfg.t)+'</button></div>'+
      '<div class="card-body">'+
        (filtros.length?'<div class="list-inline">'+filtros.map(f=>badge(f,'b-blue')).join('')+'</div>'
          :'<p class="muted" style="margin:0">Nenhum filtro aplicado — a consulta inclui todos os registros. '+
           'Os filtros das telas de '+esc(cfg.t)+' são reaproveitados aqui e mantidos na exportação.</p>')+
      '</div></div>'+
    '<div class="card"><div class="card-head"><h2>Prévia do resultado</h2>'+
      '<span class="muted" style="font-size:12.5px">'+dados.length+' registro(s) · exibindo '+previa.length+'</span></div>'+
      (previa.length?'<div class="table-wrap"><table><thead><tr>'+
        colunas.slice(0,7).map(c=>'<th>'+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>'+
        previa.map(r=>'<tr>'+colunas.slice(0,7).map(c=>'<td>'+esc(c.valor(r))+'</td>').join('')+'</tr>').join('')+
        '</tbody></table></div>'
      :'<div class="empty">'+IC.inbox+'<h3>Nenhum registro</h3><p>Ajuste os filtros na tela de origem.</p></div>')+
    '</div>';
};
function exportarConsulta(){
  const alvo = S.consulta || 'licencas';
  const cfg = CONSULTAS[alvo];
  exportar(alvo, cfg.colunas(), cfg.dados(), cfg.filtros());
}
