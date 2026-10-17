import type { Profile } from './world.js';
const skill = (name: string, group: 'Gathering' | 'Crafting' | 'Combat', training: string) => ({ name, group, training });
export const SKILLS = {
    woodcutting: skill('Woodcutting', 'Gathering', 'Chop trees and bank wood. Levels speed gathering.'),
    mining: skill('Mining', 'Gathering', 'Mine rocks and bank ore. Levels speed gathering.'),
    fishing: skill('Fishing', 'Gathering', 'Fish at blue pools and bank raw fish. Levels speed gathering.'),
    foraging: skill('Foraging', 'Gathering', 'Pick berry bushes and bank berries. Levels speed gathering.'),
    herbalism: skill('Herbalism', 'Gathering', 'Collect herb beds and bank herbs. Levels speed gathering.'),
    hunting: skill('Hunting', 'Gathering', 'Check hide snares and bank hides. Levels speed gathering.'),
    farming: skill('Farming', 'Gathering', 'Harvest grain or flax patches and bank crops. Patches regrow; levels speed harvesting.'),
    excavation: skill('Excavation', 'Gathering', 'Excavate clay or crystals and bank them. Levels speed gathering.'),
    smithing: skill('Smithing', 'Crafting', 'Smelt bars and forge weapons/shields at the bank workshop. Levels unlock recipes.'),
    carpentry: skill('Carpentry', 'Crafting', 'Cut planks and make arrows/bows at the bank workshop. Levels unlock recipes.'),
    cooking: skill('Cooking', 'Crafting', 'Cook fish and prepare stamina rations at the bank workshop.'),
    alchemy: skill('Alchemy', 'Crafting', 'Brew healing tonics from herbs and berries at the bank workshop.'),
    leatherworking: skill('Leatherworking', 'Crafting', 'Tan hides and stitch protective vests at the bank workshop.'),
    weaving: skill('Weaving', 'Crafting', 'Weave flax into cloth used in bows, vests and charms.'),
    enchanting: skill('Enchanting', 'Crafting', 'Craft staves, charms and set sigils, or damage monsters with Frost nova. Strengthens gear chill.'),
    runecrafting: skill('Runecrafting', 'Crafting', 'Shape spell runes and Stormcaller coils. Lightning bursts train and scale with this skill.'),
    combat: skill('Combat', 'Combat', 'Defeat PvE enemies for combat XP. Your existing combat XP is retained.'),
    swordsmanship: skill('Swordsmanship', 'Combat', 'Damage PvE enemies with swords. Every 3 levels adds 1 damage, up to +6.'),
    spearmastery: skill('Spear mastery', 'Combat', 'Damage PvE enemies with spears. Every 3 levels adds 1 damage, up to +6.'),
    axemastery: skill('Axe mastery', 'Combat', 'Damage PvE enemies with axes. Every 3 levels adds 1 damage, up to +6.'),
    archery: skill('Archery', 'Combat', 'Hit PvE enemies with a shortbow. Basic shots are free; Twin shot uses two arrows. Levels add up to +6 damage.'),
    pyromancy: skill('Pyromancy', 'Combat', 'Hit monsters with ember bolts or gear burns. Levels improve staff damage and equipped fire wards.'),
    restoration: skill('Restoration', 'Combat', 'F uses a focus rune to heal recent enemy damage. Levels increase healing, up to 35.'),
    defence: skill('Defence', 'Combat', 'Take PvE damage to train. Levels reduce incoming damage, up to 5, alongside crafted armor.'),
    agility: skill('Agility', 'Combat', 'Dodge an incoming attack to train, once per dodge. Levels reduce dodge cost, down to 26 stamina.')
} as const;
export type SkillId = keyof typeof SKILLS;
export type SkillXp = Record<SkillId, number>;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];
export const isSkill = (v: unknown): v is SkillId => typeof v === 'string' && Object.hasOwn(SKILLS, v);
export const emptySkills = () => Object.fromEntries(SKILL_IDS.map(s => [s, 0])) as SkillXp;
export const skillXp = (p: Pick<Profile, 'xp' | 'combatXp' | 'skills'>, id: SkillId) => id === 'woodcutting' ? p.xp.wood : id === 'mining' ? p.xp.ore : id === 'combat' ? p.combatXp : p.skills[id];
export const skillRecord = (p: Profile) => Object.fromEntries(SKILL_IDS.map(s => [s, skillXp(p, s)])) as SkillXp;
export function gainSkill(p: Profile, id: SkillId, amount: number) {
    if (id === 'woodcutting')
        p.xp.wood += amount;
    else if (id === 'mining')
        p.xp.ore += amount;
    else if (id === 'combat')
        p.combatXp += amount;
    else
        p.skills[id] += amount;
    p.skills[id] = skillXp(p, id);
}
export const RESOURCES = {
    wood: { name: 'Wood', skill: 'woodcutting', xp: 10, coins: 5, color: '#91ad71', action: 'chop wood' },
    ore: { name: 'Ore', skill: 'mining', xp: 14, coins: 8, color: '#b3bdba', action: 'mine ore' },
    rawFish: { name: 'Raw fish', skill: 'fishing', xp: 12, coins: 4, color: '#77b7d1', action: 'catch fish' },
    berries: { name: 'Berries', skill: 'foraging', xp: 8, coins: 3, color: '#c38cbd', action: 'pick berries' },
    herb: { name: 'Herbs', skill: 'herbalism', xp: 12, coins: 4, color: '#a2ce8d', action: 'pick herbs' },
    hide: { name: 'Hide', skill: 'hunting', xp: 14, coins: 5, color: '#c39b72', action: 'check snares' },
    grain: { name: 'Grain', skill: 'farming', xp: 10, coins: 4, color: '#d1bf71', action: 'harvest grain' },
    flax: { name: 'Flax', skill: 'farming', xp: 10, coins: 4, color: '#9eafd1', action: 'harvest flax' },
    clay: { name: 'Clay', skill: 'excavation', xp: 12, coins: 4, color: '#c6997c', action: 'dig clay' },
    crystal: { name: 'Crystal', skill: 'excavation', xp: 16, coins: 6, color: '#a6d3c5', action: 'excavate crystals' }
} as const;
export type Resource = keyof typeof RESOURCES;
export const RESOURCE_IDS = Object.keys(RESOURCES) as Resource[];
export const weaponSkill = (family: string): SkillId => ({ sword: 'swordsmanship', spear: 'spearmastery', axe: 'axemastery', bow: 'archery', staff: 'pyromancy' } as Record<string, SkillId>)[family] ?? 'combat';
