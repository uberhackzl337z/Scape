// Deliberate source allowlist: no saves, environments, browser identities or credentials.
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
await mkdir('artifacts/cloud', { recursive: true });
const destination = await mkdtemp(resolve('artifacts/cloud/source-'));
const files = [];
async function copy(relative) {
  const info = await lstat(relative);
  if (info.isSymbolicLink()) throw new Error(`Source handoff refuses symbolic links: ${relative}`);
  if (info.isDirectory()) {
    for (const entry of (await readdir(relative)).sort()) await copy(`${relative}/${entry}`);
    return;
  }
  if (!info.isFile()) throw new Error(`Unexpected source entry: ${relative}`);
  if (!/\.(?:ts|js|mjs|json|yaml|yml|md|html|css|svg|cmd|txt)$/.test(relative) && !relative.endsWith('Caddyfile')) throw new Error(`Unexpected source file type: ${relative}`);
  await copyOne(relative);
}
async function copyOne(relative) {
  const info = await lstat(relative);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Not a regular source file: ${relative}`);
  const target = resolve(destination, relative);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(relative, target);
  files.push({ path: relative, sha256: createHash('sha256').update(await readFile(target)).digest('hex'), bytes: info.size });
}
for (const path of ['src', 'public', 'scripts', 'deploy', '.github']) await copy(path);
for (const path of ['package.json', 'pnpm-lock.yaml', 'tsconfig.json', '.nvmrc', '.gitignore', '.dockerignore', 'Dockerfile', 'compose.yaml', 'START-GAME.cmd', 'AGENTS.md', 'PROJECT_CONTEXT.md', 'README.md', 'VALIDATION.md']) await copyOne(path);
await mkdir(resolve(destination, 'docs'), { recursive: true });
for (const name of (await readdir('docs')).filter(name => name.endsWith('.md')).sort()) await copyOne(`docs/${name}`);
await writeFile(resolve(destination, 'SOURCE-MANIFEST.json'), JSON.stringify({ files }, null, 2) + '\n');
console.log(JSON.stringify({ destination, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) }));
