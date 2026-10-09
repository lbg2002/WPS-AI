const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyReleaseAssets } = require('../tools/verify-release-assets.js');
const version = '1.4.8';
const names = [`lingxi-ai-${version}-setup.exe`, `lingxi-ai-${version}-linux-x64.tar.gz`,
  `lingxi-ai-${version}-linux-arm64.tar.gz`, `lingxi-ai_${version}_amd64.deb`, `lingxi-ai_${version}_arm64.deb`];
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingxi-release-assets-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of names) fs.writeFileSync(path.join(dir, name), `fixture ${name}`);
  return dir;
}
test('complete Windows/Linux release produces exact SHA256 manifest', (t) => {
  const dir = fixture(t);
  assert.deepEqual(verifyReleaseAssets(dir, version), names);
  const actual = fs.readFileSync(path.join(dir, 'SHA256SUMS'), 'utf8');
  const expected = names.map((name) => `${crypto.createHash('sha256').update(`fixture ${name}`).digest('hex')}  ${name}`).join('\n') + '\n';
  assert.equal(actual, expected);
});
test('missing or empty architecture package prevents publication manifest', (t) => {
  for (const empty of [false, true]) {
    const dir = fixture(t);
    if (empty) fs.writeFileSync(path.join(dir, names[2]), '');
    else fs.unlinkSync(path.join(dir, names[2]));
    assert.throws(() => verifyReleaseAssets(dir, version), /Missing or empty/);
    assert.equal(fs.existsSync(path.join(dir, 'SHA256SUMS')), false);
  }
});
test('invalid release version is rejected before file access', (t) => {
  assert.throws(() => verifyReleaseAssets(fixture(t), '../escape'), /Invalid release version/);
});
