import { advance } from './contracts.js';
import { ITEMS, stackLimit, type ItemId } from './items.js';
import { owned, changeStock } from './market.js';
import { gainSkill, skillXp, type SkillId } from './skills.js';
import type { Player } from './world.js';
type Recipe = {
    id: string;
    name: string;
    skill: SkillId;
    level: number;
    xp: number;
    inputs: Partial<Record<ItemId, number>>;
    output: ItemId;
    amount: number;
};
export const RECIPES: Recipe[] = [
    { id: 'planks', name: 'Cut planks', skill: 'carpentry', level: 1, xp: 12, inputs: { wood: 2 }, output: 'plank', amount: 1 },
    { id: 'bars', name: 'Smelt metal bars', skill: 'smithing', level: 1, xp: 14, inputs: { ore: 2 }, output: 'bar', amount: 1 },
    { id: 'cloth', name: 'Weave cloth', skill: 'weaving', level: 1, xp: 14, inputs: { flax: 2 }, output: 'cloth', amount: 1 },
    { id: 'leather', name: 'Tan leather', skill: 'leatherworking', level: 1, xp: 14, inputs: { hide: 2 }, output: 'leather', amount: 1 },
    { id: 'fish', name: 'Cook fish', skill: 'cooking', level: 1, xp: 12, inputs: { rawFish: 1 }, output: 'cookedFish', amount: 1 },
    { id: 'ration', name: 'Prepare trail rations', skill: 'cooking', level: 1, xp: 18, inputs: { berries: 2, grain: 1 }, output: 'ration', amount: 1 },
    { id: 'tonic', name: 'Brew healing tonics', skill: 'alchemy', level: 1, xp: 20, inputs: { herb: 2, berries: 1 }, output: 'tonic', amount: 1 },
    { id: 'focus', name: 'Shape focus runes', skill: 'runecrafting', level: 1, xp: 16, inputs: { crystal: 1, clay: 1 }, output: 'focusRune', amount: 2 },
    { id: 'ember', name: 'Shape ember runes', skill: 'runecrafting', level: 1, xp: 18, inputs: { crystal: 1, herb: 1 }, output: 'emberRune', amount: 2 },
    { id: 'arrows', name: 'Fletch arrows', skill: 'carpentry', level: 1, xp: 16, inputs: { plank: 1, bar: 1 }, output: 'arrow', amount: 10 },
    { id: 'bow', name: 'Make a shortbow', skill: 'carpentry', level: 2, xp: 30, inputs: { plank: 2, cloth: 1 }, output: 'shortbow', amount: 1 },
    { id: 'sword', name: 'Forge a steel sword', skill: 'smithing', level: 2, xp: 32, inputs: { bar: 2, plank: 1 }, output: 'steelSword', amount: 1 },
    { id: 'spear', name: 'Forge a war spear', skill: 'smithing', level: 3, xp: 36, inputs: { bar: 3, plank: 2 }, output: 'warSpear', amount: 1 },
    { id: 'axe', name: 'Forge a battle axe', skill: 'smithing', level: 3, xp: 40, inputs: { bar: 4, plank: 2 }, output: 'battleAxe', amount: 1 },
    { id: 'vest', name: 'Stitch a leather vest', skill: 'leatherworking', level: 2, xp: 30, inputs: { leather: 2, cloth: 1 }, output: 'leatherVest', amount: 1 },
    { id: 'shield', name: 'Forge an iron shield', skill: 'smithing', level: 2, xp: 30, inputs: { bar: 2, plank: 1 }, output: 'ironShield', amount: 1 },
    { id: 'staff', name: 'Enchant an ember staff', skill: 'enchanting', level: 1, xp: 36, inputs: { plank: 2, emberRune: 4 }, output: 'emberStaff', amount: 1 },
    { id: 'charm', name: 'Enchant a ward charm', skill: 'enchanting', level: 2, xp: 30, inputs: { focusRune: 2, cloth: 1 }, output: 'wardCharm', amount: 1 },
    { id: 'ember-mantle', name: 'Stitch Emberguard mantle', skill: 'leatherworking', level: 2, xp: 40, inputs: { cloth: 2, leather: 1, emberRune: 3 }, output: 'emberMantle', amount: 1 },
    { id: 'ember-guard', name: 'Forge Emberguard buckler', skill: 'smithing', level: 2, xp: 40, inputs: { bar: 2, plank: 1, emberRune: 3 }, output: 'emberGuard', amount: 1 },
    { id: 'ember-sigil', name: 'Enchant Emberguard sigil', skill: 'enchanting', level: 3, xp: 55, inputs: { cloth: 1, bar: 1, crystal: 2, emberRune: 2 }, output: 'emberSigil', amount: 1 },
    { id: 'storm-mantle', name: 'Weave Stormcaller mantle', skill: 'weaving', level: 2, xp: 40, inputs: { cloth: 2, leather: 1, crystal: 3 }, output: 'stormMantle', amount: 1 },
    { id: 'storm-guard', name: 'Shape Stormcaller coil', skill: 'runecrafting', level: 2, xp: 40, inputs: { bar: 2, plank: 1, crystal: 3 }, output: 'stormGuard', amount: 1 },
    { id: 'storm-sigil', name: 'Enchant Stormcaller sigil', skill: 'enchanting', level: 3, xp: 55, inputs: { cloth: 1, bar: 1, crystal: 2, focusRune: 2 }, output: 'stormSigil', amount: 1 },
    { id: 'frost-mantle', name: 'Weave Rimebound mantle', skill: 'weaving', level: 2, xp: 40, inputs: { cloth: 2, leather: 1, focusRune: 3 }, output: 'frostMantle', amount: 1 },
    { id: 'frost-guard', name: 'Forge Rimebound guard', skill: 'smithing', level: 2, xp: 40, inputs: { bar: 2, plank: 1, focusRune: 3 }, output: 'frostGuard', amount: 1 },
    { id: 'frost-sigil', name: 'Enchant Rimebound sigil', skill: 'enchanting', level: 3, xp: 55, inputs: { cloth: 1, bar: 1, crystal: 2, focusRune: 2 }, output: 'frostSigil', amount: 1 }
];
type Host = {
    players: Map<string, Player>;
    canTrade(p: Player): boolean;
    economyRevision: number;
    say(p: Player, text: string, now: number): void;
};
export function craft(host: Host, id: string, raw: unknown, now: number) {
    const p = host.players.get(id);
    if (!p || !raw || typeof raw !== 'object')
        return;
    const m = raw as Record<string, unknown>, r = RECIPES.find(r => r.id === m.recipe), q = m.quantity;
    if (!host.canTrade(p)) {
        host.say(p, 'Craft at the bank workshop, alive and outside a duel.', now);
        return;
    }
    if (!r || typeof q !== 'number' || !Number.isSafeInteger(q) || q < 1 || q > 10) {
        host.say(p, 'Choose a recipe and a whole batch of 1–10.', now);
        return;
    }
    if (now < p.craftAt) {
        host.say(p, 'Your workbench is recovering. Try again shortly.', now);
        return;
    }
    if (1 + Math.floor(Math.sqrt(skillXp(p, r.skill) / 40)) < r.level) {
        host.say(p, `Requires ${r.skill} level ${r.level}.`, now);
        return;
    }
    if (Object.entries(r.inputs).some(([i, n]) => owned(p, i as ItemId) < n! * q) || owned(p, r.output) + r.amount * q > stackLimit(r.output)) {
        host.say(p, 'Not enough stored materials or room for the finished goods.', now);
        return;
    }
    for (const [i, n] of Object.entries(r.inputs))
        changeStock(p, i as ItemId, -n! * q);
    changeStock(p, r.output, r.amount * q);
    gainSkill(p, r.skill, r.xp * q);
    if (r.id === 'planks' || r.id === 'bars')
        advance(p.contracts, 'craft', r.amount * q);
    p.craftAt = now + 800;
    host.economyRevision++;
    host.say(p, `Made ${r.amount * q} ${ITEMS[r.output].name}. +${r.xp * q} ${r.skill} XP.`, now);
}
