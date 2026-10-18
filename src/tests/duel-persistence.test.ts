import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer } from '../shared/world.js';
import { captureProfile, recoverState } from '../persistence.js';

test('server duel snapshots retain independent uncapped hauls and refund stakes once', () => {
    const world = new World();
    const a = createPlayer('a', { coins: 100 }), b = createPlayer('b', { coins: 100 });
    a.x = 610; b.x = 640; a.y = b.y = 550;
    a.bag = { wood: 123_456_789, ore: 15 };
    world.players.set(a.id, a); world.players.set(b.id, b);
    world.dueling.handle('a', { action: 'offer', targetId: 'b', wager: 20 }, 1000);
    world.dueling.handle('b', { action: 'accept', offerId: world.dueling.offers[0].id }, 1200);
    const profiles = { a: captureProfile(a), b: captureProfile(b) };
    a.bag.wood = 0;
    const recovered = recoverState({ version: 5, profiles, marketListings: [], escrows: [
        { id: world.dueling.matches[0].id, tokens: ['a', 'b'], wager: 20 },
    ] });
    const resumed = createPlayer('resumed', recovered.profiles.get('a'));
    assert.deepEqual(resumed.bag, { wood: 123_456_789, ore: 15 });
    assert.equal(resumed.coins, 100);
    assert.equal(captureProfile(resumed).duelBag, undefined, 'ordinary play must not retain a stale protected haul');
    world.dueling.cancelAll(2000);
    assert.equal(captureProfile(a).duelBag, undefined);
    assert.deepEqual(captureProfile(a, true).duelBag, a.bag, 'shutdown captures the pre-cancellation duel membership');
});
