// Repeatable checks for a fresh cloud workspace. Never use the live world.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const env = { ...process.env };
for (const key of ['APP_ENV', 'HOST', 'PORT', 'PUBLIC_ORIGIN', 'DATA_DIR', 'STORAGE', 'WORLD_ID', 'WORLD_NAME', 'MAX_PLAYERS', 'GAME_URL', 'TEST_STORAGE', 'TEST_PORT']) delete env[key];

async function run(label, args, extra = {}) {
  console.log(`\nChecking: ${label}`);
  await new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { env: { ...env, ...extra }, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolveRun() : reject(new Error(`${label} failed (${signal ?? code})`)));
  });
}

await run('TypeScript build', ['node_modules/typescript/bin/tsc']);
await run('Browser download budget', ['scripts/asset-report.mjs']);
const tests = (await readdir('dist/tests')).filter(name => name.endsWith('.test.js')).sort().map(name => `dist/tests/${name}`);
if (!tests.length) throw new Error('No compiled rules/storage tests found');
await run('Rules and persistence', ['--test', ...tests]);
await run('Solo boss simulation', ['scripts/boss-balance.mjs']);

await mkdir('artifacts', { recursive: true });
const dataDir = await mkdtemp(resolve('artifacts/cloud-smoke-'));
const port = 3047, origin = `http://127.0.0.1:${port}`;
let output = '';
const server = spawn(process.execPath, ['dist/server.js'], {
  env: { ...env, APP_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), PUBLIC_ORIGIN: origin, DATA_DIR: dataDir, STORAGE: 'sqlite', WORLD_ID: 'cloud-smoke' },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let spawnError;
server.once('error', error => { spawnError = error; });
server.stdout.on('data', data => { output = (output + data).slice(-12000); });
server.stderr.on('data', data => { output = (output + data).slice(-12000); });
const exited = new Promise(resolveExit => server.once('close', resolveExit));
try {
  const deadline = Date.now() + 15000;
  while (true) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null || server.signalCode !== null) throw new Error(`Disposable server stopped: ${output}`);
    // Wait for our own process's readiness before probing a possibly occupied port.
    if (output.includes('Scape is ready:')) break;
    if (Date.now() >= deadline) throw new Error(`Disposable server did not start: ${output}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
  }
  await run('Browser assets, two-player replication and invalid-input rejection', ['scripts/smoke.mjs'], { GAME_URL: origin });
} finally {
  if (server.exitCode === null && server.signalCode === null && !spawnError) {
    server.kill('SIGTERM');
    let timer;
    await Promise.race([exited, new Promise(resolveWait => { timer = setTimeout(resolveWait, 3000); })]);
    clearTimeout(timer);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
    await exited;
  }
}

for (const [label, script, extra] of [
  ['Contract rewards, migration and SQLite crash retention', 'contracts-e2e.mjs', {}],
  ['Leaderboard search and pagination', 'scores-e2e.mjs', {}],
  ['Player market and offline seller payments', 'market-e2e.mjs', {}],
  ['Gathering, crafting, ranged combat and healing', 'skills-e2e.mjs', {}],
  ['Equipment, elemental combat and SQLite restart retention', 'equipment-e2e.mjs', {}],
  ['SQLite duel payout and crash refunds', 'duel-e2e.mjs', { TEST_STORAGE: 'sqlite', TEST_PORT: '3038' }],
]) await run(label, [`scripts/${script}`], extra);

console.log('\nPASS: cloud verification completed using disposable worlds. This is not a load test or proof of bug-free gameplay.');
