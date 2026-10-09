const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { probeProxyHealth, startProxyHealthMonitor } = require('../tools/proxy-health-monitor.js');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test('health probe validates signature/PID and imposes deadline even when socket stays open', async (t) => {
  let hang = false;
  const server = http.createServer((req, res) => {
    if (hang) return;
    res.end(JSON.stringify({ service: 'lingxi-ai-proxy/v1', pid: 123 }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const port = server.address().port;
  assert.equal(await probeProxyHealth(port, 123, 80), true);
  assert.equal(await probeProxyHealth(port, 999, 80), false);
  hang = true;
  assert.equal(await probeProxyHealth(port, 123, 80), false);
});

test('monitor leaves responsive child alone and terminates only its own unresponsive child, escalating ignored SIGTERM', async (t) => {
  const child = spawn(process.execPath, ['-e', `
    const http = require('http'); let frozen = false;
    process.on('SIGTERM', () => {});
    const server = http.createServer((req, res) => {
      if (req.url === '/freeze') { frozen = true; res.end('ok'); return; }
      if (!frozen) res.end(JSON.stringify({ service: 'lingxi-ai-proxy/v1', pid: process.pid }));
    });
    server.listen(0, '127.0.0.1', () => console.log(server.address().port));
  `], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('fixture did not start')), 3000);
    let text = '';
    child.stdout.on('data', (chunk) => { text += chunk; if (text.includes('\n')) { clearTimeout(timeout); resolve(Number(text.trim())); } });
  });
  const logs = [];
  const stop = startProxyHealthMonitor(child, { getPort: () => port, intervalMs: 40, graceMs: 0,
    timeoutMs: 30, failureLimit: 3, killGraceMs: 60, log: (s) => logs.push(s) });
  t.after(stop);
  await delay(160);
  assert.equal(child.exitCode, null); assert.equal(logs.length, 0);
  await new Promise((resolve, reject) => http.get(`http://127.0.0.1:${port}/freeze`, (res) => { res.resume(); res.on('end', resolve); }).on('error', reject));
  const result = await Promise.race([once(child, 'exit'), delay(2000).then(() => { throw new Error('hung child not terminated'); })]);
  assert.equal(result[1], 'SIGKILL');
  assert.equal(logs.filter((s) => s.includes('restarting owned child')).length, 1);
  assert.ok(logs.some((s) => s.includes(`pid=${child.pid}`)));
});
