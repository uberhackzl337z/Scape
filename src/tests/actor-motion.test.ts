import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActorMotion } from '../client/actor-motion.js';

test('motion preserves interpolation, snap threshold and position identity', () => {
    const motion = new ActorMotion();
    motion.update([{ id: 'p', x: 10, y: 20 }], [], 1 / 60);
    const pos = motion.positions.get('p')!;
    motion.update([{ id: 'p', x: 106, y: 148 }], [], 1 / 60);
    const blend = 1 - Math.exp(-16 / 60);
    assert.equal(motion.positions.get('p'), pos);
    assert.equal(pos.x, 10 + 96 * blend);
    assert.equal(pos.y, 20 + 128 * blend); // Exactly 160 units still interpolates.
    motion.update([{ id: 'p', x: 1000, y: 900 }], [], 1 / 60);
    assert.deepEqual(pos, { x: 1000, y: 900 });
});

test('motion removes disconnected actors, retains both rosters and resets rejoining positions', () => {
    const motion = new ActorMotion();
    motion.update([{ id: 'p', x: 1, y: 2 }], [{ id: 'r', x: 3, y: 4 }], .05);
    motion.update([], [{ id: 'r', x: 3, y: 4 }], .05);
    assert.deepEqual([...motion.positions.keys()], ['r']);
    motion.update([{ id: 'p', x: 50, y: 60 }], [], .05);
    assert.deepEqual([...motion.positions], [['p', { x: 50, y: 60 }]]);
    motion.update([], [], .05);
    assert.equal(motion.positions.size, 0);
});
