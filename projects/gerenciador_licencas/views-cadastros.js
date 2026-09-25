/* =========================================================
   Cadastros: Tipos de Parceiro, Parceiros, Clientes, Produtos,
   Tipos de Licença, Categorias, Ambientes, Branding, Motivos
   ========================================================= */

function useForm(name, key, factory){
  if(!S.form[name] || S.form[name]._key !== key) S.form[name] = Object.assign({_key:key}, factory());
  return S.form[name];
}
function missing(obj, reqs){
  return reqs.filter(r=>{ const v=(obj||{})[r.k]; return v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length); }).map(r=>r.t);
}
function failValidation(list){ toast('Campos obrigatórios não preenchidos', list.join(', '), true); }
const num = v => Number(v)||0;

/* lista filtrada por busca + situação + excluídos */
function baseLista(col, key, casaBusca){
  const st = listState(key), q = norm(st.q);
  return DB[col].filter(r=>{
    if(!st.f.excl && r.excluido) return false;
    if(q && !casaBusca(r,q)) return false;
    if(st.f.sit==='ativos'   && !r.ativo) return false;
    if(st.f.sit==='inativos' &&  r.ativo) return false;
    return true;
  });
}
const filtroSituacao = key => filterSelect(key,'sit','Situação',[{v:'ativos',t:'Ativos'},{v:'inativos',t:'Inativos'}],'w-160');
const temFiltro = key => { const st=listState(key); return !!(st.q||st.f.sit||st.f.excl); };

/* card de histórico reutilizado nas telas de detalhe */
function cardHistorico(entidade, id, limite){
  const evs = auditoriaDe(entidade, id).slice(0, limite||4);
  return '<div class="card"><div class="card-head"><h2>Histórico</h2>'+
    '<button class="btn btn-ghost btn-sm" onclick="setListF(\'aud\',\'entidade\',\''+entidade+'\');go(\'#/auditoria\')">Ver tudo</button></div><div class="card-body">'+
    (evs.length?'<div class="timeline">'+evs.map(h=>itemTimeline(h)).join('')+'</div>'
      :'<p class="muted" style="margin:0">Nenhuma alteração registrada.</p>')+
    '</div></div>';
}
function itemTimeline(h){
  return '<div class="tl-item'+(['Emissão','Cadastro'].includes(h.tipo)?' gray':'')+'">'+
    '<div class="when">'+esc(h.dataHora)+' · '+esc(h.tipo)+' · '+esc(h.origem)+'</div>'+
    '<div class="what">'+esc(h.rotuloEvento||h.rotulo)+'</div>'+
    '<div class="who">'+esc(h.usuario)+'</div>'+
    ((h.de||h.para)?'<div class="diff"><s>'+esc(h.de||'—')+'</s> &rarr; <b>'+esc(h.para||'—')+'</b></div>':'')+
    (h.obs?'<div class="diff">'+esc(h.obs)+'</div>':'')+
  '</div>';
}

/* =========================================================
   3.1 TIPOS DE PARCEIRO COMERCIAL
   ========================================================= */
VIEWS['tipos-parceiro'] = function(){
  const key='tp';
  const rows = baseLista('tiposParceiro', key, (r,q)=>norm(r.descricao).includes(q));
  return pageHead('Tipos de Parceiro Comercial','Classificação comercial dos parceiros, incluindo operações Private Label.',
      '<button class="btn btn-primary" onclick="openTipoParceiro()">'+IC.plus+'Novo Tipo</button>',
      [{t:'Configurações'},{t:'Tipos de Parceiro Comercial'}])+
    '<div class="filters">'+searchBox(key,'Buscar descrição')+filtroSituacao(key)+filtroExcluidos(key,'tiposParceiro')+(temFiltro(key)?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:temFiltro(key), perPage:10,
      emptyAction:'<button class="btn btn-primary" onclick="openTipoParceiro()">'+IC.plus+'Novo Tipo</button>',
      columns:[
        {label:'Descrição', key:'d', cls:'strong', sortVal:r=>r.descricao, render:r=>esc(r.descricao)},
        {label:'Private Label', key:'pl', width:'150px', sortVal:r=>r.privateLabel?0:1,
          render:r=>r.privateLabel?badge('Sim','b-violet'):badge('Não','b-gray')},
        {label:'Parceiros', key:'n', width:'160px', sortVal:r=>DB.parceiros.filter(p=>p.tipoParceiroId===r.id).length,
          render:r=>{ const n=DB.parceiros.filter(p=>p.tipoParceiroId===r.id).length;
            return n?'<span class="linkcell" onclick="setListF(\'parc\',\'tipo\',\''+r.id+'\');go(\'#/parceiros\')">'+n+' parceiro(s)</span>':'<span class="muted">Nenhum</span>'; }},
        {label:'Situação', key:'s', width:'120px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'150px', align:true, render:r=>acoesCadastro('tiposParceiro', r.id, {
          editar:'openTipoParceiro('+r.id+')',
          vinculos:(function(){ const n=DB.parceiros.filter(p=>p.tipoParceiroId===r.id).length; return n?[n+' parceiro(s)']:[]; })()
        })}
      ]});
};
function openTipoParceiro(id){
  const r = id?get('tiposParceiro',id):{descricao:'',privateLabel:false,ativo:true};
  S.form.tp = {id, descricao:r.descricao, privateLabel:!!r.privateLabel, ativo:r.ativo!==false};
  renderTipoParceiroModal();
}
function renderTipoParceiroModal(){
  setModalRender(renderTipoParceiroModal);
  const f = S.form.tp;
  openModal('<h2>'+(f.id?'Editar':'Novo')+' Tipo de Parceiro Comercial</h2>'+
    field('Descrição', inputF('form.tp.descricao', f.descricao, 'Ex.: Sales Partner'), {req:true,
      hint:'Exemplos: Sales Government Partner, Sales Partner, White Label.'})+
    '<div class="box mt20"><div class="box-title">Configurações</div>'+
      switchF('form.tp.privateLabel', f.privateLabel, 'Private Label', 'Parceiro comercializa com identidade visual própria.')+
      switchF('form.tp.ativo', f.ativo, 'Ativo', 'Inativos não aparecem para novas associações.')+
    '</div>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveTipoParceiro()">'+IC.save+'Salvar</button></div>');
}
function saveTipoParceiro(){
  const f=S.form.tp, miss=missing(f,[{k:'descricao',t:'Descrição'}]);
  if(miss.length) return failValidation(miss);
  const data={descricao:f.descricao, privateLabel:!!f.privateLabel, ativo:!!f.ativo};
  if(f.id){ const r=get('tiposParceiro',f.id), antes=r.descricao; Object.assign(r,data);
    log({entidade:'Tipo de Parceiro', entidadeId:f.id, rotulo:data.descricao, tipo:'Alteração', rotuloEvento:'Cadastro alterado',
         de:antes!==data.descricao?antes:null, para:antes!==data.descricao?data.descricao:null}); }
  else { const id=nextId('tiposParceiro'); DB.tiposParceiro.push(Object.assign({id},data));
    log({entidade:'Tipo de Parceiro', entidadeId:id, rotulo:data.descricao, tipo:'Cadastro', rotuloEvento:'Tipo de parceiro cadastrado'}); }
  closeModal(); render(); toast('Tipo de parceiro salvo', data.descricao);
}

/* =========================================================
   3.2 PARCEIROS COMERCIAIS
   ========================================================= */
VIEWS['parceiros'] = function(parts){
  if(parts[1]==='novo') return parceiroForm(null);
  if(parts[2]==='editar') return parceiroForm(Number(parts[1]));
  if(parts[1]) return parceiroDetalhe(Number(parts[1]));

  const key='parc', st=listState(key);
  const rows = baseLista('parceiros', key, (r,q)=>norm(r.nome).includes(q)||norm(r.cnpj).includes(q)||norm(r.cidade).includes(q))
    .filter(p=>!st.f.tipo || String(p.tipoParceiroId)===st.f.tipo);
  const hasF = temFiltro(key) || !!st.f.tipo;
  return pageHead('Parceiros Comerciais','Empresas que se relacionam comercialmente com os clientes.', btnNew('Novo Parceiro','#/parceiros/novo'))+
    '<div class="filters">'+searchBox(key,'Buscar nome, CNPJ ou cidade')+
      filterSelect(key,'tipo','Tipo de parceiro',vivos('tiposParceiro').map(t=>({v:t.id,t:t.descricao})),'w-200')+
      filtroSituacao(key)+filtroExcluidos(key,'parceiros')+(hasF?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:hasF, perPage:10, emptyAction:btnNew('Novo Parceiro','#/parceiros/novo'),
      columns:[
        {label:'Nome / Razão Social', key:'nome', cls:'strong', sortVal:r=>r.nome,
          render:r=>'<span class="linkcell" onclick="go(\'#/parceiros/'+r.id+'\')">'+esc(r.nome)+'</span><span class="cell-sub">'+esc(r.cidade+'/'+r.uf)+'</span>'},
        {label:'CNPJ', key:'cnpj', width:'175px', cls:'num', sortVal:r=>r.cnpj, render:r=>esc(r.cnpj)},
        {label:'Tipo de Parceiro', key:'tipo', width:'220px', sortVal:r=>get('tiposParceiro',r.tipoParceiroId).descricao,
          render:r=>{ const t=get('tiposParceiro',r.tipoParceiroId);
            return badge(t.descricao||'—','b-ref')+(t.privateLabel?' '+badge('PL','b-violet'):''); }},
        {label:'Clientes', key:'cli', width:'100px', sortVal:r=>DB.clientes.filter(c=>c.parceiroId===r.id).length,
          render:r=>DB.clientes.filter(c=>c.parceiroId===r.id).length},
        {label:'Tipos permitidos', key:'tl', width:'140px', render:r=>(r.tiposLicenca||[]).length+' tipo(s)'},
        {label:'Situação', key:'s', width:'110px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'175px', align:true, render:r=>acoesCadastro('parceiros', r.id, {
          ver:'#/parceiros/'+r.id, editar:'#/parceiros/'+r.id+'/editar',
          vinculos:(function(){ const n=DB.clientes.filter(c=>c.parceiroId===r.id).length; return n?[n+' cliente(s)']:[]; })()
        })}
      ]});
};
function parceiroForm(id){
  const base = id?get('parceiros',id):null;
  const f = useForm('parceiro','p'+(id||'novo'), ()=> base ? JSON.parse(JSON.stringify(base))
    :{nome:'',cnpj:'',cep:'',uf:'',cidade:'',endereco:'',numero:'',complemento:'',tipoParceiroId:'',tiposLicenca:[],brandingId:'',ativo:true,
      contatos:[{nome:'',cargo:'',email:'',telefone:''}]});

  return pageHead(id?'Editar Parceiro Comercial':'Novo Parceiro Comercial',
      id?esc(base.nome):'Dados cadastrais, tipo de parceiro, branding, tipos de licença permitidos e contatos.',
      '<button class="btn btn-ghost" onclick="go(\'#/parceiros\')">'+IC.x+'Cancelar</button>'+
      '<button class="btn btn-primary" onclick="saveParceiro('+(id||'')+')">'+IC.save+'Salvar</button>',
      [{t:'Parceiros Comerciais',href:'#/parceiros'},{t:id?'Editar':'Novo'}])+
    '<div class="card mb16"><div class="card-body">'+
      '<h3 class="section-title">Dados cadastrais</h3>'+
      '<div class="grid g3">'+
        field('Nome / Razão Social', inputF('form.parceiro.nome', f.nome,'Nome do parceiro'), {req:true, span2:true})+
        field('CNPJ', inputF('form.parceiro.cnpj', f.cnpj,'00.000.000/0000-00'), {req:true})+
      '</div>'+
      '<h3 class="section-title mt24">Endereço</h3>'+
      '<div class="grid g4">'+
        field('CEP', inputF('form.parceiro.cep', f.cep,'00000-000'))+
        field('UF', selectF('form.parceiro.uf', f.uf, ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(u=>({v:u,t:u})),'UF'))+
        field('Cidade', inputF('form.parceiro.cidade', f.cidade,'Cidade'))+
        field('Número', inputF('form.parceiro.numero', f.numero,'Nº'))+
        field('Endereço', inputF('form.parceiro.endereco', f.endereco,'Logradouro'), {span2:true})+
        field('Complemento', inputF('form.parceiro.complemento', f.complemento,'Sala, andar...'), {span2:true})+
      '</div>'+
    '</div></div>'+
    '<div class="grid g2 mb16">'+
      '<div class="card"><div class="card-body">'+
        '<h3 class="section-title">Configurações comerciais</h3>'+
        '<div class="grid">'+
          field('Tipo de Parceiro Comercial', selectF('form.parceiro.tipoParceiroId', f.tipoParceiroId,
            vivos('tiposParceiro').filter(t=>t.ativo||String(t.id)===String(f.tipoParceiroId)).map(t=>({v:t.id,t:t.descricao+(t.privateLabel?' (Private Label)':'')})),'Selecione o tipo'), {req:true})+
          field('Branding', selectF('form.parceiro.brandingId', f.brandingId,
            vivos('brandings').filter(b=>b.ativo||String(b.id)===String(f.brandingId)).map(b=>({v:b.id,t:b.descricao})),'Selecione o branding'))+
          field('Tipos de Licença permitidos', '<div class="box" style="padding:8px 10px;max-height:250px;overflow-y:auto">'+
            vivos('tiposLicenca').map(t=>checkF('toggleInArray(\'form.parceiro.tiposLicenca\','+t.id+')', (f.tiposLicenca||[]).includes(t.id),
              t.sigla, t.descricao)).join('')+'</div>',
            {req:true, hint:'Somente estes tipos poderão ser emitidos para os clientes do parceiro.'})+
          '<div>'+switchF('form.parceiro.ativo', f.ativo, 'Parceiro ativo')+'</div>'+
        '</div>'+
      '</div></div>'+
      '<div class="card"><div class="card-body">'+
        '<div class="between mb16"><h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.04em">Contatos</h3>'+
        '<button class="btn btn-ghost btn-sm" onclick="addContato(\'parceiro\')">'+IC.plus+'Adicionar contato</button></div>'+
        (f.contatos.length? f.contatos.map((c,i)=>
          '<div class="box mb16"><div class="box-title">Contato '+(i+1)+'</div>'+
            (f.contatos.length>1?'<button class="icon-btn danger" style="position:absolute;top:8px;right:8px" onclick="rmContato(\'parceiro\','+i+')">'+IC.x+'</button>':'')+
            '<div class="grid g2">'+
              field('Nome', inputF('form.parceiro.contatos.'+i+'.nome', c.nome,'Nome do contato'))+
              field('Cargo', inputF('form.parceiro.contatos.'+i+'.cargo', c.cargo,'Cargo'))+
              field('E-mail', inputF('form.parceiro.contatos.'+i+'.email', c.email,'email@empresa.com.br','email'))+
              field('Telefone', inputF('form.parceiro.contatos.'+i+'.telefone', c.telefone,'(00) 0000-0000'))+
            '</div></div>').join('')
          : '<div class="empty" style="padding:26px">'+IC.users+'<h3>Nenhum contato informado</h3><p>Adicione ao menos um responsável.</p></div>')+
      '</div></div>'+
    '</div>'+
    '<div class="form-footer"><button class="btn btn-ghost" onclick="go(\'#/parceiros\')">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveParceiro('+(id||'')+')">'+IC.save+'Salvar Parceiro</button></div>';
}
function addContato(form){ S.form[form].contatos.push({nome:'',cargo:'',email:'',telefone:''}); render(); }
function rmContato(form,i){ S.form[form].contatos.splice(i,1); render(); }
function saveParceiro(id){
  const f=S.form.parceiro;
  const miss=missing(f,[{k:'nome',t:'Nome'},{k:'cnpj',t:'CNPJ'},{k:'tipoParceiroId',t:'Tipo de Parceiro'},{k:'tiposLicenca',t:'Tipos de Licença permitidos'}]);
  if(miss.length) return failValidation(miss);
  const data = {nome:f.nome,cnpj:f.cnpj,cep:f.cep,uf:f.uf,cidade:f.cidade,endereco:f.endereco,numero:f.numero,complemento:f.complemento,
    tipoParceiroId:num(f.tipoParceiroId), tiposLicenca:(f.tiposLicenca||[]).map(Number), brandingId:num(f.brandingId)||null,
    ativo:!!f.ativo, contatos:f.contatos.filter(c=>c.nome||c.email)};
  let novoId=id;
  if(id){ Object.assign(get('parceiros',id), data);
    log({entidade:'Parceiro Comercial', entidadeId:id, rotulo:data.nome, tipo:'Alteração', rotuloEvento:'Cadastro alterado'}); }
  else { novoId=nextId('parceiros'); DB.parceiros.push(Object.assign({id:novoId}, data));
    log({entidade:'Parceiro Comercial', entidadeId:novoId, rotulo:data.nome, tipo:'Cadastro', rotuloEvento:'Parceiro comercial cadastrado'}); }
  S.form.parceiro=null;
  go('#/parceiros/'+novoId);
  toast('Parceiro salvo', data.nome+' foi '+(id?'atualizado':'cadastrado')+'.');
}
function parceiroDetalhe(id){
  const p = get('parceiros', id);
  if(!p.id) return VIEWS['404']();
  const tp = get('tiposParceiro', p.tipoParceiroId), br = get('brandings', p.brandingId);
  const clientes = DB.clientes.filter(c=>c.parceiroId===id);
  const licencas = DB.licencas.filter(l=>clientes.some(c=>c.id===l.clienteId));

  return pageHead(p.nome, p.cnpj+' · '+p.cidade+'/'+p.uf,
      '<button class="btn btn-ghost" onclick="go(\'#/parceiros/'+id+'/editar\')">'+IC.edit+'Editar</button>'+
      '<button class="btn btn-primary" onclick="go(\'#/clientes/novo\')">'+IC.plus+'Novo Cliente</button>',
      [{t:'Parceiros Comerciais',href:'#/parceiros'},{t:p.nome}])+
    '<div class="two-col">'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Resumo cadastral</h2>'+badgeSituacao(p.ativo)+'</div><div class="card-body">'+
          '<div class="dl">'+
            '<div><div class="k">Nome / Razão Social</div><div class="v">'+esc(p.nome)+'</div></div>'+
            '<div><div class="k">CNPJ</div><div class="v">'+esc(p.cnpj)+'</div></div>'+
            '<div><div class="k">Endereço</div><div class="v">'+esc(p.endereco+', '+p.numero+(p.complemento?' — '+p.complemento:''))+'</div></div>'+
            '<div><div class="k">Cidade / UF / CEP</div><div class="v">'+esc(p.cidade+'/'+p.uf+' · '+p.cep)+'</div></div>'+
          '</div></div></div>'+
        '<div class="card mb16"><div class="card-head"><h2>Clientes vinculados</h2><span class="muted" style="font-size:12.5px">'+clientes.length+'</span></div>'+
          (clientes.length?'<div class="table-wrap"><table class="mini-table"><thead><tr><th>Cliente</th><th>CNPJ</th><th>Licenças</th><th>Situação</th><th></th></tr></thead><tbody>'+
            clientes.map(c=>'<tr><td class="strong"><span class="linkcell" onclick="go(\'#/clientes/'+c.id+'\')">'+esc(c.nomeFantasia)+'</span><span class="cell-sub">'+esc(c.razaoSocial)+'</span></td>'+
              '<td class="num">'+esc(c.cnpj)+'</td><td>'+licencasDe(c).length+'</td><td>'+badgeSituacao(c.ativo)+'</td>'+
              '<td class="right"><button class="btn btn-ghost btn-sm" onclick="go(\'#/clientes/'+c.id+'\')">Abrir</button></td></tr>').join('')+
            '</tbody></table></div>'
          :'<div class="empty">'+IC.users+'<h3>Nenhum cliente vinculado</h3><p>Cadastre um cliente e selecione este parceiro.</p></div>')+
        '</div>'+
        '<div class="card"><div class="card-head"><h2>Licenças da carteira</h2><span class="muted" style="font-size:12.5px">'+licencas.length+'</span></div>'+
          (licencas.length?'<div class="table-wrap"><table class="mini-table"><thead><tr><th>Licença</th><th>Cliente</th><th>Tipo</th><th>Expira em</th><th>Situação</th><th></th></tr></thead><tbody>'+
            licencas.map(l=>'<tr><td class="strong">'+esc(l.identificador)+'</td><td>'+esc(clienteDe(l).nomeFantasia)+'</td>'+
              '<td>'+badge(tipoLicDe(l).sigla,'b-ref')+'</td><td class="num">'+fmtDate(l.expiracao)+'</td>'+
              '<td>'+badge(situacao(l).label, situacao(l).cls)+'</td>'+
              '<td class="right"><button class="btn btn-ghost btn-sm" onclick="go(\'#/licencas/'+l.id+'\')">Visão 360º</button></td></tr>').join('')+
            '</tbody></table></div>'
          :'<div class="empty">'+IC.key+'<h3>Nenhuma licença emitida</h3><p>As licenças dos clientes aparecerão aqui.</p></div>')+
        '</div>'+
      '</div>'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Configurações</h2></div><div class="card-body">'+
          '<div style="font-size:12px;color:var(--slate-400);font-weight:600">Tipo de Parceiro Comercial</div>'+
          '<div class="mt8">'+badge(tp.descricao||'—','b-ref')+(tp.privateLabel?' '+badge('Private Label','b-violet'):'')+'</div>'+
          '<div class="mt20" style="font-size:12px;color:var(--slate-400);font-weight:600">Tipos de Licença permitidos</div>'+
          '<div class="list-inline mt8">'+((p.tiposLicenca||[]).map(t=>badge(get('tiposLicenca',t).sigla||'—','b-green')).join('')||'<span class="muted">Nenhum</span>')+'</div>'+
          '<div class="mt20" style="font-size:12px;color:var(--slate-400);font-weight:600">Branding</div>'+
          '<div class="mt8 flex"><span style="width:22px;height:22px;border-radius:6px;background:'+(br.cor||'#cbd5e1')+'"></span>'+
            '<span class="linkcell" onclick="go(\'#/branding/'+(br.id||'')+'\')">'+esc(br.descricao||'Não definido')+'</span></div>'+
        '</div></div>'+
        '<div class="card mb16"><div class="card-head"><h2>Contatos</h2></div><div class="card-body">'+
          (p.contatos&&p.contatos.length? p.contatos.map(c=>'<div class="box mb16"><div style="font-weight:700;color:var(--slate-900)">'+esc(c.nome)+'</div>'+
            '<div class="muted" style="font-size:12.5px">'+esc(c.cargo)+'</div>'+
            '<div class="mt8" style="font-size:13px">'+esc(c.email)+'<br>'+esc(c.telefone)+'</div></div>').join('')
          :'<p class="muted">Nenhum contato cadastrado.</p>')+
        '</div></div>'+
        cardHistorico('Parceiro Comercial', id)+
      '</div>'+
    '</div>';
}

/* =========================================================
   3.3 CLIENTES
   ========================================================= */
VIEWS['clientes'] = function(parts){
  if(parts[1]==='novo') return clienteForm(null);
  if(parts[2]==='editar') return clienteForm(Number(parts[1]));
  if(parts[1]) return clienteDetalhe(Number(parts[1]));

  const key='cli', st=listState(key);
  const rows = baseLista('clientes', key, (r,q)=>norm(r.razaoSocial).includes(q)||norm(r.nomeFantasia).includes(q)||norm(r.cnpj).includes(q))
    .filter(c=>!st.f.parceiro || String(c.parceiroId)===st.f.parceiro);
  const hasF = temFiltro(key) || !!st.f.parceiro;
  return pageHead('Clientes','Empresas licenciadas. Um cliente pode possuir várias licenças independentes.', btnNew('Novo Cliente','#/clientes/novo'))+
    '<div class="filters">'+searchBox(key,'Buscar razão social, fantasia ou CNPJ')+
      filterSelect(key,'parceiro','Parceiro Comercial',vivos('parceiros').map(p=>({v:p.id,t:p.nome})),'w-240')+
      filtroSituacao(key)+filtroExcluidos(key,'clientes')+(hasF?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:hasF, perPage:8, emptyAction:btnNew('Novo Cliente','#/clientes/novo'),
      columns:[
        {label:'Razão Social', key:'rs', cls:'strong', sortVal:r=>r.razaoSocial,
          render:r=>'<span class="linkcell" onclick="go(\'#/clientes/'+r.id+'\')">'+esc(r.razaoSocial)+'</span><span class="cell-sub">'+esc(r.nomeFantasia)+'</span>'},
        {label:'CNPJ', key:'cnpj', width:'175px', cls:'num', sortVal:r=>r.cnpj, render:r=>esc(r.cnpj)},
        {label:'Parceiro Comercial', key:'pc', width:'205px', sortVal:r=>parceiroDe(r).nome,
          render:r=>'<span class="linkcell" onclick="go(\'#/parceiros/'+r.parceiroId+'\')">'+esc(parceiroDe(r).nome)+'</span>'},
        {label:'Licenças', key:'lic', width:'100px', sortVal:r=>licencasDe(r).length, render:r=>licencasDe(r).length},
        {label:'Branding', key:'br', width:'160px', render:r=>esc(brandingDe(r).descricao||'—')},
        {label:'Situação', key:'s', width:'110px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'175px', align:true, render:r=>acoesCadastro('clientes', r.id, {
          ver:'#/clientes/'+r.id, editar:'#/clientes/'+r.id+'/editar',
          vinculos:(function(){ const n=licencasDe(r).length; return n?[n+' licença(s)']:[]; })()
        })}
      ]});
};
function clienteForm(id){
  const base = id?get('clientes',id):null;
  const f = useForm('cliente','c'+(id||'novo'), ()=> base?JSON.parse(JSON.stringify(base))
    :{razaoSocial:'',nomeFantasia:'',cnpj:'',parceiroId:'',brandingId:'',ativo:true,
      contatoPrincipal:{nome:'',email:'',telefone:''}, contatos:[]});
  if(!f.contatoPrincipal) f.contatoPrincipal={nome:'',email:'',telefone:''};
  if(!f.contatos) f.contatos=[];

  return pageHead(id?'Editar Cliente':'Novo Cliente', id?esc(base.razaoSocial):'Vincule o cliente ao parceiro comercial e ao branding.',
      '<button class="btn btn-ghost" onclick="go(\'#/clientes\')">'+IC.x+'Cancelar</button>'+
      '<button class="btn btn-primary" onclick="saveCliente('+(id||'')+')">'+IC.save+'Salvar</button>',
      [{t:'Clientes',href:'#/clientes'},{t:id?'Editar':'Novo'}])+
    '<div class="card mb16"><div class="card-body">'+
      '<h3 class="section-title">Identificação</h3>'+
      '<div class="grid g3">'+
        field('Razão Social', inputF('form.cliente.razaoSocial', f.razaoSocial,'Razão social completa'), {req:true, span2:true})+
        field('CNPJ', inputF('form.cliente.cnpj', f.cnpj,'00.000.000/0000-00'), {req:true})+
        field('Nome Fantasia', inputF('form.cliente.nomeFantasia', f.nomeFantasia,'Nome comercial'), {req:true})+
        field('Parceiro Comercial', selectF('form.cliente.parceiroId', f.parceiroId,
          vivos('parceiros').filter(p=>p.ativo||String(p.id)===String(f.parceiroId)).map(p=>({v:p.id,t:p.nome})),'Selecione o parceiro'), {req:true})+
        field('Branding', selectF('form.cliente.brandingId', f.brandingId,
          vivos('brandings').filter(b=>b.ativo||String(b.id)===String(f.brandingId)).map(b=>({v:b.id,t:b.descricao})),'Herdar do parceiro'),
          {hint:'Se vazio, usa o branding do parceiro comercial.'})+
      '</div>'+
      '<div class="mt20">'+switchF('form.cliente.ativo', f.ativo, 'Cliente ativo','Inativos não podem receber novas licenças.')+'</div>'+
    '</div></div>'+
    '<div class="grid g2">'+
      '<div class="card"><div class="card-body">'+
        '<h3 class="section-title">Contato principal</h3>'+
        '<div class="grid">'+
          field('Nome', inputF('form.cliente.contatoPrincipal.nome', f.contatoPrincipal.nome,'Nome do responsável'), {req:true})+
          field('E-mail', inputF('form.cliente.contatoPrincipal.email', f.contatoPrincipal.email,'email@empresa.com.br','email'), {req:true})+
          field('Telefone', inputF('form.cliente.contatoPrincipal.telefone', f.contatoPrincipal.telefone,'(00) 0000-0000'))+
        '</div>'+
      '</div></div>'+
      '<div class="card"><div class="card-body">'+
        '<div class="between mb16"><h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.04em">Outros contatos</h3>'+
        '<button class="btn btn-ghost btn-sm" onclick="addContato(\'cliente\')">'+IC.plus+'Adicionar contato</button></div>'+
        (f.contatos.length? f.contatos.map((c,i)=>
          '<div class="box mb16"><div class="box-title">Contato '+(i+1)+'</div>'+
            '<button class="icon-btn danger" style="position:absolute;top:8px;right:8px" onclick="rmContato(\'cliente\','+i+')">'+IC.x+'</button>'+
            '<div class="grid g2">'+
              field('Nome', inputF('form.cliente.contatos.'+i+'.nome', c.nome,'Nome'))+
              field('Cargo', inputF('form.cliente.contatos.'+i+'.cargo', c.cargo,'Cargo'))+
              field('E-mail', inputF('form.cliente.contatos.'+i+'.email', c.email,'email@empresa.com.br','email'))+
              field('Telefone', inputF('form.cliente.contatos.'+i+'.telefone', c.telefone,'(00) 0000-0000'))+
            '</div></div>').join('')
          : '<div class="empty" style="padding:26px">'+IC.users+'<h3>Somente o contato principal</h3><p>Adicione outros contatos se necessário.</p></div>')+
      '</div></div>'+
    '</div>'+
    '<div class="form-footer"><button class="btn btn-ghost" onclick="go(\'#/clientes\')">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveCliente('+(id||'')+')">'+IC.save+'Salvar Cliente</button></div>';
}
function saveCliente(id){
  const f=S.form.cliente;
  const miss=missing(f,[{k:'razaoSocial',t:'Razão Social'},{k:'nomeFantasia',t:'Nome Fantasia'},{k:'cnpj',t:'CNPJ'},{k:'parceiroId',t:'Parceiro Comercial'}])
    .concat(missing(f.contatoPrincipal,[{k:'nome',t:'Contato principal'},{k:'email',t:'E-mail do contato principal'}]));
  if(miss.length) return failValidation(miss);
  const data={razaoSocial:f.razaoSocial,nomeFantasia:f.nomeFantasia,cnpj:f.cnpj,parceiroId:num(f.parceiroId),
    brandingId:num(f.brandingId)||get('parceiros',num(f.parceiroId)).brandingId||null,
    contatoPrincipal:Object.assign({},f.contatoPrincipal), contatos:(f.contatos||[]).filter(c=>c.nome||c.email), ativo:!!f.ativo};
  let novoId=id;
  if(id){ Object.assign(get('clientes',id), data);
    log({entidade:'Cliente', entidadeId:id, rotulo:data.razaoSocial, tipo:'Alteração', rotuloEvento:'Cadastro alterado'}); }
  else { novoId=nextId('clientes'); DB.clientes.push(Object.assign({id:novoId},data));
    log({entidade:'Cliente', entidadeId:novoId, rotulo:data.razaoSocial, tipo:'Cadastro', rotuloEvento:'Cliente cadastrado'}); }
  S.form.cliente=null;
  go('#/clientes/'+novoId);
  toast('Cliente salvo', data.razaoSocial+' foi '+(id?'atualizado':'cadastrado')+'.');
}
function clienteDetalhe(id){
  const c = get('clientes', id);
  if(!c.id) return VIEWS['404']();
  const p = parceiroDe(c), br = brandingDe(c);
  const lics = licencasDe(c);
  const instal = DB.instalacoes.filter(i=>lics.some(l=>l.id===i.licencaId));
  const criticas = lics.filter(l=>['aexpirar','expirada','tolerancia','bloqueada'].includes(situacao(l).key)).length;

  return pageHead(c.nomeFantasia, c.razaoSocial+' · '+c.cnpj,
      '<button class="btn btn-ghost" onclick="go(\'#/clientes/'+id+'/editar\')">'+IC.edit+'Editar</button>'+
      '<button class="btn btn-primary" onclick="novaLicencaPara('+id+')">'+IC.plus+'Nova Licença</button>',
      [{t:'Clientes',href:'#/clientes'},{t:c.nomeFantasia}])+
    (criticas?'<div class="alert alert-warn mb20" style="margin-top:0">'+IC.alert+'<div>Este cliente possui <b>'+criticas+'</b> licença(s) que exigem atenção (expirada, bloqueada ou próxima da expiração).</div></div>':'')+
    '<div class="two-col">'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Dados do cliente</h2>'+badgeSituacao(c.ativo)+'</div>'+
        '<div class="card-body"><div class="dl">'+
          '<div><div class="k">Razão Social</div><div class="v">'+esc(c.razaoSocial)+'</div></div>'+
          '<div><div class="k">Nome Fantasia</div><div class="v">'+esc(c.nomeFantasia)+'</div></div>'+
          '<div><div class="k">CNPJ</div><div class="v">'+esc(c.cnpj)+'</div></div>'+
          '<div><div class="k">Contato principal</div><div class="v">'+esc(c.contatoPrincipal.nome)+
            '<span class="cell-sub">'+esc(c.contatoPrincipal.email)+' · '+esc(c.contatoPrincipal.telefone||'—')+'</span></div></div>'+
        '</div>'+
        ((c.contatos||[]).length?'<h3 class="section-title mt24">Outros contatos</h3><div class="table-wrap"><table class="mini-table"><tbody>'+
          c.contatos.map(x=>'<tr><td class="strong">'+esc(x.nome)+'</td><td>'+esc(x.cargo||'—')+'</td><td>'+esc(x.email)+'</td><td class="num">'+esc(x.telefone||'—')+'</td></tr>').join('')+
          '</tbody></table></div>':'')+
        '</div></div>'+
        '<div class="card mb16"><div class="card-head"><h2>Licenças do cliente</h2><span class="muted" style="font-size:12.5px">'+lics.length+' licença(s) independentes</span></div>'+
          (lics.length?'<div class="table-wrap"><table class="mini-table"><thead><tr><th>Licença</th><th>Tipo</th><th>Categoria</th><th>Instalações</th><th>Vigência</th><th>Situação</th><th></th></tr></thead><tbody>'+
            lics.map(l=>'<tr><td class="strong">'+esc(l.identificador)+'</td><td>'+badge(tipoLicDe(l).sigla,'b-ref')+'</td>'+
              '<td>'+esc(categoriaDe(l).descricao||'—')+'</td>'+
              '<td class="num">'+instalacoesDe(l).filter(i=>i.ativo).length+' / '+fmtLimite(limiteInstalacoes(l))+'</td>'+
              '<td class="num">'+fmtDate(l.inicio)+' – '+fmtDate(l.expiracao)+'</td>'+
              '<td>'+badge(situacao(l).label, situacao(l).cls)+'</td>'+
              '<td class="right"><button class="btn btn-ghost btn-sm" onclick="go(\'#/licencas/'+l.id+'\')">Visão 360º</button></td></tr>').join('')+
            '</tbody></table></div>'
          :'<div class="empty">'+IC.key+'<h3>Nenhuma licença emitida</h3><p>Emita a primeira licença para este cliente.</p>'+
            '<button class="btn btn-primary" onclick="novaLicencaPara('+id+')">'+IC.plus+'Nova Licença</button></div>')+
        '</div>'+
        '<div class="card"><div class="card-head"><h2>Instalações do cliente</h2><span class="muted" style="font-size:12.5px">'+instal.length+'</span></div>'+
          (instal.length?'<div class="table-wrap"><table class="mini-table"><thead><tr><th>Instalação</th><th>Licença</th><th>Ambiente</th><th>Tipo</th><th>Situação</th></tr></thead><tbody>'+
            instal.map(i=>'<tr><td class="strong"><span class="linkcell" onclick="go(\'#/instalacoes/'+i.id+'\')">'+esc(i.descricao)+'</span>'+
              '<span class="cell-sub">'+esc(i.identificador)+'</span></td>'+
              '<td>'+esc(get('licencas',i.licencaId).identificador)+'</td>'+
              '<td>'+badge(get('ambientes',i.ambienteId).sigla,'b-ref')+'</td>'+
              '<td>'+(i.temporaria?badge('Temporária','b-amber'):badge('Permanente','b-gray'))+'</td>'+
              '<td>'+badgeSituacao(i.ativo, true)+'</td></tr>').join('')+
            '</tbody></table></div>'
          :'<div class="empty">'+IC.server+'<h3>Nenhuma instalação registrada</h3><p>As instalações são cadastradas a partir da licença.</p></div>')+
        '</div>'+
      '</div>'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Parceiro comercial</h2></div><div class="card-body">'+
          '<div style="font-weight:700;color:var(--slate-900)">'+esc(p.nome)+'</div>'+
          '<div class="muted" style="font-size:12.5px">'+esc(p.cnpj)+' · '+esc(p.cidade+'/'+p.uf)+'</div>'+
          '<div class="mt8">'+badge(get('tiposParceiro',p.tipoParceiroId).descricao||'—','b-ref')+'</div>'+
          '<button class="btn btn-ghost btn-sm mt16" onclick="go(\'#/parceiros/'+p.id+'\')">'+IC.link+'Abrir parceiro</button>'+
        '</div></div>'+
        '<div class="card mb16"><div class="card-head"><h2>Branding</h2></div><div class="card-body">'+
          '<div class="preview mb16"><div class="ph" style="background:'+(br.cor||'#94a3b8')+'">'+esc(br.descricao||'Sem branding')+'</div>'+
          '<div class="bar"><span>Fundo do login</span><span>'+esc(br.loginBg||'não enviado')+'</span></div></div>'+
          '<button class="btn btn-ghost btn-sm" onclick="go(\'#/branding/'+(br.id||'')+'\')">'+IC.palette+'Ver branding</button>'+
        '</div></div>'+
        cardHistorico('Cliente', id)+
      '</div>'+
    '</div>';
}
function novaLicencaPara(clienteId){ S.form.licenca=null; S.novaLicClienteId=clienteId; go('#/licencas/nova'); }

/* =========================================================
   3.4 PRODUTOS
   ========================================================= */
VIEWS['produtos'] = function(){
  const key='prod';
  const rows = baseLista('produtos', key, (r,q)=>norm(r.nome).includes(q)||norm(r.sigla).includes(q));
  return pageHead('Produtos','Produtos Weknow disponíveis para vinculação nas licenças.',
      '<button class="btn btn-primary" onclick="openProduto()">'+IC.plus+'Novo Produto</button>')+
    '<div class="filters">'+searchBox(key,'Buscar nome ou sigla')+filtroSituacao(key)+filtroExcluidos(key,'produtos')+(temFiltro(key)?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:temFiltro(key), perPage:10,
      emptyAction:'<button class="btn btn-primary" onclick="openProduto()">'+IC.plus+'Novo Produto</button>',
      columns:[
        {label:'Nome', key:'nome', cls:'strong', sortVal:r=>r.nome, render:r=>esc(r.nome)},
        {label:'Sigla', key:'sig', width:'150px', sortVal:r=>r.sigla, render:r=>badge(r.sigla,'b-ref')},
        {label:'Versão', key:'ver', width:'130px', cls:'num', sortVal:r=>r.versao, render:r=>esc(r.versao)},
        {label:'Licenças', key:'lic', width:'120px', sortVal:r=>DB.licencas.filter(l=>l.produtos.includes(r.id)).length,
          render:r=>DB.licencas.filter(l=>l.produtos.includes(r.id)).length},
        {label:'Situação', key:'s', width:'120px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'150px', align:true, render:r=>acoesCadastro('produtos', r.id, {
          editar:'openProduto('+r.id+')',
          vinculos:(function(){ const n=DB.licencas.filter(l=>l.produtos.includes(r.id)).length; return n?[n+' licença(s)']:[]; })()
        })}
      ]});
};
function openProduto(id){
  const r = id?get('produtos',id):{nome:'',sigla:'',versao:'',ativo:true};
  S.form.prod = {id, nome:r.nome, sigla:r.sigla, versao:r.versao, ativo:r.ativo!==false};
  renderProdutoModal();
}
function renderProdutoModal(){
  setModalRender(renderProdutoModal);
  const f=S.form.prod;
  openModal('<h2>'+(f.id?'Editar':'Novo')+' Produto</h2>'+
    '<div class="grid g2">'+
      field('Nome', inputF('form.prod.nome', f.nome,'Ex.: Weknow Enterprise'), {req:true, span2:true})+
      field('Sigla', inputF('form.prod.sigla', f.sigla,'WK-XXX'), {req:true})+
      field('Versão', inputF('form.prod.versao', f.versao,'0.0.0'), {req:true})+
    '</div>'+
    '<div class="box mt20"><div class="box-title">Situação</div>'+switchF('form.prod.ativo', f.ativo, 'Produto ativo')+'</div>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveProduto()">'+IC.save+'Salvar</button></div>','md');
}
function saveProduto(){
  const f=S.form.prod, miss=missing(f,[{k:'nome',t:'Nome'},{k:'sigla',t:'Sigla'},{k:'versao',t:'Versão'}]);
  if(miss.length) return failValidation(miss);
  const data={nome:f.nome,sigla:f.sigla,versao:f.versao,ativo:!!f.ativo};
  if(f.id){ const r=get('produtos',f.id), antes=r.versao; Object.assign(r,data);
    log({entidade:'Produto', entidadeId:f.id, rotulo:data.nome, tipo:'Alteração', rotuloEvento:'Cadastro alterado',
         de:antes!==data.versao?'versão '+antes:null, para:antes!==data.versao?'versão '+data.versao:null}); }
  else { const id=nextId('produtos'); DB.produtos.push(Object.assign({id},data));
    log({entidade:'Produto', entidadeId:id, rotulo:data.nome, tipo:'Cadastro', rotuloEvento:'Produto cadastrado'}); }
  closeModal(); render(); toast('Produto salvo', data.nome+' '+data.versao);
}

/* =========================================================
   3.5 TIPOS DE LICENÇA
   ========================================================= */
VIEWS['tipos-licenca'] = function(parts){
  if(parts[1]==='novo') return tipoLicencaForm(null);
  if(parts[2]==='editar') return tipoLicencaForm(Number(parts[1]));
  if(parts[1]) return tipoLicencaDetalhe(Number(parts[1]));

  const key='tl';
  const rows = baseLista('tiposLicenca', key, (r,q)=>norm(r.sigla).includes(q)||norm(r.descricao).includes(q));
  return pageHead('Tipos de Licença','Modelo comercial da licença: limites, duração e permissões.', btnNew('Novo Tipo de Licença','#/tipos-licenca/novo'),
      [{t:'Configurações'},{t:'Tipos de Licença'}])+
    '<div class="filters">'+searchBox(key,'Buscar sigla ou descrição')+filtroSituacao(key)+filtroExcluidos(key,'tiposLicenca')+(temFiltro(key)?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:temFiltro(key), perPage:10, emptyAction:btnNew('Novo Tipo de Licença','#/tipos-licenca/novo'),
      columns:[
        {label:'Sigla', key:'sg', width:'175px', sortVal:r=>r.sigla, render:r=>badge(r.sigla,'b-ref')},
        {label:'Descrição', key:'ds', cls:'strong', sortVal:r=>r.descricao,
          render:r=>'<span class="linkcell" onclick="go(\'#/tipos-licenca/'+r.id+'\')">'+esc(r.descricao)+'</span>'},
        {label:'Duração máx.', key:'dur', width:'130px', cls:'num', sortVal:r=>r.duracaoMaxDias, render:r=>r.duracaoMaxDias+' dias'},
        {label:'Concorrentes', key:'cc', width:'125px', cls:'num', sortVal:r=>r.qtdConcorrentes, render:r=>r.qtdConcorrentes},
        {label:'Instalações', key:'ins', width:'115px', cls:'num', sortVal:r=>r.qtdInstalacoes, render:r=>r.qtdInstalacoes},
        {label:'Managers', key:'mg', width:'110px', cls:'num', sortVal:r=>r.qtdManagers, render:r=>r.qtdManagers},
        {label:'Cancel. parceiro', key:'cp', width:'150px', render:r=>r.cancelaParceiro?badge('Permite','b-green'):badge('Não permite','b-gray')},
        {label:'Situação', key:'s', width:'110px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'175px', align:true, render:r=>acoesCadastro('tiposLicenca', r.id, {
          ver:'#/tipos-licenca/'+r.id, editar:'#/tipos-licenca/'+r.id+'/editar',
          vinculos:(function(){ const n=DB.licencas.filter(l=>l.tipoLicencaId===r.id).length; return n?[n+' licença(s)']:[]; })()
        })}
      ]});
};
function tipoLicencaForm(id){
  const base=id?get('tiposLicenca',id):null;
  const f=useForm('tipoLic','t'+(id||'novo'), ()=> base?JSON.parse(JSON.stringify(base))
    :{sigla:'',descricao:'',duracaoMaxDias:'',qtdContatos:'',qtdConcorrentes:'',qtdInstalacoes:'',qtdManagers:'',cancelaParceiro:false,ativo:true});
  return pageHead(id?'Editar Tipo de Licença':'Novo Tipo de Licença', id?esc(base.descricao):'Defina limites, duração e permissões do modelo comercial.',
      '<button class="btn btn-ghost" onclick="go(\'#/tipos-licenca\')">'+IC.x+'Cancelar</button>'+
      '<button class="btn btn-primary" onclick="saveTipoLicenca('+(id||'')+')">'+IC.save+'Salvar</button>',
      [{t:'Tipos de Licença',href:'#/tipos-licenca'},{t:id?'Editar':'Novo'}])+
    '<div class="grid g2">'+
      '<div class="card"><div class="card-body">'+
        '<h3 class="section-title">Identificação e limites</h3>'+
        '<div class="grid g2">'+
          field('Sigla', inputF('form.tipoLic.sigla', f.sigla,'Ex.: LUT - Enterprise'), {req:true})+
          field('Duração máxima (dias)', inputF('form.tipoLic.duracaoMaxDias', f.duracaoMaxDias,'365','number'), {req:true})+
          field('Descrição', inputF('form.tipoLic.descricao', f.descricao,'Ex.: Licença de Uso Temporária — Weknow Enterprise'), {req:true, span2:true})+
          field('Quantidade de contatos', inputF('form.tipoLic.qtdContatos', f.qtdContatos,'0','number'))+
          field('Acessos concorrentes', inputF('form.tipoLic.qtdConcorrentes', f.qtdConcorrentes,'0','number'))+
          field('Quantidade de instalações', inputF('form.tipoLic.qtdInstalacoes', f.qtdInstalacoes,'0','number'))+
          field('Quantidade de managers', inputF('form.tipoLic.qtdManagers', f.qtdManagers,'0','number'))+
        '</div>'+
      '</div></div>'+
      '<div class="card"><div class="card-body">'+
        '<h3 class="section-title">Permissões e situação</h3>'+
        '<div class="box">'+
          switchF('form.tipoLic.cancelaParceiro', f.cancelaParceiro, 'Permite cancelamento pelo Parceiro Comercial')+
          switchF('form.tipoLic.ativo', f.ativo, 'Tipo ativo', 'Inativos não podem ser usados em novas licenças.')+
        '</div>'+
        '<div class="alert alert-info mt20">'+IC.info+'<div>Estes limites são copiados para a licença na emissão. Depois, cada licença pode ter '+
        '<b>limites próprios</b> e receber <b>liberações temporárias</b> sem alterar o tipo.</div></div>'+
      '</div></div>'+
    '</div>'+
    '<div class="form-footer"><button class="btn btn-ghost" onclick="go(\'#/tipos-licenca\')">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveTipoLicenca('+(id||'')+')">'+IC.save+'Salvar Tipo de Licença</button></div>';
}
function saveTipoLicenca(id){
  const f=S.form.tipoLic, miss=missing(f,[{k:'sigla',t:'Sigla'},{k:'descricao',t:'Descrição'},{k:'duracaoMaxDias',t:'Duração máxima'}]);
  if(miss.length) return failValidation(miss);
  const data={sigla:f.sigla,descricao:f.descricao,duracaoMaxDias:num(f.duracaoMaxDias),qtdContatos:num(f.qtdContatos),
    qtdConcorrentes:num(f.qtdConcorrentes),qtdInstalacoes:num(f.qtdInstalacoes),qtdManagers:num(f.qtdManagers),
    cancelaParceiro:!!f.cancelaParceiro, ativo:!!f.ativo};
  let novoId=id;
  if(id){ Object.assign(get('tiposLicenca',id), data);
    log({entidade:'Tipo de Licença', entidadeId:id, rotulo:data.sigla, tipo:'Alteração', rotuloEvento:'Cadastro alterado'}); }
  else { novoId=nextId('tiposLicenca'); DB.tiposLicenca.push(Object.assign({id:novoId},data));
    log({entidade:'Tipo de Licença', entidadeId:novoId, rotulo:data.sigla, tipo:'Cadastro', rotuloEvento:'Tipo de licença cadastrado'}); }
  S.form.tipoLic=null; go('#/tipos-licenca/'+novoId); toast('Tipo de licença salvo', data.sigla);
}
function tipoLicencaDetalhe(id){
  const t=get('tiposLicenca',id);
  if(!t.id) return VIEWS['404']();
  const lics=DB.licencas.filter(l=>l.tipoLicencaId===id);
  const parceiros=DB.parceiros.filter(p=>(p.tiposLicenca||[]).includes(id));
  const par=(k,v)=>'<div><div class="k">'+esc(k)+'</div><div class="v">'+v+'</div></div>';
  return pageHead(t.sigla, t.descricao,
      '<button class="btn btn-primary" onclick="go(\'#/tipos-licenca/'+id+'/editar\')">'+IC.edit+'Editar</button>',
      [{t:'Tipos de Licença',href:'#/tipos-licenca'},{t:t.sigla}])+
    '<div class="two-col">'+
      '<div class="card"><div class="card-head"><h2>Parâmetros do modelo</h2>'+badgeSituacao(t.ativo)+'</div><div class="card-body">'+
        '<div class="dl">'+par('Sigla', badge(t.sigla,'b-ref'))+par('Duração máxima', t.duracaoMaxDias+' dias')+
        par('Quantidade de contatos', t.qtdContatos)+par('Acessos concorrentes', t.qtdConcorrentes)+
        par('Quantidade de instalações', t.qtdInstalacoes)+par('Quantidade de managers', t.qtdManagers)+
        par('Licenças emitidas', lics.length)+par('Parceiros habilitados', parceiros.length)+'</div>'+
        '<h3 class="section-title mt24">Permissões</h3>'+
        badge((t.cancelaParceiro?'✓ ':'✕ ')+'Cancelamento pelo Parceiro Comercial', t.cancelaParceiro?'b-green':'b-gray')+
      '</div></div>'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Licenças com este tipo</h2></div>'+
          (lics.length?'<div class="table-wrap"><table class="mini-table"><tbody>'+
            lics.slice(0,7).map(l=>'<tr><td class="strong"><span class="linkcell" onclick="go(\'#/licencas/'+l.id+'\')">'+esc(l.identificador)+'</span></td>'+
              '<td>'+esc(clienteDe(l).nomeFantasia)+'</td><td>'+badge(situacao(l).label,situacao(l).cls)+'</td></tr>').join('')+
            '</tbody></table></div>'
          :'<div class="empty">'+IC.key+'<h3>Nenhuma licença</h3><p>Nenhuma licença usa este tipo.</p></div>')+
        '</div>'+
        cardHistorico('Tipo de Licença', id)+
      '</div>'+
    '</div>';
}

/* =========================================================
   CATEGORIAS DE LICENÇA
   ========================================================= */
VIEWS['categorias'] = function(parts){
  if(parts[1]) return categoriaDetalhe(Number(parts[1]));
  const key='cat';
  const rows = baseLista('categorias', key, (r,q)=>norm(r.sigla).includes(q)||norm(r.descricao).includes(q));
  return pageHead('Categorias de Licença','Classifica a licença como Cliente, Parceiro Comercial ou Uso Interno.',
      '<button class="btn btn-primary" onclick="openCategoria()">'+IC.plus+'Nova Categoria</button>',
      [{t:'Configurações'},{t:'Categorias de Licença'}])+
    '<div class="filters">'+searchBox(key,'Buscar sigla ou descrição')+filtroSituacao(key)+filtroExcluidos(key,'categorias')+(temFiltro(key)?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:temFiltro(key), perPage:10,
      emptyAction:'<button class="btn btn-primary" onclick="openCategoria()">'+IC.plus+'Nova Categoria</button>',
      columns:[
        {label:'Sigla', key:'sg', width:'140px', sortVal:r=>r.sigla, render:r=>badge(r.sigla,'b-violet')},
        {label:'Descrição', key:'ds', cls:'strong', sortVal:r=>r.descricao,
          render:r=>'<span class="linkcell" onclick="go(\'#/categorias/'+r.id+'\')">'+esc(r.descricao)+'</span>'},
        {label:'Licenças', key:'lic', width:'150px', sortVal:r=>DB.licencas.filter(l=>l.categoriaId===r.id).length,
          render:r=>DB.licencas.filter(l=>l.categoriaId===r.id).length},
        {label:'Situação', key:'s', width:'120px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo, true)},
        {label:'', key:'a', width:'175px', align:true, render:r=>acoesCadastro('categorias', r.id, {
          ver:'#/categorias/'+r.id, editar:'openCategoria('+r.id+')',
          vinculos:(function(){ const n=DB.licencas.filter(l=>l.categoriaId===r.id).length; return n?[n+' licença(s)']:[]; })()
        })}
      ]});
};
function openCategoria(id){
  const r = id?get('categorias',id):{sigla:'',descricao:'',ativo:true};
  S.form.cat = {id, sigla:r.sigla, descricao:r.descricao, ativo:r.ativo!==false};
  renderCategoriaModal();
}
function renderCategoriaModal(){
  setModalRender(renderCategoriaModal);
  const f=S.form.cat;
  openModal('<h2>'+(f.id?'Editar':'Nova')+' Categoria de Licença</h2>'+
    '<div class="grid g2">'+
      field('Sigla', inputF('form.cat.sigla', f.sigla,'Ex.: CLI'), {req:true})+
      field('Descrição', inputF('form.cat.descricao', f.descricao,'Ex.: Cliente'), {req:true})+
    '</div>'+
    '<div class="box mt20"><div class="box-title">Situação</div>'+switchF('form.cat.ativo', f.ativo, 'Categoria ativa')+'</div>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveCategoria()">'+IC.save+'Salvar</button></div>');
}
function saveCategoria(){
  const f=S.form.cat, miss=missing(f,[{k:'sigla',t:'Sigla'},{k:'descricao',t:'Descrição'}]);
  if(miss.length) return failValidation(miss);
  const data={sigla:f.sigla,descricao:f.descricao,ativo:!!f.ativo};
  if(f.id){ Object.assign(get('categorias',f.id), data);
    log({entidade:'Categoria de Licença', entidadeId:f.id, rotulo:data.descricao, tipo:'Alteração', rotuloEvento:'Cadastro alterado'}); }
  else { const id=nextId('categorias'); DB.categorias.push(Object.assign({id},data));
    log({entidade:'Categoria de Licença', entidadeId:id, rotulo:data.descricao, tipo:'Cadastro', rotuloEvento:'Categoria cadastrada'}); }
  closeModal(); render(); toast('Categoria salva', data.sigla+' — '+data.descricao);
}
function categoriaDetalhe(id){
  const c=get('categorias',id);
  if(!c.id) return VIEWS['404']();
  const lics=DB.licencas.filter(l=>l.categoriaId===id);
  return pageHead(c.descricao, 'Categoria '+c.sigla,
      '<button class="btn btn-primary" onclick="openCategoria('+id+')">'+IC.edit+'Editar</button>',
      [{t:'Categorias de Licença',href:'#/categorias'},{t:c.descricao}])+
    '<div class="two-col">'+
      '<div class="card"><div class="card-head"><h2>Licenças nesta categoria</h2>'+badgeSituacao(c.ativo, true)+'</div>'+
        (lics.length?'<div class="table-wrap"><table class="mini-table"><thead><tr><th>Licença</th><th>Cliente</th><th>Tipo</th><th>Situação</th><th></th></tr></thead><tbody>'+
          lics.map(l=>'<tr><td class="strong">'+esc(l.identificador)+'</td><td>'+esc(clienteDe(l).nomeFantasia)+'</td>'+
            '<td>'+badge(tipoLicDe(l).sigla,'b-ref')+'</td><td>'+badge(situacao(l).label,situacao(l).cls)+'</td>'+
            '<td class="right"><button class="btn btn-ghost btn-sm" onclick="go(\'#/licencas/'+l.id+'\')">Abrir</button></td></tr>').join('')+
          '</tbody></table></div>'
        :'<div class="empty">'+IC.key+'<h3>Nenhuma licença</h3><p>Nenhuma licença usa esta categoria.</p></div>')+
      '</div>'+
      cardHistorico('Categoria de Licença', id)+
    '</div>';
}

/* =========================================================
   3.8 AMBIENTES
   ========================================================= */
VIEWS['ambientes'] = function(parts){
  if(parts[1]) return ambienteDetalhe(Number(parts[1]));
  const key='amb';
  const rows = baseLista('ambientes', key, (r,q)=>norm(r.sigla).includes(q)||norm(r.descricao).includes(q));
  return pageHead('Ambientes','Contexto de utilização das instalações. Obrigatório em toda instalação.',
      '<button class="btn btn-primary" onclick="openAmbiente()">'+IC.plus+'Novo Ambiente</button>',
      [{t:'Configurações'},{t:'Ambientes'}])+
    '<div class="filters">'+searchBox(key,'Buscar sigla ou descrição')+filtroSituacao(key)+filtroExcluidos(key,'ambientes')+(temFiltro(key)?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:temFiltro(key), perPage:10,
      emptyAction:'<button class="btn btn-primary" onclick="openAmbiente()">'+IC.plus+'Novo Ambiente</button>',
      columns:[
        {label:'Sigla', key:'sg', width:'150px', sortVal:r=>r.sigla, render:r=>marcadorAmbiente(r)},
        {label:'Descrição', key:'ds', cls:'strong', sortVal:r=>r.descricao,
          render:r=>'<span class="linkcell" onclick="go(\'#/ambientes/'+r.id+'\')">'+esc(r.descricao)+'</span>'},
        {label:'Instalações', key:'ins', width:'170px', sortVal:r=>DB.instalacoes.filter(i=>i.ambienteId===r.id).length,
          render:r=>{ const n=DB.instalacoes.filter(i=>i.ambienteId===r.id).length;
            return n?'<span class="linkcell" onclick="setListF(\'inst\',\'ambiente\',\''+r.id+'\');go(\'#/instalacoes\')">'+n+' instalação(ões)</span>':'<span class="muted">Nenhuma</span>'; }},
        {label:'Situação', key:'s', width:'120px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'175px', align:true, render:r=>acoesCadastro('ambientes', r.id, {
          ver:'#/ambientes/'+r.id, editar:'openAmbiente('+r.id+')',
          vinculos:(function(){ const n=DB.instalacoes.filter(i=>i.ambienteId===r.id).length; return n?[n+' instalação(ões)']:[]; })()
        })}
      ]});
};
function openAmbiente(id){
  const r = id?get('ambientes',id):{sigla:'',descricao:'',cor:'#64748b',ativo:true};
  S.form.amb = {id, sigla:r.sigla, descricao:r.descricao, cor:r.cor||'#64748b', ativo:r.ativo!==false};
  renderAmbienteModal();
}
function renderAmbienteModal(){
  setModalRender(renderAmbienteModal);
  const f=S.form.amb;
  openModal('<h2>'+(f.id?'Editar':'Novo')+' Ambiente</h2>'+
    '<div class="grid g2">'+
      field('Sigla', inputF('form.amb.sigla', f.sigla,'Ex.: PRD'), {req:true})+
      field('Descrição', inputF('form.amb.descricao', f.descricao,'Ex.: Produção'), {req:true})+
    '</div>'+
    '<p class="muted mt8" style="font-size:12px">Exemplos: Produção, Homologação, Testes, Suporte, Demonstração, POC, Parceiro, Gratuidade.</p>'+
    '<div class="mt20">'+field('Cor',
      '<div class="cor-picker">'+
        '<input type="color" value="'+esc(f.cor)+'" onchange="setF(\'form.amb.cor\',this.value)">'+
        '<div class="cor-presets">'+
          ['#16a34a','#3366cc','#f59e0b','#dc2626','#7c3aed','#0e7490','#db2777','#64748b']
            .map(cor=>'<button style="background:'+cor+'" class="'+(String(f.cor).toLowerCase()===cor?'on':'')+'" title="'+cor+'" onclick="setF(\'form.amb.cor\',\''+cor+'\')"></button>').join('')+
        '</div>'+
        '<span class="amb" style="margin-left:4px"><i style="background:'+esc(f.cor)+'"></i>'+esc(f.sigla||'PRD')+'</span>'+
      '</div>',
      {hint:'Identifica o ambiente nas listas de Ambientes e de Instalações.'})+'</div>'+
    '<div class="box mt20"><div class="box-title">Situação</div>'+switchF('form.amb.ativo', f.ativo, 'Ambiente ativo')+'</div>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveAmbiente()">'+IC.save+'Salvar</button></div>');
}
function saveAmbiente(){
  const f=S.form.amb, miss=missing(f,[{k:'sigla',t:'Sigla'},{k:'descricao',t:'Descrição'}]);
  if(miss.length) return failValidation(miss);
  const data={sigla:f.sigla,descricao:f.descricao,cor:f.cor||'#64748b',ativo:!!f.ativo};
  if(f.id){ Object.assign(get('ambientes',f.id), data);
    log({entidade:'Ambiente', entidadeId:f.id, rotulo:data.sigla+' — '+data.descricao, tipo:'Alteração', rotuloEvento:'Cadastro alterado'}); }
  else { const id=nextId('ambientes'); DB.ambientes.push(Object.assign({id},data));
    log({entidade:'Ambiente', entidadeId:id, rotulo:data.sigla+' — '+data.descricao, tipo:'Cadastro', rotuloEvento:'Ambiente cadastrado'}); }
  closeModal(); render(); toast('Ambiente salvo', data.sigla+' — '+data.descricao);
}
function ambienteDetalhe(id){
  const a=get('ambientes',id);
  if(!a.id) return VIEWS['404']();
  const inst=DB.instalacoes.filter(i=>i.ambienteId===id);
  return pageHead(a.descricao, 'Ambiente '+a.sigla,
      '<button class="btn btn-primary" onclick="openAmbiente('+id+')">'+IC.edit+'Editar</button>',
      [{t:'Ambientes',href:'#/ambientes'},{t:a.descricao}])+
    '<div class="two-col">'+
      '<div class="card"><div class="card-head"><h2>Instalações neste ambiente</h2>'+badgeSituacao(a.ativo)+'</div>'+
        (inst.length?'<div class="table-wrap"><table class="mini-table"><thead><tr><th>Instalação</th><th>Licença</th><th>Cliente</th><th>Tipo</th><th>Situação</th><th></th></tr></thead><tbody>'+
          inst.map(i=>{ const l=get('licencas',i.licencaId);
            return '<tr><td class="strong">'+esc(i.descricao)+'<span class="cell-sub">'+esc(i.identificador)+'</span></td>'+
            '<td>'+esc(l.identificador)+'</td><td>'+esc(clienteDe(l).nomeFantasia)+'</td>'+
            '<td>'+(i.temporaria?badge('Temporária','b-amber'):badge('Permanente','b-gray'))+'</td>'+
            '<td>'+badgeSituacao(i.ativo, true)+'</td>'+
            '<td class="right"><button class="btn btn-ghost btn-sm" onclick="go(\'#/instalacoes/'+i.id+'\')">Abrir</button></td></tr>'; }).join('')+
          '</tbody></table></div>'
        :'<div class="empty">'+IC.server+'<h3>Nenhuma instalação</h3><p>Nenhuma instalação usa este ambiente.</p></div>')+
      '</div>'+
      cardHistorico('Ambiente', id)+
    '</div>';
}

/* =========================================================
   3.6 BRANDING
   ========================================================= */
VIEWS['branding'] = function(parts){
  if(parts[1]==='novo') return brandingForm(null);
  if(parts[1]) return brandingForm(Number(parts[1]));
  const key='brd';
  const rows = baseLista('brandings', key, (r,q)=>norm(r.descricao).includes(q));
  return pageHead('Branding','Identidade visual aplicada às janelas do cliente desktop.', btnNew('Novo Branding','#/branding/novo'))+
    '<div class="filters">'+searchBox(key,'Buscar descrição')+filtroSituacao(key)+filtroExcluidos(key,'brandings')+(temFiltro(key)?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:temFiltro(key), perPage:10, emptyAction:btnNew('Novo Branding','#/branding/novo'),
      columns:[
        {label:'Descrição', key:'t', cls:'strong', sortVal:r=>r.descricao,
          render:r=>'<div class="flex"><span style="width:24px;height:24px;border-radius:6px;background:'+r.cor+'"></span>'+
            '<span class="linkcell" onclick="go(\'#/branding/'+r.id+'\')">'+esc(r.descricao)+'</span></div>'},
        {label:'Imagem de fundo do login', key:'bg', width:'240px',
          render:r=>r.loginBg?'<span class="muted">'+esc(r.loginBg)+'</span>':badge('Não enviada','b-amber')},
        {label:'Logo das janelas internas', key:'lg', width:'240px',
          render:r=>r.logo?'<span class="muted">'+esc(r.logo)+'</span>':badge('Não enviada','b-amber')},
        {label:'Em uso', key:'uso', width:'130px', render:r=>{ const n=usosBranding(r.id); return n?n+' vínculo(s)':'<span class="muted">Nenhum</span>';}},
        {label:'Situação', key:'s', width:'110px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'150px', align:true, render:r=>acoesCadastro('brandings', r.id, {
          editar:'#/branding/'+r.id,
          vinculos:(function(){ const n=usosBranding(r.id); return n?[n+' vínculo(s)']:[]; })()
        })}
      ]});
};
function usosBranding(id){
  return DB.clientes.filter(c=>c.brandingId===id).length + DB.parceiros.filter(p=>p.brandingId===id).length +
         DB.licencas.filter(l=>l.brandingId===id).length + DB.instalacoes.filter(i=>i.brandingId===id).length;
}
function brandingForm(id){
  const base = id?get('brandings',id):null;
  if(id && !base.id) return VIEWS['404']();
  const f = useForm('branding','b'+(id||'novo'), ()=> base?JSON.parse(JSON.stringify(base))
    :{descricao:'',cor:'#16a34a',loginBg:'',logo:'',ativo:true});
  const usos = id? usosBranding(id) : 0;

  const upload = (label, arquivo, campo, ajuda, altura) =>
    '<div class="field"><label>'+esc(label)+'</label>'+
      (arquivo
        ? '<div class="preview"><div class="ph" style="background:'+f.cor+';height:'+(altura||130)+'px">'+esc(arquivo)+'</div>'+
          '<div class="bar"><span>'+esc(arquivo)+'</span><span class="flex" style="gap:4px">'+
            '<button class="btn btn-ghost btn-sm" onclick="selecionarArquivo(\''+campo+'\')">'+IC.upload+'Selecionar Arquivo</button>'+
            '<button class="icon-btn danger" title="Remover" onclick="setF(\'form.branding.'+campo+'\',\'\')">'+IC.x+'</button></span></div></div>'
        : '<div class="upload" onclick="selecionarArquivo(\''+campo+'\')">'+IC.upload+
          '<p><b>Selecionar Arquivo</b></p><p style="font-size:11.5px;margin-top:4px">PNG, JPG ou SVG — até 4 MB</p></div>')+
      '<span class="hint">'+esc(ajuda)+'</span>'+
    '</div>';

  return pageHead(id?'Editar Branding':'Novo Branding', id?esc(base.descricao):'Configure as imagens aplicadas ao cliente desktop.',
      '<button class="btn btn-ghost" onclick="go(\'#/branding\')">'+IC.x+'Cancelar</button>'+
      '<button class="btn btn-primary" onclick="saveBranding('+(id||'')+')">'+IC.save+'Salvar</button>',
      [{t:'Branding',href:'#/branding'},{t:id?'Editar':'Novo'}])+
    '<div class="grid g2">'+
      '<div class="card"><div class="card-body">'+
        '<h3 class="section-title">Identificação</h3>'+
        field('Descrição', inputF('form.branding.descricao', f.descricao,'Ex.: Weknow Padrão'), {req:true})+
        '<div class="mt16">'+field('Cor de destaque', '<input class="input" type="color" value="'+esc(f.cor)+'" style="height:42px;padding:4px" onchange="setF(\'form.branding.cor\',this.value)">',
          {hint:'Usada nas pré-visualizações do protótipo.'})+'</div>'+
        '<div class="mt16">'+switchF('form.branding.ativo', f.ativo, 'Branding ativo')+'</div>'+
        (usos?'<div class="alert alert-info mt20">'+IC.info+'<div>Este branding está aplicado em <b>'+usos+'</b> registro(s). Alterações passam a valer para todos eles.</div></div>':'')+
      '</div></div>'+
      '<div class="card"><div class="card-body">'+
        '<div class="tabs" style="margin-bottom:18px"><button class="on">Cliente desktop</button></div>'+
        upload('Imagem de fundo da janela de login', f.loginBg, 'loginBg', 'Aplicada na janela de login do cliente desktop.', 150)+
        '<div class="mt20">'+upload('Logo para todas as janelas internas', f.logo, 'logo', 'Logotipo exibido nas janelas internas do cliente desktop.', 90)+'</div>'+
      '</div></div>'+
    '</div>'+
    '<div class="form-footer"><button class="btn btn-ghost" onclick="go(\'#/branding\')">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveBranding('+(id||'')+')">'+IC.save+'Salvar Branding</button></div>';
}
function selecionarArquivo(campo){
  const nomes = {loginBg:'login-background.jpg', logo:'logo-interna.svg'};
  setF('form.branding.'+campo, nomes[campo]);
  toast('Arquivo selecionado', nomes[campo]+' — pré-visualização atualizada.');
}
function saveBranding(id){
  const f=S.form.branding, miss=missing(f,[{k:'descricao',t:'Descrição'}]);
  if(miss.length) return failValidation(miss);
  const data={descricao:f.descricao,cor:f.cor,loginBg:f.loginBg,logo:f.logo,ativo:!!f.ativo};
  if(id){ Object.assign(get('brandings',id), data);
    log({entidade:'Branding', entidadeId:id, rotulo:data.descricao, tipo:'Alteração', rotuloEvento:'Branding alterado'}); }
  else { const novo=nextId('brandings'); DB.brandings.push(Object.assign({id:novo},data));
    log({entidade:'Branding', entidadeId:novo, rotulo:data.descricao, tipo:'Cadastro', rotuloEvento:'Branding cadastrado'}); }
  S.form.branding=null; go('#/branding'); toast('Branding salvo', data.descricao);
}

/* =========================================================
   3.11 MOTIVOS DE ALTERAÇÃO DE STATUS
   ========================================================= */
VIEWS['motivos'] = function(parts){
  if(parts[1]) return motivoDetalhe(Number(parts[1]));
  const key='mot';
  const rows = baseLista('motivos', key, (r,q)=>norm(r.descricao).includes(q)||norm(r.titulo||'').includes(q));
  return pageHead('Motivos de Alteração de Status','Justificativas registradas na alteração de situação das licenças.',
      '<button class="btn btn-primary" onclick="openMotivo()">'+IC.plus+'Novo Motivo</button>',
      [{t:'Configurações'},{t:'Motivos de Alteração de Status'}])+
    '<div class="filters">'+searchBox(key,'Buscar descrição')+filtroSituacao(key)+filtroExcluidos(key,'motivos')+(temFiltro(key)?btnClear(key):'')+'</div>'+
    dataTable({key, rows, hasFilters:temFiltro(key), perPage:10,
      emptyAction:'<button class="btn btn-primary" onclick="openMotivo()">'+IC.plus+'Novo Motivo</button>',
      columns:[
        {label:'Descrição', key:'ds', cls:'strong', sortVal:r=>r.descricao,
          render:r=>'<span class="linkcell" onclick="go(\'#/motivos/'+r.id+'\')">'+esc(r.descricao)+'</span>'+
            (r.titulo?'<span class="cell-sub">'+esc(r.titulo)+'</span>':'')},
        {label:'Notificação', key:'nt', width:'175px', sortVal:r=>r.notifica?0:1,
          render:r=>r.notifica?badge('Notifica cliente','b-blue'):badge('Sem notificação','b-gray')},
        {label:'Somente administradores', key:'ad', width:'215px', sortVal:r=>r.somenteAdmin?0:1,
          render:r=>r.somenteAdmin?badge('Sim','b-amber'):badge('Não','b-gray')},
        {label:'Licenças', key:'us', width:'110px', render:r=>DB.licencas.filter(l=>l.motivoId===r.id).length},
        {label:'Situação', key:'s', width:'110px', sortVal:r=>r.ativo?0:1, render:r=>badgeSituacao(r.ativo)},
        {label:'', key:'a', width:'175px', align:true, render:r=>acoesCadastro('motivos', r.id, {
          ver:'#/motivos/'+r.id, editar:'openMotivo('+r.id+')',
          vinculos:(function(){ const n=DB.licencas.filter(l=>l.motivoId===r.id).length; return n?[n+' licença(s)']:[]; })()
        })}
      ]});
};
function openMotivo(id){
  const r = id?get('motivos',id):{descricao:'',notifica:false,titulo:'',mensagem:'',somenteAdmin:false,ativo:true};
  S.form.mot = Object.assign({id}, JSON.parse(JSON.stringify(r)));
  renderMotivoModal();
}
function renderMotivoModal(){
  setModalRender(renderMotivoModal);
  const f=S.form.mot;
  openModal('<h2>'+(f.id?'Editar':'Novo')+' Motivo de Alteração de Status</h2>'+
    field('Descrição', inputF('form.mot.descricao', f.descricao,'Ex.: Inadimplência'), {req:true,
      hint:'Exemplos: Inadimplência, Solicitação do cliente, Encerramento do contrato, Migração de ambiente, Ativação do período de testes.'})+
    '<div class="box mt20"><div class="box-title">Notificação</div>'+
      switchF('form.mot.notifica', f.notifica, 'Notificar o cliente ao aplicar este motivo')+
      (f.notifica?'<div class="grid mt16">'+
        field('Título da notificação', inputF('form.mot.titulo', f.titulo,'Título exibido ao usuário'), {req:true})+
        field('Mensagem', textareaF('form.mot.mensagem', f.mensagem,'Texto exibido ao usuário',3))+
        '</div>'+switchF('form.mot.somenteAdmin', f.somenteAdmin, 'Exibir somente para usuários administradores'):'')+
    '</div>'+
    '<div class="box mt16"><div class="box-title">Situação</div>'+switchF('form.mot.ativo', f.ativo, 'Motivo ativo')+'</div>'+
    '<div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
    '<button class="btn btn-primary" onclick="saveMotivo()">'+IC.save+'Salvar</button></div>','md');
}
function saveMotivo(){
  const f=S.form.mot, miss=missing(f,[{k:'descricao',t:'Descrição'}]);
  if(miss.length) return failValidation(miss);
  if(f.notifica && !f.titulo) return failValidation(['Título da notificação']);
  const data={descricao:f.descricao,notifica:!!f.notifica,titulo:f.titulo,mensagem:f.mensagem,somenteAdmin:!!f.somenteAdmin,ativo:!!f.ativo};
  if(f.id){ Object.assign(get('motivos',f.id), data);
    log({entidade:'Motivo de Alteração', entidadeId:f.id, rotulo:data.descricao, tipo:'Alteração', rotuloEvento:'Cadastro alterado'}); }
  else { const id=nextId('motivos'); DB.motivos.push(Object.assign({id},data));
    log({entidade:'Motivo de Alteração', entidadeId:id, rotulo:data.descricao, tipo:'Cadastro', rotuloEvento:'Motivo cadastrado'}); }
  closeModal(); render(); toast('Motivo salvo', data.descricao);
}
function motivoDetalhe(id){
  const m=get('motivos',id);
  if(!m.id) return VIEWS['404']();
  const lics=DB.licencas.filter(l=>l.motivoId===id);
  const ocorrencias=DB.auditoria.filter(a=>a.obs===m.descricao);
  return pageHead(m.descricao,'Motivo de alteração de status',
      '<button class="btn btn-primary" onclick="openMotivo('+id+')">'+IC.edit+'Editar</button>',
      [{t:'Motivos de Alteração de Status',href:'#/motivos'},{t:m.descricao}])+
    '<div class="two-col">'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Configuração</h2>'+badgeSituacao(m.ativo)+'</div><div class="card-body">'+
          '<div class="dl">'+
            '<div><div class="k">Descrição</div><div class="v">'+esc(m.descricao)+'</div></div>'+
            '<div><div class="k">Notifica o cliente</div><div class="v">'+(m.notifica?badge('Sim','b-blue'):badge('Não','b-gray'))+'</div></div>'+
          '</div>'+
          (m.notifica?'<div class="box mt20"><div class="box-title">Notificação</div>'+
            '<b style="color:var(--slate-900)">'+esc(m.titulo)+'</b>'+
            '<p style="margin:8px 0 0;font-size:13px">'+esc(m.mensagem)+'</p>'+
            '<div class="mt16">'+(m.somenteAdmin?badge('Somente administradores','b-amber'):badge('Todos os usuários','b-gray'))+'</div></div>':'')+
        '</div></div>'+
        '<div class="card"><div class="card-head"><h2>Licenças com este motivo</h2></div>'+
          (lics.length?'<div class="table-wrap"><table class="mini-table"><tbody>'+
            lics.map(l=>'<tr><td class="strong"><span class="linkcell" onclick="go(\'#/licencas/'+l.id+'\')">'+esc(l.identificador)+'</span></td>'+
              '<td>'+esc(clienteDe(l).nomeFantasia)+'</td><td>'+badge(situacao(l).label,situacao(l).cls)+'</td></tr>').join('')+
            '</tbody></table></div>'
          :'<div class="empty">'+IC.key+'<h3>Nenhuma licença</h3><p>Nenhuma licença está com este motivo registrado.</p></div>')+
        '</div>'+
      '</div>'+
      '<div>'+
        '<div class="card mb16"><div class="card-head"><h2>Ocorrências no histórico</h2></div><div class="card-body">'+
          (ocorrencias.length?'<div class="timeline">'+ocorrencias.slice(0,5).map(h=>itemTimeline(h)).join('')+'</div>'
            :'<p class="muted" style="margin:0">Nenhuma ocorrência registrada.</p>')+
        '</div></div>'+
        cardHistorico('Motivo de Alteração', id)+
      '</div>'+
    '</div>';
}
