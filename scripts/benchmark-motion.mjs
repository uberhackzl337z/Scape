// Synthetic CPU comparison of roster interpolation only, not a browser FPS test.
// Build first, then run: node scripts/benchmark-motion.mjs
import { performance } from 'node:perf_hooks';
import { ActorMotion } from '../dist/client/actor-motion.js';

function previousFrame(positions, players, raiders, dt) {
    for (const id of positions.keys())
        if (![...players, ...raiders].some(actor => actor.id === id)) positions.delete(id);
    for (const actor of [...players, ...raiders]) {
        const pos = positions.get(actor.id) ?? { x: actor.x, y: actor.y };
        if (Math.hypot(pos.x - actor.x, pos.y - actor.y) > 160) {
            pos.x = actor.x;
            pos.y = actor.y;
        }
        pos.x += (actor.x - pos.x) * (1 - Math.exp(-16 * dt));
        pos.y += (actor.y - pos.y) * (1 - Math.exp(-16 * dt));
        positions.set(actor.id, pos);
    }
}

const frames = 2000;
function measure(fn) {
    const start = performance.now();
    for (let i = 0; i < frames; i++) fn();
    return performance.now() - start;
}
for (const count of [32, 128, 512]) {
    const actors = Array.from({ length: count }, (_, i) => ({ id: String(i), x: i % 1600, y: i % 1100 }));
    const players = actors.slice(0, count / 2), raiders = actors.slice(count / 2);
    const positions = new Map(), motion = new ActorMotion();
    const before = () => previousFrame(positions, players, raiders, 1 / 60);
    const after = () => motion.update(players, raiders, 1 / 60);
    for (let i = 0; i < 500; i++) { before(); after(); }
    const oldSamples = [], newSamples = [];
    for (let i = 0; i < 5; i++) { oldSamples.push(measure(before)); newSamples.push(measure(after)); }
    oldSamples.sort((a, b) => a - b);
    newSamples.sort((a, b) => a - b);
    console.log(JSON.stringify({ actors: count, frames, beforeMs: +oldSamples[2].toFixed(2),
        afterMs: +newSamples[2].toFixed(2), ratio: +(oldSamples[2] / newSamples[2]).toFixed(1) }));
}
