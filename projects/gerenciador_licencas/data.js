/* =========================================================
   Gerenciador de Licenças Weknow — modelo e dados de protótipo
   Baseado em "Projeto Novo Gerenciador de Licenças v12"
   ========================================================= */

/* ---------- Símbolo Weknow ---------- */
const LOGO_WEKNOW =
'<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Weknow">'+
'<path d="M8.31415 5.96231L13.6115 11.2004L7.36774 17.3742L2.0702 12.1361C1.81966 11.8882 1.67885 11.552 1.67871 11.2014C1.67871 10.8508 1.81939 10.5145 2.06993 10.2666L6.42296 5.96231C6.67378 5.71437 7.01391 5.5752 7.36855 5.5752C7.7232 5.5752 8.06333 5.71437 8.31415 5.96231Z" fill="#3366CC"/>'+
'<path d="M20.801 5.96231L25.1528 10.2653C25.4035 10.5134 25.5443 10.8497 25.5443 11.2004C25.5443 11.5511 25.4035 11.8874 25.1528 12.1353L19.8554 17.3734L13.6123 11.2004L18.9098 5.96231C19.1607 5.71437 19.5008 5.5752 19.8554 5.5752C20.2101 5.5752 20.5501 5.71437 20.801 5.96231Z" fill="#5ADBDB"/>'+
'<path d="M13.6121 11.2021L19.8551 17.3753L14.5577 22.6134C14.3069 22.8612 13.9668 23.0005 13.6121 23.0005C13.2575 23.0005 12.9175 22.8612 12.6665 22.6134L7.36914 17.3753L13.6121 11.2021Z" fill="#30A7E2"/>'+
'</svg>';

/* ---------- Ícones ---------- */
const IC = {
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v13M3.5 13.5L7 17l3.5-3.5"/><path d="M17 20V7M13.5 10.5L17 7l3.5 3.5"/></svg>',
  ban:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
  power:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 11-12.8 0"/></svg>',
  archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 13h4"/></svg>',
  key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M17 6l2.5 2.5M14.5 8.5L17 11"/></svg>',
  save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  filterOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18l-7 8v6l-4 2v-8z"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 9l5-5 5 5M12 4v12"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>',
  inbox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.8L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.4-6.2A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.8z"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.9"/></svg>',
  palette:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21a9 9 0 110-18c5 0 9 3.6 9 8 0 2.2-1.8 4-4 4h-2a2 2 0 00-1.4 3.4A2 2 0 0112 21z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  server:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/></svg>',
  layers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5"/></svg>',
  history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.5 8.5A9 9 0 1112 21"/><path d="M12 7v5l4 2"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.5.5l3-3A5 5 0 0013.5 3.5L12 5"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3A5 5 0 0010.5 20.5L12 19"/></svg>',
  sliders:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l14 8-14 8V4z"/></svg>',
  infinity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 8a4 4 0 000 8c2.5 0 3.5-4 5.5-4s3 4 5.5 4a4 4 0 000-8c-2.5 0-3.5 4-5.5 4S9 8 6.5 8z"/></svg>'
};

/* ---------- Datas ---------- */
const HOJE = new Date(2026, 8, 1); // 01/09/2026
function dOff(days){ const d=new Date(HOJE); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function fmtDate(iso){ if(!iso) return '—'; const p=String(iso).slice(0,10).split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function diasAte(iso){ const d=new Date(String(iso).slice(0,10)+'T00:00:00'); return Math.round((d-HOJE)/86400000); }
function hojeISO(){ return HOJE.toISOString().slice(0,10); }
function addDias(iso,n){ const d=new Date(String(iso).slice(0,10)+'T00:00:00'); d.setDate(d.getDate()+Number(n)); return d.toISOString().slice(0,10); }
function agora(hhmm){ return fmtDate(hojeISO())+' '+(hhmm||new Date().toTimeString().slice(0,5)); }
function difDias(a,b){ return Math.round((new Date(String(b).slice(0,10))-new Date(String(a).slice(0,10)))/86400000); }

/* ---------- Constantes de domínio ---------- */
const SITUACOES_LICENCA   = ['Ativa','Inativa','Expirada','Bloqueada'];          // 3.7
const STATUS_LIBERACAO    = ['Agendada','Ativa','Expirada','Cancelada','Restaurada']; // 3.10
const ORIGENS_ALTERACAO   = ['Tela','Integração','Rotina automática','API'];     // 3.12
const RECURSOS_LIBERACAO  = [{v:'usuarios',t:'Usuários'},{v:'instalacoes',t:'Instalações'}];
const USUARIO_ATUAL       = 'Ana Beatriz Souza';
const TOLERANCIA_DIAS     = 5;  // política de tolerância (regra 7)

const DB = {};

/* ---------- 3.1 Tipos de Parceiro Comercial ---------- */
DB.tiposParceiro = [
  {id:1, descricao:'Sales Government Partner', privateLabel:false, ativo:true},
  {id:2, descricao:'Sales Partner',            privateLabel:false, ativo:true},
  {id:3, descricao:'White Label',              privateLabel:true,  ativo:true},
  {id:4, descricao:'Representante Regional',   privateLabel:false, ativo:false}
];

/* ---------- 3.6 Branding ---------- */
DB.brandings = [
  {id:1, descricao:'Weknow Padrão',       cor:'#16a34a', loginBg:'login-weknow.jpg',  logo:'logo-weknow.svg',  ativo:true},
  {id:2, descricao:'Health Partner Blue', cor:'#1d4ed8', loginBg:'login-hpb.jpg',     logo:'logo-hpb.svg',     ativo:true},
  {id:3, descricao:'Grupo Vitalis',         cor:'#7c3aed', loginBg:'login-vitalis.jpg',   logo:'logo-vitalis.svg',   ativo:true},
  {id:4, descricao:'Smart Health',        cor:'#0f766e', loginBg:'',                  logo:'logo-smart.svg',   ativo:true},
  {id:5, descricao:'Governo SC (White Label)', cor:'#b45309', loginBg:'login-gov.jpg', logo:'logo-gov.svg',    ativo:false}
];

/* ---------- 3.2 Parceiros Comerciais ---------- */
DB.parceiros = [
  {id:1, nome:'NordSaúde Sistemas', cnpj:'00.000.001/0001-00', tipoParceiroId:2, cep:'89202-000', uf:'SC', cidade:'Joinville',
   endereco:'Rua das Palmeiras', numero:'157', complemento:'Sala 12', tiposLicenca:[1,2,3,4,5,6,7], brandingId:1, ativo:true,
   contatos:[{nome:'Carlos Andrade', cargo:'Diretor Comercial', email:'carlos.andrade@nordsaude.com.br', telefone:'(47) 3000-0001'},
             {nome:'Marcos Silveira', cargo:'Suporte', email:'marcos.silveira@nordsaude.com.br', telefone:'(47) 3000-0002'}]},
  {id:2, nome:'TechCare Soluções', cnpj:'00.000.002/0001-00', tipoParceiroId:2, cep:'88015-200', uf:'SC', cidade:'Florianópolis',
   endereco:'Av. das Acácias', numero:'2100', complemento:'Conj. 803', tiposLicenca:[1,2,4], brandingId:2, ativo:true,
   contatos:[{nome:'Rodrigo Almeida', cargo:'Sócio', email:'rodrigo@techcare.com.br', telefone:'(48) 3000-0003'}]},
  {id:3, nome:'VidaPlus Distribuidora', cnpj:'00.000.003/0001-00', tipoParceiroId:3, cep:'69050-010', uf:'AM', cidade:'Manaus',
   endereco:'Av. das Orquídeas', numero:'880', complemento:'', tiposLicenca:[2,3,4], brandingId:4, ativo:true,
   contatos:[{nome:'Bruno Fagundes', cargo:'Gerente de Contas', email:'bruno@vidaplus.com.br', telefone:'(92) 3000-0004'}]},
  {id:4, nome:'Consórcio Regional de Saúde', cnpj:'00.000.004/0001-00', tipoParceiroId:1, cep:'88010-400', uf:'SC', cidade:'Florianópolis',
   endereco:'Rua das Gaivotas', numero:'390', complemento:'8º andar', tiposLicenca:[3,5,6], brandingId:5, ativo:true,
   contatos:[{nome:'Marcelo Teixeira', cargo:'Coordenador', email:'marcelo@consorcioregional.gov.br', telefone:'(48) 3000-0005'}]},
  {id:5, nome:'Clinitec Tecnologia', cnpj:'00.000.005/0001-00', tipoParceiroId:2, cep:'88110-000', uf:'SC', cidade:'São José',
   endereco:'Rua das Camélias', numero:'340', complemento:'', tiposLicenca:[1,4], brandingId:3, ativo:false,
   contatos:[{nome:'Fabio Nogueira', cargo:'Diretor', email:'fabio@clinitec.com.br', telefone:'(48) 3000-0006'}]}
];

/* ---------- 3.3 Clientes ---------- */
DB.clientes = [
  {id:1, razaoSocial:'Hospital Regional Santa Fé', nomeFantasia:'HRSF', cnpj:'00.000.011/0001-00', parceiroId:1, brandingId:1, ativo:true,
   contatoPrincipal:{nome:'Patrícia Duarte', email:'ti@hrsf.org.br', telefone:'(81) 3000-0011'},
   contatos:[{nome:'Eduardo Farias', cargo:'Infraestrutura', email:'infra@hrsf.org.br', telefone:'(81) 3000-0012'}]},
  {id:2, razaoSocial:'Grupo Vitalis Serviços Médicos LTDA', nomeFantasia:'GRUPO VITALIS', cnpj:'00.000.012/0001-00', parceiroId:5, brandingId:3, ativo:true,
   contatoPrincipal:{nome:'André Correia', email:'sistemas@grupovitalis.com.br', telefone:'(48) 3000-0013'}, contatos:[]},
  {id:3, razaoSocial:'Bela Vista Radiologia S/A', nomeFantasia:'BELA VISTA RADIOLOGIA', cnpj:'00.000.013/0001-00', parceiroId:2, brandingId:2, ativo:true,
   contatoPrincipal:{nome:'Juliana Ramos', email:'juliana@belavista.com.br', telefone:'(48) 3000-0014'},
   contatos:[{nome:'Thiago Moreira', cargo:'TI', email:'thiago@belavista.com.br', telefone:'(48) 3000-0015'}]},
  {id:4, razaoSocial:'Hospital Bom Pastor', nomeFantasia:'Hospital Bom Pastor', cnpj:'00.000.014/0001-00', parceiroId:1, brandingId:1, ativo:true,
   contatoPrincipal:{nome:'Renata Cardoso', email:'ti@bompastor.com.br', telefone:'(11) 3000-0016'}, contatos:[]},
  {id:5, razaoSocial:'Vida Nova Operadora LTDA', nomeFantasia:'Vida Nova', cnpj:'00.000.015/0001-00', parceiroId:4, brandingId:1, ativo:true,
   contatoPrincipal:{nome:'Camila Rezende', email:'camila@vidanova.com.br', telefone:'(19) 3000-0017'}, contatos:[]},
  {id:6, razaoSocial:'DiagnoMed Medicina Diagnóstica', nomeFantasia:'DIAGNOMED', cnpj:'00.000.016/0001-00', parceiroId:3, brandingId:4, ativo:true,
   contatoPrincipal:{nome:'Rafael Lacerda', email:'rafael@diagnomed.com.br', telefone:'(92) 3000-0018'}, contatos:[]},
  {id:7, razaoSocial:'Grupo Esperança Saúde LTDA', nomeFantasia:'Grupo Esperança', cnpj:'00.000.017/0001-00', parceiroId:2, brandingId:2, ativo:true,
   contatoPrincipal:{nome:'Larissa Freitas', email:'larissa@grupoesperanca.com.br', telefone:'(48) 3000-0019'}, contatos:[]},
  {id:8, razaoSocial:'AIBS - Associação das Irmãs Beneficentes de Santos', nomeFantasia:'AIBS', cnpj:'00.000.018/0001-00', parceiroId:4, brandingId:1, ativo:false,
   contatoPrincipal:{nome:'Ir. Cecília Prado', email:'contato@aibs.org.br', telefone:'(48) 3000-0020'}, contatos:[]},
  {id:9, razaoSocial:'Ambulatório Médico de Especialidades de Bragança', nomeFantasia:'AME Bragança', cnpj:'00.000.019/0001-00', parceiroId:3, brandingId:4, ativo:true,
   contatoPrincipal:{nome:'Fernando Batista', email:'fernando@amebraganca.gov.br', telefone:'(14) 3000-0021'}, contatos:[]},
  {id:10, razaoSocial:'Estrela Saúde Diagnósticos', nomeFantasia:'ESTRELA SAÚDE', cnpj:'00.000.020/0001-00', parceiroId:1, brandingId:1, ativo:true,
   contatoPrincipal:{nome:'Vanessa Pires', email:'ti@estrelasaude.com.br', telefone:'(47) 3000-0022'}, contatos:[]}
];

/* ---------- 3.4 Produtos ---------- */
DB.produtos = [
  {id:1, nome:'Weknow Enterprise',  sigla:'WK-ENT', versao:'8.4.2', ativo:true},
  {id:2, nome:'Weknow Smart',       sigla:'WK-SMT', versao:'6.1.0', ativo:true},
  {id:3, nome:'Weknow Proactive',   sigla:'WK-PRO', versao:'3.9.5', ativo:true},
  {id:4, nome:'Weknow Explorador de Dados', sigla:'WK-EXP', versao:'4.1.0', ativo:true},
  {id:5, nome:'Weknow Message Manager', sigla:'WK-MSG', versao:'2.2.0', ativo:true},
  {id:6, nome:'Weknow Integrador HL7', sigla:'WK-HL7', versao:'1.8.3', ativo:false}
];

/* ---------- 3.5 Tipos de Licença ---------- */
DB.tiposLicenca = [
  {id:1, sigla:'LUT - Enterprise', descricao:'Licença de Uso Temporária — Weknow Enterprise', duracaoMaxDias:365, qtdContatos:10, qtdConcorrentes:50, qtdInstalacoes:5, qtdManagers:5, cancelaParceiro:false, ativo:true},
  {id:2, sigla:'LUP - Smart',      descricao:'Licença de Uso Permanente — Weknow Smart',      duracaoMaxDias:3650, qtdContatos:6, qtdConcorrentes:20, qtdInstalacoes:3, qtdManagers:3, cancelaParceiro:false, ativo:true},
  {id:3, sigla:'POC',              descricao:'Licença de Prova de Conceito',                  duracaoMaxDias:60,  qtdContatos:2,  qtdConcorrentes:5,  qtdInstalacoes:1, qtdManagers:1, cancelaParceiro:true,  ativo:true},
  {id:4, sigla:'LUT - Smart',      descricao:'Licença de Uso Temporária — Weknow Smart',      duracaoMaxDias:365, qtdContatos:6,  qtdConcorrentes:20, qtdInstalacoes:3, qtdManagers:3, cancelaParceiro:true,  ativo:true},
  {id:5, sigla:'LUT - Proactive',  descricao:'Licença de Uso Temporária — Weknow Proactive',  duracaoMaxDias:365, qtdContatos:8,  qtdConcorrentes:30, qtdInstalacoes:4, qtdManagers:4, cancelaParceiro:false, ativo:true},
  {id:6, sigla:'LUP - Enterprise', descricao:'Licença de Uso Permanente — Weknow Enterprise', duracaoMaxDias:3650, qtdContatos:10, qtdConcorrentes:50, qtdInstalacoes:5, qtdManagers:5, cancelaParceiro:false, ativo:true},
  {id:7, sigla:'LUP - Proactive',  descricao:'Licença de Uso Permanente — Weknow Proactive',  duracaoMaxDias:3650, qtdContatos:8, qtdConcorrentes:30, qtdInstalacoes:4, qtdManagers:4, cancelaParceiro:false, ativo:true}
];

/* ---------- Categorias de Licença (3.7 / seção 6) ---------- */
DB.categorias = [
  {id:1, sigla:'CLI', descricao:'Cliente',            ativo:true},
  {id:2, sigla:'PAR', descricao:'Parceiro Comercial', ativo:true},
  {id:3, sigla:'INT', descricao:'Uso Interno',        ativo:true}
];

/* ---------- 3.8 Ambientes ---------- */
DB.ambientes = [
  {id:1, sigla:'PRD', descricao:'Produção',      cor:'#16a34a', ativo:true},
  {id:2, sigla:'HML', descricao:'Homologação',   cor:'#3366cc', ativo:true},
  {id:3, sigla:'TST', descricao:'Testes',        cor:'#f59e0b', ativo:true},
  {id:4, sigla:'SUP', descricao:'Suporte',       cor:'#dc2626', ativo:true},
  {id:5, sigla:'DEM', descricao:'Demonstração',  cor:'#7c3aed', ativo:true},
  {id:6, sigla:'POC', descricao:'POC',           cor:'#0e7490', ativo:true},
  {id:7, sigla:'PAR', descricao:'Parceiro',      cor:'#db2777', ativo:true},
  {id:8, sigla:'GRA', descricao:'Gratuidade',    cor:'#64748b', ativo:false}
];

/* ---------- 3.11 Motivos de Alteração de Status ---------- */
DB.motivos = [
  {id:1, descricao:'Inadimplência',                 notifica:true,  titulo:'Pendência financeira identificada', mensagem:'Identificamos pendências financeiras em seu contrato. Regularize para evitar o bloqueio do acesso.', somenteAdmin:true,  ativo:true},
  {id:2, descricao:'Solicitação do cliente',        notifica:false, titulo:'Licença inativada a pedido',        mensagem:'A licença foi inativada conforme solicitação formal do cliente.', somenteAdmin:false, ativo:true},
  {id:3, descricao:'Encerramento do contrato',      notifica:true,  titulo:'Contrato encerrado',                mensagem:'Seu contrato foi encerrado. O acesso será interrompido na data de expiração.', somenteAdmin:false, ativo:true},
  {id:4, descricao:'Migração de ambiente',          notifica:false, titulo:'Migração de ambiente em andamento', mensagem:'Sua licença foi temporariamente bloqueada devido à migração de ambiente.', somenteAdmin:true,  ativo:true},
  {id:5, descricao:'Ativação do período de testes', notifica:true,  titulo:'Período de avaliação iniciado',     mensagem:'Sua licença de avaliação foi ativada.', somenteAdmin:false, ativo:true},
  {id:6, descricao:'Expiração automática',          notifica:true,  titulo:'Licença expirada',                  mensagem:'A vigência da licença terminou e o acesso foi encerrado.', somenteAdmin:false, ativo:true}
];

/* ---------- 3.7 Licenças ---------- */
/* Chave gerada pelo sistema, no formato WK-XXXX-XXXX-XXXX-XXXX */
function chaveLic(seed){
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let x = ((seed+1)*2654435761)>>>0 || 1, s = '';
  for(let i=0;i<16;i++){
    x ^= x<<13; x>>>=0; x ^= x>>>17; x ^= x<<5; x>>>=0;
    s += alfa[x % alfa.length];
    if(i%4===3 && i<15) s += '-';
  }
  return 'WK-'+s;
}
DB.licencas = [
  {id:1, identificador:'LIC-2026-0148', clienteId:1, produtos:[1,4], tipoLicencaId:1, categoriaId:1, brandingId:1,
   qtdUsuarios:45, usuariosIlimitados:false, qtdInstalacoes:5, instalacoesIlimitadas:false,
   emissao:dOff(-240), inicio:dOff(-240), expiracao:dOff(117), situacao:'Ativa', motivoId:null,
   obs:'Contrato anual renovado automaticamente.',
   renovacoes:[{data:dOff(-240), deInicio:dOff(-605), deFim:dOff(-241), paraInicio:dOff(-240), paraFim:dOff(117), usuario:'Ana Beatriz Souza', obs:'Renovação anual 2026.'}]},

  {id:2, identificador:'LIC-2026-0147', clienteId:2, produtos:[2], tipoLicencaId:4, categoriaId:1, brandingId:3,
   qtdUsuarios:30, usuariosIlimitados:false, qtdInstalacoes:3, instalacoesIlimitadas:false,
   emissao:dOff(-320), inicio:dOff(-320), expiracao:dOff(21), situacao:'Ativa', motivoId:null, obs:'', renovacoes:[]},

  {id:3, identificador:'LIC-2026-0146', clienteId:3, produtos:[1], tipoLicencaId:1, categoriaId:1, brandingId:2,
   qtdUsuarios:12, usuariosIlimitados:false, qtdInstalacoes:2, instalacoesIlimitadas:false,
   emissao:dOff(-150), inicio:dOff(-150), expiracao:dOff(7), situacao:'Ativa', motivoId:null,
   obs:'Cliente avaliando ampliação de usuários.', renovacoes:[]},

  {id:4, identificador:'LIC-2026-0145', clienteId:4, produtos:[1,3,4], tipoLicencaId:6, categoriaId:1, brandingId:1,
   qtdUsuarios:0, usuariosIlimitados:true, qtdInstalacoes:5, instalacoesIlimitadas:false,
   emissao:dOff(-400), inicio:dOff(-400), expiracao:dOff(59), situacao:'Bloqueada', motivoId:1,
   obs:'Bloqueada por pendência financeira desde 12/08/2026.', renovacoes:[]},

  {id:5, identificador:'LIC-2026-0144', clienteId:5, produtos:[2], tipoLicencaId:3, categoriaId:1, brandingId:1,
   qtdUsuarios:5, usuariosIlimitados:false, qtdInstalacoes:1, instalacoesIlimitadas:false,
   emissao:dOff(-95), inicio:dOff(-95), expiracao:dOff(-65), situacao:'Expirada', motivoId:6,
   obs:'POC não convertida.', renovacoes:[]},

  {id:6, identificador:'LIC-2026-0143', clienteId:6, produtos:[1,4], tipoLicencaId:1, categoriaId:1, brandingId:4,
   qtdUsuarios:25, usuariosIlimitados:false, qtdInstalacoes:3, instalacoesIlimitadas:false,
   emissao:dOff(-60), inicio:dOff(-60), expiracao:dOff(304), situacao:'Ativa', motivoId:null, obs:'', renovacoes:[]},

  {id:7, identificador:'LIC-2026-0142', clienteId:7, produtos:[3,5], tipoLicencaId:5, categoriaId:1, brandingId:2,
   qtdUsuarios:10, usuariosIlimitados:false, qtdInstalacoes:4, instalacoesIlimitadas:false,
   emissao:dOff(-40), inicio:dOff(-40), expiracao:dOff(49), situacao:'Ativa', motivoId:null,
   obs:'Homologação da integração HL7.', renovacoes:[]},

  {id:8, identificador:'LIC-2026-0141', clienteId:8, produtos:[1], tipoLicencaId:1, categoriaId:1, brandingId:1,
   qtdUsuarios:18, usuariosIlimitados:false, qtdInstalacoes:2, instalacoesIlimitadas:false,
   emissao:dOff(-500), inicio:dOff(-500), expiracao:dOff(-135), situacao:'Inativa', motivoId:3,
   obs:'Contrato encerrado em 18/04/2026.', renovacoes:[]},

  {id:9, identificador:'LIC-2026-0140', clienteId:9, produtos:[1,5], tipoLicencaId:1, categoriaId:1, brandingId:4,
   qtdUsuarios:22, usuariosIlimitados:false, qtdInstalacoes:3, instalacoesIlimitadas:false,
   emissao:dOff(-200), inicio:dOff(-200), expiracao:dOff(164), situacao:'Ativa', motivoId:null, obs:'', renovacoes:[]},

  {id:10, identificador:'LIC-2026-0139', clienteId:10, produtos:[1,3,4], tipoLicencaId:6, categoriaId:1, brandingId:1,
   qtdUsuarios:60, usuariosIlimitados:false, qtdInstalacoes:0, instalacoesIlimitadas:true,
   emissao:dOff(-110), inicio:dOff(-110), expiracao:dOff(254), situacao:'Ativa', motivoId:null,
   obs:'Instalações ilimitadas conforme contrato corporativo.', renovacoes:[]},

  {id:11, identificador:'LIC-2026-0138', clienteId:1, produtos:[3], tipoLicencaId:5, categoriaId:1, brandingId:1,
   qtdUsuarios:8, usuariosIlimitados:false, qtdInstalacoes:2, instalacoesIlimitadas:false,
   emissao:dOff(-25), inicio:dOff(-25), expiracao:dOff(64), situacao:'Ativa', motivoId:null,
   obs:'Segunda licença da HRSF, independente da LIC-2026-0148.', renovacoes:[]},

  {id:12, identificador:'LIC-2026-0137', clienteId:3, produtos:[4], tipoLicencaId:3, categoriaId:1, brandingId:2,
   qtdUsuarios:3, usuariosIlimitados:false, qtdInstalacoes:1, instalacoesIlimitadas:false,
   emissao:dOff(-12), inicio:dOff(-12), expiracao:dOff(17), situacao:'Ativa', motivoId:null,
   obs:'POC do Explorador de Dados.', renovacoes:[]},

  {id:13, identificador:'LIC-2026-0136', clienteId:5, produtos:[1,3,5], tipoLicencaId:1, categoriaId:1, brandingId:1,
   qtdUsuarios:40, usuariosIlimitados:false, qtdInstalacoes:4, instalacoesIlimitadas:false,
   emissao:dOff(-330), inicio:dOff(-330), expiracao:dOff(34), situacao:'Ativa', motivoId:null, obs:'', renovacoes:[]},

  {id:14, identificador:'LIC-2026-0135', clienteId:2, produtos:[5], tipoLicencaId:2, categoriaId:2, brandingId:3,
   qtdUsuarios:6, usuariosIlimitados:false, qtdInstalacoes:2, instalacoesIlimitadas:false,
   emissao:dOff(-420), inicio:dOff(-420), expiracao:dOff(309), situacao:'Ativa', motivoId:null,
   obs:'Licença de uso do parceiro comercial.', renovacoes:[]},

  {id:15, identificador:'LIC-2026-0134', clienteId:7, produtos:[1], tipoLicencaId:1, categoriaId:1, brandingId:2,
   qtdUsuarios:15, usuariosIlimitados:false, qtdInstalacoes:2, instalacoesIlimitadas:false,
   emissao:dOff(-280), inicio:dOff(-280), expiracao:dOff(-3), situacao:'Ativa', motivoId:null,
   obs:'Renovação em negociação — dentro da tolerância.', renovacoes:[]},

  {id:16, identificador:'LIC-2026-0133', clienteId:1, produtos:[1,2,3,4,5], tipoLicencaId:6, categoriaId:3, brandingId:1,
   qtdUsuarios:0, usuariosIlimitados:true, qtdInstalacoes:0, instalacoesIlimitadas:true,
   emissao:dOff(-700), inicio:dOff(-700), expiracao:dOff(1000), situacao:'Ativa', motivoId:null,
   obs:'Licença de uso interno Weknow — ambientes de demonstração.', renovacoes:[]}
];
DB.licencas.forEach(l => l.chave = chaveLic(l.id));

/* ---------- 3.9 Instalações ---------- */
DB.instalacoes = [
  {id:1, licencaId:1, descricao:'Servidor principal HRSF', ambienteId:1, finalidade:'Operação assistencial e faturamento',
   identificador:'SRV-HRSF-PRD-01', inicio:dOff(-238), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:2, licencaId:1, descricao:'Ambiente de homologação HRSF', ambienteId:2, finalidade:'Validação de versões antes da produção',
   identificador:'SRV-HRSF-HML-01', inicio:dOff(-200), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:3, licencaId:1, descricao:'Base restaurada para análise de incidente', ambienteId:4, finalidade:'Suporte ao ticket #48211',
   identificador:'SRV-HRSF-SUP-TMP', inicio:dOff(-6), termino:dOff(2), brandingId:1, temporaria:true, ativo:true,
   obs:'Base restaurada temporariamente — não consome licença comercial.'},
  {id:4, licencaId:2, descricao:'Servidor Vitalis Produção', ambienteId:1, finalidade:'Operação da rede de clínicas',
   identificador:'SRV-VITALIS-PRD', inicio:dOff(-318), termino:null, brandingId:3, temporaria:false, ativo:true, obs:''},
  {id:5, licencaId:3, descricao:'Bela Vista — Produção', ambienteId:1, finalidade:'Laudos e imagens',
   identificador:'SRV-BVR-PRD', inicio:dOff(-148), termino:null, brandingId:2, temporaria:false, ativo:true, obs:''},
  {id:6, licencaId:4, descricao:'Bom Pastor — Produção', ambienteId:1, finalidade:'Operação hospitalar',
   identificador:'SRV-BPAST-PRD', inicio:dOff(-398), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:7, licencaId:4, descricao:'Bom Pastor — Testes', ambienteId:3, finalidade:'Treinamento de equipe',
   identificador:'SRV-BPAST-TST', inicio:dOff(-120), termino:null, brandingId:1, temporaria:false, ativo:false,
   obs:'Inativada após o término do treinamento.'},
  {id:8, licencaId:7, descricao:'Grupo Esperança — Homologação HL7', ambienteId:2, finalidade:'Homologação da integração HL7',
   identificador:'SRV-ESPER-HML', inicio:dOff(-38), termino:null, brandingId:2, temporaria:false, ativo:true, obs:''},
  {id:9, licencaId:10, descricao:'Estrela — Produção matriz', ambienteId:1, finalidade:'Operação da matriz',
   identificador:'SRV-ESTRELA-PRD-01', inicio:dOff(-108), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:10, licencaId:10, descricao:'Estrela — Produção filial Blumenau', ambienteId:1, finalidade:'Operação da filial',
   identificador:'SRV-ESTRELA-PRD-02', inicio:dOff(-90), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:11, licencaId:12, descricao:'POC Explorador — máquina do cliente', ambienteId:6, finalidade:'Prova de conceito do Explorador de Dados',
   identificador:'NB-BVR-POC', inicio:dOff(-12), termino:dOff(17), brandingId:2, temporaria:true, ativo:true, obs:''},
  {id:12, licencaId:16, descricao:'Ambiente de demonstração comercial', ambienteId:5, finalidade:'Demonstrações para prospects',
   identificador:'SRV-WK-DEMO', inicio:dOff(-690), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:13, licencaId:16, descricao:'Ambiente interno de POC', ambienteId:6, finalidade:'Provas de conceito internas',
   identificador:'SRV-WK-POC', inicio:dOff(-400), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:14, licencaId:13, descricao:'Vida Nova — Produção', ambienteId:1, finalidade:'Operação da operadora',
   identificador:'SRV-VN-PRD', inicio:dOff(-328), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''},
  {id:15, licencaId:6, descricao:'DiagnoMed — Produção', ambienteId:1, finalidade:'Medicina diagnóstica',
   identificador:'SRV-DM-PRD', inicio:dOff(-58), termino:null, brandingId:4, temporaria:false, ativo:true, obs:''},
  {id:16, licencaId:9, descricao:'AME Bragança — Produção', ambienteId:1, finalidade:'Atendimento ambulatorial',
   identificador:'SRV-AME-PRD', inicio:dOff(-198), termino:null, brandingId:4, temporaria:false, ativo:true, obs:''},
  {id:17, licencaId:11, descricao:'HRSF Proactive — Produção', ambienteId:1, finalidade:'Monitoramento proativo',
   identificador:'SRV-HRSF-PRO', inicio:dOff(-23), termino:null, brandingId:1, temporaria:false, ativo:true, obs:''}
];

/* ---------- 3.10 Liberações Temporárias ---------- */
DB.liberacoes = [
  {id:1, licencaId:1, recurso:'usuarios', valorOriginal:45, valorNovo:70, ilimitado:false,
   inicio:dOff(-10), termino:dOff(5), motivo:'Campanha de mutirão de exames', usuario:'Marcos Silveira', status:'Ativa', aprovadoPor:'Ana Beatriz Souza', aprovadoEm:dOff(-11)},
  {id:2, licencaId:1, recurso:'instalacoes', valorOriginal:5, valorNovo:6, ilimitado:false,
   inicio:dOff(-6), termino:dOff(2), motivo:'Base restaurada para suporte ao ticket #48211', usuario:'Marcos Silveira', status:'Ativa', aprovadoPor:'Ana Beatriz Souza', aprovadoEm:dOff(-6)},
  {id:3, licencaId:10, recurso:'usuarios', valorOriginal:60, valorNovo:0, ilimitado:true,
   inicio:dOff(12), termino:dOff(42), motivo:'Migração de unidades — período de transição', usuario:'Vanessa Pires', status:'Agendada', aprovadoPor:null, aprovadoEm:null},
  {id:4, licencaId:3, recurso:'usuarios', valorOriginal:12, valorNovo:20, ilimitado:false,
   inicio:dOff(-60), termino:dOff(-30), motivo:'Pico de demanda sazonal', usuario:'Juliana Ramos', status:'Restaurada', aprovadoPor:'Ana Beatriz Souza', aprovadoEm:dOff(-61)},
  {id:5, licencaId:13, recurso:'instalacoes', valorOriginal:4, valorNovo:6, ilimitado:false,
   inicio:dOff(-90), termino:dOff(-60), motivo:'Reinstalação de servidores', usuario:'Camila Rezende', status:'Cancelada', aprovadoPor:null, aprovadoEm:null},
  {id:6, licencaId:7, recurso:'usuarios', valorOriginal:10, valorNovo:15, ilimitado:false,
   inicio:dOff(-3), termino:dOff(-1), motivo:'Treinamento da equipe assistencial', usuario:'Larissa Freitas', status:'Ativa', aprovadoPor:'Ana Beatriz Souza', aprovadoEm:dOff(-4)}
];

/* ---------- 3.12 Histórico / Auditoria ---------- */
DB.auditoria = [];
let SEQ_AUD = 0;
function log(ev){
  DB.auditoria.unshift(Object.assign({
    id: ++SEQ_AUD,
    dataHora: agora(),
    usuario: USUARIO_ATUAL,
    origem: 'Tela',
    entidade: 'Licença',
    entidadeId: null,
    rotulo: '',
    tipo: 'Alteração',
    de: null, para: null, obs: ''
  }, ev));
  return DB.auditoria[0];
}
/* histórico inicial (mais antigo primeiro para o unshift deixar em ordem) */
[
  {dataHora:'07/07/2025 09:00', usuario:'Fabio Nogueira', entidade:'Licença', entidadeId:14, rotulo:'LIC-2026-0135', tipo:'Emissão', rotuloEvento:'Licença emitida'},
  {dataHora:'19/04/2025 10:00', usuario:'Sistema',          entidade:'Licença', entidadeId:8,  rotulo:'LIC-2026-0141', tipo:'Emissão', rotuloEvento:'Licença emitida', origem:'API'},
  {dataHora:'01/01/2025 08:00', usuario:'Sistema',          entidade:'Licença', entidadeId:1,  rotulo:'LIC-2026-0148', tipo:'Emissão', rotuloEvento:'Licença emitida', origem:'API'},
  {dataHora:'18/12/2025 14:40', usuario:'Marcos Silveira',      entidade:'Licença', entidadeId:1,  rotulo:'LIC-2026-0148', tipo:'Alteração de status', rotuloEvento:'Situação alterada', de:'Ativa', para:'Bloqueada', obs:'Inadimplência'},
  {dataHora:'05/01/2026 09:10', usuario:'Ana Beatriz Souza', entidade:'Licença', entidadeId:1, rotulo:'LIC-2026-0148', tipo:'Alteração de status', rotuloEvento:'Situação alterada', de:'Bloqueada', para:'Ativa', obs:'Pagamento regularizado'},
  {dataHora:'05/01/2026 09:12', usuario:'Ana Beatriz Souza', entidade:'Licença', entidadeId:1, rotulo:'LIC-2026-0148', tipo:'Renovação', rotuloEvento:'Vigência alterada', de:'01/01/2025 – 04/01/2026', para:'05/01/2026 – 27/12/2026'},
  {dataHora:'18/04/2026 17:20', usuario:'Ana Beatriz Souza', entidade:'Licença', entidadeId:8, rotulo:'LIC-2026-0141', tipo:'Alteração de status', rotuloEvento:'Situação alterada', de:'Ativa', para:'Inativa', obs:'Encerramento do contrato'},
  {dataHora:'12/08/2026 11:30', usuario:'Renata Cardoso', entidade:'Licença', entidadeId:4, rotulo:'LIC-2026-0145', tipo:'Alteração de status', rotuloEvento:'Situação alterada', de:'Ativa', para:'Bloqueada', obs:'Inadimplência'},
  {dataHora:'27/06/2026 00:01', usuario:'Rotina de expiração', entidade:'Licença', entidadeId:5, rotulo:'LIC-2026-0144', tipo:'Expiração', rotuloEvento:'Licença expirada automaticamente', de:'Ativa', para:'Expirada', origem:'Rotina automática'},
  {dataHora:'22/08/2026 08:15', usuario:'Marcos Silveira', entidade:'Liberação temporária', entidadeId:1, rotulo:'Usuários — LIC-2026-0148', tipo:'Liberação temporária', rotuloEvento:'Liberação temporária ativada', de:'45 usuários', para:'70 usuários', obs:'Campanha de mutirão de exames'},
  {dataHora:'26/08/2026 09:40', usuario:'Marcos Silveira', entidade:'Instalação', entidadeId:3, rotulo:'SRV-HRSF-SUP-TMP', tipo:'Cadastro', rotuloEvento:'Instalação temporária registrada', obs:'Suporte ao ticket #48211'},
  {dataHora:'02/08/2026 14:05', usuario:'Rotina de restauração', entidade:'Liberação temporária', entidadeId:4, rotulo:'Usuários — LIC-2026-0146', tipo:'Restauração', rotuloEvento:'Configuração original restaurada', de:'20 usuários', para:'12 usuários', origem:'Rotina automática'},
  {dataHora:'15/07/2026 10:22', usuario:'Renata Cardoso', entidade:'Instalação', entidadeId:7, rotulo:'SRV-BPAST-TST', tipo:'Ativação/Desativação', rotuloEvento:'Instalação inativada', de:'Ativa', para:'Inativa', obs:'Treinamento concluído'}
].forEach(e=>{
  log({dataHora:e.dataHora, usuario:e.usuario, entidade:e.entidade, entidadeId:e.entidadeId, rotulo:e.rotulo,
       tipo:e.tipo, rotuloEvento:e.rotuloEvento, de:e.de||null, para:e.para||null, obs:e.obs||'', origem:e.origem||'Tela'});
});
/* emissões das licenças sem evento explícito */
DB.licencas.forEach(l=>{
  if(!DB.auditoria.some(a=>a.entidade==='Licença'&&a.entidadeId===l.id&&a.tipo==='Emissão'))
    log({dataHora:fmtDate(l.emissao)+' 09:00', usuario:USUARIO_ATUAL, entidade:'Licença', entidadeId:l.id,
         rotulo:l.identificador, tipo:'Emissão', rotuloEvento:'Licença emitida', origem:'Tela'});
});

/* ---------- Lookups ---------- */
const get = (col,id)=> DB[col].find(x=>x.id===Number(id)) || {};
const clienteDe    = l => get('clientes', l.clienteId);
const parceiroDe   = c => get('parceiros', c.parceiroId);
const tipoLicDe    = l => get('tiposLicenca', l.tipoLicencaId);
const categoriaDe  = l => get('categorias', l.categoriaId);
const brandingDe   = x => get('brandings', x.brandingId);
const produtosDe   = l => (l.produtos||[]).map(id=>get('produtos',id));
const instalacoesDe = l => DB.instalacoes.filter(i=>i.licencaId===l.id);
const liberacoesDe  = l => DB.liberacoes.filter(x=>x.licencaId===l.id);
const auditoriaDe   = (entidade,id) => DB.auditoria.filter(a=>a.entidade===entidade && a.entidadeId===Number(id));
const licencasDe    = c => DB.licencas.filter(l=>l.clienteId===c.id);

/* ---------- Situação e limites ---------- */
/* Regra 8: status, data de vencimento e motivo de bloqueio são separados.
   A situação efetiva combina a situação registrada com a vigência. */
function situacao(l){
  if(l.situacao==='Bloqueada') return {key:'bloqueada', label:'Bloqueada', cls:'b-red'};
  if(l.situacao==='Inativa')   return {key:'inativa',   label:'Inativa',   cls:'b-gray'};
  if(l.situacao==='Expirada')  return {key:'expirada',  label:'Expirada',  cls:'b-red'};
  const d = diasAte(l.expiracao);
  if(d < -TOLERANCIA_DIAS) return {key:'expirada',  label:'Expirada',  cls:'b-red'};
  if(d < 0)                return {key:'tolerancia',label:'Em tolerância', cls:'b-amber'};
  if(d <= 30)              return {key:'aexpirar',  label:'A expirar', cls:'b-amber'};
  return {key:'vigente', label:'Ativa', cls:'b-green'};
}
const SITUACOES_EFETIVAS = [
  {v:'vigente',    t:'Ativa (vigente)'},
  {v:'aexpirar',   t:'A expirar (30 dias)'},
  {v:'tolerancia', t:'Em tolerância'},
  {v:'expirada',   t:'Expirada'},
  {v:'bloqueada',  t:'Bloqueada'},
  {v:'inativa',    t:'Inativa'}
];
function situacaoBadgeCls(s){
  return {Ativa:'b-green', Inativa:'b-gray', Expirada:'b-red', Bloqueada:'b-red'}[s] || 'b-gray';
}
function statusLiberacaoCls(s){
  return {Ativa:'b-green', Agendada:'b-blue', Expirada:'b-gray', Cancelada:'b-gray', Restaurada:'b-violet'}[s] || 'b-gray';
}

/* Regra 9/10: "ilimitado" é atributo explícito; o número não é usado quando ilimitado. */
function limiteUsuarios(l){
  const lib = liberacoesDe(l).find(x=>x.status==='Ativa' && x.recurso==='usuarios');
  if(lib) return {ilimitado:lib.ilimitado, valor:lib.valorNovo, liberado:true};
  return {ilimitado:!!l.usuariosIlimitados, valor:l.qtdUsuarios, liberado:false};
}
function limiteInstalacoes(l){
  const lib = liberacoesDe(l).find(x=>x.status==='Ativa' && x.recurso==='instalacoes');
  if(lib) return {ilimitado:lib.ilimitado, valor:lib.valorNovo, liberado:true};
  return {ilimitado:!!l.instalacoesIlimitadas, valor:l.qtdInstalacoes, liberado:false};
}
const fmtLimite = lim => lim.ilimitado ? 'Ilimitado' : String(lim.valor);

/* ---------- Seção 8: rotinas automáticas (idempotentes) ---------- */
function rodarRotinas(origem){
  const eventos = [];
  const orig = origem || 'Rotina automática';

  // 1. licenças vencidas além da tolerância
  DB.licencas.forEach(l=>{
    if(l.situacao==='Ativa' && diasAte(l.expiracao) < -TOLERANCIA_DIAS){
      l.situacao='Expirada'; l.motivoId=6;
      eventos.push('Licença '+l.identificador+' expirada (vencida há '+Math.abs(diasAte(l.expiracao))+' dias).');
      log({entidade:'Licença', entidadeId:l.id, rotulo:l.identificador, tipo:'Expiração',
           rotuloEvento:'Licença expirada automaticamente', de:'Ativa', para:'Expirada',
           origem:orig, usuario:'Rotina de expiração', obs:'Tolerância de '+TOLERANCIA_DIAS+' dias aplicada.'});
    }
  });

  // 2. instalações temporárias vencidas
  DB.instalacoes.forEach(i=>{
    if(i.ativo && i.temporaria && i.termino && diasAte(i.termino) < 0){
      i.ativo=false;
      eventos.push('Instalação temporária '+i.identificador+' encerrada.');
      log({entidade:'Instalação', entidadeId:i.id, rotulo:i.identificador, tipo:'Ativação/Desativação',
           rotuloEvento:'Instalação temporária encerrada automaticamente', de:'Ativa', para:'Inativa',
           origem:orig, usuario:'Rotina de expiração'});
    }
  });

  // 3. liberações temporárias vencidas → restaura configuração original (regra 12)
  DB.liberacoes.forEach(x=>{
    if(x.status==='Ativa' && diasAte(x.termino) < 0){
      x.status='Restaurada';
      const l = get('licencas', x.licencaId);
      const rec = x.recurso==='usuarios' ? 'usuários' : 'instalações';
      eventos.push('Liberação de '+rec+' da licença '+l.identificador+' restaurada para '+x.valorOriginal+'.');
      log({entidade:'Liberação temporária', entidadeId:x.id, rotulo:(x.recurso==='usuarios'?'Usuários':'Instalações')+' — '+l.identificador,
           tipo:'Restauração', rotuloEvento:'Configuração original restaurada',
           de:(x.ilimitado?'Ilimitado':x.valorNovo)+' '+rec, para:x.valorOriginal+' '+rec,
           origem:orig, usuario:'Rotina de restauração'});
    }
    // liberações agendadas que chegaram à data de início
    if(x.status==='Agendada' && x.aprovadoEm && diasAte(x.inicio) <= 0 && diasAte(x.termino) >= 0){
      x.status='Ativa';
      const l = get('licencas', x.licencaId);
      eventos.push('Liberação temporária da licença '+l.identificador+' ativada.');
      log({entidade:'Liberação temporária', entidadeId:x.id, rotulo:(x.recurso==='usuarios'?'Usuários':'Instalações')+' — '+l.identificador,
           tipo:'Liberação temporária', rotuloEvento:'Liberação temporária ativada',
           de:String(x.valorOriginal), para:(x.ilimitado?'Ilimitado':String(x.valorNovo)), origem:orig, usuario:'Rotina de ativação'});
    }
  });

  return eventos;
}
