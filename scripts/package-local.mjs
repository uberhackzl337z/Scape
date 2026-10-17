import { mkdir, mkdtemp, readFile, readdir, writeFile, copyFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { SKILLS } from '../dist/shared/skills.js';
import { RECIPES } from '../dist/shared/crafting.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const releases = join(root, 'artifacts', 'releases');
await mkdir(releases, { recursive: true });
const target = await mkdtemp(join(releases, `${pkg.name}-${pkg.version}-local-test-`));
async function copy(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
async function copyJs(source, destination) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isDirectory()) await copyJs(join(source, entry.name), join(destination, entry.name));
    else if (entry.name.endsWith('.js')) await copy(join(source, entry.name), join(destination, entry.name));
  }
}
for (const name of ['index.html', 'style.css', 'favicon.svg'])
  await copy(join(root, 'public', name), join(target, 'public', name));
for (const name of ['server.js', 'socket-heartbeat.js', 'persistence.js', 'save-file.js', 'storage.js', 'server-config.js'])
  await copy(join(root, 'dist', name), join(target, 'dist', name));
for (const dir of ['client', 'shared'])
  await copyJs(join(root, 'dist', dir), join(target, 'dist', dir));
const wsRoot = await realpath(join(root, 'node_modules', 'ws'));
const wsPackage = JSON.parse(await readFile(join(wsRoot, 'package.json'), 'utf8'));
for (const name of ['index.js', 'browser.js', 'wrapper.mjs', 'LICENSE', 'package.json'])
  await copy(join(wsRoot, name), join(target, 'node_modules', 'ws', name));
await copyJs(join(wsRoot, 'lib'), join(target, 'node_modules', 'ws', 'lib'));
await writeFile(join(target, 'package.json'), JSON.stringify({
  name: pkg.name, version: pkg.version, private: true, type: 'module',
  engines: pkg.engines, scripts: { start: 'node dist/server.js' },
  dependencies: { ws: wsPackage.version }
}, null, 2) + '\n');
await writeFile(join(target, 'START-LOCAL.cmd'), [
  '@echo off', 'setlocal', 'cd /d "%~dp0"',
  'node --input-type=module -e "const [a,b]=process.versions.node.split(\'.\').map(Number);process.exit(a>24||a===24&&b>=12?0:1)" >nul 2>nul',
  'if errorlevel 1 (',
  '  echo Install Node.js 24.12 or newer from https://nodejs.org/ first.',
  '  pause', '  exit /b 1', ')',
  'set "HOST=127.0.0.1"', 'set "PORT=3030"', 'set "DATA_DIR=%~dp0data"',
  'echo Keep this window open. When ready, open http://127.0.0.1:3030/ in your browser.',
  'node dist\server.js', 'pause', ''
].join('\r\n'));
await writeFile(join(target, 'README.txt'), `Scape ${pkg.version} - LOCAL TEST BUILD

Requirements: Node.js 24.12 or newer (https://nodejs.org/) and a desktop browser.
Node.js is NOT bundled. No compiler, package install, Steam account or payment needed.
Extract the entire ZIP first; do not run inside the ZIP viewer.

Windows: double-click START-LOCAL.cmd, keep the window open, then open
http://127.0.0.1:3030/ after the server prints "Scape is ready".
This port is separate from the development game's port 3000.
If port 3030 is already in use, close the other test server first.
Other systems: in this folder run "node dist/server.js", then open port 3000.
Stop the server with Ctrl+C. Progress is stored in this copy's data/ folder.
Each copy runs its own world; sending this ZIP does not connect friends together.
The server listens only on this computer by default. Public multiplayer needs hosting.
Browser identity is local to that browser/site; clearing it can lose character access.

Controls: WASD/arrows move; E gather/bank; left click/Space free basic attack;
right click/B weapon ability; Shift dodge; 1/2/3 melee, 4 bow, 5 staff
(own the weapon; basic shots need no ammo); K skills/workshop; J contracts;
M market; L high scores; Q tonic; R stamina ration; T cooked fish; F Restoration.
Secondary bow/staff abilities and Restoration still need their listed supplies.
The in-game field guide explains combat and earned-coin wagers.

Includes ${Object.keys(SKILLS).length} trainable skills, ${RECIPES.length} recipes,
expedition contracts, gathering, bank, PvE/boss combat, PvP/earned-coin duels,
market and world high scores. No purchases or cash-out.
Prototype balance, temporary identities, local save files; not a commercial release.
No existing player saves, authentication secrets, backups or development tools included.

Third-party dependency: ws ${wsPackage.version}, MIT; see node_modules/ws/LICENSE.
MANIFEST.json lists every packaged file with byte size and SHA-256 (except itself).
`);
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else result.push(path);
  }
  return result.sort();
}
const manifest = [];
for (const file of await files(target)) {
  const data = await readFile(file);
  manifest.push({ path: relative(target, file).replaceAll('\\', '/'), bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex') });
}
await writeFile(join(target, 'MANIFEST.json'), JSON.stringify({ version: pkg.version,
  kind: 'local-test', nodeBundled: false, files: manifest }, null, 2) + '\n');
console.log(JSON.stringify({ directory: target, files: manifest.length + 1,
  contentBytes: manifest.reduce((sum, file) => sum + file.bytes, 0) }));
