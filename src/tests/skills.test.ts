import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer, profileOf, createEnemy, cleanInput, count, zone, xpForLevel } from '../shared/world.js';
import { SKILLS, SKILL_IDS, RESOURCES, RESOURCE_IDS, skillXp, emptySkills } from '../shared/skills.js';
import { RECIPES } from '../shared/crafting.js';
import { ITEMS, type ItemId } from '../shared/items.js';
import { owned, changeStock } from '../shared/market.js';
import { queryScores } from '../shared/leaderboards.js';
import { recoverState } from '../persistence.js';
function setup() { const w = new World(); w.raiders = []; const p = createPlayer('p', { name: 'Crafter', coins: 1000 }); w.players.set(p.id, p); return { w, p }; }
test('25 skills have real gathering, recipe, or combat training paths and resource sites are reachable safe ground', () => {
    assert.equal(SKILL_IDS.length, 25);
    assert.equal(SKILL_IDS.filter(s => SKILLS[s].group === 'Gathering').length, 8);
    assert.equal(SKILL_IDS.filter(s => SKILLS[s].group === 'Crafting').length, 8);
    assert.equal(SKILL_IDS.filter(s => SKILLS[s].group === 'Combat').length, 9);
    const w = new World();
    for (const r of RESOURCE_IDS) {
        const nodes = w.nodes.filter(n => n.kind === r);
        assert.ok(nodes.length);
        for (const n of nodes)
            assert.equal(zone(n), 'grove');
    }
    for (const id of SKILL_IDS.filter(s => SKILLS[s].group === 'Crafting'))
        assert.ok(RECIPES.some(r => r.skill === id));
});
test('all ten raw resources share the 12-slot haul, bank once into storage, and train the correct gathering skills', () => {
    const { w, p } = setup();
    let now = 1000;
    for (const resource of RESOURCE_IDS) {
        const n = w.nodes.find(n => n.kind === resource)!;
        p.x = n.x;
        p.y = n.y;
        w.interact(p, now);
        now += 1000;
        assert.equal(p.bag[resource], 1);
        assert.equal(skillXp(p, RESOURCES[resource].skill), 0);
    }
    assert.equal(count(p.bag), 10);
    p.x = 800;
    p.y = 550;
    w.interact(p, now);
    assert.equal(count(p.bag), 0);
    assert.equal(p.coins, 1047);
    assert.equal(p.skills.farming, 20);
    assert.equal(p.skills.excavation, 28);
    assert.equal(p.xp.wood, 10);
    assert.equal(p.xp.ore, 14);
    for (const r of RESOURCE_IDS)
        assert.equal(owned(p, r), 1);
    w.interact(p, now + 1000);
    assert.equal(p.coins, 1047);
});
test('new raw materials drop and recover with old resources without duplication or overflow', () => {
    const { w, p } = setup();
    p.bag = { wood: 1, ore: 2, herb: 3, rawFish: 6 };
    w.drop(p, 1000);
    assert.equal(count(p.bag), 0);
    p.bag = { wood: 10, ore: 0 };
    w.interact(p, 2000);
    assert.equal(count(p.bag), 12);
    assert.equal(count(w.loot[0].bag), 10);
    assert.equal(count(p.bag) + count(w.loot[0].bag), 22);
});
test('every recipe consumes its actual inputs, produces goods, pays the declared profession XP and has no vendor-profit loop', () => {
    for (const r of RECIPES) {
        const { w, p } = setup();
        p.x = 800;
        p.y = 550;
        p.skills[r.skill] = xpForLevel(r.level);
        const start = skillXp(p, r.skill);
        for (const [item, n] of Object.entries(r.inputs))
            changeStock(p, item as ItemId, n! * 2);
        w.craft('p', { recipe: r.id, quantity: 2, output: 'battleAxe', xp: 999999 }, 1000);
        assert.equal(owned(p, r.output), r.amount * 2, r.id);
        assert.equal(skillXp(p, r.skill), start + r.xp * 2, r.id);
        for (const [item] of Object.entries(r.inputs))
            assert.equal(owned(p, item as ItemId), 0, r.id);
        const inputCost = Object.entries(r.inputs).reduce((n, [i, a]) => n + ITEMS[i as ItemId].buy * a!, 0);
        assert.ok(inputCost >= ITEMS[r.output].sell * r.amount, r.id);
    }
});
test('crafting enforces station, skill unlock, cooldown, stock, output capacity and safe batch quantities', () => {
    const { w, p } = setup();
    p.banked.ore = 20;
    w.craft('p', { recipe: 'bars', quantity: 1 }, 1000);
    assert.equal(p.banked.ore, 20);
    p.x = 800;
    for (const quantity of [0, -1, 1.5, 11, Infinity, '1'])
        w.craft('p', { recipe: 'bars', quantity }, 1000);
    assert.equal(p.banked.ore, 20);
    w.craft('p', { recipe: 'bars', quantity: 1 }, 1000);
    assert.equal(p.banked.ore, 18);
    w.craft('p', { recipe: 'bars', quantity: 1 }, 1100);
    assert.equal(p.banked.ore, 18);
    p.items.bar = 99;
    w.craft('p', { recipe: 'bars', quantity: 1 }, 2000);
    assert.equal(p.banked.ore, 18);
    p.items.plank = 2;
    w.craft('p', { recipe: 'sword', quantity: 1 }, 3000);
    assert.equal(p.items.steelSword, 0);
    assert.equal(p.items.bar, 99);
    p.duelId = 'd';
    w.craft('p', { recipe: 'planks', quantity: 1 }, 4000);
    assert.equal(p.items.plank, 2);
});
test('basic arrows and fire bolts work with zero ammunition, never spend stock or stamina, and train only on actual hits', () => {
    for (const [weapon, ammo, skill, damage] of [['shortbow', 'arrow', 'archery', 18], ['emberStaff', 'emberRune', 'pyromancy', 24]] as const) {
        for (const stock of [0, 2]) {
            const { w, p } = setup();
            p.x = 1000;
            p.y = 550;
            p.items[weapon] = 1;
            p.weapon = weapon;
            p.stamina = 0;
            p.items[ammo] = stock;
            const enemy = createEnemy('brute', 'target', 1120, 550);
            w.raiders = [enemy];
            w.attack(p, 1000);
            assert.equal(p.items[ammo], stock);
            assert.equal(p.stamina, 0);
            assert.equal(enemy.hp, 180);
            assert.equal(w.projectiles.length, 1);
            assert.equal(p.skills[skill], 0, 'firing into the air does not grant XP');
            for (let at = 1050; at <= 1400; at += 50)
                w.tick(.05, at);
            assert.equal(enemy.hp, 180 - damage);
            assert.equal(p.skills[skill], Math.ceil(damage / 4));
            assert.equal(p.combatXp, 0);
        }
    }
});
test('melee training uses actual enemy damage and cannot farm a corpse or PvP target', () => {
    const { w, p } = setup();
    p.x = 1000;
    p.y = 550;
    const e = createEnemy('skirmisher', 'target', 1000, 550);
    w.hitEnemy(e, p, 1000, 1000);
    assert.equal(p.skills.swordsmanship, 19);
    w.hitEnemy(e, p, 1000, 1001);
    assert.equal(p.skills.swordsmanship, 19);
    const other = createPlayer('other');
    w.damage(other, 10, 2000, p);
    assert.equal(p.skills.swordsmanship, 19);
    assert.equal(p.combatXp, 25);
});
test('equipped armor stacks by slot, Defence trains on actual PvE damage, and Agility rewards one successful evasion per dodge', () => {
    const { w, p } = setup();
    p.items.leatherVest = 2;
    p.items.ironShield = 1;
    p.items.wardCharm = 1;
    p.equipment = { body: 'leatherVest', offhand: 'ironShield', charm: 'wardCharm', boots: null };
    w.damage(p, 38, 1000);
    assert.equal(p.hp, 68);
    assert.equal(p.skills.defence, 4);
    p.input = cleanInput({ x: 1 });
    p.stamina = 100;
    w.dodge(p, 2000);
    w.damage(p, 38, 2050);
    w.damage(p, 38, 2100);
    assert.equal(p.skills.agility, 8);
    assert.equal(p.hp, 68);
    p.skills.agility = 360;
    p.stamina = 100;
    w.dodge(p, 4000);
    assert.equal(p.stamina, 69);
});
test('Restoration spends a rune only for unhealed PvE damage, respects cooldown, and is disabled in duels', () => {
    const { w, p } = setup();
    p.items.focusRune = 3;
    w.restore('p', 1000);
    assert.equal(p.items.focusRune, 3);
    w.damage(p, 40, 2000);
    w.restore('p', 2100);
    assert.equal(p.hp, 85);
    assert.equal(p.items.focusRune, 2);
    assert.equal(p.skills.restoration, 25);
    w.restore('p', 2200);
    assert.equal(p.items.focusRune, 2);
    p.duelId = 'd';
    w.restore('p', 12000);
    assert.equal(p.hp, 85);
    p.duelId = '';
    p.recentEnemyDamage = 0;
    w.restore('p', 13000);
    assert.equal(p.items.focusRune, 2);
});
test('crafted weapons and materials can be traded and a last-copy ranged weapon sale restores a free weapon', () => {
    const { w, p } = setup();
    p.x = 800;
    p.items.shortbow = 1;
    p.items.arrow = 10;
    p.weapon = 'shortbow';
    w.market.handle('p', { action: 'sell', item: 'shortbow', quantity: 1 }, 1000);
    assert.equal(p.weapon, 'sword');
    assert.equal(p.coins, 1035);
    w.market.handle('p', { action: 'list', item: 'arrow', quantity: 10, unitPrice: 2 }, 2000);
    assert.equal(p.items.arrow, 0);
    assert.equal(w.market.listings[0].item, 'arrow');
});
test('v3 profiles migrate all skills and inventory to v4 without altering earned progress; new skill ranks persist', () => {
    const { p } = setup();
    p.xp = { wood: 90, ore: 266 };
    p.combatXp = 160;
    const legacy = JSON.parse(JSON.stringify(profileOf(p)));
    delete legacy.skills;
    legacy.items = { tonic: 1 };
    const restored = recoverState({ version: 3, profiles: { secret: legacy }, escrows: [], marketListings: [] }).profiles.get('secret')!;
    assert.equal(restored.skills.combat, 160);
    assert.equal(restored.skills.woodcutting, 90);
    assert.equal(restored.skills.mining, 266);
    assert.equal(restored.skills.alchemy, 0);
    restored.skills.alchemy = 80;
    restored.items.herb = 4;
    const again = recoverState({ version: 4, profiles: { secret: restored }, escrows: [], marketListings: [] });
    assert.equal(again.profiles.get('secret')!.skills.alchemy, 80);
    assert.equal(again.profiles.get('secret')!.items.herb, 4);
    const rank = queryScores(again.profiles.values(), [], 'p', { board: 'alchemy' });
    assert.equal(rank.entries[0].score, 80);
    assert.equal(rank.self!.rank, 1);
    const bad = profileOf(p);
    bad.skills.agility = -1;
    assert.throws(() => recoverState({ version: 4, profiles: { bad }, escrows: [], marketListings: [] }));
});
