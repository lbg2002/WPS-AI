const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check) {
  const until = Date.now() + 6000;
  while (Date.now() < until) { if (await check()) return; await delay(50); }
  throw new Error('service fixture did not recover');
}

test('permanent server learns its child actual port and respawns frozen proxy without touching another port owner', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-recovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const blocker = http.createServer((req, res) => res.end(JSON.stringify({ service: 'lingxi-ai-proxy/v1', pid: 999999 })));
  blocker.listen(0, '127.0.0.1'); await once(blocker, 'listening');
  t.after(() => { blocker.closeAllConnections(); blocker.close(); });
  const reservation = http.createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const staticPort = reservation.address().port; await new Promise((resolve) => reservation.close(resolve));
  fs.mkdirSync(path.join(root, 'tools'));
  for (const file of ['serve-permanent.js', 'pick-node.js']) fs.copyFileSync(path.join(__dirname, '../tools', file), path.join(root, 'tools', file));
  const monitor = path.join(__dirname, '../tools/proxy-health-monitor.js');
  fs.writeFileSync(path.join(root, 'tools/proxy-health-monitor.js'), `
    const original = require(${JSON.stringify(monitor)});
    exports.startProxyHealthMonitor = (child, options) => original.startProxyHealthMonitor(child,
      { ...options, intervalMs: 50, graceMs: 150, timeoutMs: 30, failureLimit: 3, killGraceMs: 50 });
  `);
  for (const host of ['wps', 'et', 'wpp', 'pdf']) fs.mkdirSync(path.join(root, `plugin-${host}`, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(root, 'plugin-wps/tools/proxy-server.js'), `
    const fs = require('fs'), path = require('path'), http = require('http');
    const countFile = path.join(__dirname, '..', '..', 'spawn-count');
    const count = (fs.existsSync(countFile) ? Number(fs.readFileSync(countFile)) : 0) + 1;
    fs.writeFileSync(countFile, String(count));
    const server = http.createServer((req, res) => res.end(JSON.stringify({ service: 'lingxi-ai-proxy/v1', pid: process.pid })));
    server.listen(0, '127.0.0.1', () => {
      console.log('[proxy] CORS 代理服务器已启动: http://127.0.0.1:' + server.address().port);
      if (count === 1) setTimeout(() => { while (true) {} }, 250);
    });
  `);
  const parent = spawn(process.execPath, [path.join(root, 'tools/serve-permanent.js'), '--root', root,
    '--static-port', String(staticPort), '--proxy-port', String(blocker.address().port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; parent.stdout.on('data', (chunk) => { output += chunk; }); parent.stderr.on('data', (chunk) => { output += chunk; });
  t.after(async () => { if (parent.exitCode === null) { parent.kill('SIGTERM'); await once(parent, 'exit'); } });
  const countFile = path.join(root, 'spawn-count');
  await waitFor(() => fs.existsSync(countFile) && Number(fs.readFileSync(countFile)) >= 2);
  assert.match(output, /proxy unresponsive; restarting owned child/);
  assert.equal(Number(fs.readFileSync(countFile)), 2);
  await delay(250);
  assert.equal(Number(fs.readFileSync(countFile)), 2, 'responsive replacement must not be restarted');
  assert.equal(blocker.listening, true, 'unrelated listener must survive');
});
