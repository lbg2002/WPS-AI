const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');

for (const name of [
  'plugin/tools/post-install-linux.sh', 'plugin/tools/post-install-mac.sh',
  'plugin/tools/post-install-windows.bat', 'plugin/install-permanent-mac.sh',
  'plugin/install-permanent-windows.bat'
]) {
  test(`${name}: installs the permanent server's sibling dependencies`, () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-installer-deps-'));
    try {
      const script = fs.readFileSync(path.join(root, name), 'utf8');
      // Follow the actual copy declarations, without running registration or
      // process cleanup against the developer's real desktop installation.
      const copies = script.split(/\r?\n/).filter((line) => /^(cp |copy \/Y )/.test(line));
      for (const file of ['serve-permanent.js', 'proxy-health-monitor.js', 'pick-node.js']) {
        const line = copies.find((x) => x.includes(file));
        assert.ok(line, `missing copy for ${file}`);
        const source = name.endsWith('.bat') ? `\\tools\\${file}"` : `/tools/${file}"`;
        assert.equal(line.split(source).length - 1, 2, 'source and destination must both name sibling tools file');
        fs.copyFileSync(path.join(root, 'plugin/tools', file), path.join(tmp, file));
      }
      const installedRequire = createRequire(path.join(tmp, 'serve-permanent.js'));
      assert.equal(typeof installedRequire('./proxy-health-monitor.js').startProxyHealthMonitor, 'function');
      assert.equal(typeof installedRequire('./pick-node.js').pickProxyLauncher, 'function');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
}

test('Linux tar builder uses preloaded runtime without network or npm and packages installer dependencies',
  { skip: process.platform !== 'linux' }, () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-offline-build-'));
    try {
      const copy = (file) => {
        const target = path.join(tmp, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(root, file), target);
      };
      for (const file of [
        'installer-linux/build.sh', 'installer-linux/install.sh', 'installer-linux/uninstall.sh',
        'README.md', 'INSTALL.md', 'plugin/package.json', 'plugin/main.js', 'plugin/taskpane.html',
        'plugin/tools/bundle-node.js', 'plugin/tools/serve-permanent.js', 'plugin/tools/pick-node.js',
        'plugin/tools/proxy-health-monitor.js', 'plugin/tools/service-watchdog.sh',
        'plugin/tools/post-install-linux.sh', 'plugin/js/quote-selection.js'
      ]) copy(file);
      const runtime = path.join(tmp, 'plugin/runtime/node-linux-x64/bin/node');
      fs.mkdirSync(path.dirname(runtime), { recursive: true });
      // Small runtime fixture; this test checks packaging, not CPU/glibc compatibility.
      fs.writeFileSync(runtime, '#!/bin/sh\necho runtime-fixture\n', { mode: 0o755 });
      fs.mkdirSync(path.join(tmp, 'plugin/node_modules'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'plugin/node_modules/unwanted'), 'development-only');
      const block = path.join(tmp, 'block-network.cjs');
      const networkAttempt = path.join(tmp, 'network-attempt');
      const nodeCalls = path.join(tmp, 'node-calls');
      fs.writeFileSync(block, `for (const name of ['node:http','node:https']) {\n` +
        ` const m=require(name); for(const op of ['get','request']) m[op]=()=>{require('node:fs').writeFileSync(${JSON.stringify(networkAttempt)}, name); throw new Error('network disabled in offline build test');};\n}\n`);
      const nodeWrapper = path.join(tmp, 'bin/node');
      fs.mkdirSync(path.dirname(nodeWrapper), { recursive: true });
      const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";
      fs.writeFileSync(nodeWrapper, `#!/bin/sh\necho "$@" >> ${quote(nodeCalls)}\nexec ${quote(process.execPath)} --require ${quote(block)} "$@"\n`, { mode: 0o755 });
      const result = spawnSync('bash', ['installer-linux/build.sh', '--arch', 'x64', '--format', 'tar', '--version', 'offline-test'], {
        cwd: tmp, encoding: 'utf8', timeout: 20000,
        env: { ...process.env, PATH: path.join(tmp, 'bin') + path.delimiter + process.env.PATH }
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(fs.readFileSync(nodeCalls, 'utf8'), /tools\/bundle-node.js --platform linux-x64/);
      assert.equal(fs.existsSync(networkAttempt), false, 'preloaded runtime must avoid all download requests');
      const archive = path.join(tmp, 'dist/lingxi-ai-offline-test-linux-x64.tar.gz');
      const listing = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
      assert.equal(listing.status, 0, listing.stderr);
      for (const file of ['install.sh', 'plugin/runtime/node-linux-x64/bin/node',
        'plugin/tools/proxy-health-monitor.js', 'plugin/tools/pick-node.js', 'plugin/js/quote-selection.js']) {
        assert.ok(listing.stdout.split('\n').includes(`lingxi-ai-offline-test/${file}`), file);
      }
      assert.doesNotMatch(listing.stdout, /\/node_modules\//);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
