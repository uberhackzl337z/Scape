import { createPlayer, profileOf, type Profile } from './shared/world.js';
import { GEAR, GEAR_SLOTS, isGear } from './shared/equipment.js';
import { DUEL_RULES } from './shared/duels.js';
import { ITEM_IDS, stackLimit, isItem } from './shared/items.js';
import type { Listing } from './shared/market.js';
import { SKILL_IDS, skillXp, RESOURCE_IDS } from './shared/skills.js';
export type EscrowRecord = {
    id: string;
    tokens: [
        string,
        string
    ];
    wager: number;
};
export type SaveState = {
    version: 2 | 3 | 4 | 5;
    profiles: Record<string, Profile>;
    escrows: EscrowRecord[];
    marketListings?: Listing[];
};
export function recoverState(raw: unknown): {
    profiles: Map<string, Profile>;
    refunded: number;
    marketListings: Listing[];
} {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error('Invalid save file');
    const saved = raw as Record<string, unknown>;
    const v2 = saved.version === 2 || saved.version === 3 || saved.version === 4 || saved.version === 5;
    const rows = v2 ? saved.profiles : saved;
    if (!rows || typeof rows !== 'object' || Array.isArray(rows))
        throw new Error('Invalid saved profiles');
    const profiles = new Map<string, Profile>();
    for (const [token, value] of Object.entries(rows)) {
        if (!value || typeof value !== 'object')
            throw new Error('Invalid saved profile');
        const profile = value as Profile;
        if (profile.equipment !== undefined) {
            if (!profile.equipment || typeof profile.equipment !== 'object' || Array.isArray(profile.equipment))
                throw new Error('Invalid equipment');
            for (const slot of GEAR_SLOTS) {
                const item = profile.equipment[slot];
                if (item !== null && (!isGear(item) || GEAR[item].slot !== slot || !(profile.items?.[item] > 0)))
                    throw new Error('Invalid equipped item');
            }
        }
        const normalized = profileOf(createPlayer('', profile));
        if (!Number.isSafeInteger(normalized.coins) || normalized.coins < 0)
            throw new Error('Invalid saved coin balance');
        for (const item of ITEM_IDS) {
            const amount = item === 'wood' || item === 'ore' ? normalized.banked[item] : normalized.items[item];
            if (!Number.isSafeInteger(amount) || amount < 0 || amount > stackLimit(item))
                throw new Error('Invalid saved inventory');
        }
        for (const key of ['pveKills', 'bossKills', 'pvpScore', 'pvpKills', 'pvpDeaths', 'duelKnockouts'] as const)
            if (!Number.isSafeInteger(normalized[key]) || normalized[key] < 0)
                throw new Error('Invalid saved score');
        if (profile.duelBag)
            normalized.duelBag = { ...profile.duelBag };
        for (const skill of SKILL_IDS)
            if (!Number.isSafeInteger(skillXp(normalized, skill)) || skillXp(normalized, skill) < 0)
                throw new Error('Invalid saved skill XP');
        if (normalized.duelBag)
            for (const r of RESOURCE_IDS) {
                const n = normalized.duelBag[r] ?? 0;
                if (!Number.isSafeInteger(n) || n < 0)
                    throw new Error('Invalid saved resource bag');
            }
        profiles.set(token, normalized);
    }
    let refunded = 0;
    const seen = new Set<string>();
    const lockedTokens = new Set<string>();
    if (v2) {
        if (!Array.isArray(saved.escrows))
            throw new Error('Invalid escrow records');
        for (const row of saved.escrows) {
            const escrow = row as EscrowRecord;
            if (!escrow || typeof escrow.id !== 'string' || !Array.isArray(escrow.tokens) || escrow.tokens.length !== 2 || escrow.tokens[0] === escrow.tokens[1] || !Number.isSafeInteger(escrow.wager) || escrow.wager < DUEL_RULES.minWager || escrow.wager > DUEL_RULES.maxWager || escrow.tokens.some(t => !profiles.has(t)))
                throw new Error('Invalid duel escrow');
            if (seen.has(escrow.id))
                continue;
            if (escrow.tokens.some(t => lockedTokens.has(t)))
                throw new Error('Conflicting duel escrows');
            for (const token of escrow.tokens)
                lockedTokens.add(token);
            seen.add(escrow.id);
            for (const token of escrow.tokens)
                profiles.get(token)!.coins += escrow.wager;
            refunded++;
        }
    }
    const marketListings: Listing[] = [];
    if (saved.version === 3 || saved.version === 4 || saved.version === 5) {
        if (!Array.isArray(saved.marketListings) || saved.marketListings.length > 200)
            throw new Error('Invalid market listings');
        const listingIds = new Set<string>();
        for (const row of saved.marketListings) {
            const l = row as Listing;
            if (!l || typeof l.id !== 'string' || listingIds.has(l.id) || !isItem(l.item) || !Number.isSafeInteger(l.quantity) || l.quantity < 1 || l.quantity > 99 || !Number.isSafeInteger(l.unitPrice) || l.unitPrice < 1 || l.unitPrice > 5000 || !Number.isSafeInteger(l.createdAt) || ![...profiles.values()].some(p => p.publicId === l.sellerId))
                throw new Error('Invalid market listing');
            listingIds.add(l.id);
            marketListings.push({ ...l });
        }
    }
    return { profiles, refunded, marketListings };
}
