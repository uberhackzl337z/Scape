import type { Player } from './world.js';
export const DUEL_RULES = { minWager: 10, maxWager: 500, offerMs: 20000, countdownMs: 3000, durationMs: 120000, exitGraceMs: 2000, x: 420, y: 550, radius: 165 };
export type DuelOffer = {
    id: string;
    from: string;
    to: string;
    wager: number;
    expires: number;
};
export type Duel = {
    id: string;
    players: [
        string,
        string
    ];
    names: [
        string,
        string
    ];
    wager: number;
    pot: number;
    x: number;
    y: number;
    radius: number;
    phase: 'countdown' | 'active' | 'finished';
    startsAt: number;
    endsAt: number;
    outside: Record<string, number>;
    winnerId?: string;
    result: string;
    finishedAt: number;
};
type DuelHost = {
    recordPvpWin(winner: Player, loser: Player, kind: 'duel' | 'world', now: number): void;
    players: Map<string, Player>;
    economyRevision: number;
    eligibleForDuel(p: Player): boolean;
    say(p: Player, text: string, now: number): void;
    event(text: string): void;
};
const dist = (a: {
    x: number;
    y: number;
}, b: {
    x: number;
    y: number;
}) => Math.hypot(a.x - b.x, a.y - b.y);
export class DuelSystem {
    offers: DuelOffer[] = [];
    matches: Duel[] = [];
    private serial = 0;
    private lastOffers = new Map<string, number>();
    constructor(private host: DuelHost) { }
    forPlayer(id: string) { return this.matches.find(d => d.phase !== 'finished' && d.players.includes(id)); }
    pending(id: string) { return this.offers.find(o => o.from === id || o.to === id); }
    opponent(id: string) { const d = this.forPlayer(id); return d ? this.host.players.get(d.players.find(p => p !== id)!) : undefined; }
    canStrike(id: string) { const d = this.forPlayer(id), p = this.host.players.get(id); return !!d && d.phase === 'active' && !!p && dist(p, d) <= d.radius; }
    handle(id: string, raw: unknown, now: number) {
        const p = this.host.players.get(id);
        if (!p || !raw || typeof raw !== 'object')
            return;
        const command = raw as Record<string, unknown>;
        if (command.action === 'offer') {
            if (now - (this.lastOffers.get(id) ?? -Infinity) < 1000)
                return;
            this.lastOffers.set(id, now);
            const other = typeof command.targetId === 'string' ? this.host.players.get(command.targetId) : undefined;
            const stake = command.wager;
            if (typeof stake !== 'number' || !Number.isSafeInteger(stake) || stake < DUEL_RULES.minWager || stake > DUEL_RULES.maxWager) {
                this.host.say(p, 'Choose a whole-number wager from 10 to 500 coins.', now);
                return;
            }
            if (!other || other.id === id) {
                this.host.say(p, 'Choose another player in the crossing.', now);
                return;
            }
            if (!this.host.eligibleForDuel(p) || !this.host.eligibleForDuel(other) || dist(p, other) > 220) {
                this.host.say(p, 'Both players must be alive, nearby, and in the PvP crossing—not the boss arena.', now);
                return;
            }
            if (this.forPlayer(id) || this.forPlayer(other.id) || this.pending(id) || this.pending(other.id)) {
                this.host.say(p, 'One of you already has a duel or pending challenge.', now);
                return;
            }
            if (p.coins < stake || other.coins < stake) {
                this.host.say(p, 'Both players need enough earned coins for this wager.', now);
                return;
            }
            const offer: DuelOffer = { id: `offer${++this.serial}`, from: id, to: other.id, wager: stake, expires: now + DUEL_RULES.offerMs };
            this.offers.push(offer);
            this.host.say(p, `Challenge sent: ${stake} coins each. Waiting for consent.`, now);
            this.host.say(other, `${p.name} offers a duel for ${stake} coins each. Review it in Wagered duels.`, now);
            return;
        }
        if (command.action === 'forfeit') {
            const d = this.forPlayer(id);
            if (d)
                this.lose(id, now, 'forfeit');
            return;
        }
        const offer = this.offers.find(o => o.id === command.offerId);
        if (!offer)
            return;
        if (command.action === 'cancel' && offer.from === id || command.action === 'decline' && offer.to === id) {
            this.offers = this.offers.filter(o => o !== offer);
            this.notifyOffer(offer, 'Duel challenge cancelled. No coins were taken.', now);
            return;
        }
        if (command.action !== 'accept' || offer.to !== id)
            return;
        const other = this.host.players.get(offer.from);
        const invalidate = (message: string) => { this.offers = this.offers.filter(o => o !== offer); this.notifyOffer(offer, message, now); };
        if (offer.expires <= now) {
            invalidate('That duel challenge expired. No coins were taken.');
            return;
        }
        if (!other || !this.host.eligibleForDuel(p) || !this.host.eligibleForDuel(other) || dist(p, other) > 220) {
            invalidate('The players moved out of range or left the PvP crossing. No coins were taken.');
            return;
        }
        if (this.matches.some(d => d.phase !== 'finished')) {
            invalidate('The duel ring is occupied. Try again when it is free.');
            return;
        }
        if (this.forPlayer(id) || this.forPlayer(other.id) || p.coins < offer.wager || other.coins < offer.wager) {
            invalidate('The wager is no longer available. No coins were taken.');
            return;
        }
        // Validation is complete before either wallet changes. No client supplies the pot.
        p.coins -= offer.wager;
        other.coins -= offer.wager;
        const d: Duel = { id: `duel${++this.serial}`, players: [other.id, id], names: [other.name, p.name], wager: offer.wager, pot: offer.wager * 2, x: DUEL_RULES.x, y: DUEL_RULES.y, radius: DUEL_RULES.radius, phase: 'countdown', startsAt: now + DUEL_RULES.countdownMs, endsAt: now + DUEL_RULES.countdownMs + DUEL_RULES.durationMs, outside: {}, result: '', finishedAt: 0 };
        this.offers = this.offers.filter(o => o !== offer);
        this.matches.push(d);
        this.host.economyRevision++;
        for (const [i, player] of [other, p].entries()) {
            player.duelId = d.id;
            player.x = d.x + (i ? 55 : -55);
            player.y = d.y;
            player.facing = i ? Math.PI : 0;
            player.hp = 100;
            player.stamina = 100;
            player.dodgeUntil = 0;
            player.dodgeAt = 0;
            player.attackAt = d.startsAt;
            player.input = { x: 0, y: 0, interact: false, attack: false, dodge: false };
            this.host.say(player, `${offer.wager} coins locked. Duel begins in 3 seconds.`, now);
        }
    }
    private notifyOffer(offer: DuelOffer, message: string, now: number) {
        for (const id of [offer.from, offer.to]) {
            const p = this.host.players.get(id);
            if (p)
                this.host.say(p, message, now);
        }
    }
    private finish(d: Duel, now: number, winnerId: string | undefined, reason: string) {
        if (d.phase === 'finished')
            return;
        // Mark terminal before paying: repeated hits/close events cannot pay twice.
        d.phase = 'finished';
        d.winnerId = winnerId;
        d.finishedAt = now;
        const winner = winnerId ? this.host.players.get(winnerId) : undefined;
        const loser = this.host.players.get(d.players.find(id => id !== winnerId)!);
        if (winner && loser && reason === 'knockout')
            this.host.recordPvpWin(winner, loser, 'duel', now);
        d.result = winner ? `${winner.name} wins ${d.pot} coins (${reason}).` : `Duel refunded: ${reason}.`;
        for (const [i, id] of d.players.entries()) {
            const p = this.host.players.get(id);
            if (!p)
                continue;
            if (winnerId) {
                if (id === winnerId) {
                    p.coins += d.pot;
                    p.duelWins++;
                }
                else
                    p.duelLosses++;
            }
            else
                p.coins += d.wager;
            p.duelId = '';
            p.hp = 100;
            p.stamina = 100;
            p.dodgeUntil = 0;
            p.x = 170 + i * 60;
            p.y = 550;
            p.input = { x: 0, y: 0, interact: false, attack: false, dodge: false };
            this.host.say(p, winnerId ? (id === winnerId ? `Duel won! Pot ${d.pot} coins; net gain ${d.wager}.` : `Duel lost: ${reason}. ${d.wager} coins paid to your opponent.`) : `Duel cancelled: ${reason}. Your ${d.wager} coins were refunded.`, now);
        }
        this.host.economyRevision++;
        this.host.event(d.result);
    }
    lose(id: string, now: number, reason: string) {
        const d = this.forPlayer(id);
        if (!d)
            return false;
        this.finish(d, now, d.players.find(p => p !== id), reason);
        return true;
    }
    disconnect(id: string, now: number) {
        this.lose(id, now, 'opponent disconnected');
        for (const offer of this.offers.filter(o => o.from === id || o.to === id))
            this.notifyOffer(offer, 'Duel challenge cancelled: a player disconnected. No coins were taken.', now);
        this.offers = this.offers.filter(o => o.from !== id && o.to !== id);
        this.lastOffers.delete(id);
    }
    cancelAll(now: number, reason = 'server restarting') {
        for (const d of this.matches)
            if (d.phase !== 'finished')
                this.finish(d, now, undefined, reason);
        this.offers = [];
    }
    tick(now: number) {
        this.offers = this.offers.filter(o => {
            const a = this.host.players.get(o.from), b = this.host.players.get(o.to);
            const valid = o.expires > now && !!a && !!b && this.host.eligibleForDuel(a) && this.host.eligibleForDuel(b) && dist(a, b) <= 220;
            if (!valid)
                this.notifyOffer(o, 'Duel challenge expired or a player left the crossing. No coins were taken.', now);
            return valid;
        });
        for (const d of this.matches) {
            if (d.phase === 'finished')
                continue;
            if (d.endsAt <= now) {
                this.finish(d, now, undefined, 'time limit reached');
                continue;
            }
            if (d.phase === 'countdown' && now >= d.startsAt) {
                d.phase = 'active';
                for (const id of d.players) {
                    const p = this.host.players.get(id);
                    if (p)
                        this.host.say(p, 'Fight! Stay inside the gold duel ring.', now);
                }
            }
            for (const id of d.players) {
                const p = this.host.players.get(id);
                if (!p) {
                    this.lose(id, now, 'opponent disconnected');
                    break;
                }
                if (dist(p, d) > d.radius) {
                    d.outside[id] ??= now;
                    if (now - d.outside[id] >= DUEL_RULES.exitGraceMs) {
                        this.lose(id, now, 'left the duel ring');
                        break;
                    }
                }
                else
                    delete d.outside[id];
            }
        }
        this.matches = this.matches.filter(d => d.phase !== 'finished' || now - d.finishedAt < 10000);
    }
}
