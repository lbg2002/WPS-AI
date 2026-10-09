const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readReleaseVersion } = require('../../upload-oss/lib/build-installer.js');

function fixture(t, version) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-release-version-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'plugin'));
  fs.writeFileSync(path.join(root, 'plugin/package.json'), JSON.stringify({ version }));
  return root;
}

test('public fork builds with package version when website source is absent', (t) => {
  const root = fixture(t, '1.4.8');
  assert.equal(readReleaseVersion(root), '1.4.8');
  fs.writeFileSync(path.join(root, 'plugin/package.json'), JSON.stringify({ version: '1.4.8-beta.1' }));
  assert.equal(readReleaseVersion(root), '1.4.8-beta.1');
});

test('upstream website version retains precedence; malformed existing website fails visibly', (t) => {
  const root = fixture(t, '1.4.7');
  fs.mkdirSync(path.join(root, 'site/utils'), { recursive: true });
  const file = path.join(root, 'site/utils/release.ts');
  fs.writeFileSync(file, "export const VERSION = '1.5.0';\n");
  assert.equal(readReleaseVersion(root), '1.5.0');
  fs.writeFileSync(file, 'export const OTHER = 1;');
  assert.throws(() => readReleaseVersion(root), /VERSION/);
});

test('invalid version cannot become an installer output filename', (t) => {
  for (const version of ['../../escape', '', 'latest', undefined]) {
    assert.throws(() => readReleaseVersion(fixture(t, version)), /版本号/);
  }
});

test('checked-in public fork has a buildable release version without site files', () => {
  assert.equal(readReleaseVersion(), require('../package.json').version);
});
