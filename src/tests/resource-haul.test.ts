import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer, count, profileOf, MAP } from '../shared/world.js';
import { RESOURCE_IDS, RESOURCES } from '../shared/skills.js';
import { recoverState } from '../persistence.js';
import { bagEntries } from '../client/bag-view.js';

test('large mixed hauls keep gathering, bank exactly once and recover without the former storage ceiling', () => {
    const world = new World(), p = createPlayer('p');
    world.players.set(p.id, p);
    p.x = 100; p.y = 100;
    p.bag.wood = 100_000_001;
    let now = 1000;
    for (const kind of RESOURCE_IDS) {
        world.nodes = [{ id: kind, kind, x: p.x, y: p.y, stock: 101, readyAt: 0 }];
        for (let i = 0; i < 100; i++) { world.interact(p, now); now += 1000; }
        assert.equal(p.bag[kind], kind === 'wood' ? 100_000_101 : 100);
    }
    assert.equal(count(p.bag), 100_001_001);
    assert.equal(p.xp.wood, 0);
    assert.equal(p.coins, 0);
    assert.equal(bagEntries(p.bag).length, RESOURCE_IDS.length, 'UI work is per resource kind, not unit count');
    const expectedCoins = RESOURCE_IDS.reduce((n, r) => n + p.bag[r]! * RESOURCES[r].coins, 0);
    p.x = MAP.bankX; p.y = MAP.bankY;
    world.interact(p, now);
    assert.equal(count(p.bag), 0);
    assert.equal(p.coins, expectedCoins);
    assert.equal(p.banked.wood, 100_000_101);
    assert.equal(p.xp.wood, 1_000_001_010);
    assert.equal(p.skills.farming, 2000);
    world.interact(p, now + 1000);
    assert.equal(p.coins, expectedCoins, 'a deposit cannot pay twice');
    const recovered = recoverState({ version: 5, profiles: { test: profileOf(p) }, escrows: [], marketListings: [] });
    assert.equal(recovered.profiles.get('test')!.banked.wood, p.banked.wood);
    assert.equal(recovered.profiles.get('test')!.coins, expectedCoins);
});

test('large dropped hauls recover completely and interrupted duel bags retain large counts', () => {
    const world = new World(), p = createPlayer('p');
    p.bag = { wood: 123_456_789, ore: 555, rawFish: 999, flax: 888 };
    const expected = count(p.bag);
    world.drop(p, 1000);
    assert.equal(count(p.bag), 0);
    world.interact(p, 2000);
    assert.equal(count(p.bag), expected);
    assert.equal(count(world.loot[0].bag), 0);
    world.interact(p, 3000);
    assert.equal(count(p.bag), expected, 'empty loot cannot be collected twice');
    const saved = { ...profileOf(p), duelBag: { ...p.bag } };
    const restored = recoverState({ version: 5, profiles: { test: saved }, escrows: [], marketListings: [] });
    assert.deepEqual(createPlayer('resumed', restored.profiles.get('test')).bag, p.bag);
});

test('numeric precision rejection is atomic and never spends resources or corrupts storage', () => {
    const world = new World(), p = createPlayer('p');
    p.x = MAP.bankX; p.y = MAP.bankY; p.coins = Number.MAX_SAFE_INTEGER;
    p.bag = { wood: 100, ore: 200 };
    world.interact(p, 1000);
    assert.deepEqual(p.bag, { wood: 100, ore: 200 });
    assert.equal(p.banked.wood, 0);
    assert.equal(p.xp.ore, 0);
    assert.equal(p.coins, Number.MAX_SAFE_INTEGER);
    p.coins = 0; p.skills.farming = Number.MAX_SAFE_INTEGER - 10;
    p.bag = { wood: 0, ore: 0, grain: 1, flax: 1 };
    world.interact(p, 2000);
    assert.equal(count(p.bag), 2, 'shared farming XP is checked as a combined gain');
    assert.equal(p.items.grain, 0);
    assert.equal(p.coins, 0);
});
