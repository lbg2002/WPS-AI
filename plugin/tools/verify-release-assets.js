'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function verifyReleaseAssets(directory, version) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Invalid release version');
  const names = [
    `lingxi-ai-${version}-setup.exe`,
    `lingxi-ai-${version}-linux-x64.tar.gz`,
    `lingxi-ai-${version}-linux-arm64.tar.gz`,
    `lingxi-ai_${version}_amd64.deb`,
    `lingxi-ai_${version}_arm64.deb`
  ];
  const lines = names.map((name) => {
    const file = path.join(directory, name);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
      throw new Error(`Missing or empty installer: ${name}`);
    }
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    return `${hash}  ${name}`;
  });
  fs.writeFileSync(path.join(directory, 'SHA256SUMS'), lines.join('\n') + '\n');
  return names;
}

if (require.main === module) {
  const version = require('../package.json').version;
  const names = verifyReleaseAssets(path.resolve(process.argv[2] || 'release-assets'), version);
  console.log(`Verified ${names.length} installers for ${version}; SHA256SUMS written.`);
}
module.exports = { verifyReleaseAssets };
