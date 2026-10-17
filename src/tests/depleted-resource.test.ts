import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer } from '../shared/world.js';

test('depleted sites explain regrowth, yield nothing until ready, then resume gathering', () => {
    const world = new World(), player = createPlayer('gatherer');
    player.x = 290; player.y = 570;
    world.players.set(player.id, player); world.raiders = [];
    world.nodes = [{ id: 'berries', kind: 'berries', x: 290, y: 570, stock: 0, readyAt: 12000 }];
    world.interact(player, 1000);
    assert.equal(player.message, 'Berries site depleted. Regrows in 11s.');
    assert.equal(player.bag.berries ?? 0, 0);
    assert.equal(player.gathering, undefined);
    world.tick(0, 12000);
    world.interact(player, 12000);
    assert.equal(player.bag.berries, 1);
    assert.equal(world.snapshot(12000).players[0].gathering?.kind, 'berries');
    player.x = 50; player.y = 100;
    world.interact(player, 13000);
    assert.equal(player.message, 'Move closer to a resource site or dropped haul.');
    assert.equal(player.bag.berries, 1);
});
