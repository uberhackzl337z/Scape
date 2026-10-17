import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer, profileOf, MAP } from '../shared/world.js';
import { RESOURCE_IDS, type Resource } from '../shared/skills.js';
import { gatherPose } from '../client/gather-view.js';

function fixture(kind: Resource = 'wood') {
    const world = new World(), player = createPlayer('gatherer');
    player.x = 220; player.y = 300;
    world.players.set(player.id, player);
    world.raiders = [];
    world.nodes = [{ id: 'resource', kind, x: 250, y: 300, stock: 4, readyAt: 0 }];
    return { world, player };
}

test('every resource produces a server-owned timed gathering pose visible in snapshots, never saves', () => {
    for (const kind of RESOURCE_IDS) {
        const { world, player } = fixture(kind);
        world.receiveInput(player.id, { interact: true, gathering: { kind: 'ore', until: 999999 } }, 1000);
        world.tick(0, 1000);
        assert.equal(player.bag[kind], 1);
        assert.deepEqual(player.gathering, { kind, x: 250, y: 300, at: 1000, until: player.gatherAt });
        assert.deepEqual(world.snapshot(1000).players[0].gathering, player.gathering);
        assert.ok(!('gathering' in profileOf(player)));
        const before = player.gathering;
        world.interact(player, 1100);
        assert.equal(player.gathering, before, 'cooldown does not restart an animation or gather twice');
        assert.equal(player.bag[kind], 1);
    }
});

test('release, expired input, movement, combat, dodge, death and duels cancel the visual action', () => {
    for (const action of ['release', 'stale', 'move', 'attack', 'dodge', 'death', 'duel'] as const) {
        const { world, player } = fixture();
        world.receiveInput(player.id, { interact: true }, 1000);
        world.tick(0, 1000);
        assert.ok(player.gathering, action);
        if (action === 'death') player.hp = 0;
        if (action === 'duel') player.duelId = 'active';
        if (action !== 'stale') world.receiveInput(player.id, {
            interact: action !== 'release', x: action === 'move' ? 1 : 0,
            attack: action === 'attack', dodge: action === 'dodge'
        }, 1050);
        world.tick(0, action === 'stale' ? 1400 : 1050);
        assert.equal(player.gathering, undefined, action);
    }
});

test('full bags, empty sites, out-of-range actions and bank deposits never invent a gathering pose', () => {
    for (const mode of ['full', 'empty', 'far', 'bank'] as const) {
        const { world, player } = fixture();
        if (mode === 'full') player.bag.wood = MAP.capacity;
        if (mode === 'empty') { world.nodes[0].stock = 0; world.nodes[0].readyAt = 2000; }
        if (mode === 'far') player.x = 25;
        if (mode === 'bank') { player.x = MAP.bankX; player.y = MAP.bankY; player.bag.wood = 2; }
        world.receiveInput(player.id, { interact: true }, 1000);
        world.tick(0, 1000);
        assert.equal(player.gathering, undefined, mode);
    }
});

test('render pose expires and yields to combat, dodges, death, distance and legacy snapshots', () => {
    const { world, player } = fixture();
    world.receiveInput(player.id, { interact: true }, 1000);
    world.tick(0, 1000);
    assert.equal(gatherPose(player, 1350)?.progress, .5);
    assert.equal(gatherPose(player, 1700), undefined);
    assert.equal(gatherPose(player, 999), undefined);
    assert.equal(gatherPose({ ...player, gathering: undefined }, 1100), undefined);
    assert.equal(gatherPose({ ...player, hp: 0 }, 1100), undefined);
    assert.equal(gatherPose({ ...player, swingAt: 1050 }, 1100), undefined);
    assert.equal(gatherPose({ ...player, dodgeUntil: 1200 }, 1100), undefined);
    assert.equal(gatherPose({ ...player, x: 400 }, 1100), undefined);
});
