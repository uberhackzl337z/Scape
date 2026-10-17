import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestWithin, inView } from '../shared/spatial.js';

test('nearest selection preserves first ties, strict range, eligibility and iterable inputs', () => {
    const first = { x: 3, y: 4, alive: true }, tie = { x: -3, y: -4, alive: true };
    const blocked = { x: 0, y: 0, alive: false }, boundary = { x: 6, y: 8, alive: true };
    const candidates = new Map([['blocked', blocked], ['first', first], ['tie', tie], ['boundary', boundary]]);
    assert.equal(nearestWithin(candidates.values(), { x: 0, y: 0 }, 10, a => a.alive), first);
    assert.equal(nearestWithin([boundary], { x: 0, y: 0 }, 10, () => true), undefined);
    assert.equal(nearestWithin([], first, Infinity, () => true), undefined);
    assert.equal(nearestWithin([first], first, 10, () => true), first);
    assert.equal(nearestWithin([first], first, -10, () => true), undefined);
});

test('padded view retains large sprite edges and rejects distant objects', () => {
    const camera = { x: 800, y: 550 };
    assert.ok(inView({ x: 1060, y: 550 }, camera, 100, 100));
    assert.ok(!inView({ x: 1060.01, y: 550 }, camera, 100, 100));
    assert.ok(inView({ x: 800, y: 290 }, camera, 100, 100));
    assert.ok(!inView({ x: 800, y: 289 }, camera, 100, 100));
});
