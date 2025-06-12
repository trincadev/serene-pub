// scripts/bundle-dist.js
// Bundles app, Node.js runtime, and launcher for each OS into ./dist/serene-pub-<version>-<os>/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import child_process from 'child_process';

import pkg from '../package.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const version = pkg.version;
const distDir = path.resolve(__dirname, '../dist');
const buildDir = path.resolve(__dirname, '../build');
const staticDir = path.resolve(__dirname, '../static');
const filesToCopy = ['LICENSE', 'README.md'];

const targets = [
  {
    os: 'linux',
    nodeUrl: 'https://nodejs.org/dist/v20.13.1/node-v20.13.1-linux-x64.tar.xz',
    nodeDir: 'node-v20.13.1-linux-x64',
    nodeBin: 'bin/node',
    launcher: 'run.sh',
  },
  {
    os: 'macos',
    nodeUrl: 'https://nodejs.org/dist/v20.13.1/node-v20.13.1-darwin-x64.tar.gz',
    nodeDir: 'node-v20.13.1-darwin-x64',
    nodeBin: 'bin/node',
    launcher: 'run.sh',
  },
  {
    os: 'win',
    nodeUrl: 'https://nodejs.org/dist/v20.13.1/node-v20.13.1-win-x64.zip',
    nodeDir: 'node-v20.13.1-win-x64',
    nodeBin: 'node.exe',
    launcher: 'run.cmd',
  },
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.lstatSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function getNodeDownloadInfo(target) {
  return {
    url: target.nodeUrl,
    archive: `node-archive.${target.os}${target.os === 'win' ? '.zip' : (target.os === 'macos' ? '.tar.gz' : '.tar.xz')}`,
    nodeDir: target.nodeDir,
    nodeBin: target.nodeBin
  };
}

function makeRunScript(target, appEntry) {
  const nodeInfo = getNodeDownloadInfo(target);
  if (target.os === 'win') {
    return `@echo off
setlocal
set NODE_BIN=node.exe
if not exist %NODE_BIN% (
  echo Downloading Node.js...
  powershell -Command "Invoke-WebRequest -Uri ${nodeInfo.url} -OutFile ${nodeInfo.archive}"
  powershell -Command "Expand-Archive -Path ${nodeInfo.archive} -DestinationPath ."
  copy ${nodeInfo.nodeDir}\\${nodeInfo.nodeBin} .\node.exe
  rmdir /s /q ${nodeInfo.nodeDir}
  del ${nodeInfo.archive}
)
%~dp0\node.exe %~dp0\${appEntry} %*`;
  } else {
    return `#!/bin/sh\nNODE_BIN=./node\nif [ ! -f "$NODE_BIN" ]; then\n  echo "Downloading Node.js..."\n  ARCHIVE=${nodeInfo.archive}\n  curl -L -o "$ARCHIVE" "${nodeInfo.url}"\n  if echo "$ARCHIVE" | grep -q ".tar.xz"; then\n    tar -xf "$ARCHIVE"\n  else\n    tar -xzf "$ARCHIVE"\n  fi\n  cp ${nodeInfo.nodeDir}/${nodeInfo.nodeBin} ./node\n  rm -rf ${nodeInfo.nodeDir}\n  rm -f "$ARCHIVE"\nfi\nchmod +x ./node\nDIR=$(dirname "$0")\n"$DIR/node" "$DIR/${appEntry}" "$@"\n`;
  }
}

// Whitelist for packages with UNKNOWN license but known to be MIT
const LICENSE_WHITELIST = [
  { name: 'json-bignum', version: '0.0.3' },
  { name: 'xmlhttprequest-ssl', version: '2.1.2' }
];

function isWhitelisted(name, version) {
  return LICENSE_WHITELIST.some(pkg => pkg.name === name && pkg.version === version);
}

// Acceptable licenses for redistribution with AGPL app
const ACCEPTABLE_LICENSES = [
  'mit', 'isc', 'bsd-2-clause', 'bsd-3-clause', '0bsd', 'wtfpl', 'apache-2.0', 'agpl-3.0', 'agpl-3.0-only', 'agpl-3.0-or-later',
  'bsd', 'bsd-2-clause or mit or apache-2.0', 'bsd-2-clause or mit', 'bsd-3-clause or mit', 'bsd-2-clause or mit or apache-2.0',
  'apache-2.0 or mit', 'apache-2.0 or bsd-3-clause', 'apache-2.0 or mit or bsd-3-clause', 'apache-2.0 or mit or bsd-2-clause',
  'mit or wtfpl', 'mit or bsd-2-clause', 'mit or bsd-3-clause', 'mit or apache-2.0', 'mit or isc', 'isc or mit', '0bsd or mit',
  'bsd-2-clause or mit or apache-2.0', 'bsd-3-clause or mit or apache-2.0', 'bsd-3-clause or mit or apache-2.0',
  'bsd-2-clause or mit or apache-2.0', 'bsd-3-clause or mit or apache-2.0', 'bsd-2-clause or mit', 'bsd-3-clause or mit',
  'bsd-2-clause or apache-2.0', 'bsd-3-clause or apache-2.0', 'bsd-2-clause or bsd-3-clause', 'bsd-3-clause or bsd-2-clause',
  'public domain', 'unlicense', 'cc0-1.0', 'cc0', '0bsd', 'bsd-2-clause-freebsd', 'bsd-3-clause-clear', 'bsd-3-clause-new',
  'bsd-3-clause-revised', 'bsd-3-clause-simplified', 'bsd-3-clause-modified', 'bsd-3-clause', 'bsd-2-clause', 'bsd',
  'wtfpl', 'isc', 'mit', 'apache-2.0', 'agpl-3.0', 'agpl-3.0-only', 'agpl-3.0-or-later', 'bsd-2-clause or mit or apache-2.0',
  'bsd-3-clause or mit or apache-2.0', 'bsd-2-clause or mit', 'bsd-3-clause or mit', 'bsd-2-clause or apache-2.0',
  'bsd-3-clause or apache-2.0', 'bsd-2-clause or bsd-3-clause', 'bsd-3-clause or bsd-2-clause', 'public domain', 'unlicense',
  'cc0-1.0', 'cc0', '0bsd', 'bsd-2-clause-freebsd', 'bsd-3-clause-clear', 'bsd-3-clause-new', 'bsd-3-clause-revised',
  'bsd-3-clause-simplified', 'bsd-3-clause-modified', 'bsd-3-clause', 'bsd-2-clause', 'bsd'
];

function isAcceptableLicense(license, name, version) {
  if (!license) return false;
  // Special case: whitelist
  if (isWhitelisted(name, version)) return true;
  // Remove parentheses and whitespace, split on OR/AND/||/&&
  const cleaned = license.replace(/[()]/g, '').toLowerCase();
  const parts = cleaned.split(/\s*(or|and|\|\||&&|,|\/)\s*/i).filter(s => s && !['or','and','||','&&','/'].includes(s));
  // If all parts are in the allowlist, it's acceptable
  return parts.length > 0 && parts.every(l => ACCEPTABLE_LICENSES.includes(l.trim()));
}

function checkAllLicensesAcceptable(nodeModulesPath) {
  let problematic = [];
  function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('@')) {
          checkDir(path.join(dir, entry.name));
        } else {
          const pkgPath = path.join(dir, entry.name, 'package.json');
          if (fs.existsSync(pkgPath)) {
            try {
              const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
              const license = (pkgData.license || '').toLowerCase();
              const name = pkgData.name || entry.name;
              const version = pkgData.version || '';
              if (license === 'unknown' || !license) {
                if (!isAcceptableLicense(license, name, version)) {
                  if (!isWhitelisted(name, version)) {
                    // Print a warning, but do not fail; user must manually verify
                    console.warn(`WARNING: ${name}@${version} has UNKNOWN license. Please verify manually. (${pkgPath})`);
                  }
                }
              } else if (!isAcceptableLicense(license, name, version)) {
                problematic.push({
                  name,
                  version,
                  license: pkgData.license || 'UNKNOWN',
                  path: pkgPath
                });
              }
            } catch (e) {
              problematic.push({ name: entry.name, version: '', license: 'PARSE_ERROR', path: pkgPath });
            }
          }
        }
      }
    }
  }
  checkDir(nodeModulesPath);
  return problematic;
}

(async () => {
  try {
    // 1. Prepare temp directory for pruned node_modules
    const os = process.platform;
    const tempDir = path.join(__dirname, '../.tmp-bundle-dist');
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir);
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(pkg, null, 2));

    // 2. Prune node_modules using Bun
    console.log('Pruning node_modules for production...');
    child_process.execSync('bun install --production', { cwd: tempDir, stdio: 'inherit' });

    // 3. Clean node_modules with modclean, preserving license files
    console.log('Cleaning node_modules with modclean...');
    child_process.execSync('bunx modclean --run --patterns="default:safe,default:caution,default:danger" --ignore="**/LICENSE,**/COPYING,**/NOTICE,**/README*,**/COPYRIGHT,**/AUTHORS,**/CONTRIBUTORS"', { cwd: tempDir, stdio: 'inherit' });

    // 4. License check
    console.log('Checking licenses...');
    const problematic = checkAllLicensesAcceptable(path.join(tempDir, 'node_modules'));
    if (problematic.length > 0) {
      console.error('Unacceptable licenses found:');
      for (const p of problematic) {
        console.error(`  ${p.name}@${p.version}: ${p.license} (${p.path})`);
      }
      process.exit(1);
    }

    // 5. For each target, create dist bundle
    for (const target of targets) {
      const outDir = path.join(distDir, `serene-pub-${version}-${target.os}`);
      if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(outDir, { recursive: true });
      // Copy build and static
      copyRecursive(buildDir, path.join(outDir, 'build'));
      copyRecursive(staticDir, path.join(outDir, 'static'));
      // Copy pruned node_modules
      copyRecursive(path.join(tempDir, 'node_modules'), path.join(outDir, 'node_modules'));
      // Copy LICENSE, README, etc.
      for (const file of filesToCopy) {
        if (fs.existsSync(path.resolve(__dirname, '..', file))) {
          fs.copyFileSync(path.resolve(__dirname, '..', file), path.join(outDir, file));
        }
      }
      // Copy platform-specific instructions
      const instrFile = path.resolve(__dirname, `../instructions/INSTRUCTIONS-${target.os}.txt`);
      if (fs.existsSync(instrFile)) {
        fs.copyFileSync(instrFile, path.join(outDir, 'INSTRUCTIONS.txt'));
      }
      // Write minimal package.json
      fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({
        type: 'module',
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        license: pkg.license
      }, null, 2));
      // Write launcher script
      const launcher = makeRunScript(target, 'build/index.js');
      const launcherPath = path.join(outDir, target.launcher);
      fs.writeFileSync(launcherPath, launcher, { mode: 0o755 });
      if (target.os !== 'win') {
        fs.chmodSync(launcherPath, 0o755);
      }
    }

    // 6. Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('All distributables generated in dist/.');
  } catch (err) {
    console.error('Bundle process failed:', err);
    process.exit(1);
  }
})();
