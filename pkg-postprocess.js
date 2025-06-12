// ./pkg-postprocess.js
import { mkdirSync, renameSync, copyFileSync, readFileSync } from 'fs';
import { join } from 'path';

const targets = [
  { os: 'linux', filename: 'serene-pub-linux', newFilename: 'serene-tavern-linux', dir: 'linux' },
  { os: 'macos', filename: 'serene-pub-macos', newFilename: 'serene-tavern-macos', dir: 'macos' },
  { os: 'win', filename: 'serene-pub-win.exe', newFilename: 'serene-tavern-windows.exe', dir: 'windows' }
];

// Read version from package.json
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;

for (const { os, filename, newFilename, dir } of targets) {
  // Use new directory naming: serene-tavern-[version]-[os]
  const distDir = join('dist', `serene-tavern-${version}-${dir}`);
  mkdirSync(distDir, { recursive: true });

  // Rename and move the binary to the new directory with the new name
  try {
    renameSync(join('build', filename), join(distDir, newFilename));
  } catch (e) {
    console.warn(`Warning: Could not find or move ${filename} for ${os}:`, e.message);
    continue;
  }

  for (const file of ['LICENSE', 'README.md', 'THIRD_PARTY_LICENSES.txt']) {
    copyFileSync(file, join(distDir, file));
  }
}

// Delete ./THIRD_PARTY_LICENSES.txt file if it exists
const thirdPartyLicensesPath = './THIRD_PARTY_LICENSES.txt';
import { existsSync, unlinkSync } from 'fs';
if (existsSync(thirdPartyLicensesPath)) {
  unlinkSync(thirdPartyLicensesPath);
}