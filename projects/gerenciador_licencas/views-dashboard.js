/* =========================================================
   Seção 11 — Dashboard (tela inicial)
   ========================================================= */

const CORES_SITUACAO = {
  vigente:   '#16a34a',
  aexpirar:  '#f59e0b',
  tolerancia:'#ea580c',
  expirada:  '#dc2626',
  bloqueada: '#b91c1c',
  inativa:   '#94a3b8'
};

VIEWS['dashboard'] = function(){
  const ls = DB.licencas;
  const total = ls.length;
  const porSit = {};
  SITUACOES_EFETIVAS.forEach(s=>porSit[s.v]=[]);
  ls.forEach(l=>porSit[situacao(l).key].push(l));

  const saudaveis = porSit.vigente.length;
  const saude = pct(saudaveis, total);
  const atencao = [].concat(porSit.aexpirar, porSit.tolerancia, porSit.expirada, porSit.bloqueada)
                    .sort((a,b)=>diasAte(a.expiracao)-diasAte(b.expiracao));

  /* --- 11.2 panorama --- */
  const panorama =
    '<div class="stats mb20">'+
      '<div class="stat"><div class="lbl">'+badgeDot('Licenças ativas','b-green')+'</div><div class="val">'+saudaveis+'</div>'+
        '<div class="sub">de '+total+' licenças cadastradas</div></div>'+
      '<div class="stat"><div class="lbl">'+badgeDot('Exigem atenção','b-amber')+'</div><div class="val">'+atencao.length+'</div>'+
        '<div class="sub">a expirar, vencidas ou bloqueadas</div></div>'+
      '<div class="stat"><div class="lbl">'+badgeDot('Instalações ativas','b-blue')+'</div><div class="val">'+DB.instalacoes.filter(i=>i.ativo).length+'</div>'+
        '<div class="sub">'+DB.instalacoes.filter(i=>i.ativo&&i.temporaria).length+' temporária(s) em uso</div></div>'+
      '<div class="stat"><div class="lbl">'+badgeDot('Liberações vigentes','b-violet')+'</div><div class="val">'+DB.liberacoes.filter(x=>x.status==='Ativa').length+'</div>'+
        '<div class="sub">'+DB.liberacoes.filter(x=>x.status==='Agendada').length+' agendada(s)</div></div>'+
    '</div>';

  /* --- saúde da carteira + distribuição empilhada --- */
  const segmentos = SITUACOES_EFETIVAS.filter(s=>porSit[s.v].length)
    .map(s=>({key:s.v, nome:s.t, n:porSit[s.v].length, cor:CORES_SITUACAO[s.v]}));
  const stack = '<div class="stack">'+segmentos.map(s=>
      '<div style="width:'+(s.n/total*100)+'%;background:'+s.cor+'" title="'+esc(s.nome)+': '+s.n+'"></div>').join('')+'</div>'+
    '<div class="stack-legend">'+segmentos.map(s=>
      '<button class="item" style="background:none;border:0;padding:0;cursor:pointer;text-align:left" onclick="filtrarPorSituacao(\''+s.key+'\')">'+
        '<span class="sw" style="background:'+s.cor+'"></span>'+
        '<span class="nm">'+esc(s.nome)+'</span>'+
        '<span class="qt">'+s.n+'</span>'+
        '<span class="pc">'+pct(s.n,total)+'%</span>'+
      '</button>').join('')+'</div>';

  const anelSaude =
    '<div class="gauge">'+
      '<div class="ring" style="background:conic-gradient(var(--green) 0 '+saude+'%, var(--slate-100) '+saude+'% 100%)"><span>'+saude+'%</span></div>'+
      '<div>'+
        '<div style="font-size:13.5px;color:var(--slate-600)">'+saudaveis+' de '+total+' licenças estão vigentes, sem bloqueio e fora da janela de expiração.</div>'+
        '<div class="mini-metric mt16"><span class="k">Vencendo em até 30 dias</span><span class="v">'+porSit.aexpirar.length+'</span></div>'+
        '<div class="mini-metric"><span class="k">Dentro da tolerância ('+TOLERANCIA_DIAS+' dias)</span><span class="v">'+porSit.tolerancia.length+'</span></div>'+
        '<div class="mini-metric"><span class="k">Expiradas ou bloqueadas</span><span class="v">'+(porSit.expirada.length+porSit.bloqueada.length)+'</span></div>'+
      '</div>'+
    '</div>';

  /* --- 11.3 licenças por tipo e por categoria --- */
  const porTipo = vivos('tiposLicenca').map(t=>({t:t.sigla, n:ls.filter(l=>l.tipoLicencaId===t.id).length})).filter(x=>x.n);
  const porCategoria = vivos('categorias').map(c=>({t:c.descricao, n:ls.filter(l=>l.categoriaId===c.id).length})).filter(x=>x.n);
  const maxTipo = Math.max(1,...porTipo.map(x=>x.n));
  const maxCat  = Math.max(1,...porCategoria.map(x=>x.n));
  const barras = (arr,max) => arr.map(x=>'<div class="bar-row"><div class="name">'+esc(x.t)+'</div>'+
    '<div class="bar-track"><div class="bar-fill" style="width:'+(x.n/max*100)+'%"></div></div><div class="qty">'+x.n+'</div></div>').join('');

  /* --- usuários licenciados --- */
  const comLimite = ls.filter(l=>!limiteUsuarios(l).ilimitado);
  const totalUsuarios = comLimite.reduce((s,l)=>s+limiteUsuarios(l).valor,0);
  const ilimitadas = ls.filter(l=>limiteUsuarios(l).ilimitado).length;
  const media = comLimite.length?Math.round(totalUsuarios/comLimite.length):0;
  const topUsuarios = comLimite.slice().sort((a,b)=>limiteUsuarios(b).valor-limiteUsuarios(a).valor).slice(0,5);
  const maxUso = topUsuarios.length?limiteUsuarios(topUsuarios[0]).valor:1;

  /* --- resumo da carteira --- */
  const resumo = [
    ['Clientes ativos', vivos('clientes').filter(c=>c.ativo).length],
    ['Parceiros comerciais', vivos('parceiros').filter(p=>p.ativo).length],
    ['Produtos ativos', vivos('produtos').filter(p=>p.ativo).length],
    ['Tipos de licença', vivos('tiposLicenca').filter(t=>t.ativo).length],
    ['Ambientes em uso', new Set(DB.instalacoes.map(i=>i.ambienteId)).size],
    ['Eventos no histórico', DB.auditoria.length]
  ];

  return pageHead('Dashboard','Visão executiva da carteira de licenças — '+fmtDate(hojeISO()),
      '<button class="btn btn-ghost" onclick="executarRotinas()">'+IC.bolt+'Executar rotinas</button>'+
      '<button class="btn btn-ghost" onclick="go(\'#/consultas\')">'+IC.chart+'Consultas</button>'+
      '<button class="btn btn-primary" onclick="go(\'#/licencas/nova\')">'+IC.plus+'Nova Licença</button>')+
    panorama+
    '<div class="two-col mb20">'+
      '<div class="card"><div class="card-head"><h2>Distribuição por situação</h2>'+
        '<span class="muted" style="font-size:12.5px">clique na legenda para filtrar a lista</span></div>'+
        '<div class="card-body">'+stack+'</div></div>'+
      '<div class="card"><div class="card-head"><h2>Saúde da carteira</h2></div><div class="card-body">'+anelSaude+'</div></div>'+
    '</div>'+
    '<div class="grid g3 mb20">'+
      '<div class="card"><div class="card-head"><h2>Licenças por tipo</h2></div><div class="card-body">'+
        (porTipo.length?barras(porTipo,maxTipo):'<p class="muted">Sem dados.</p>')+
        '<h3 class="section-title mt24">Por categoria</h3>'+
        (porCategoria.length?barras(porCategoria,maxCat):'<p class="muted">Sem dados.</p>')+
      '</div></div>'+
      '<div class="card"><div class="card-head"><h2>Usuários licenciados</h2></div><div class="card-body">'+
        '<div class="mini-metric"><span class="k">Total licenciado</span><span class="v">'+totalUsuarios+'</span></div>'+
        '<div class="mini-metric"><span class="k">Média por licença</span><span class="v">'+media+'</span></div>'+
        '<div class="mini-metric"><span class="k">Licenças ilimitadas</span><span class="v">'+ilimitadas+'</span></div>'+
        '<div class="mini-metric"><span class="k">Com liberação temporária</span><span class="v">'+ls.filter(l=>limiteUsuarios(l).liberado).length+'</span></div>'+
        '<h3 class="section-title mt24">Maiores alocações</h3>'+
        topUsuarios.map(l=>'<div style="margin-bottom:12px"><div class="between" style="font-size:12.5px">'+
          '<span class="linkcell" onclick="go(\'#/licencas/'+l.id+'\')">'+esc(clienteDe(l).nomeFantasia)+'</span>'+
          '<b style="color:var(--slate-900)">'+limiteUsuarios(l).valor+'</b></div>'+
          '<div class="barra-uso"><div style="width:'+(limiteUsuarios(l).valor/maxUso*100)+'%"></div></div></div>').join('')+
      '</div></div>'+
      '<div class="card"><div class="card-head"><h2>Resumo da carteira</h2></div><div class="card-body">'+
        resumo.map(r=>'<div class="mini-metric"><span class="k">'+esc(r[0])+'</span><span class="v">'+r[1]+'</span></div>').join('')+
        '<div class="alert alert-info mt20">'+IC.info+'<div>As rotinas automáticas expiram licenças vencidas, encerram instalações temporárias e restauram liberações.</div></div>'+
      '</div></div>'+
    '</div>'+
    '<div class="card"><div class="card-head"><h2>Licenças que exigem ação</h2>'+
      '<button class="btn btn-primary btn-sm" onclick="filtrarAtencao()">'+IC.filterOff+'Ver todas na lista</button></div>'+
      (atencao.length?'<div class="table-wrap"><table><thead><tr><th>Licença</th><th>Cliente</th><th>Tipo</th><th>Expira em</th><th>Situação</th><th>Motivo</th><th></th></tr></thead><tbody>'+
        atencao.slice(0,8).map(l=>{ const s=situacao(l), d=diasAte(l.expiracao);
          return '<tr><td class="strong"><span class="linkcell" onclick="go(\'#/licencas/'+l.id+'\')">'+esc(l.identificador)+'</span></td>'+
          '<td>'+esc(clienteDe(l).nomeFantasia)+'</td>'+
          '<td>'+badge(tipoLicDe(l).sigla,'b-ref')+'</td>'+
          '<td class="num">'+fmtDate(l.expiracao)+'<span class="cell-sub">'+(d<0?Math.abs(d)+' dia(s) atrás':'em '+d+' dia(s)')+'</span></td>'+
          '<td>'+badge(s.label,s.cls)+'</td>'+
          '<td>'+(l.motivoId?esc(get('motivos',l.motivoId).descricao):'<span class="muted">—</span>')+'</td>'+
          '<td class="right"><div class="rowactions">'+
            actCustom(IC.refresh,'Renovar','openRenovar('+l.id+')')+
            actCustom(IC.swap,'Alterar situação','openAlterarStatus('+l.id+')')+
            actView('#/licencas/'+l.id)+'</div></td></tr>'; }).join('')+
        '</tbody></table></div>'
      :'<div class="empty">'+IC.check+'<h3>Nenhuma licença exige ação</h3><p>Toda a carteira está vigente e dentro do prazo.</p></div>')+
    '</div>';
};
function filtrarPorSituacao(key){
  clearList('lic'); setListF('lic','sit',key); go('#/licencas');
}
function filtrarAtencao(){
  clearList('lic'); setListF('lic','sit','aexpirar'); go('#/licencas');
  toast('Filtro aplicado','Mostrando licenças a expirar. Troque o filtro Situação para ver expiradas ou bloqueadas.');
}

/* =========================================================
   Boot — 11.5: rota padrão é o Dashboard
   ========================================================= */
if(!location.hash) { try{ location.hash = '#/dashboard'; }catch(e){} }
S.route = location.hash || '#/dashboard';
render();
