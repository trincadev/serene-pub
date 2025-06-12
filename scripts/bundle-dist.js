// scripts/bundle-dist.js
// Bundles app, Node.js runtime, and launcher for each OS into ./dist/serene-pub-<version>-<os>/

import fs from 'fs';
import path from 'path';
import https from 'https';
import child_process from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

import pkg from '../package.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const version = pkg.version;
const distDir = path.resolve(__dirname, '../dist');
const buildDir = path.resolve(__dirname, '../build');
const staticDir = path.resolve(__dirname, '../static');
const filesToCopy = ['LICENSE', 'README.md', 'THIRD_PARTY_LICENSES.txt'];

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

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) return resolve();
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) return reject(new Error('Failed to download: ' + url));
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

function extract(archive, dest, os) {
  if (os === 'win') {
    child_process.execSync(`unzip -q -o ${archive} -d ${dest}`);
  } else if (archive.endsWith('.tar.xz')) {
    child_process.execSync(`tar -xf ${archive} -C ${dest}`);
  } else if (archive.endsWith('.tar.gz')) {
    child_process.execSync(`tar -xzf ${archive} -C ${dest}`);
  }
}

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

(async () => {
  fs.mkdirSync(distDir, { recursive: true });
  for (const target of targets) {
    const outDir = path.join(distDir, `serene-pub-${version}-${target.os}`);
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    // Do NOT bundle Node.js binary or download it here

    // Copy app files
    copyRecursive(buildDir, path.join(outDir, 'build'));
    copyRecursive(staticDir, path.join(outDir, 'static'));
    for (const file of filesToCopy) {
      if (fs.existsSync(path.join(buildDir, file))) {
        fs.copyFileSync(path.join(buildDir, file), path.join(outDir, file));
      } else if (fs.existsSync(path.resolve(__dirname, '../', file))) {
        fs.copyFileSync(path.resolve(__dirname, '../', file), path.join(outDir, file));
      }
    }

    // Write run script
    const runScript = makeRunScript(target, 'build/index.js');
    const runScriptPath = path.join(outDir, target.launcher);
    fs.writeFileSync(runScriptPath, runScript, { mode: 0o755 });
    if (target.os !== 'win') fs.chmodSync(runScriptPath, 0o755);

    // Add clickable executable for Linux/macOS
    if (target.os === 'linux' || target.os === 'macos') {
      const execPath = path.join(outDir, 'Serene Pub');
      const script = `#!/bin/sh\ncd \"$(dirname \"$0\")\"\n\n# Try common terminals\nif command -v x-terminal-emulator >/dev/null 2>&1; then\n  exec x-terminal-emulator -e ./run.sh\nelif command -v gnome-terminal >/dev/null 2>&1; then\n  exec gnome-terminal -- ./run.sh\nelif command -v konsole >/dev/null 2>&1; then\n  exec konsole -e ./run.sh\nelif command -v xfce4-terminal >/dev/null 2>&1; then\n  exec xfce4-terminal -e ./run.sh\nelif command -v mate-terminal >/dev/null 2>&1; then\n  exec mate-terminal -e ./run.sh\nelif command -v lxterminal >/dev/null 2>&1; then\n  exec lxterminal -e ./run.sh\nelif command -v tilix >/dev/null 2>&1; then\n  exec tilix -e ./run.sh\nelse\n  ./run.sh\nfi\n`;
      fs.writeFileSync(execPath, script, { mode: 0o755 });
    }

    // Copy platform-specific instructions as INSTRUCTIONS.txt
    let instructionsFile;
    if (target.os === 'linux') instructionsFile = path.resolve(__dirname, '../instructions/INSTRUCTIONS-linux.txt');
    else if (target.os === 'macos') instructionsFile = path.resolve(__dirname, '../instructions/INSTRUCTIONS-macos.txt');
    else if (target.os === 'win') instructionsFile = path.resolve(__dirname, '../instructions/INSTRUCTIONS-windows.txt');
    if (instructionsFile && fs.existsSync(instructionsFile)) {
      fs.copyFileSync(instructionsFile, path.join(outDir, 'INSTRUCTIONS.txt'));
    }

    console.log(`Created: ${outDir}`);
  }
  console.log('All distributables created in ./dist');
})();
