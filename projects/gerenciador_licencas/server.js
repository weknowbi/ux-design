/* Servidor estático do protótipo — Node puro, sem dependências.
   Uso: npm run dev   (ou: node server.js)
   Porta: 5175 por padrão (5174 é do weknow ask).
   Para trocar:  $env:PORT=5180; npm run dev */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 5175;
const RAIZ = __dirname;

const TIPOS = {
  '.html':'text/html; charset=utf-8',
  '.js'  :'text/javascript; charset=utf-8',
  '.css' :'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg' :'image/svg+xml',
  '.png' :'image/png',
  '.jpg' :'image/jpeg',
  '.jpeg':'image/jpeg',
  '.ico' :'image/x-icon',
  '.woff2':'font/woff2'
};

const servidor = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  // impede acesso fora da pasta do projeto
  const arquivo = path.join(RAIZ, path.normalize(rel));
  if (!arquivo.startsWith(RAIZ)) {
    res.writeHead(403, {'Content-Type':'text/plain; charset=utf-8'});
    return res.end('403 — acesso negado');
  }

  fs.readFile(arquivo, (err, dados) => {
    if (err) {
      res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
      return res.end('<h1>404</h1><p>Arquivo não encontrado: ' + rel +
        '</p><p><a href="/">Abrir o protótipo</a></p>');
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
      // sem cache: recarregar o navegador já mostra a última alteração
      'Cache-Control': 'no-store'
    });
    res.end(dados);
  });
});

/* Lista os IPs da máquina, separando Tailscale (100.x) da rede local */
function enderecos() {
  const redes = require('os').networkInterfaces();
  const saida = [];
  for (const nome of Object.keys(redes)) {
    for (const net of redes[nome]) {
      if (net.family !== 'IPv4' || net.internal) continue;
      saida.push({
        ip: net.address,
        rotulo: net.address.startsWith('100.') ? 'Tailscale' : 'Rede local'
      });
    }
  }
  return saida;
}

servidor.listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('');
  console.log('  Gerenciador de Licenças Weknow — protótipo');
  console.log('');
  console.log('  Local:    ' + url + '/');
  for (const e of enderecos()) {
    console.log('  Network:  http://' + e.ip + ':' + PORT + '/   ' + e.rotulo);
  }
  console.log('');
  console.log('  Arquivo único:  ' + url + '/gerenciador-licencas.html');
  console.log('  Publicar:       tailscale funnel --https=8443 ' + PORT);
  console.log('  Encerrar:       Ctrl+C');
  console.log('');
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('\n  A porta ' + PORT + ' já está em uso.');
    console.error('  Rode em outra porta:  $env:PORT=5180; npm run dev\n');
  } else {
    console.error(e);
  }
  process.exit(1);
});
