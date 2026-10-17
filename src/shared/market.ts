import { ITEMS, isItem, stackLimit, type ItemId } from './items.js';
import { isWeapon, WEAPONS } from './combat.js';
import type { Player, Profile } from './world.js';
import { GEAR, GEAR_SLOTS, isGear } from './equipment.js';
export type Listing = {
    id: string;
    sellerId: string;
    sellerName: string;
    item: ItemId;
    quantity: number;
    unitPrice: number;
    createdAt: number;
};
type Host = {
    players: Map<string, Player>;
    economyRevision: number;
    canTrade(p: Player): boolean;
    profileByPublicId(id: string): Profile | undefined;
    say(p: Player, text: string, now: number): void;
};
export const owned = (p: Profile, item: ItemId) => item === 'wood' || item === 'ore' ? p.banked[item] : p.items[item];
export function changeStock(p: Profile, item: ItemId, delta: number) {
    if (item === 'wood' || item === 'ore')
        p.banked[item] += delta;
    else
        p.items[item] += delta;
    if (isGear(item) && p.items[item] === 0)
        for (const slot of GEAR_SLOTS)
            if (p.equipment[slot] === item)
                p.equipment[slot] = null;
    if (isWeapon(item) && p.weapon === item && p.items[item] === 0)
        p.weapon = WEAPONS[item].family === 'bow' || WEAPONS[item].family === 'staff' ? 'sword' : WEAPONS[item].family as 'sword' | 'spear' | 'axe';
}
export class Market {
    listings: Listing[] = [];
    private serial = 0;
    constructor(private host: Host) { }
    handle(id: string, raw: unknown, now: number) {
        const p = this.host.players.get(id);
        if (!p || !raw || typeof raw !== 'object')
            return;
        if (!this.host.canTrade(p)) {
            this.host.say(p, 'Visit the bank alive and outside a duel to trade.', now);
            return;
        }
        const m = raw as Record<string, unknown>;
        if (m.action === 'equip') {
            if (isGear(m.item) && owned(p, m.item) > 0) {
                p.equipment[GEAR[m.item].slot] = m.item;
                this.host.economyRevision++;
                this.host.say(p, `${GEAR[m.item].name} equipped.`, now);
                return;
            }
            if (!isWeapon(m.item) || !isItem(m.item) || ITEMS[m.item].kind !== 'gear' || owned(p, m.item) < 1) {
                this.host.say(p, 'You do not own that weapon.', now);
                return;
            }
            p.weapon = m.item;
            this.host.economyRevision++;
            this.host.say(p, `${ITEMS[m.item].name} equipped.`, now);
            return;
        }
        if (m.action === 'cancel') {
            const l = this.listings.find(l => l.id === m.listingId && l.sellerId === p.publicId);
            if (!l)
                return;
            if (owned(p, l.item) + l.quantity > stackLimit(l.item)) {
                this.host.say(p, 'Make room before reclaiming this listing.', now);
                return;
            }
            changeStock(p, l.item, l.quantity);
            this.listings = this.listings.filter(o => o !== l);
            this.host.economyRevision++;
            this.host.say(p, 'Listing cancelled. All unsold goods returned.', now);
            return;
        }
        const quantity = m.quantity;
        if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
            this.host.say(p, 'Choose a whole quantity from 1 to 99.', now);
            return;
        }
        if (m.action === 'buyListing') {
            const l = this.listings.find(l => l.id === m.listingId);
            if (!l) {
                this.host.say(p, 'That listing is no longer available.', now);
                return;
            }
            const seller = this.host.profileByPublicId(l.sellerId), cost = l.unitPrice * quantity;
            if (l.sellerId === p.publicId || !seller || l.quantity < quantity || p.coins < cost || owned(p, l.item) + quantity > stackLimit(l.item) || !Number.isSafeInteger(seller.coins + cost)) {
                this.host.say(p, 'Purchase unavailable: check coins, remaining stock, and carrying limits.', now);
                return;
            }
            p.coins -= cost;
            seller.coins += cost;
            changeStock(p, l.item, quantity);
            l.quantity -= quantity;
            if (!l.quantity)
                this.listings = this.listings.filter(o => o !== l);
            this.host.economyRevision++;
            this.host.say(p, `Bought ${quantity} ${ITEMS[l.item].name} for ${cost} coins.`, now);
            return;
        }
        if (!isItem(m.item)) {
            this.host.say(p, 'That item cannot be traded.', now);
            return;
        }
        const item = m.item, definition = ITEMS[item];
        if (m.action === 'buy') {
            if (isGear(item) && GEAR[item].rarity >= 4) {
                this.host.say(p, 'Epic gear is crafted or looted; legendary gear comes from the Warden. Trade with players for either.', now);
                return;
            }
            const cost = definition.buy * quantity;
            if (p.coins < cost || owned(p, item) + quantity > stackLimit(item)) {
                this.host.say(p, 'Not enough coins or storage space.', now);
                return;
            }
            p.coins -= cost;
            changeStock(p, item, quantity);
            this.host.economyRevision++;
            this.host.say(p, `Bought ${quantity} ${definition.name} for ${cost} coins.`, now);
            return;
        }
        if (m.action === 'sell') {
            if (owned(p, item) < quantity) {
                this.host.say(p, 'You do not own enough of that item.', now);
                return;
            }
            const value = definition.sell * quantity;
            if (!Number.isSafeInteger(p.coins + value))
                return;
            changeStock(p, item, -quantity);
            p.coins += value;
            this.host.economyRevision++;
            this.host.say(p, `Sold ${quantity} ${definition.name} for ${value} coins.`, now);
            return;
        }
        if (m.action === 'list') {
            const price = m.unitPrice;
            if (typeof price !== 'number' || !Number.isSafeInteger(price) || price < 1 || price > 5000) {
                this.host.say(p, 'Set a whole unit price from 1 to 5,000 coins.', now);
                return;
            }
            if (owned(p, item) < quantity || this.listings.filter(l => l.sellerId === p.publicId).length >= 5 || this.listings.length >= 200) {
                this.host.say(p, 'Not enough stock, or your five-listing limit has been reached.', now);
                return;
            }
            changeStock(p, item, -quantity);
            this.listings.push({ id: `order-${now.toString(36)}-${++this.serial}`, sellerId: p.publicId, sellerName: p.name, item, quantity, unitPrice: price, createdAt: now });
            this.host.economyRevision++;
            this.host.say(p, `Listed ${quantity} ${definition.name} at ${price} coins each. Goods held until sold or cancelled.`, now);
        }
    }
}
