export type WeaponId = 'sword' | 'spear' | 'axe' | 'steelSword' | 'warSpear' | 'battleAxe' | 'shortbow' | 'emberStaff';
export type EnemyKind = 'skirmisher' | 'hunter' | 'brute' | 'boss';
export const WEAPONS = {
    sword: { family: 'sword', name: 'Iron sword', damage: 25, range: 80, cooldown: 350, arc: 1.25, description: 'Quick, balanced cuts', key: '1' },
    spear: { family: 'spear', name: 'Ash spear', damage: 22, range: 142, cooldown: 450, arc: .32, description: 'Long reach, narrow thrust', key: '2' },
    axe: { family: 'axe', name: 'Felling axe', damage: 45, range: 88, cooldown: 500, arc: 2, description: 'Heavy sweeping blows', key: '3' },
    steelSword: { family: 'sword', name: 'Steel sword', damage: 32, range: 80, cooldown: 350, arc: 1.25, description: 'Tempered balanced cuts', key: '1' },
    warSpear: { family: 'spear', name: 'War spear', damage: 30, range: 142, cooldown: 450, arc: .32, description: 'Tempered long thrust', key: '2' },
    battleAxe: { family: 'axe', name: 'Battle axe', damage: 58, range: 88, cooldown: 500, arc: 2, description: 'Tempered heavy sweep', key: '3' },
    shortbow: { family: 'bow', name: 'Shortbow', damage: 18, range: 260, cooldown: 400, arc: .3, description: 'Basic arrows · no ammunition cost', key: '4' },
    emberStaff: { family: 'staff', name: 'Ember staff', damage: 24, range: 240, cooldown: 450, arc: .35, description: 'Basic fire bolts · no rune cost', key: '5' }
} as const;
export const ENEMIES = {
    skirmisher: { label: 'Thornrunner', hp: 75, speed: 142, damage: 13, xp: 25, reach: 65, windup: 480, cooldown: 1400, color: '#b97867' },
    hunter: { label: 'Cinder hunter', hp: 95, speed: 95, damage: 19, xp: 40, reach: 285, windup: 850, cooldown: 2100, color: '#b49c68' },
    brute: { label: 'Ironhide brute', hp: 180, speed: 76, damage: 30, xp: 70, reach: 105, windup: 1150, cooldown: 2500, color: '#8f9b8c' },
    boss: { label: 'The Hollow Warden', hp: 650, speed: 48, damage: 38, xp: 300, reach: 140, windup: 1150, cooldown: 2300, color: '#ba8a70' }
} as const;
export const isWeapon = (value: unknown): value is WeaponId => typeof value === 'string' && Object.hasOwn(WEAPONS, value);
export const angleGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export const ABILITIES = {
    sword: { name: 'Crescent strike', cooldown: 4500, stamina: 25, damage: 38, range: 100, arc: 1.7, description: 'A wider sweeping strike' },
    spear: { name: 'Piercing thrust', cooldown: 4500, stamina: 25, damage: 34, range: 205, arc: .27, description: 'A long, precise thrust' },
    axe: { name: 'Groundbreaker', cooldown: 6000, stamina: 35, damage: 60, range: 100, arc: Math.PI, description: 'A close circular cleave' },
    bow: { name: 'Twin shot', cooldown: 4500, stamina: 25, damage: 18, range: 280, arc: .3, description: 'Two aimed arrows; costs 2 arrows' },
    staff: { name: 'Frost nova', cooldown: 6000, stamina: 20, damage: 12, range: 125, arc: Math.PI, description: 'A chilling pulse; costs 1 focus rune; slow affects monsters' }
} as const;

export const ENEMY_TACTICS = {
    skirmisher: { role: 'RUSHER', tip: 'Sidestep the slash, then punish its recovery.' },
    hunter: { role: 'RANGED', tip: 'Strafe across its aim; do not run along the bolt line.' },
    brute: { role: 'HEAVY', tip: 'Bait the slow slam, move out, then strike.' },
    boss: { role: 'WORLD BOSS', tip: 'Sidestep bolt fans; leave the slam circle. Retreat to reset it.' }
} as const;
