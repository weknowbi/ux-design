import net from "node:net";
import http from "node:http";

export function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "127.0.0.1");
  });
}

export function pingHttp(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, timeout: timeoutMs, path: "/" },
      (res) => {
        res.resume();
        resolve(true);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

// So confia na URL real de "servidor pronto" (ex: "Local: http://localhost:5173/").
// Nao usar um fallback "solto" tipo /port\s*[:=]?\s*(\d+)/ -- ferramentas como o Vite
// imprimem mensagens de colisao de porta (ex: "Port 5173 is in use, trying another
// one...") antes de conseguir a porta real, e um regex solto captura esse numero
// errado, fazendo o workspace apontar para o processo/porta de OUTRO projeto.
//
// Ferramentas de terminal (Vite, etc.) colorem o numero da porta com codigos ANSI,
// injetando bytes de escape ENTRE os digitos (ex: "localhost:\x1b[1m5173\x1b[22m/"),
// o que quebra o regex se nao removermos esses codigos antes.
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export function extractPortFromLog(line) {
  const clean = stripAnsi(line);
  const match = clean.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)[:/](\d{2,5})/i);
  if (match) return Number(match[1]);
  return null;
}
