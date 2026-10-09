const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('Linux source sync adds quote module and loader, preserves user data, and rollback restores/removes files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-source-sync-'));
  try {
    const repo = path.join(tmp, 'repo'); const install = path.join(tmp, 'installed');
    const pluginFiles = ['main.js', 'taskpane.html', 'css/style.css', 'js/app.js', 'js/wps-addon-adapter.js',
      'tools/serve-permanent.js', 'tools/service-watchdog.sh', 'tools/proxy-health-monitor.js',
      'js/i18n.js', 'js/quick-actions.js', 'js/quote-selection.js', 'tools/gen-ribbon.js',
      'ribbon.xml', 'ribbon.en.xml', 'js/ribbon-callbacks.generated.js'];
    for (const file of pluginFiles) {
      const dst = path.join(repo, 'plugin', file); fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(path.join(__dirname, '..', file), dst);
    }
    fs.copyFileSync(path.join(__dirname, '../package.json'), path.join(repo, 'plugin/package.json'));
    fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
    for (const script of ['linux-sync-installed.sh', 'linux-restore-last-sync.sh']) {
      fs.copyFileSync(path.join(__dirname, '../../scripts', script), path.join(repo, 'scripts', script));
    }
    for (const host of ['wps', 'et']) {
      for (const file of pluginFiles.filter((x) => !x.startsWith('tools/') && x !== 'js/quote-selection.js')) {
        const dst = path.join(install, `plugin-${host}`, file); fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, `old ${host} ${file}`);
      }
    }
    fs.mkdirSync(path.join(install, 'tools'), { recursive: true });
    fs.writeFileSync(path.join(install, 'tools/service-watchdog.sh'), 'old watchdog', { mode: 0o644 });
    fs.writeFileSync(path.join(install, 'settings.json'), 'credentials and settings');
    const env = { ...process.env, LINGXI_INSTALL_DIR: install };
    const run = (script) => spawnSync('bash', [path.join(repo, 'scripts', script)], { env, encoding: 'utf8' });
    const synced = run('linux-sync-installed.sh'); assert.equal(synced.status, 0, synced.stdout + synced.stderr);
    assert.equal(fs.readFileSync(path.join(install, 'plugin-wps/js/quote-selection.js'), 'utf8'), fs.readFileSync(path.join(repo, 'plugin/js/quote-selection.js'), 'utf8'));
    assert.match(fs.readFileSync(path.join(install, 'plugin-wps/main.js'), 'utf8'), /js\/quote-selection.js/);
    assert.match(fs.readFileSync(path.join(install, 'plugin-wps/ribbon.xml'), 'utf8'), /ContextMenuText/);
    assert.doesNotMatch(fs.readFileSync(path.join(install, 'plugin-et/ribbon.xml'), 'utf8'), /ContextMenuText|quoteSelection/);
    for (const file of ['ribbon.xml', 'ribbon.en.xml', 'js/ribbon-callbacks.generated.js']) {
      assert.equal(fs.readFileSync(path.join(repo, 'plugin', file), 'utf8'), fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
    }
    assert.equal(fs.readFileSync(path.join(install, 'settings.json'), 'utf8'), 'credentials and settings');
    for (const bucket of ['tools', 'plugin-wps/tools', 'plugin-et/tools']) {
      assert.equal(fs.readFileSync(path.join(install, bucket, 'proxy-health-monitor.js'), 'utf8'), fs.readFileSync(path.join(repo, 'plugin/tools/proxy-health-monitor.js'), 'utf8'));
      assert.equal(fs.statSync(path.join(install, bucket, 'service-watchdog.sh')).mode & 0o111, 0o111);
    }
    const restored = run('linux-restore-last-sync.sh'); assert.equal(restored.status, 0, restored.stdout + restored.stderr);
    assert.equal(fs.readFileSync(path.join(install, 'plugin-wps/main.js'), 'utf8'), 'old wps main.js');
    assert.equal(fs.existsSync(path.join(install, 'plugin-wps/js/quote-selection.js')), false);
    assert.equal(fs.existsSync(path.join(install, 'tools/proxy-health-monitor.js')), false);
    assert.equal(fs.readFileSync(path.join(install, 'tools/service-watchdog.sh'), 'utf8'), 'old watchdog');
    assert.equal(fs.statSync(path.join(install, 'tools/service-watchdog.sh')).mode & 0o111, 0);
    assert.equal(fs.readFileSync(path.join(install, 'settings.json'), 'utf8'), 'credentials and settings');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
