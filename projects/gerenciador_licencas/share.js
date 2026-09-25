/* Publica o protótipo na internet via Tailscale Funnel.
   Uso: npm run share
   Escolhe sozinho uma porta pública livre (443, 8443 ou 10000),
   sobe o servidor se ainda não estiver no ar e imprime o link para enviar. */
const { spawn, execFileSync } = require('child_process');
const net  = require('net');
const path = require('path');
const fs   = require('fs');

const PORT    = Number(process.env.PORT) || 5175;
const DRY     = process.argv.includes('--dry');
const PORTAS_PUBLICAS = [443, 8443, 10000];

/* ---------- localiza o tailscale ---------- */
function acharTailscale() {
  const candidatos = [
    'C:\\Program Files\\Tailscale\\tailscale.exe',
    'C:\\Program Files (x86)\\Tailscale\\tailscale.exe',
    '/usr/bin/tailscale',
    '/usr/local/bin/tailscale'
  ];
  for (const c of candidatos) if (fs.existsSync(c)) return c;
  return 'tailscale';
}
const TS = acharTailscale();

function ts(args) {
  return execFileSync(TS, args, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
}

/* ---------- porta local já está servindo? ---------- */
function portaEmUso(porta) {
  return new Promise(resolve => {
    const s = net.connect({ host: '127.0.0.1', port: porta })
      .on('connect', () => { s.destroy(); resolve(true); })
      .on('error',   () => resolve(false));
    setTimeout(() => { s.destroy(); resolve(false); }, 800);
  });
}

/* ---------- portas públicas já ocupadas por outro funnel ---------- */
function publicasOcupadas() {
  let cfg;
  try { cfg = JSON.parse(ts(['serve','status','--json'])); }
  catch (e) { return new Set(); }
  const usadas = new Set();
  const coletar = bloco => {
    if (bloco && bloco.TCP) Object.keys(bloco.TCP).forEach(p => usadas.add(Number(p)));
  };
  coletar(cfg);
  if (cfg && cfg.Foreground) Object.values(cfg.Foreground).forEach(coletar);
  return usadas;
}

function meuHost() {
  try {
    const st = JSON.parse(ts(['status','--json']));
    return (st.Self && st.Self.DNSName || '').replace(/\.$/, '');
  } catch (e) { return ''; }
}

(async () => {
  const ocupadas = publicasOcupadas();
  const publica  = PORTAS_PUBLICAS.find(p => !ocupadas.has(p));

  if (!publica) {
    console.error('\n  As portas públicas do Funnel (443, 8443, 10000) já estão todas em uso.');
    console.error('  Feche um dos funnels (Ctrl+C na aba dele) e rode novamente.\n');
    process.exit(1);
  }
  if (ocupadas.size) {
    console.log('\n  Porta pública 443 já ocupada por outro projeto — usando ' + publica + '.');
  }

  const filhos = [];

  /* sobe o servidor local, se necessário */
  if (await portaEmUso(PORT)) {
    console.log('  Servidor já rodando na porta ' + PORT + ' — reaproveitando.');
  } else {
    console.log('  Subindo o servidor na porta ' + PORT + '...');
    if (!DRY) filhos.push(spawn(process.execPath, [path.join(__dirname,'server.js')],
      { stdio: 'inherit', env: Object.assign({}, process.env, { PORT: String(PORT) }) }));
    await new Promise(r => setTimeout(r, 1200));
  }

  const host = meuHost();
  const url  = 'https://' + (host || 'seu-host.ts.net') + (publica === 443 ? '' : ':' + publica) + '/';

  console.log('');
  console.log('  Link público (mande este para o time):');
  console.log('  ' + url);
  console.log('');
  console.log('  Atenção: fica acessível a qualquer pessoa com o link, sem senha.');
  console.log('  Ctrl+C encerra a publicação.');
  console.log('');

  if (DRY) {
    console.log('  [--dry] comando que seria executado: ' + TS + ' funnel --https=' + publica + ' ' + PORT);
    filhos.forEach(f => f.kill());
    return;
  }

  const funnel = spawn(TS, ['funnel', '--https=' + publica, String(PORT)], { stdio: 'inherit' });
  filhos.push(funnel);
  funnel.on('exit', code => { filhos.forEach(f => f.kill()); process.exit(code || 0); });

  process.on('SIGINT', () => { filhos.forEach(f => f.kill()); process.exit(0); });
})();
