import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer, profileOf, cleanInput, createEnemy, count } from '../shared/world.js';
import { DUEL_RULES } from '../shared/duels.js';
import { recoverState, type SaveState } from '../persistence.js';
function setup() { const world = new World(); world.raiders = []; const a = createPlayer('a', { coins: 100 }), b = createPlayer('b', { coins: 100 }); a.name = 'A'; b.name = 'B'; a.x = 610; b.x = 640; a.y = b.y = 550; world.players.set(a.id, a); world.players.set(b.id, b); return { world, a, b }; }
function offer(world: World) { world.dueling.handle('a', { action: 'offer', targetId: 'b', wager: 20 }, 1000); return world.dueling.offers[0]; }
function start() { const s = setup(); const o = offer(s.world); s.world.dueling.handle('b', { action: 'accept', offerId: o.id }, 1200); return s; }
test('banking mints earned coins once and old saves receive only their earned equivalent', () => {
    const { world, a } = setup();
    a.coins = 0;
    a.x = 800;
    a.bag = { wood: 2, ore: 1 };
    world.interact(a, 1000);
    assert.equal(a.coins, 18);
    world.interact(a, 2000);
    assert.equal(a.coins, 18);
    assert.equal(createPlayer('old', { banked: { wood: 2, ore: 1 } }).coins, 18);
    assert.equal(createPlayer('new').coins, 0);
});
test('pending, declined, cancelled, and expired offers never take coins', () => {
    for (const action of ['decline', 'cancel', 'expire'] as const) {
        const { world, a, b } = setup();
        const o = offer(world);
        assert.equal(a.coins, 100);
        assert.equal(b.coins, 100);
        if (action === 'expire')
            world.dueling.tick(22000);
        else
            world.dueling.handle(action === 'cancel' ? 'a' : 'b', { action, offerId: o.id }, 1500);
        assert.equal(world.dueling.offers.length, 0);
        assert.equal(a.coins + b.coins, 200);
        assert.equal(world.dueling.matches.length, 0);
    }
});
test('invalid, fractional, unsafe, self, distant, and non-PvP wagers are rejected', () => {
    for (const wager of [-20, 0, 9, 501, 1.5, NaN, Infinity, '20', Number.MAX_SAFE_INTEGER]) {
        const { world } = setup();
        world.dueling.handle('a', { action: 'offer', targetId: 'b', wager }, 1000);
        assert.equal(world.dueling.offers.length, 0);
    }
    for (const mode of ['self', 'safe', 'distant', 'boss']) {
        const { world, a, b } = setup();
        if (mode === 'safe')
            a.x = 800;
        if (mode === 'distant')
            b.y = 200;
        if (mode === 'boss') {
            a.x = 1340;
            b.x = 1360;
        }
        world.dueling.handle('a', { action: 'offer', targetId: mode === 'self' ? 'a' : 'b', wager: 20 }, 1000);
        assert.equal(world.dueling.offers.length, 0);
    }
});
test('only the addressed opponent can consent and acceptance uses the stored stake', () => {
    const { world, a, b } = setup();
    const o = offer(world);
    world.dueling.handle('a', { action: 'accept', offerId: o.id }, 1200);
    assert.equal(world.dueling.matches.length, 0);
    world.dueling.handle('b', { action: 'accept', offerId: o.id, wager: 500, pot: 999999 }, 1300);
    assert.equal(a.coins, 80);
    assert.equal(b.coins, 80);
    assert.equal(world.dueling.matches[0].pot, 40);
    world.dueling.handle('b', { action: 'accept', offerId: o.id }, 1400);
    assert.equal(a.coins + b.coins, 160);
    assert.equal(world.dueling.matches.length, 1);
});
test('acceptance rechecks funds and location before debiting either player', () => {
    for (const mode of ['funds', 'location', 'expired']) {
        const { world, a, b } = setup();
        const o = offer(world);
        if (mode === 'funds')
            b.coins = 10;
        if (mode === 'location')
            a.x = 800;
        world.dueling.handle('b', { action: 'accept', offerId: o.id }, mode === 'expired' ? 22000 : 1300);
        assert.equal(a.coins, 100);
        assert.equal(b.coins, mode === 'funds' ? 10 : 100);
        assert.equal(world.dueling.matches.length, 0);
    }
});
test('countdown freezes movement, dodging, and damage, then starts a full-health fight', () => {
    const { world, a, b } = start();
    a.input = cleanInput({ x: 1, attack: true, dodge: true });
    a.lastInput = 2000;
    const x = a.x;
    world.tick(.1, 2000);
    world.damage(b, 90, 2000, a);
    assert.equal(a.x, x);
    assert.equal(b.hp, 100);
    assert.equal(a.stamina, 100);
    world.tick(0, 4200);
    assert.equal(world.dueling.matches[0].phase, 'active');
    world.damage(b, 25, 4300, a);
    assert.equal(b.hp, 75);
    world.tick(.1, 4400);
    assert.equal(b.hp, 75, 'duelists get no safe-ground regeneration');
});
test('duel damage excludes NPCs, outsiders, and attacks against the wider world', () => {
    const { world, a, b } = start();
    world.tick(0, 4200);
    const c = createPlayer('c');
    c.x = 570;
    c.y = 550;
    c.weapon = 'spear';
    world.players.set(c.id, c);
    world.damage(b, 90, 4300);
    world.damage(b, 90, 4300, c);
    assert.equal(b.hp, 100);
    world.attack(c, 4500);
    assert.equal(b.hp, 100);
    const enemy = createEnemy('brute', 'npc', a.x, a.y);
    world.raiders = [enemy];
    world.hitEnemy(enemy, a, 100, 4500);
    assert.equal(enemy.hp, 180);
    world.damage(c, 99, 4500, a);
    assert.equal(c.hp, 100);
});
test('real weapon knockout pays the pot once, keeps bags and XP, and updates duel record', () => {
    const { world, a, b } = start();
    a.bag = { wood: 2, ore: 1 };
    b.bag = { wood: 1, ore: 2 };
    b.xp.wood = 60;
    a.weapon = 'spear';
    world.tick(0, 4200);
    for (let now = 4200; now <= 6800; now += 650)
        world.attack(a, now);
    assert.equal(a.coins, 120);
    assert.equal(b.coins, 80);
    assert.equal(a.duelWins, 1);
    assert.equal(b.duelLosses, 1);
    assert.equal(count(a.bag), 3);
    assert.equal(count(b.bag), 3);
    assert.equal(b.xp.wood, 60);
    assert.equal(world.loot.length, 0);
    assert.equal(b.hp, 100);
    assert.equal(a.combatXp, 0);
    world.dueling.lose('b', 7000, 'duplicate');
    world.dueling.handle('b', { action: 'forfeit' }, 7100);
    assert.equal(a.coins + b.coins, 200);
    assert.equal(a.coins, 120);
});
test('disconnect and forfeit pay the opponent exactly once', () => {
    for (const mode of ['disconnect', 'forfeit']) {
        const { world, a, b } = start();
        if (mode === 'disconnect')
            world.dueling.disconnect('a', 1500);
        else
            world.dueling.handle('a', { action: 'forfeit' }, 1500);
        world.dueling.disconnect('a', 1600);
        assert.equal(a.coins, 80);
        assert.equal(b.coins, 120);
        assert.equal(b.duelWins, 1);
        assert.equal(a.duelLosses, 1);
    }
});
test('leaving the ring grants a return grace period and then forfeits', () => {
    const { world, a, b } = start();
    world.tick(0, 4200);
    a.x = DUEL_RULES.x + DUEL_RULES.radius + 1;
    world.dueling.tick(4500);
    assert.equal(world.dueling.canStrike(a.id), false);
    a.x = DUEL_RULES.x;
    world.dueling.tick(5500);
    assert.equal(world.dueling.forPlayer(a.id)?.phase, 'active');
    a.x = DUEL_RULES.x + DUEL_RULES.radius + 1;
    world.dueling.tick(6000);
    world.dueling.tick(7999);
    assert.equal(a.coins, 80);
    world.dueling.tick(8000);
    assert.equal(b.coins, 120);
});
test('timeout and server cancellation refund both stakes without recording a win', () => {
    for (const mode of ['timeout', 'restart']) {
        const { world, a, b } = start();
        if (mode === 'timeout')
            world.dueling.tick(124200);
        else
            world.dueling.cancelAll(5000);
        assert.equal(a.coins, 100);
        assert.equal(b.coins, 100);
        assert.equal(a.duelWins + b.duelWins, 0);
        world.dueling.cancelAll(6000);
        assert.equal(a.coins + b.coins, 200);
    }
});
test('occupied ring cannot escrow a second pair and stale challenges cannot be accepted', () => {
    const { world } = start();
    const c = createPlayer('c', { coins: 100 }), d = createPlayer('d', { coins: 100 });
    c.x = 610;
    d.x = 640;
    c.y = d.y = 550;
    world.players.set(c.id, c);
    world.players.set(d.id, d);
    world.dueling.handle('c', { action: 'offer', targetId: 'd', wager: 20 }, 2000);
    const o = world.dueling.offers[0];
    world.dueling.handle('d', { action: 'accept', offerId: o.id }, 2100);
    assert.equal(c.coins + d.coins, 200);
    assert.equal(world.dueling.matches.length, 1);
});
test('interrupted escrow recovers both wallets once and settled saves do not refund again', () => {
    const { a, b } = start();
    const saved: SaveState = { version: 2, profiles: { a: profileOf(a), b: profileOf(b) }, escrows: [{ id: 'duel1', tokens: ['a', 'b'], wager: 20 }] };
    const recovered = recoverState(saved);
    assert.equal(recovered.refunded, 1);
    assert.equal(recovered.profiles.get('a')!.coins, 100);
    assert.equal(recovered.profiles.get('b')!.coins, 100);
    const cleared: SaveState = { version: 2, profiles: Object.fromEntries(recovered.profiles), escrows: [] };
    assert.equal(recoverState(cleared).profiles.get('a')!.coins, 100);
    const duplicate = recoverState({ ...saved, escrows: [saved.escrows[0], saved.escrows[0]] });
    assert.equal(duplicate.profiles.get('a')!.coins, 100);
});
test('old profile files migrate earned balances and malformed coin saves fail closed', () => {
    const migrated = recoverState({ old: { name: 'Old', xp: { wood: 60, ore: 0 }, banked: { wood: 6, ore: 4 }, kills: 2, runs: 1 } });
    assert.equal(migrated.profiles.get('old')!.coins, 62);
    assert.throws(() => recoverState({ bad: { coins: -5 } }));
    assert.throws(() => recoverState({ version: 2, profiles: { a: profileOf(createPlayer('a')) }, escrows: [{ id: 'x', tokens: ['a', 'missing'], wager: 20 }] }));
    const stash = recoverState({ a: { ...profileOf(createPlayer('a')), duelBag: { wood: 2, ore: 1 } } });
    assert.equal(count(createPlayer('a', stash.profiles.get('a')).bag), 3);
});
