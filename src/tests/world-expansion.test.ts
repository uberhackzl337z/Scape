import test from 'node:test';
import assert from 'node:assert/strict';
import { World, MAP, createPlayer, zone } from '../shared/world.js';
import { EXPEDITIONS, GROVES } from '../shared/world-layout.js';

test('expanded world preserves the central bank, original sites and accessible outer resources', () => {
    const w = new World();
    assert.equal(MAP.width * MAP.height, 4 * 1600 * 1100);
    assert.equal(MAP.minX + MAP.width / 2, MAP.bankX);
    assert.equal(MAP.minY + MAP.height / 2, MAP.bankY);
    assert.equal(zone({ x: 800, y: 550 }), 'bank');
    assert.equal(zone({ x: 1000, y: 550 }), 'wild');
    assert.equal(zone({ x: 170, y: 550 }), 'grove');
    assert.equal(w.nodes.find(n => n.id === 'n0-0')?.x, GROVES[0].x + 30);
    for (const n of w.nodes) {
        assert.ok(n.x > MAP.minX + 25 && n.x < MAP.minX + MAP.width - 25);
        assert.ok(n.y > MAP.minY + 25 && n.y < MAP.minY + MAP.height - 25);
        assert.equal(zone(n), 'grove', `${n.id} should be gatherable outside combat camps`);
    }
    assert.equal(new Set(w.nodes.map(n => n.id)).size, w.nodes.length);
    assert.ok(w.nodes.some(n => n.x < 0) && w.nodes.some(n => n.x > 1600));
});

test('outer camp monsters patrol and respawn in their own marked combat area', () => {
    const w = new World();
    for (let now = 1000; now < 30000; now += 100) w.tick(.1, now);
    for (const camp of EXPEDITIONS) {
        assert.equal(zone(camp), 'wild');
        assert.equal(zone({ x: camp.x + camp.radius + 1, y: camp.y }), 'grove');
        const guards = w.raiders.filter(e => e.id.startsWith(camp.id));
        assert.equal(guards.length, 2);
        for (const enemy of guards) {
            assert.ok(Math.hypot(enemy.x - camp.x, enemy.y - camp.y) < camp.radius - 20);
            enemy.hp = 0; enemy.respawnAt = 31000;
        }
    }
    w.tick(.1, 31000);
    for (const camp of EXPEDITIONS)
        for (const enemy of w.raiders.filter(e => e.id.startsWith(camp.id))) {
            assert.ok(enemy.hp > 0);
            assert.ok(Math.hypot(enemy.x - camp.x, enemy.y - camp.y) < camp.radius);
        }
});

test('movement can cross the old west edge and is clamped to the new edges', () => {
    const w = new World(), p = createPlayer('explorer');
    w.players.set(p.id, p); w.raiders = [];
    p.x = 28; p.y = 300;
    w.receiveInput(p.id, { x: -1, y: 0 }, 1000); w.tick(.1, 1000);
    assert.ok(p.x < 25, 'old map edge no longer blocks movement');
    p.x = MAP.minX + 26;
    w.receiveInput(p.id, { x: -1, y: 0 }, 1100); w.tick(.1, 1100);
    assert.equal(p.x, MAP.minX + 25);
    p.x = MAP.minX + MAP.width - 26; p.y = MAP.minY + MAP.height - 26;
    w.receiveInput(p.id, { x: 1, y: 1 }, 1200); w.tick(.1, 1200);
    assert.equal(p.x, MAP.minX + MAP.width - 25);
    assert.equal(p.y, MAP.minY + MAP.height - 25);
});
