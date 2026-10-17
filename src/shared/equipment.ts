import type { Stock } from './items.js';
import { skillXp } from './skills.js';
export type Element = 'fire' | 'storm' | 'frost';
export type GearSlot = 'body' | 'offhand' | 'charm' | 'boots';
export const GEAR_SLOTS: GearSlot[] = ['body', 'offhand', 'charm', 'boots'];
export const RARITIES = {
    1: { name: 'Common', color: '#bdc5c0' }, 2: { name: 'Uncommon', color: '#88bd85' },
    3: { name: 'Rare', color: '#79b6e3' }, 4: { name: 'Epic', color: '#c49ae4' },
    5: { name: 'Legendary', color: '#edbe68' }
} as const;
export const SETS = {
    fire: { name: 'Emberguard', color: '#ef9868', skill: 'Pyromancy',
        effect: 'A fire ward ignites nearby monsters. Burns last 3 seconds; no stacking.',
        two: '+1 burn damage per second and +1 armor', three: 'Ward radius 120; pulse every 2 seconds; +1 attack power' },
    storm: { name: 'Stormcaller', color: '#e4d88d', skill: 'Runecrafting',
        effect: 'Weapon hits trigger a lightning burst and brief stun. 4-second recovery.',
        two: '+2 lightning burst damage and +1 armor', three: 'Lightning recovery reduced to 3 seconds; +1 attack power' },
    frost: { name: 'Rimebound', color: '#8fd8e9', skill: 'Enchanting',
        effect: 'Weapon hits chill monsters by 25% for 2 seconds. 3-second recovery.',
        two: 'Chill strengthened to 35%; +1 armor', three: 'Chill lasts 3 seconds; +1 attack power' }
} as const;
type Definition = {
    name: string;
    kind: 'armor';
    buy: number;
    sell: number;
    description: string;
    slot: GearSlot;
    rarity: 1 | 2 | 3 | 4 | 5;
    armor: number;
    power: number;
    set?: Element;
    legendary?: Element;
};
function gear(name: string, slot: GearSlot, rarity: Definition['rarity'], armor: number, power: number, buy: number, description: string, set?: Element, legendary?: Element): Definition {
    return { name, slot, rarity, armor, power, buy, sell: Math.floor(buy / 4), kind: 'armor', description, set, legendary };
}
export const GEAR_ITEMS = {
    wayfarerBoots: gear('Wayfarer boots', 'boots', 1, 1, 0, 35, 'Boots · 1 armor · a first expedition reward'),
    rangerBoots: gear('Ranger boots', 'boots', 2, 1, 1, 95, 'Boots · 1 armor · +1 attack power'),
    emberMantle: gear('Emberguard mantle', 'body', 3, 3, 0, 180, 'Body · 3 armor · fire ward · Emberguard set', 'fire'),
    emberGuard: gear('Emberguard buckler', 'offhand', 3, 3, 0, 190, 'Offhand · 3 armor · fire ward · Emberguard set', 'fire'),
    emberSigil: gear('Emberguard sigil', 'charm', 4, 1, 2, 280, 'Charm · +2 attack power · fire ward · Emberguard set', 'fire'),
    stormMantle: gear('Stormcaller mantle', 'body', 3, 3, 0, 180, 'Body · 3 armor · lightning burst · Stormcaller set', 'storm'),
    stormGuard: gear('Stormcaller coil', 'offhand', 3, 3, 0, 190, 'Offhand · 3 armor · lightning burst · Stormcaller set', 'storm'),
    stormSigil: gear('Stormcaller sigil', 'charm', 4, 1, 2, 280, 'Charm · +2 attack power · lightning burst · Stormcaller set', 'storm'),
    frostMantle: gear('Rimebound mantle', 'body', 3, 3, 0, 180, 'Body · 3 armor · chilling hits · Rimebound set', 'frost'),
    frostGuard: gear('Rimebound guard', 'offhand', 3, 3, 0, 190, 'Offhand · 3 armor · chilling hits · Rimebound set', 'frost'),
    frostSigil: gear('Rimebound sigil', 'charm', 4, 1, 2, 280, 'Charm · +2 attack power · chilling hits · Rimebound set', 'frost'),
    phoenixAegis: gear('Phoenix aegis', 'body', 5, 5, 1, 1600, 'Body · 5 armor · +1 power · strong fire ward; not a set piece', undefined, 'fire'),
    thunderheart: gear('Thunderheart', 'offhand', 5, 4, 2, 1600, 'Offhand · 4 armor · +2 power · strong lightning burst; not a set piece', undefined, 'storm'),
    winterCrown: gear('Heart of winter', 'charm', 5, 2, 3, 1600, 'Charm · 2 armor · +3 power · strong chill; not a set piece', undefined, 'frost')
};
export const GEAR = {
    leatherVest: gear('Leather vest', 'body', 1, 2, 0, 65, 'Body · 2 armor'),
    ironShield: gear('Iron shield', 'offhand', 2, 3, 0, 80, 'Offhand · 3 armor'),
    wardCharm: gear('Ward charm', 'charm', 2, 1, 0, 60, 'Charm · 1 armor'),
    ...GEAR_ITEMS
};
export type GearId = keyof typeof GEAR;
export type Equipment = Record<GearSlot, GearId | null>;
export const isGear = (v: unknown): v is GearId => typeof v === 'string' && Object.hasOwn(GEAR, v);
export const emptyEquipment = (): Equipment => ({ body: null, offhand: null, charm: null, boots: null });
export function normalizeEquipment(items: Stock, saved?: Equipment): Equipment {
    const result = emptyEquipment();
    if (saved !== undefined) {
        for (const slot of GEAR_SLOTS) {
            const id = saved?.[slot];
            if (isGear(id) && GEAR[id].slot === slot && items[id] > 0)
                result[slot] = id;
        }
    }
    else {
        // One-time migration preserves the armor that legacy ownership activated.
        for (const id of ['leatherVest', 'ironShield', 'wardCharm'] as const)
            if (items[id] > 0)
                result[GEAR[id].slot] = id;
    }
    return result;
}
type Equipped = {
    items: Stock;
    equipment: Equipment;
};
export function gearStats(p: Equipped) {
    const counts: Record<Element, number> = { fire: 0, storm: 0, frost: 0 };
    const ranks: Record<Element, number> = { fire: 0, storm: 0, frost: 0 };
    const legendary: Record<Element, boolean> = { fire: false, storm: false, frost: false };
    let armor = 0, power = 0;
    for (const slot of GEAR_SLOTS) {
        const id = p.equipment[slot];
        if (!id || !isGear(id) || GEAR[id].slot !== slot || p.items[id] < 1)
            continue;
        const g = GEAR[id];
        armor += g.armor;
        power += g.power;
        if (g.set)
            counts[g.set]++;
        if (g.legendary) {
            ranks[g.legendary] = 3;
            legendary[g.legendary] = true;
        }
    }
    for (const element of ['fire', 'storm', 'frost'] as const) {
        if (counts[element] > 0)
            ranks[element] = Math.max(ranks[element], counts[element]);
        if (counts[element] >= 2)
            armor++;
        if (counts[element] >= 3)
            power++;
    }
    return { armor, power: Math.min(8, power), counts, ranks, legendary };
}
export function elementalPower(p: Parameters<typeof skillXp>[0], element: Element) {
    const skill = element === 'fire' ? 'pyromancy' : element === 'storm' ? 'runecrafting' : 'enchanting';
    return Math.min(3, Math.floor(Math.sqrt(skillXp(p, skill) / 40) / 3));
}
export function rollGear(boss: boolean, roll: number): GearId | undefined {
    const r = Math.max(0, Math.min(.999999, roll));
    const legendary: GearId[] = ['phoenixAegis', 'thunderheart', 'winterCrown'];
    const epic: GearId[] = ['emberSigil', 'stormSigil', 'frostSigil'];
    const rare: GearId[] = ['emberMantle', 'emberGuard', 'stormMantle', 'stormGuard', 'frostMantle', 'frostGuard'];
    if (boss) {
        if (r < .05)
            return legendary[Math.floor(r / .05 * legendary.length)];
        if (r < .35)
            return epic[Math.floor((r - .05) / .30 * epic.length)];
        return rare[Math.min(rare.length - 1, Math.floor((r - .35) / .65 * rare.length))];
    }
    if (r < .04)
        return rare[Math.floor(r / .04 * rare.length)];
    if (r < .12)
        return 'rangerBoots';
    if (r < .25)
        return 'wayfarerBoots';
    return undefined;
}
