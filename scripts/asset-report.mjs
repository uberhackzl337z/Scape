// A conservative download budget: public assets plus all served browser modules.
import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const BUDGET = { rawBytes: 512 * 1024, gzipBytes: 128 * 1024 };

export async function measureAssets(root) {
  const assets = [];
  async function scan(directory, modulesOnly = false) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Browser assets must not be symbolic links');
      if (entry.isDirectory()) await scan(path, modulesOnly);
      else if (entry.isFile() && (!modulesOnly || entry.name.endsWith('.js'))) {
        const content = await readFile(path);
        assets.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: content.length,
          gzipBytes: gzipSync(content).length });
      }
    }
  }
  await scan(resolve(root, 'public'));
  await scan(resolve(root, 'dist/client'), true);
  await scan(resolve(root, 'dist/shared'), true);
  for (const required of ['public/index.html', 'dist/client/main.js', 'dist/shared/world.js']) {
    if (!assets.some(asset => asset.path === required)) throw new Error(`Missing ${required}; build the game first`);
  }
  assets.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
  return { files: assets.length, rawBytes: assets.reduce((n, a) => n + a.bytes, 0),
    gzipBytes: assets.reduce((n, a) => n + a.gzipBytes, 0), assets };
}

export function checkBudget(report) {
  if (report.rawBytes > BUDGET.rawBytes || report.gzipBytes > BUDGET.gzipBytes)
    throw new Error('Browser download budget exceeded; inspect the largest assets before raising the budget');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await measureAssets(fileURLToPath(new URL('../', import.meta.url)));
  const kib = bytes => (bytes / 1024).toFixed(1);
  console.log(`Scape browser assets: ${report.files} files, ${kib(report.rawBytes)} KiB raw, ${kib(report.gzipBytes)} KiB estimated gzip`);
  console.log(`Budgets: ${kib(BUDGET.rawBytes)} KiB raw / ${kib(BUDGET.gzipBytes)} KiB gzip. Excludes ongoing WebSocket traffic.`);
  for (const asset of report.assets.slice(0, 5))
    console.log(`  ${asset.path}: ${kib(asset.bytes)} KiB raw / ${kib(asset.gzipBytes)} KiB gzip`);
  checkBudget(report);
}
