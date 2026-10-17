import { GEAR_ITEMS } from './equipment.js';
export const ITEMS = {
    ...GEAR_ITEMS,
    steelSword: { name: 'Steel sword', kind: 'gear', buy: 120, sell: 60, description: '32 damage · quick balanced cuts' },
    warSpear: { name: 'War spear', kind: 'gear', buy: 150, sell: 75, description: '30 damage · long narrow thrust' },
    battleAxe: { name: 'Battle axe', kind: 'gear', buy: 180, sell: 90, description: '58 damage · heavy sweeping blow' },
    tonic: { name: 'Healing tonic', kind: 'supply', buy: 30, sell: 12, description: 'Q · restore 35 health · 8s shared supply cooldown' },
    ration: { name: 'Trail ration', kind: 'supply', buy: 18, sell: 7, description: 'R · restore 45 stamina · 8s shared supply cooldown' },
    wood: { name: 'Banked wood', kind: 'resource', buy: 8, sell: 2, description: 'Stored at the bank · market purchases grant no XP' },
    ore: { name: 'Banked ore', kind: 'resource', buy: 12, sell: 4, description: 'Stored at the bank · market purchases grant no XP' },
    rawFish: { name: 'Raw fish', kind: 'resource', buy: 8, sell: 2, description: 'Fishing catch · cook at the workshop' },
    berries: { name: 'Berries', kind: 'resource', buy: 5, sell: 1, description: 'Foraged fruit · tonics and rations' },
    herb: { name: 'Herbs', kind: 'resource', buy: 6, sell: 2, description: 'Herbalism harvest · alchemy and fire runes' },
    hide: { name: 'Hide', kind: 'resource', buy: 8, sell: 2, description: 'Snare harvest · tan into leather' },
    grain: { name: 'Grain', kind: 'resource', buy: 6, sell: 2, description: 'Farm harvest · stamina rations' },
    flax: { name: 'Flax', kind: 'resource', buy: 8, sell: 2, description: 'Farm harvest · weave into cloth' },
    clay: { name: 'Clay', kind: 'resource', buy: 6, sell: 2, description: 'Excavated earth · focus runes' },
    crystal: { name: 'Crystal', kind: 'resource', buy: 12, sell: 3, description: 'Excavated crystal · spell runes' },
    plank: { name: 'Plank', kind: 'material', buy: 16, sell: 5, description: 'Carpentry material · weapons and arrows' },
    bar: { name: 'Metal bar', kind: 'material', buy: 30, sell: 8, description: 'Smithing material · forge weapons and shields' },
    leather: { name: 'Leather', kind: 'material', buy: 18, sell: 5, description: 'Tanned hide · protective vests' },
    cloth: { name: 'Cloth', kind: 'material', buy: 18, sell: 5, description: 'Woven flax · bows, vests and charms' },
    arrow: { name: 'Arrows', kind: 'material', buy: 3, sell: 1, description: 'Twin shot uses two arrows · basic shots are free · stack 999' },
    emberRune: { name: 'Ember runes', kind: 'material', buy: 10, sell: 3, description: 'Craft ember staves and Emberguard gear · basic fire bolts are free · stack 999' },
    focusRune: { name: 'Focus runes', kind: 'material', buy: 10, sell: 2, description: 'F · restoration uses one rune · stack 999' },
    cookedFish: { name: 'Cooked fish', kind: 'supply', buy: 14, sell: 4, description: 'T · restore 20 health · shared supply cooldown' },
    shortbow: { name: 'Shortbow', kind: 'gear', buy: 80, sell: 35, description: '4 · 18 damage · free basic arrows · Twin shot uses ammunition' },
    emberStaff: { name: 'Ember staff', kind: 'gear', buy: 100, sell: 40, description: '5 · 24 damage · free basic fire bolts · Frost nova uses a focus rune' },
    leatherVest: { name: 'Leather vest', kind: 'armor', buy: 65, sell: 25, description: 'Equip in body slot · reduces damage by 2' },
    ironShield: { name: 'Iron shield', kind: 'armor', buy: 80, sell: 30, description: 'Equip in offhand slot · reduces damage by 3' },
    wardCharm: { name: 'Ward charm', kind: 'armor', buy: 60, sell: 18, description: 'Equip in charm slot · reduces damage by 1' }
} as const;
export type ItemId = keyof typeof ITEMS;
export type Stock = Record<ItemId, number>;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const isItem = (value: unknown): value is ItemId => typeof value === 'string' && Object.hasOwn(ITEMS, value);
export const emptyStock = (): Stock => Object.fromEntries(ITEM_IDS.map(i => [i, 0])) as Stock;
export const stackLimit = (item: ItemId) => ITEMS[item].kind === 'resource' ? 100000000 : ['arrow', 'emberRune', 'focusRune'].includes(item) ? 999 : 99;
