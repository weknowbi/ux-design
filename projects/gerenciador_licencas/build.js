/* Gera o arquivo único gerenciador-licencas.html com CSS e JS embutidos */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let html = fs.readFileSync(path.join(dir,'index.html'),'utf8');
const files = ['data.js','ui.js','views-cadastros.js','views-licencas.js','views-operacoes.js','views-dashboard.js'];
const js = files.map(f=>'/* ===== '+f+' ===== */\n'+fs.readFileSync(path.join(dir,f),'utf8')).join('\n\n');

html = html.replace(/<script src="[^"]+"><\/script>\s*/g,'');
html = html.replace('</body>', '<script>\n'+js+'\n</script>\n</body>');

fs.writeFileSync(path.join(dir,'gerenciador-licencas.html'), html);
console.log('gerenciador-licencas.html gerado —', (html.length/1024).toFixed(1), 'KB');

/* Versão para publicação como Artifact: sem doctype/html/head/body */
let art = html
  .replace(/^[\s\S]*?<head>/,'')
  .replace(/<\/head>\s*<body>/,'')
  .replace(/<\/body>\s*<\/html>\s*$/,'')
  .replace(/<meta[^>]*>\s*/g,'');
fs.writeFileSync(path.join(dir,'artifact.html'), art.trim()+'\n');
console.log('artifact.html gerado —', (art.length/1024).toFixed(1), 'KB');
