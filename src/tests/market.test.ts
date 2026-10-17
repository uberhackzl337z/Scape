import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer, createEnemy, profileOf, cleanInput, bestWeapon } from '../shared/world.js';
import { ITEMS, ITEM_IDS } from '../shared/items.js';
import { buildLeaderboards } from '../shared/leaderboards.js';
import { recoverState } from '../persistence.js';
function setup() {
    const world = new World();
    world.raiders = [];
    const a = createPlayer('a', { name: 'Seller', coins: 1000 }), b = createPlayer('b', { name: 'Buyer', coins: 1000 });
    for (const p of [a, b]) {
        p.x = 800;
        p.y = 550;
        world.players.set(p.id, p);
    }
    const trade = (id: string, action: string, item: unknown = 'tonic', quantity: unknown = 1, extra = {}) => world.market.handle(id, { action, item, quantity, ...extra }, 1000);
    return { world, a, b, trade };
}
test('outfitter buys and sells exact quantities without minting XP or profitable shop loops', () => {
    const { a, trade, world } = setup();
    trade('a', 'buy', 'wood', 3);
    assert.equal(a.coins, 976);
    assert.equal(a.banked.wood, 3);
    assert.equal(a.xp.wood, 0);
    assert.equal(a.bag.wood, 0);
    world.interact(a, 2000);
    assert.equal(a.coins, 976);
    trade('a', 'sell', 'wood', 3);
    assert.equal(a.coins, 982);
    assert.equal(a.banked.wood, 0);
    for (const item of ITEM_IDS)
        assert.ok(ITEMS[item].sell < ITEMS[item].buy);
});
test('market rejects unsafe quantities, forged prices, unaffordable purchases and trades outside bank', () => {
    const { world, a, trade } = setup();
    for (const quantity of [-1, 0, 1.5, 100, NaN, Infinity, '1'])
        trade('a', 'buy', 'tonic', quantity);
    trade('a', 'buy', 'sword');
    trade('a', 'sell', 'tonic');
    assert.equal(a.coins, 1000);
    trade('a', 'buy', 'tonic', 1, { price: 0, coins: 99999 });
    assert.equal(a.coins, 970);
    assert.equal(a.items.tonic, 1);
    a.items.tonic = 99;
    trade('a', 'buy');
    assert.equal(a.coins, 970);
    a.coins = 0;
    trade('a', 'buy', 'warSpear');
    assert.equal(a.items.warSpear, 0);
    for (const state of ['grove', 'dead', 'duel']) {
        a.x = state === 'grove' ? 170 : 800;
        a.hp = state === 'dead' ? 0 : 100;
        a.duelId = state === 'duel' ? 'duel' : '';
        trade('a', 'sell', 'tonic');
        assert.equal(a.items.tonic, 99);
    }
    assert.ok(world.economyRevision > 0);
});
test('upgraded weapons require ownership and last-copy sale or listing restores a starter weapon', () => {
    const { world, a, trade } = setup();
    a.input = cleanInput({ weapon: 'battleAxe' });
    a.lastInput = 1000;
    world.tick(.05, 1000);
    assert.equal(a.weapon, 'sword');
    trade('a', 'equip', 'battleAxe');
    assert.equal(a.weapon, 'sword');
    trade('a', 'buy', 'battleAxe');
    trade('a', 'equip', 'battleAxe');
    assert.equal(a.weapon, 'battleAxe');
    assert.equal(bestWeapon(a, 'axe'), 'battleAxe');
    trade('a', 'list', 'battleAxe', 1, { unitPrice: 150 });
    assert.equal(a.weapon, 'axe');
    assert.equal(bestWeapon(a, 'axe'), 'axe');
    trade('a', 'buy', 'steelSword');
    trade('a', 'equip', 'steelSword');
    trade('a', 'sell', 'steelSword');
    assert.equal(a.weapon, 'sword');
});
test('player exchange escrows stock, settles partial purchases once, ignores forged cost and returns only unsold goods', () => {
    const { world, a, b, trade } = setup();
    a.items.tonic = 5;
    trade('a', 'list', 'tonic', 5, { unitPrice: 17 });
    const listing = world.market.listings[0];
    assert.equal(a.items.tonic, 0);
    trade('a', 'buyListing', 'tonic', 1, { listingId: listing.id });
    assert.equal(a.coins, 1000, 'self-purchase forbidden');
    trade('b', 'cancel', 'tonic', 1, { listingId: listing.id });
    assert.equal(world.market.listings.length, 1);
    trade('b', 'buyListing', 'wood', 2, { listingId: listing.id, unitPrice: 0, cost: 0 });
    assert.equal(a.coins, 1034);
    assert.equal(b.coins, 966);
    assert.equal(b.items.tonic, 2);
    assert.equal(listing.quantity, 3);
    trade('a', 'cancel', 'tonic', 1, { listingId: listing.id });
    assert.equal(a.items.tonic, 3);
    assert.equal(world.market.listings.length, 0);
    trade('b', 'buyListing', 'tonic', 1, { listingId: listing.id });
    assert.equal(a.coins + b.coins, 2000);
    assert.equal(a.items.tonic + b.items.tonic, 5);
});
test('offline sellers are paid and open listings survive a saved-state round trip', () => {
    const { world, a, b, trade } = setup();
    a.items.ration = 4;
    trade('a', 'list', 'ration', 4, { unitPrice: 9 });
    world.savedProfiles.set('private-seller-token', profileOf(a));
    world.players.delete('a');
    trade('b', 'buyListing', 'ration', 2, { listingId: world.market.listings[0].id });
    assert.equal(world.savedProfiles.get('private-seller-token')!.coins, 1018);
    const restored = recoverState(JSON.parse(JSON.stringify({ version: 3, profiles: { seller: world.savedProfiles.get('private-seller-token'), buyer: profileOf(b) }, escrows: [], marketListings: world.market.listings })));
    assert.equal(restored.marketListings[0].quantity, 2);
    assert.equal(restored.profiles.get('seller')!.coins, 1018);
    assert.equal(restored.profiles.get('buyer')!.items.ration, 2);
});
test('player listings enforce stock, price, stack and five-listing limits', () => {
    const { world, a, b, trade } = setup();
    a.items.tonic = 20;
    for (const price of [0, -1, 1.1, 5001, NaN, '10'])
        trade('a', 'list', 'tonic', 1, { unitPrice: price });
    assert.equal(world.market.listings.length, 0);
    for (let n = 0; n < 6; n++)
        trade('a', 'list', 'tonic', 1, { unitPrice: 10 });
    assert.equal(world.market.listings.length, 5);
    assert.equal(a.items.tonic, 15);
    b.items.tonic = 99;
    trade('b', 'buyListing', 'tonic', 1, { listingId: world.market.listings[0].id });
    assert.equal(b.coins, 1000);
    assert.equal(world.market.listings[0].quantity, 1);
    a.items.tonic = 99;
    trade('a', 'cancel', 'tonic', 1, { listingId: world.market.listings[0].id });
    assert.equal(world.market.listings.length, 5);
});
test('consumables clamp restoration, share cooldown, stay unused at full stats, and cannot be used in duels', () => {
    const { world, a } = setup();
    a.items.tonic = 3;
    a.items.ration = 2;
    world.useSupply('a', 'tonic', 1000);
    assert.equal(a.items.tonic, 3);
    a.hp = 80;
    world.useSupply('a', 'tonic', 1000);
    assert.equal(a.hp, 100);
    assert.equal(a.items.tonic, 2);
    a.stamina = 10;
    world.useSupply('a', 'ration', 1001);
    assert.equal(a.stamina, 10);
    world.useSupply('a', 'ration', 9000);
    assert.equal(a.stamina, 55);
    assert.equal(a.items.ration, 1);
    a.duelId = 'x';
    a.hp = 30;
    world.useSupply('a', 'tonic', 19000);
    assert.equal(a.hp, 30);
    assert.equal(a.items.tonic, 2);
    a.duelId = '';
    a.hp = 0;
    world.useSupply('a', 'tonic', 19000);
    assert.equal(a.hp, 0);
});
test('PvE tracks distinct enemy and boss defeats once and preserves old combat XP', () => {
    const { world, a } = setup();
    a.combatXp = 50;
    a.x = 1360;
    const boss = createEnemy('boss', 'boss', 1360, 550);
    world.raiders = [boss];
    world.hitEnemy(boss, a, 1000, 1000);
    world.hitEnemy(boss, a, 1000, 1001);
    assert.equal(a.combatXp, 350);
    assert.equal(a.pveKills, 1);
    assert.equal(a.bossKills, 1);
});
test('PvP score rewards knockouts and world kills, with a shared per-victim cooldown surviving saves', () => {
    const { world, a, b } = setup();
    world.recordPvpWin(a, b, 'duel', 1000);
    assert.equal(a.pvpScore, 100);
    world.recordPvpWin(a, b, 'world', 2000);
    assert.equal(a.pvpScore, 100);
    assert.equal(a.pvpKills, 1);
    assert.equal(b.pvpDeaths, 1);
    assert.equal(a.duelKnockouts, 1);
    const restored = createPlayer('returning', profileOf(a));
    world.recordPvpWin(restored, b, 'world', 600999);
    assert.equal(restored.pvpScore, 100);
    world.recordPvpWin(restored, b, 'world', 601000);
    assert.equal(restored.pvpScore, 125);
});
test('forfeits settle wagers without earning PvP points, while a real duel knockout earns 100', () => {
    for (const knockout of [false, true]) {
        const { world, a, b } = setup();
        a.x = 620;
        b.x = 650;
        world.dueling.handle('a', { action: 'offer', targetId: 'b', wager: 10 }, 1000);
        world.dueling.handle('b', { action: 'accept', offerId: world.dueling.offers[0].id }, 1100);
        world.dueling.tick(4200);
        if (knockout)
            world.damage(b, 100, 4300, a);
        else
            world.dueling.handle('b', { action: 'forfeit' }, 4300);
        assert.equal(a.duelWins, 1);
        assert.equal(a.pvpScore, knockout ? 100 : 0);
        assert.equal(a.duelKnockouts, knockout ? 1 : 0);
    }
});
test('leaderboards merge current and offline characters, rank independently and reveal no resume tokens', () => {
    const saved = createPlayer('p', { name: 'Offline', combatXp: 300, pvpScore: 25 }), live = createPlayer('p', { name: 'Current', combatXp: 400, pvpScore: 25 }), rival = createPlayer('q', { name: 'Rival', combatXp: 200, pvpScore: 100 });
    const boards = buildLeaderboards([saved, rival], [live]);
    assert.equal(boards.pve.length, 2);
    assert.equal(boards.pve[0].name, 'Current');
    assert.equal(boards.pve[0].online, true);
    assert.equal(boards.pvp[0].name, 'Rival');
    assert.equal(boards.pvp[0].online, false);
    assert.equal(boards.pvp[1].rank, 2);
    assert.ok(!JSON.stringify(boards).includes('recentPvpWins'));
    assert.ok(!JSON.stringify(boards).includes('coins'));
    const tied = buildLeaderboards([createPlayer('b', { name: 'B', combatXp: 50 }), createPlayer('a', { name: 'A', combatXp: 50 })], []);
    assert.equal(tied.pve[0].name, 'A');
});
test('old saves gain empty inventory and scores; invalid v3 inventory and listings fail without silent data loss', () => {
    const legacy = recoverState({ old: { name: 'Old', banked: { wood: 2, ore: 3 }, xp: { wood: 20, ore: 42 }, combatXp: 75 } });
    assert.equal(legacy.profiles.get('old')!.combatXp, 75);
    assert.equal(legacy.profiles.get('old')!.items.tonic, 0);
    assert.equal(legacy.profiles.get('old')!.pvpScore, 0);
    assert.equal(legacy.profiles.get('old')!.coins, 34);
    const a = createPlayer('a');
    a.items.tonic = -1;
    assert.throws(() => recoverState({ version: 3, profiles: { a }, escrows: [], marketListings: [] }));
    a.items.tonic = 1;
    assert.throws(() => recoverState({ version: 3, profiles: { a }, escrows: [], marketListings: [{ id: 'bad', sellerId: 'missing', item: 'tonic', quantity: 1, unitPrice: 10, createdAt: 1 }] }));
});
