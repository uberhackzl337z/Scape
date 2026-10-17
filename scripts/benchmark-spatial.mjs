// Run after building. Synthetic CPU benchmark, not a game FPS or capacity test.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { nearestWithin } from '../dist/shared/spatial.js';

const origin = { x: 800, y: 550 };
const eligible = p => p.active;
const distance = p => Math.hypot(p.x - origin.x, p.y - origin.y);
const previous = roster => roster.filter(p => eligible(p) && distance(p) < 300)
  .sort((a, b) => distance(a) - distance(b))[0];
const current = roster => nearestWithin(roster, origin, 300, eligible);
const iterations = 20000;
let checksum = 0;
function measure(fn, roster) {
  const samples = [];
  for (let sample = 0; sample < 5; sample++) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) checksum += fn(roster)?.id ?? 0;
    samples.push(performance.now() - start);
  }
  return samples.sort((a, b) => a - b)[2];
}
for (const size of [32, 128, 200]) {
  const roster = Array.from({ length: size }, (_, id) => ({ id,
    x: 350 + (id * 97) % 900, y: 200 + (id * 71) % 700, active: id % 7 !== 0 }));
  assert.equal(previous(roster)?.id, current(roster)?.id);
  for (let i = 0; i < 2000; i++) { previous(roster); current(roster); }
  const before = measure(previous, roster), after = measure(current, roster);
  console.log(JSON.stringify({ players: size, selections: iterations,
    previousMs: +before.toFixed(2), currentMs: +after.toFixed(2), speedup: +(before / after).toFixed(1) }));
}
assert.ok(checksum > 0);
