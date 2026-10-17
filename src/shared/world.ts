import { readJournal, advance, complete, unlocked, CONTRACTS, type Journal } from './contracts.js';
import { WEAPONS, ENEMIES, ABILITIES, isWeapon, angleGap, type WeaponId, type EnemyKind } from './combat.js';
import { DuelSystem, type DuelOffer, type Duel } from './duels.js';
import { Market, type Listing } from './market.js';
import { emptyStock, isItem, type Stock } from './items.js';
import type { Leaderboards } from './leaderboards.js';
import { SKILL_IDS, RESOURCES, RESOURCE_IDS, emptySkills, skillXp, skillRecord, gainSkill, weaponSkill, type SkillXp, type Resource } from './skills.js';
import { craft } from './crafting.js';
import { GEAR, GEAR_SLOTS, gearStats, isGear, normalizeEquipment, elementalPower, rollGear, type Equipment, type Element } from './equipment.js';
import { stackLimit } from './items.js';
export { WEAPONS, ENEMIES } from './combat.js';
export type { WeaponId, EnemyKind } from './combat.js';
export const MAP = { width: 1600, height: 1100, bankX: 800, bankY: 550, safeRadius: 96, dangerRadius: 330, capacity: 12, bossX: 1360, bossY: 550, bossRadius: 170 };
export type { Resource } from './skills.js';
export type Bag = {
    wood: number;
    ore: number;
} & Partial<Record<Exclude<Resource, 'wood' | 'ore'>, number>>;
export type Input = {
    x: number;
    y: number;
    interact: boolean;
    attack: boolean;
    dodge: boolean;
    weapon?: WeaponId;
    aim?: number;
};
export type Profile = {
    contracts: Journal;
    equipment: Equipment;
    skills: SkillXp;
    publicId: string;
    items: Stock;
    pveKills: number;
    bossKills: number;
    pvpScore: number;
    pvpKills: number;
    pvpDeaths: number;
    duelKnockouts: number;
    recentPvpWins: Record<string, number>;
    name: string;
    xp: Bag;
    banked: Bag;
    runs: number;
    kills: number;
    combatXp: number;
    weapon: WeaponId;
    coins: number;
    duelWins: number;
    duelLosses: number;
    duelBag?: Bag;
};
export type GatherAction = { kind: Resource; x: number; y: number; at: number; until: number };
export type Player = Profile & {
    id: string;
    x: number;
    y: number;
    hp: number;
    bag: Bag;
    input: Input;
    lastInput: number;
    gatherAt: number;
    gathering?: GatherAction;
    attackAt: number;
    respawnAt: number;
    attackQueuedUntil: number;
    facing: number;
    message: string;
    messageUntil: number;
    hitAt: number;
    swingAt: number;
    stamina: number;
    dodgeUntil: number;
    dodgeAt: number;
    dodgeX: number;
    dodgeY: number;
    duelId: string;
    supplyAt: number;
    craftAt: number;
    restoreAt: number;
    recentEnemyDamage: number;
    dodgeTrainedAt: number;
    auraAt: number;
    stormAt: number;
    frostAt: number;
    abilityAt: number;
};
export type Node = {
    id: string;
    x: number;
    y: number;
    kind: Resource;
    stock: number;
    readyAt: number;
};
export type Raider = {
    id: string;
    name: string;
    kind: EnemyKind;
    x: number;
    y: number;
    hp: number;
    phase: number;
    attackAt: number;
    respawnAt: number;
    hitAt: number;
    swingAt: number;
    facing: number;
    staggerUntil: number;
    lastEngaged: number;
    attackCount: number;
    chillUntil: number;
    chillSlow: number;
    stunUntil: number;
    burnUntil: number;
};
export type Loot = {
    id: string;
    x: number;
    y: number;
    bag: Bag;
    expires: number;
};
export type Warning = {
    id: string;
    source: string;
    kind: 'slam' | 'slash' | 'shot' | 'fan';
    x: number;
    y: number;
    radius: number;
    angle: number;
    start: number;
    at: number;
    damage: number;
};
export type Projectile = {
    owner?: string;
    skill?: 'archery' | 'pyromancy';
    duelId?: string;
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    expires: number;
    source: string;
};
export type CombatEffect = {
    id: string;
    kind: 'blood' | 'reward' | 'dodge' | 'fire' | 'storm' | 'frost' | 'gear';
    x: number;
    y: number;
    at: number;
    amount: number;
    target: string;
};
export type Snapshot = {
    marketListings: Listing[];
    leaderboards: Leaderboards;
    duelOffers: DuelOffer[];
    duels: Duel[];
    time: number;
    players: Omit<Player, 'input' | 'lastInput'>[];
    nodes: Node[];
    raiders: Raider[];
    loot: Loot[];
    events: string[];
    warnings: Warning[];
    projectiles: Projectile[];
    effects: CombatEffect[];
};
export const emptyBag = (): Bag => ({ wood: 0, ore: 0 });
export const count = (bag: Bag) => Object.values(bag).reduce((sum, n) => sum + (n ?? 0), 0);
export const haulXp = (bag: Bag) => RESOURCE_IDS.reduce((sum, r) => sum + (bag[r] ?? 0) * RESOURCES[r].xp, 0);
export const distance = (a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}) => Math.hypot(a.x - b.x, a.y - b.y);
export const bankDistance = (p: {
    x: number;
    y: number;
}) => Math.hypot(p.x - MAP.bankX, p.y - MAP.bankY);
export const inBossArena = (p: {
    x: number;
    y: number;
}) => Math.hypot(p.x - MAP.bossX, p.y - MAP.bossY) < MAP.bossRadius;
export const zone = (p: {
    x: number;
    y: number;
}): 'bank' | 'wild' | 'grove' => bankDistance(p) <= MAP.safeRadius ? 'bank' : bankDistance(p) < MAP.dangerRadius || inBossArena(p) ? 'wild' : 'grove';
export const level = (xp: number) => 1 + Math.floor(Math.sqrt(xp / 40));
export const xpForLevel = (n: number) => 40 * (n - 1) ** 2;
export const cleanInput = (raw: unknown): Input => {
    const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const number = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
    let x = number(v.x), y = number(v.y);
    const length = Math.hypot(x, y);
    if (length > 1) {
        x /= length;
        y /= length;
    }
    return { x, y, interact: v.interact === true, attack: v.attack === true, dodge: v.dodge === true, weapon: isWeapon(v.weapon) ? v.weapon : undefined,
        aim: typeof v.aim === 'number' && Number.isFinite(v.aim) ? Math.atan2(Math.sin(v.aim), Math.cos(v.aim)) : undefined };
};
export function createPlayer(id: string, profile?: Partial<Profile>): Player {
    const items = { ...emptyStock(), ...profile?.items };
    const skills = { ...emptySkills(), ...profile?.skills };
    const weapon = isWeapon(profile?.weapon) && (!isItem(profile.weapon) || items[profile.weapon] > 0) ? profile.weapon : 'sword';
    const p: Player = { name: 'Wanderer', xp: emptyBag(), banked: emptyBag(), runs: 0, kills: 0, ...profile, contracts: readJournal(profile?.contracts), equipment: normalizeEquipment(items, profile?.equipment), skills, publicId: profile?.publicId || id, items, pveKills: profile?.pveKills ?? 0, bossKills: profile?.bossKills ?? 0, pvpScore: profile?.pvpScore ?? 0, pvpKills: profile?.pvpKills ?? 0, pvpDeaths: profile?.pvpDeaths ?? 0, duelKnockouts: profile?.duelKnockouts ?? 0, recentPvpWins: { ...profile?.recentPvpWins }, coins: profile?.coins ?? (profile?.banked?.wood ?? 0) * 5 + (profile?.banked?.ore ?? 0) * 8, duelWins: profile?.duelWins ?? 0, duelLosses: profile?.duelLosses ?? 0, duelBag: undefined, combatXp: profile?.combatXp ?? 0, weapon, id, x: 170, y: 550, hp: 100, bag: profile?.duelBag ? { ...profile.duelBag } : emptyBag(), input: cleanInput(null), lastInput: 0, gatherAt: 0, attackAt: 0, attackQueuedUntil: 0, respawnAt: 0, facing: 0, message: 'J opens your expedition contracts. Hold E at resource sites; bank your haul for XP.', messageUntil: 0, hitAt: 0, swingAt: 0, stamina: 100, dodgeUntil: 0, dodgeAt: 0, dodgeX: 1, dodgeY: 0, duelId: '', supplyAt: 0, craftAt: 0, restoreAt: 0, recentEnemyDamage: 0, dodgeTrainedAt: -1, auraAt: 0, stormAt: 0, frostAt: 0, abilityAt: 0 };
    p.skills = skillRecord(p);
    return p;
}
export function profileOf(p: Profile): Profile { return { contracts: readJournal(p.contracts), equipment: { ...p.equipment }, skills: skillRecord(p), publicId: p.publicId, items: { ...p.items }, pveKills: p.pveKills, bossKills: p.bossKills, pvpScore: p.pvpScore, pvpKills: p.pvpKills, pvpDeaths: p.pvpDeaths, duelKnockouts: p.duelKnockouts, recentPvpWins: { ...p.recentPvpWins }, name: p.name, xp: { ...p.xp }, banked: { ...p.banked }, runs: p.runs, kills: p.kills, combatXp: p.combatXp, weapon: p.weapon, coins: p.coins, duelWins: p.duelWins, duelLosses: p.duelLosses }; }
export const ownsWeapon = (p: Profile, weapon: WeaponId) => !isItem(weapon) || p.items[weapon] > 0;
export function bestWeapon(p: Profile | undefined, family: 'sword' | 'spear' | 'axe'): WeaponId { const upgrade = ({ sword: 'steelSword', spear: 'warSpear', axe: 'battleAxe' } as const)[family]; return p && p.items[upgrade] > 0 ? upgrade : family; }
export function createEnemy(kind: EnemyKind, id: string, x: number, y: number, phase = 0): Raider {
    return { id, name: ENEMIES[kind].label, kind, x, y, hp: ENEMIES[kind].hp, phase, attackAt: 0, respawnAt: 0, hitAt: 0, swingAt: 0, facing: 0, staggerUntil: 0, lastEngaged: 0, attackCount: 0, chillUntil: 0, chillSlow: 0, stunUntil: 0, burnUntil: 0 };
}
export class World {
    receiveInput(id: string, raw: unknown, now: number) {
        const p = this.players.get(id);
        if (!p)
            return;
        const next = cleanInput(raw);
        // Preserve one quick press even if release arrives before the next world tick.
        if (next.attack && !p.input.attack && p.hp > 0 && this.dueling.forPlayer(id)?.phase !== 'countdown')
            p.attackQueuedUntil = now + 200;
        p.input = next;
        p.lastInput = now;
    }
    ability(id: string, now: number, aim?: number) {
        const p = this.players.get(id);
        if (!p || p.hp <= 0 || now < p.abilityAt || now < p.dodgeUntil)
            return;
        const duel = this.dueling.forPlayer(id);
        if (duel ? !this.dueling.canStrike(id) : zone(p) !== 'wild') {
            this.say(p, 'Abilities require contested ground or an active duel.', now);
            return;
        }
        const family = WEAPONS[p.weapon].family, a = ABILITIES[family];
        const targets = (duel ? [this.dueling.opponent(id)!] : [...this.raiders, ...[...this.players.values()].filter(o => o.id !== id && !o.duelId)])
            .filter(t => t && t.hp > 0 && (duel || zone(t) === 'wild') && distance(p, t) <= a.range).sort((x, y) => distance(p, x) - distance(p, y));
        if (!targets.length && !(family === 'bow' && aim !== undefined))
            return;
        if (p.stamina < a.stamina) {
            this.say(p, `${a.name} needs ${a.stamina} stamina.`, now);
            return;
        }
        if (family === 'bow' && p.items.arrow < 2 || family === 'staff' && p.items.focusRune < 1) {
            this.say(p, family === 'bow' ? 'Twin shot needs 2 arrows.' : 'Frost nova needs 1 focus rune.', now);
            return;
        }
        p.facing = aim !== undefined && Number.isFinite(aim) ? Math.atan2(Math.sin(aim), Math.cos(aim)) : Math.atan2(targets[0].y - p.y, targets[0].x - p.x);
        p.stamina -= a.stamina;
        p.abilityAt = now + a.cooldown;
        p.attackAt = Math.max(p.attackAt, now + 120);
        p.swingAt = now;
        const damage = a.damage + gearStats(p).power + Math.min(6, Math.floor((level(skillXp(p, weaponSkill(family))) - 1) / 3));
        if (family === 'bow') {
            p.items.arrow -= 2;
            this.economyRevision++;
            for (const offset of [-.06, .06]) {
                const angle = p.facing + offset;
                this.projectiles.push({ id: `shot${++this.serial}`, source: p.id, owner: p.id, skill: 'archery', duelId: p.duelId,
                    x: p.x, y: p.y, vx: Math.cos(angle) * 420, vy: Math.sin(angle) * 420, damage, expires: now + a.range / 420 * 1000 });
            }
        }
        else {
            if (family === 'staff') {
                p.items.focusRune--;
                this.economyRevision++;
                this.effect('frost', p, a.range, now);
            }
            for (const t of targets) {
                if (angleGap(Math.atan2(t.y - p.y, t.x - p.x), p.facing) > a.arc)
                    continue;
                if ('bag' in t)
                    this.damage(t, damage, now, p);
                else {
                    this.hitEnemy(t, p, damage, now, family === 'staff' ? 'enchanting' : weaponSkill(family));
                    if (family === 'staff' && t.hp > 0) {
                        t.chillUntil = now + 2500;
                        t.chillSlow = .3;
                    }
                }
            }
        }
        this.say(p, `${a.name}. ${a.cooldown / 1000}s recovery.`, now);
    }
    random = Math.random;
    private burns = new Map<string, {
        owner: string;
        until: number;
        next: number;
        damage: number;
    }>();
    equip(id: string, raw: unknown, now: number) {
        const p = this.players.get(id);
        if (!p || !raw || typeof raw !== 'object')
            return;
        const m = raw as Record<string, unknown>;
        if (!this.canTrade(p)) {
            this.say(p, 'Change equipment at the bank, alive and outside a duel.', now);
            return;
        }
        const slot = GEAR_SLOTS.find(s => s === m.slot);
        if (!slot || (m.item !== null && (!isGear(m.item) || GEAR[m.item].slot !== slot || p.items[m.item] < 1))) {
            this.say(p, 'Choose an owned item for the matching equipment slot.', now);
            return;
        }
        p.equipment[slot] = m.item as Equipment[typeof slot];
        this.economyRevision++;
        this.say(p, m.item === null ? `${slot} slot cleared.` : `${GEAR[m.item as keyof typeof GEAR].name} equipped.`, now);
    }
    awardGear(p: Player, boss: boolean, now: number) {
        const item = p.pveKills === 1 && !boss ? 'wayfarerBoots' : rollGear(boss, this.random());
        if (!item || p.items[item] >= stackLimit(item))
            return;
        p.items[item]++;
        this.economyRevision++;
        this.effect('gear', p, GEAR[item].rarity, now);
        this.event(`${p.name} found ${GEAR[item].name}${boss ? ' from the Warden' : ''}.`);
    }
    elementalHit(p: Player, enemy: Raider, now: number) {
        // Elemental procs start in PvE. They cannot hit players or interfere with duels.
        if (p.duelId || p.hp <= 0 || enemy.hp <= 0 || zone(p) !== 'wild' || zone(enemy) !== 'wild')
            return;
        const stats = gearStats(p);
        if (stats.ranks.storm && now >= p.stormAt) {
            p.stormAt = now + (stats.counts.storm >= 3 ? 3000 : 4000);
            const damage = 7 + (stats.legendary.storm ? 2 : 0) + elementalPower(p, 'storm') + (stats.counts.storm >= 2 ? 2 : 0);
            enemy.stunUntil = now + (enemy.kind === 'boss' ? 150 : 450);
            this.effect('storm', enemy, damage, now);
            this.hitEnemy(enemy, p, damage, now, 'runecrafting', false);
        }
        if (enemy.hp > 0 && stats.ranks.frost && now >= p.frostAt) {
            p.frostAt = now + 3000;
            enemy.chillUntil = now + (stats.counts.frost >= 3 ? 3000 : 2000);
            enemy.chillSlow = Math.min(.4, (stats.counts.frost >= 2 ? .35 : .25) + (stats.legendary.frost ? .05 : 0) + elementalPower(p, 'frost') * .015);
            this.effect('frost', enemy, Math.round(enemy.chillSlow * 100), now);
        }
    }
    tickElements(now: number) {
        for (const p of this.players.values()) {
            if (p.hp <= 0 || p.duelId || zone(p) !== 'wild' || now < p.auraAt)
                continue;
            const stats = gearStats(p);
            if (!stats.ranks.fire)
                continue;
            p.auraAt = now + (stats.counts.fire >= 3 ? 2000 : 3000);
            const radius = stats.counts.fire >= 3 ? 120 : 90;
            const damage = 2 + (stats.legendary.fire ? 2 : 0) + elementalPower(p, 'fire') + (stats.counts.fire >= 2 ? 1 : 0);
            for (const enemy of this.raiders) {
                if (enemy.hp <= 0 || zone(enemy) !== 'wild' || distance(p, enemy) > radius)
                    continue;
                const old = this.burns.get(enemy.id);
                // Refresh, never multiply the number of burn stacks or speed up its next tick.
                if (!old || old.until <= now || old.damage <= damage) {
                    const next = old && old.until > now ? old.next : now + 1000;
                    this.burns.set(enemy.id, { owner: p.id, until: now + 3000, next, damage });
                    enemy.burnUntil = now + 3000;
                    this.effect('fire', enemy, damage, now);
                }
            }
        }
        for (const [id, burn] of this.burns) {
            const p = this.players.get(burn.owner), enemy = this.raiders.find(e => e.id === id);
            if (!p || !enemy || enemy.hp <= 0 || p.hp <= 0 || p.duelId || zone(p) !== 'wild' || zone(enemy) !== 'wild' || now > burn.until) {
                this.burns.delete(id);
                if (enemy)
                    enemy.burnUntil = 0;
                continue;
            }
            if (now >= burn.next) {
                burn.next = now + 1000;
                this.hitEnemy(enemy, p, burn.damage, now, 'pyromancy', false);
            }
        }
    }
    claimContract(id: string, raw: unknown, now: number) {
        const p = this.players.get(id);
        if (!p || !raw || typeof raw !== 'object')
            return;
        const c = CONTRACTS.find(c => c.id === (raw as Record<string, unknown>).contract);
        if (!this.canTrade(p)) {
            this.say(p, 'Claim contract rewards at the bank, alive and outside a duel.', now);
            return;
        }
        if (!c || !unlocked(p.contracts, CONTRACTS.indexOf(c)) || !complete(p.contracts, c.id) || p.contracts.claimed.includes(c.id)) {
            this.say(p, 'This contract is not ready or was already rewarded.', now);
            return;
        }
        if (!Number.isSafeInteger(p.coins + c.reward))
            return;
        p.contracts.claimed.push(c.id);
        p.coins += c.reward;
        this.economyRevision++;
        this.say(p, `${c.name}: earned exactly ${c.reward} coins. Reward claimed.`, now);
    }
    craft(id: string, raw: unknown, now: number) { craft(this, id, raw, now); }
    train(p: Player, skill: Parameters<typeof gainSkill>[1], xp: number) { gainSkill(p, skill, xp); this.economyRevision++; }
    restore(id: string, now: number) {
        const p = this.players.get(id);
        if (!p || p.hp <= 0 || p.duelId || now < p.restoreAt)
            return;
        if (p.items.focusRune < 1) {
            this.say(p, 'Restoration requires a focus rune. Craft or buy one at the bank.', now);
            return;
        }
        if (p.hp >= 100 || p.recentEnemyDamage <= 0) {
            this.say(p, 'Restoration heals recent PvE damage. No rune used.', now);
            return;
        }
        const healed = Math.min(100 - p.hp, p.recentEnemyDamage, 25 + Math.min(10, level(skillXp(p, 'restoration')) - 1));
        p.hp += healed;
        p.recentEnemyDamage -= healed;
        p.items.focusRune--;
        p.restoreAt = now + 8000;
        this.train(p, 'restoration', Math.ceil(healed));
        this.say(p, `Restoration: +${Math.ceil(healed)} health.`, now);
    }
    savedProfiles = new Map<string, Profile>();
    market = new Market(this);
    leaderboards: Leaderboards = { pve: [], pvp: [] };
    canTrade(p: Player) { return p.hp > 0 && !p.duelId && zone(p) === 'bank'; }
    profileByPublicId(id: string) { return [...this.players.values()].find(p => p.publicId === id) ?? [...this.savedProfiles.values()].find(p => p.publicId === id); }
    recordPvpWin(winner: Player, loser: Player, kind: 'duel' | 'world', now: number) {
        if (winner.publicId === loser.publicId)
            return;
        if (kind === 'duel')
            winner.duelKnockouts++;
        else {
            winner.pvpKills++;
            loser.pvpDeaths++;
        }
        for (const [id, at] of Object.entries(winner.recentPvpWins))
            if (now - at >= 600000)
                delete winner.recentPvpWins[id];
        if (winner.recentPvpWins[loser.publicId] === undefined) {
            winner.pvpScore += kind === 'duel' ? 100 : 25;
            winner.recentPvpWins[loser.publicId] = now;
        }
        this.economyRevision++;
    }
    useSupply(id: string, item: unknown, now: number) {
        const p = this.players.get(id);
        if (!p || p.hp <= 0)
            return;
        if (p.duelId) {
            this.say(p, 'Consumables are disabled in wagered duels.', now);
            return;
        }
        if (item !== 'tonic' && item !== 'ration' && item !== 'cookedFish')
            return;
        if (now < p.supplyAt)
            return;
        if (p.items[item] < 1) {
            this.say(p, 'Buy supplies at the bank market first.', now);
            return;
        }
        if (item !== 'ration' && p.hp >= 100 || item === 'ration' && p.stamina >= 100) {
            this.say(p, 'Already full. Supply kept.', now);
            return;
        }
        p.items[item]--;
        if (item !== 'ration')
            p.hp = Math.min(100, p.hp + (item === 'cookedFish' ? 20 : 35));
        else
            p.stamina = Math.min(100, p.stamina + 45);
        p.supplyAt = now + 8000;
        p.recentEnemyDamage = Math.min(p.recentEnemyDamage, 100 - p.hp);
        this.economyRevision++;
        this.say(p, item === 'tonic' ? 'Tonic used. +35 health.' : item === 'cookedFish' ? 'Fish eaten. +20 health.' : 'Ration eaten. +45 stamina.', now);
    }
    economyRevision = 0;
    dueling = new DuelSystem(this);
    eligibleForDuel(p: Player) { return p.hp > 0 && !p.duelId && zone(p) === 'wild' && !inBossArena(p); }
    players = new Map<string, Player>();
    nodes: Node[] = [];
    raiders: Raider[] = [];
    loot: Loot[] = [];
    warnings: Warning[] = [];
    projectiles: Projectile[] = [];
    effects: CombatEffect[] = [];
    events: string[] = ['The Hollow Warden watches the eastern ruins.'];
    private serial = 0;
    private contributions = new Map<string, Map<string, number>>();
    constructor() {
        const groves = [{ x: 220, y: 240 }, { x: 240, y: 810 }, { x: 1370, y: 250 }, { x: 1360, y: 820 }, { x: 800, y: 100 }, { x: 800, y: 1000 }];
        for (const [g, center] of groves.entries())
            for (let n = 0; n < 7; n++) {
                const angle = n * 2.4, radius = 30 + (n % 3) * 33;
                this.nodes.push({ id: `n${g}-${n}`, x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius, kind: (n + g) % 3 === 0 ? 'ore' : 'wood', stock: 6, readyAt: 0 });
            }
        const extra: [
            Exclude<Resource, 'wood' | 'ore'>,
            number,
            number
        ][] = [['rawFish', 135, 400], ['rawFish', 1460, 395], ['berries', 295, 570], ['berries', 1305, 965], ['herb', 340, 680], ['herb', 1230, 170], ['hide', 380, 350], ['hide', 1450, 740], ['grain', 220, 960], ['grain', 1030, 130], ['flax', 345, 940], ['flax', 1130, 950], ['clay', 100, 690], ['clay', 1475, 1000], ['crystal', 250, 100], ['crystal', 1400, 80]];
        for (const [kind, x, y] of extra)
            this.nodes.push({ id: `resource-${kind}-${x}`, kind, x, y, stock: 6, readyAt: 0 });
        for (const [n, kind] of (['skirmisher', 'hunter', 'brute'] as const).entries())
            this.raiders.push(createEnemy(kind, `r${n}`, 800 + Math.cos(n * 2.1) * 230, 550 + Math.sin(n * 2.1) * 230, n * 2.1));
        this.raiders.push(createEnemy('boss', 'warden', MAP.bossX, MAP.bossY));
    }
    say(p: Player, text: string, now: number) { p.message = text; p.messageUntil = now + 3000; }
    event(text: string) { this.events.unshift(text); this.events.length = Math.min(this.events.length, 6); }
    effect(kind: CombatEffect['kind'], target: {
        id: string;
        x: number;
        y: number;
    }, amount: number, now: number) {
        this.effects.push({ id: `fx${++this.serial}`, kind, x: target.x, y: target.y, at: now, amount, target: target.id });
        if (this.effects.length > 120)
            this.effects.splice(0, this.effects.length - 120);
    }
    drop(p: Player, now: number) {
        if (count(p.bag))
            this.loot.push({ id: `loot${++this.serial}`, x: p.x, y: p.y, bag: { ...p.bag }, expires: now + 90000 });
        p.bag = emptyBag();
    }
    damage(p: Player, amount: number, now: number, killer?: Player) {
        if (p.duelId || killer?.duelId) {
            if (!killer || !p.duelId || p.duelId !== killer.duelId || !this.dueling.canStrike(killer.id))
                return;
        }
        if (p.hp <= 0)
            return;
        if (now < p.dodgeUntil) {
            if (!killer && p.dodgeTrainedAt !== p.dodgeAt) {
                p.dodgeTrainedAt = p.dodgeAt;
                this.train(p, 'agility', 8);
            }
            return;
        }
        const armor = gearStats(p).armor + Math.min(5, Math.floor((level(skillXp(p, 'defence')) - 1) / 3));
        amount = Math.max(1, amount - armor);
        const actual = Math.min(p.hp, amount);
        p.hp = Math.max(0, p.hp - amount);
        if (!killer) {
            p.recentEnemyDamage = Math.min(100, p.recentEnemyDamage + actual);
            this.train(p, 'defence', Math.max(1, Math.floor(actual / 8)));
        }
        p.hitAt = now;
        this.effect('blood', p, actual, now);
        if (p.hp === 0 && p.duelId) {
            this.dueling.lose(p.id, now, 'knockout');
            return;
        }
        if (p.hp === 0) {
            this.drop(p, now);
            p.respawnAt = now + 3000;
            p.input = cleanInput(null);
            if (killer) {
                killer.kills++;
                this.recordPvpWin(killer, p, 'world', now);
            }
            this.say(p, 'Your haul fell. Your banked progress is safe.', now);
            this.event(`${p.name} fell in battle.`);
        }
    }
    hitEnemy(enemy: Raider, attacker: Player, amount: number, now: number, training = weaponSkill(WEAPONS[attacker.weapon].family), triggerGear = true) {
        if (attacker.duelId)
            return;
        if (enemy.hp <= 0)
            return;
        const actual = Math.min(enemy.hp, amount);
        enemy.hp = Math.max(0, enemy.hp - amount);
        this.train(attacker, training, Math.max(1, Math.ceil(actual / 4)));
        enemy.hitAt = now;
        enemy.lastEngaged = now;
        if (enemy.kind === 'hunter' || enemy.kind === 'skirmisher')
            enemy.staggerUntil = now + 180;
        this.effect('blood', enemy, amount, now);
        let hits = this.contributions.get(enemy.id);
        if (!hits) {
            hits = new Map();
            this.contributions.set(enemy.id, hits);
        }
        hits.set(attacker.id, now);
        if (enemy.hp === 0) {
            enemy.respawnAt = now + (enemy.kind === 'boss' ? 90000 : 18000);
            this.warnings = this.warnings.filter(w => w.source !== enemy.id);
            for (const [id, at] of hits) {
                const p = this.players.get(id);
                if (p && !p.duelId && p.hp > 0 && now - at < 30000 && distance(p, enemy) < 650) {
                    gainSkill(p, 'combat', ENEMIES[enemy.kind].xp);
                    p.kills++;
                    p.pveKills++;
                    advance(p.contracts, enemy.kind === 'boss' ? 'boss' : 'monster', 1);
                    this.awardGear(p, enemy.kind === 'boss', now);
                    if (enemy.kind === 'boss')
                        p.bossKills++;
                    this.economyRevision++;
                    this.effect('reward', p, ENEMIES[enemy.kind].xp, now);
                    this.say(p, `${enemy.name} defeated. +${ENEMIES[enemy.kind].xp} combat XP.`, now);
                }
            }
            this.contributions.delete(enemy.id);
            if (enemy.kind === 'boss')
                this.event(`${attacker.name}'s party defeated the Hollow Warden. +300 combat XP each.`);
        }
        if (triggerGear && enemy.hp > 0)
            this.elementalHit(attacker, enemy, now);
    }
    interact(p: Player, now: number) {
        if (p.duelId || p.hp <= 0 || now < p.gatherAt || now < p.dodgeUntil)
            return;
        if (zone(p) === 'bank') {
            const amount = count(p.bag);
            if (!amount) {
                this.say(p, 'Your bag is empty. Head to a grove.', now);
                p.gatherAt = now + 800;
                return;
            }
            if (RESOURCE_IDS.some(r => (r === 'wood' || r === 'ore' ? p.banked[r] : p.items[r]) + (p.bag[r] ?? 0) > stackLimit(r))) {
                this.say(p, 'Bank storage is full for part of this haul. Use or sell stored resources, then deposit again.', now);
                p.gatherAt = now + 800;
                return;
            }
            const earned = haulXp(p.bag);
            const coins = RESOURCE_IDS.reduce((sum, r) => sum + (p.bag[r] ?? 0) * RESOURCES[r].coins, 0);
            p.coins += coins;
            this.economyRevision++;
            for (const kind of RESOURCE_IDS) {
                const n = p.bag[kind] ?? 0;
                if (!n)
                    continue;
                gainSkill(p, RESOURCES[kind].skill, n * RESOURCES[kind].xp);
                if (kind === 'wood' || kind === 'ore')
                    p.banked[kind] += n;
                else
                    p.items[kind] += n;
            }
            advance(p.contracts, 'bank', amount);
            p.runs++;
            p.bag = emptyBag();
            p.gatherAt = now + 500;
            this.say(p, `Haul secured. +${earned} gathering XP and ${coins} coins.`, now);
            this.event(`${p.name} banked ${amount} resources. +${earned} XP.`);
            return;
        }
        if (count(p.bag) >= MAP.capacity) {
            this.say(p, 'Bag full. Take your haul to the bank.', now);
            p.gatherAt = now + 700;
            return;
        }
        const loot = this.loot.find(l => distance(l, p) < 48 && count(l.bag) > 0);
        if (loot) {
            for (const kind of RESOURCE_IDS) {
                const n = Math.min(loot.bag[kind] ?? 0, MAP.capacity - count(p.bag));
                if (!n)
                    continue;
                p.bag[kind] = (p.bag[kind] ?? 0) + n;
                loot.bag[kind] = (loot.bag[kind] ?? 0) - n;
            }
            p.gatherAt = now + 300;
            this.say(p, 'Recovered a dropped haul.', now);
            return;
        }
        const node = this.nodes.filter(n => n.stock > 0 && distance(n, p) < 62).sort((a, b) => distance(a, p) - distance(b, p))[0];
        if (!node) {
            this.say(p, 'Move closer to a tree, rock, or dropped bag.', now);
            p.gatherAt = now + 500;
            return;
        }
        p.bag[node.kind] = (p.bag[node.kind] ?? 0) + 1;
        node.stock--;
        advance(p.contracts, 'gather', 1);
        this.economyRevision++;
        node.readyAt = now + 12000;
        p.gatherAt = now + Math.max(280, 700 - (level(skillXp(p, RESOURCES[node.kind].skill)) - 1) * 45);
        p.gathering = { kind: node.kind, x: node.x, y: node.y, at: now, until: p.gatherAt };
        this.say(p, `${RESOURCES[node.kind].name} collected. XP is earned at the bank.`, now);
    }
    dodge(p: Player, now: number) {
        if (this.dueling.forPlayer(p.id)?.phase === 'countdown')
            return false;
        const cost = 32 - Math.min(6, Math.floor((level(skillXp(p, 'agility')) - 1) / 3));
        if (p.hp <= 0 || now < p.dodgeAt || p.stamina < cost)
            return false;
        const len = Math.hypot(p.input.x, p.input.y);
        p.dodgeX = len ? p.input.x / len : Math.cos(p.facing);
        p.dodgeY = len ? p.input.y / len : Math.sin(p.facing);
        p.stamina -= cost;
        p.dodgeUntil = now + 240;
        p.dodgeAt = now + 1000;
        this.effect('dodge', p, 0, now);
        return true;
    }
    attack(p: Player, now: number) {
        const duel = this.dueling.forPlayer(p.id);
        if (duel && !this.dueling.canStrike(p.id))
            return;
        if (p.hp <= 0 || now < p.attackAt || now < p.dodgeUntil)
            return;
        const weapon = WEAPONS[p.weapon];
        p.attackAt = now + weapon.cooldown;
        p.attackQueuedUntil = 0;
        p.swingAt = now;
        if (p.input.aim !== undefined)
            p.facing = p.input.aim;
        if (!duel && zone(p) !== 'wild') {
            this.say(p, 'Combat is only allowed in contested ground.', now);
            return;
        }
        const targets = (duel ? [this.dueling.opponent(p.id)!] : [...this.raiders.filter(r => r.hp > 0 && zone(r) === 'wild'), ...[...this.players.values()].filter(o => !o.duelId && o.id !== p.id && o.hp > 0 && zone(o) === 'wild')]).filter(t => !!t && t.hp > 0).filter(t => distance(t, p) < weapon.range + (('kind' in t && t.kind === 'boss') ? 16 : 0)).sort((a, b) => distance(a, p) - distance(b, p));
        if (!targets.length && !(p.input.aim !== undefined && (weapon.family === 'bow' || weapon.family === 'staff')))
            return;
        p.facing = p.input.aim ?? Math.atan2(targets[0].y - p.y, targets[0].x - p.x);
        const training = weaponSkill(weapon.family), damage = weapon.damage + gearStats(p).power + Math.min(6, Math.floor((level(skillXp(p, training)) - 1) / 3));
        if (weapon.family === 'bow' || weapon.family === 'staff') {
            this.projectiles.push({ id: `shot${++this.serial}`, source: p.id, owner: p.id, skill: weapon.family === 'bow' ? 'archery' : 'pyromancy', duelId: p.duelId, x: p.x, y: p.y, vx: Math.cos(p.facing) * 420, vy: Math.sin(p.facing) * 420, damage, expires: now + weapon.range / 420 * 1000 });
            return;
        }
        for (const t of targets)
            if (angleGap(Math.atan2(t.y - p.y, t.x - p.x), p.facing) <= weapon.arc) {
                if ('bag' in t)
                    this.damage(t, damage, now, p);
                else
                    this.hitEnemy(t, p, damage, now);
            }
    }
    warn(enemy: Raider, target: Player, now: number) {
        const stats = ENEMIES[enemy.kind], enraged = enemy.kind === 'boss' && enemy.hp < stats.hp / 2;
        const kind: Warning['kind'] = enemy.kind === 'hunter' ? 'shot' : enemy.kind === 'boss' && enemy.attackCount % 2 === 1 ? 'fan' : enemy.kind === 'skirmisher' ? 'slash' : 'slam';
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        enemy.facing = angle;
        enemy.attackCount++;
        enemy.attackAt = now + stats.cooldown * (enraged ? .72 : 1);
        this.warnings.push({ id: `w${++this.serial}`, source: enemy.id, kind, x: enemy.x, y: enemy.y, radius: kind === 'fan' ? 360 : kind === 'shot' ? 370 : enemy.kind === 'boss' ? 140 : stats.reach, angle, start: now, at: now + stats.windup * (enraged ? .72 : 1), damage: stats.damage });
    }
    resolveWarnings(now: number) {
        for (const warning of this.warnings.filter(w => now >= w.at)) {
            const source = this.raiders.find(r => r.id === warning.source);
            if (!source || source.hp <= 0)
                continue;
            source.swingAt = now;
            if (warning.kind === 'shot' || warning.kind === 'fan') {
                for (const offset of warning.kind === 'fan' ? [-.55, -.275, 0, .275, .55] : [0]) {
                    const angle = warning.angle + offset;
                    this.projectiles.push({ id: `bolt${++this.serial}`, source: source.id, x: warning.x, y: warning.y, vx: Math.cos(angle) * 310, vy: Math.sin(angle) * 310, damage: warning.damage, expires: now + 1400 });
                }
            }
            else
                for (const p of this.players.values())
                    if (!p.duelId && p.hp > 0 && zone(p) === 'wild' && distance(p, warning) < warning.radius && (warning.kind !== 'slash' || angleGap(Math.atan2(p.y - warning.y, p.x - warning.x), warning.angle) < 1.1))
                        this.damage(p, warning.damage, now);
        }
        this.warnings = this.warnings.filter(w => w.at > now && this.raiders.some(r => r.id === w.source && r.hp > 0));
    }
    tick(dt: number, now: number) {
        this.dueling.tick(now);
        for (const n of this.nodes)
            if (n.stock < 6 && now >= n.readyAt) {
                n.stock++;
                n.readyAt = now + 4000;
            }
        this.loot = this.loot.filter(l => l.expires > now && count(l.bag) > 0);
        this.effects = this.effects.filter(e => now - e.at < 1400);
        for (const p of this.players.values()) {
            if (p.hp <= 0) {
                delete p.gathering;
                if (now >= p.respawnAt) {
                    p.x = 170;
                    p.y = 550;
                    p.hp = 100;
                    p.stamina = 100;
                    p.recentEnemyDamage = 0;
                    this.say(p, 'Back on your feet. Banked and combat XP were kept.', now);
                }
                continue;
            }
            if (now - p.lastInput > 350)
                p.input = cleanInput(null);
            if (this.dueling.forPlayer(p.id)?.phase === 'countdown')
                p.input = cleanInput(null);
            p.stamina = Math.min(100, p.stamina + dt * 17);
            if (p.input.weapon && ownsWeapon(p, p.input.weapon) && p.input.weapon !== p.weapon && now >= p.attackAt && now >= p.dodgeUntil) {
                p.weapon = p.input.weapon;
                p.attackAt = now + 200;
                if (p.attackQueuedUntil >= now)
                    p.attackQueuedUntil = p.attackAt + 50;
            }
            if (p.input.dodge)
                this.dodge(p, now);
            const dodging = now < p.dodgeUntil, speed = dodging ? 560 : p.duelId || zone(p) === 'wild' ? 175 : 195;
            p.x = Math.max(25, Math.min(MAP.width - 25, p.x + (dodging ? p.dodgeX : p.input.x) * speed * dt));
            p.y = Math.max(25, Math.min(MAP.height - 25, p.y + (dodging ? p.dodgeY : p.input.y) * speed * dt));
            if (!dodging && (p.input.x || p.input.y))
                p.facing = Math.atan2(p.input.y, p.input.x);
            if (!p.duelId && zone(p) !== 'wild')
                p.hp = Math.min(100, p.hp + dt * (zone(p) === 'bank' ? 22 : 7));
            p.recentEnemyDamage = Math.min(p.recentEnemyDamage, 100 - p.hp);
            if (p.input.interact)
                this.interact(p, now);
            if (p.input.attack || now <= p.attackQueuedUntil)
                this.attack(p, now);
            if (p.gathering && (now >= p.gathering.until || !p.input.interact || p.input.attack ||
                p.input.x || p.input.y || p.duelId || p.hp <= 0 || now < p.dodgeUntil || now - p.swingAt < 250))
                delete p.gathering;
        }
        this.tickElements(now);
        this.resolveWarnings(now);
        for (const bolt of this.projectiles) {
            if (bolt.expires <= now)
                continue;
            const from = { x: bolt.x, y: bolt.y };
            const travel = Math.min(dt, Math.max(0, (bolt.expires - now + dt * 1000) / 1000));
            bolt.x += bolt.vx * travel;
            bolt.y += bolt.vy * travel;
            if (bolt.owner) {
                const owner = this.players.get(bolt.owner);
                if (!owner || owner.hp <= 0 || owner.duelId !== (bolt.duelId ?? '')) {
                    bolt.expires = 0;
                    continue;
                }
                const candidates = owner.duelId ? (this.dueling.canStrike(owner.id) ? [this.dueling.opponent(owner.id)!] : []) : [...this.raiders.filter(r => r.hp > 0 && zone(r) === 'wild'), ...[...this.players.values()].filter(p => p.id !== owner.id && !p.duelId && p.hp > 0 && zone(p) === 'wild')];
                for (const t of candidates) {
                    if (!t || t.hp <= 0)
                        continue;
                    const dx = bolt.x - from.x, dy = bolt.y - from.y, len = dx * dx + dy * dy, part = len ? Math.max(0, Math.min(1, ((t.x - from.x) * dx + (t.y - from.y) * dy) / len)) : 0;
                    if (distance(t, { x: from.x + dx * part, y: from.y + dy * part }) < ('kind' in t && t.kind === 'boss' ? 32 : 18)) {
                        if ('bag' in t)
                            this.damage(t, bolt.damage, now, owner);
                        else
                            this.hitEnemy(t, owner, bolt.damage, now, bolt.skill);
                        bolt.expires = 0;
                        break;
                    }
                }
                continue;
            }
            if (zone(bolt) === 'bank') {
                bolt.expires = 0;
                continue;
            }
            for (const p of this.players.values())
                if (!p.duelId && p.hp > 0 && zone(p) === 'wild') {
                    const dx = bolt.x - from.x, dy = bolt.y - from.y, len = dx * dx + dy * dy;
                    const t = len ? Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.y - from.y) * dy) / len)) : 0;
                    if (distance(p, { x: from.x + dx * t, y: from.y + dy * t }) < 18) {
                        this.damage(p, bolt.damage, now);
                        bolt.expires = 0;
                        break;
                    }
                }
        }
        this.projectiles = this.projectiles.filter(b => b.expires > now);
        for (const r of this.raiders) {
            const stats = ENEMIES[r.kind];
            if (r.hp <= 0) {
                if (now >= r.respawnAt) {
                    r.hp = stats.hp;
                    r.x = r.kind === 'boss' ? MAP.bossX : 800 + Math.cos(r.phase) * 245;
                    r.y = r.kind === 'boss' ? MAP.bossY : 550 + Math.sin(r.phase) * 245;
                    r.lastEngaged = 0;
                    r.attackCount = 0;
                    r.burnUntil = r.chillUntil = r.stunUntil = 0;
                    this.burns.delete(r.id);
                }
                continue;
            }
            const candidates = [...this.players.values()].filter(p => !p.duelId && p.hp > 0 && zone(p) === 'wild' && (r.kind === 'boss' ? inBossArena(p) : !inBossArena(p) && distance(p, r) < 300));
            const target = candidates.sort((a, b) => distance(a, r) - distance(b, r))[0];
            if (target)
                r.lastEngaged = now;
            if (r.kind === 'boss' && !target && r.lastEngaged && now - r.lastEngaged > 6000) {
                r.hp = stats.hp;
                r.x = MAP.bossX;
                r.y = MAP.bossY;
                r.attackCount = 0;
                r.lastEngaged = 0;
                r.burnUntil = r.chillUntil = r.stunUntil = 0;
                this.burns.delete(r.id);
                this.contributions.delete(r.id);
                this.warnings = this.warnings.filter(w => w.source !== r.id);
            }
            if (now < r.stunUntil || now < r.staggerUntil || this.warnings.some(w => w.source === r.id))
                continue;
            const destination = target ?? (r.kind === 'boss' ? { x: MAP.bossX, y: MAP.bossY } : { x: 800 + Math.cos(now / 9000 + r.phase) * 240, y: 550 + Math.sin(now / 9000 + r.phase) * 240 });
            const d = distance(r, destination), preferred = r.kind === 'hunter' ? 180 : r.kind === 'boss' ? 88 : 38;
            r.facing = Math.atan2(destination.y - r.y, destination.x - r.x);
            if (target && d < stats.reach + (r.kind === 'boss' && r.attackCount % 2 === 1 ? 180 : 0) && now >= r.attackAt) {
                this.warn(r, target, now);
                continue;
            }
            const direction = d > preferred ? 1 : r.kind === 'hunter' && target && d < 110 ? -1 : 0;
            if (d > 1 && direction) {
                const speed = (target ? stats.speed * (r.kind === 'boss' && r.hp < stats.hp / 2 ? 1.35 : 1) : r.kind === 'boss' ? 40 : 36) * (now < r.chillUntil ? 1 - r.chillSlow : 1);
                const x = r.x + (destination.x - r.x) / d * dt * speed * direction, y = r.y + (destination.y - r.y) / d * dt * speed * direction;
                if (zone({ x, y }) === 'wild' && (r.kind === 'boss' ? inBossArena({ x, y }) : !inBossArena({ x, y }))) {
                    r.x = x;
                    r.y = y;
                }
            }
        }
    }
    snapshot(now: number): Snapshot { return { marketListings: this.market.listings, leaderboards: this.leaderboards, duelOffers: this.dueling.offers, duels: this.dueling.matches, time: now, players: [...this.players.values()].map(({ input, lastInput, ...p }) => p), nodes: this.nodes, raiders: this.raiders, loot: this.loot, events: this.events, warnings: this.warnings, projectiles: this.projectiles, effects: this.effects }; }
}
