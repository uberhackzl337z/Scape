import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, profileOf } from '../shared/world.js';
import { rankPlayers, queryScores } from '../shared/leaderboards.js';
function roster() { return Array.from({ length: 60 }, (_, i) => profileOf(createPlayer(`player-${i + 1}`, { name: `Player ${String(i + 1).padStart(2, '0')}`, combatXp: (i + 1) * 25, xp: { wood: (i + 1) * 10, ore: (i + 1) * 14 }, pvpScore: (i + 1) * 25 }))); }
test('overall ranks by the sum of actual skill levels before total XP and ignores unearned profiles', () => {
    const specialist = createPlayer('specialist', { combatXp: 400 }), rounded = createPlayer('rounded', { combatXp: 160, xp: { wood: 160, ore: 0 } }), fresh = createPlayer('fresh');
    const ranked = rankPlayers([specialist, rounded, fresh], [], 'overall');
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].publicId, 'rounded');
    assert.equal(ranked[0].totalLevel, 29);
    assert.equal(ranked[0].totalXp, 320);
    assert.equal(ranked[1].totalLevel, 28);
});
test('queries page all ranked characters and locate own rank beyond the first 25', () => {
    const saved = roster(), self = queryScores(saved, [], 'player-1', { board: 'overall', view: 'self', requestId: 7 });
    assert.equal(self.total, 60);
    assert.equal(self.pages, 3);
    assert.equal(self.page, 3);
    assert.equal(self.self!.rank, 60);
    assert.equal(self.entries.length, 10);
    assert.equal(self.entries.at(-1)!.publicId, 'player-1');
    assert.equal(self.highlightId, 'player-1');
    assert.equal(self.requestId, 7);
    const page = queryScores(saved, [], 'player-1', { board: 'overall', page: 2 });
    assert.equal(page.entries.length, 25);
    assert.equal(page.entries[0].rank, 26);
    assert.equal(page.entries.at(-1)!.rank, 50);
    const high = queryScores(saved, [], 'player-1', { board: 'overall', page: 99999 });
    assert.equal(high.page, 3);
});
test('name searches are case insensitive and keep global rank, while rank search locates the right page', () => {
    const saved = roster(), name = queryScores(saved, [], 'player-1', { board: 'pve', view: 'name', query: '  pLaYeR 44  ' });
    assert.equal(name.matches, 1);
    assert.equal(name.entries[0].rank, 17);
    assert.equal(name.entries[0].name, 'Player 44');
    assert.equal(name.total, 60);
    const rank = queryScores(saved, [], 'player-1', { board: 'pve', view: 'rank', rank: 26 });
    assert.equal(rank.page, 2);
    assert.equal(rank.entries[0].rank, 26);
    assert.equal(rank.highlightId, rank.entries[0].publicId);
    const missing = queryScores(saved, [], 'player-1', { board: 'pve', view: 'name', query: '[.*]' });
    assert.equal(missing.matches, 0);
    assert.equal(missing.pages, 1);
    assert.equal(missing.error, '');
});
test('skill and boss/duel categories rank their tracked metrics independently without using forfeits as knockouts', () => {
    const a = createPlayer('a', { xp: { wood: 400, ore: 0 }, bossKills: 1, duelWins: 20 }), b = createPlayer('b', { xp: { wood: 40, ore: 160 }, bossKills: 3, duelKnockouts: 1, duelWins: 1 });
    for (const [board, first] of [['woodcutting', 'a'], ['mining', 'b'], ['bosses', 'b'], ['duels', 'b']] as const) {
        const ranked = rankPlayers([a, b], [], board);
        assert.equal(ranked[0].publicId, first);
    }
    const refreshed = createPlayer('a', { xp: { wood: 0, ore: 400 }, name: 'Live' });
    const result = queryScores([a, b], [refreshed], 'a', { board: 'mining' });
    assert.equal(result.entries.length, 2);
    assert.equal(result.entries[0].name, 'Live');
    assert.equal(result.entries[0].online, true);
});
test('invalid searches and unranked players return useful bounded pages without changing saved progress', () => {
    const saved = roster(), before = JSON.stringify(saved);
    for (const rank of [0, -1, 1.5, 61, Infinity, '2']) {
        const r = queryScores(saved, [], 'missing', { board: 'pvp', view: 'rank', rank });
        assert.ok(r.error);
        assert.equal(r.entries.length, 25);
    }
    const self = queryScores(saved, [], 'missing', { board: 'pvp', view: 'self' });
    assert.equal(self.self, null);
    assert.ok(self.error);
    assert.equal(self.page, 1);
    const invalid = queryScores(saved, [], 'player-1', { board: '__proto__', requestId: 'fake', pvpScore: 999999 });
    assert.ok(invalid.error);
    assert.equal(invalid.requestId, 0);
    assert.equal(invalid.entries.length, 0);
    assert.equal(JSON.stringify(saved), before);
    const empty = queryScores([], [], 'missing', { board: 'pvp', view: 'rank', rank: 1 });
    assert.equal(empty.total, 0);
    assert.equal(empty.pages, 1);
    assert.equal(empty.entries.length, 0);
    const json = JSON.stringify(queryScores(saved, [], 'player-1', { board: 'overall' }));
    assert.ok(!json.includes('recentPvpWins'));
    assert.ok(!json.includes('coins'));
    assert.ok(!json.includes('items'));
});
