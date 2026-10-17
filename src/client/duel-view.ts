import { distance, zone, inBossArena, type Snapshot } from '../shared/world.js';
import { DUEL_RULES } from '../shared/duels.js';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (id: string, value: string | number) => { $(id).textContent = String(value); };
export class DuelView {
    private snapshot: Snapshot | undefined;
    private self = '';
    private listKey = '';
    private confirmForfeit = false;
    constructor(private send: (message: Record<string, unknown>) => void) {
        $<HTMLFormElement>('duel-form').addEventListener('submit', e => { e.preventDefault(); this.send({ action: 'offer', targetId: $<HTMLSelectElement>('duel-opponent').value, wager: $<HTMLInputElement>('duel-wager').valueAsNumber }); });
        $('duel-wager').addEventListener('input', () => this.refresh());
        $('duel-opponent').addEventListener('change', () => this.refresh());
        $('duel-accept').addEventListener('click', () => {
            const offer = this.snapshot?.duelOffers.find(o => o.to === this.self);
            if (offer)
                this.send({ action: 'accept', offerId: offer.id });
        });
        $('duel-decline').addEventListener('click', () => {
            const offer = this.snapshot?.duelOffers.find(o => o.to === this.self);
            if (offer)
                this.send({ action: 'decline', offerId: offer.id });
        });
        $('duel-cancel').addEventListener('click', () => {
            const offer = this.snapshot?.duelOffers.find(o => o.from === this.self);
            if (offer)
                this.send({ action: 'cancel', offerId: offer.id });
        });
        $('duel-forfeit').addEventListener('click', () => { this.confirmForfeit = true; this.refresh(); });
        $('duel-confirm-forfeit').addEventListener('click', () => { this.send({ action: 'forfeit' }); this.confirmForfeit = false; });
        $('duel-keep-fighting').addEventListener('click', () => { this.confirmForfeit = false; this.refresh(); });
        $('review-duel').addEventListener('click', () => $('duel-section').scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
    update(snapshot: Snapshot, self: string) { this.snapshot = snapshot; this.self = self; this.refresh(); }
    private refresh() {
        const state = this.snapshot, p = state?.players.find(p => p.id === this.self);
        if (!state || !p)
            return;
        text('coin-balance', p.coins);
        text('duel-record', `${p.duelWins}W / ${p.duelLosses}L`);
        const duel = state.duels.find(d => d.phase !== 'finished' && d.players.includes(p.id));
        const offer = state.duelOffers.find(o => o.from === p.id || o.to === p.id);
        const eligible = state.players.filter(other => other.id !== p.id && other.hp > 0 && !other.duelId && zone(other) === 'wild' && !inBossArena(other) && distance(p, other) <= 220);
        const listKey = eligible.map(o => `${o.id}:${o.name}:${o.coins}`).join('|');
        const select = $<HTMLSelectElement>('duel-opponent');
        if (listKey !== this.listKey || !select.options.length) {
            this.listKey = listKey;
            const selected = select.value;
            select.replaceChildren();
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = eligible.length ? 'Choose a nearby player' : 'No nearby duel partners';
            select.append(placeholder);
            for (const other of eligible) {
                const option = document.createElement('option');
                option.value = other.id;
                option.textContent = `${other.name} · ${other.coins} coins`;
                select.append(option);
            }
            if (eligible.some(o => o.id === selected))
                select.value = selected;
        }
        $('duel-form').classList.toggle('hidden', !!duel || !!offer);
        $('duel-offer').classList.toggle('hidden', !offer);
        $('duel-active').classList.toggle('hidden', !duel);
        $('duel-hud').classList.toggle('hidden', !duel && !offer);
        $('review-duel').classList.toggle('hidden', !offer);
        const stake = $<HTMLInputElement>('duel-wager').valueAsNumber;
        const opponent = eligible.find(o => o.id === select.value);
        const valid = Number.isSafeInteger(stake) && stake >= 10 && stake <= 500 && stake <= p.coins && !!opponent && stake <= opponent.coins && zone(p) === 'wild' && !inBossArena(p) && p.hp > 0;
        $<HTMLButtonElement>('duel-send').disabled = !valid;
        text('duel-payout', Number.isSafeInteger(stake) && stake >= 10 && stake <= 500 ? `Each stakes ${stake} coins · winner receives ${stake * 2}` : 'Choose 10–500 whole coins.');
        text('duel-status', p.coins < 10 ? 'Bank resources to earn your first wager.' : zone(p) !== 'wild' || inBossArena(p) ? 'Enter the PvP crossing with another player to challenge.' : !eligible.length ? 'Bring a second player nearby in the crossing.' : 'Pick an opponent and agree on a stake.');
        if (offer) {
            const incoming = offer.to === p.id, other = state.players.find(o => o.id === (incoming ? offer.from : offer.to));
            text('duel-offer-title', incoming ? `${other?.name ?? 'Player'} challenges you` : `Waiting for ${other?.name ?? 'opponent'}`);
            text('duel-offer-terms', `${offer.wager} coins each · ${offer.wager * 2} coin pot · ${Math.max(0, Math.ceil((offer.expires - state.time) / 1000))}s to respond`);
            text('duel-accept', `Accept & lock ${offer.wager} coins`);
            $('duel-incoming-actions').classList.toggle('hidden', !incoming);
            $('duel-cancel').classList.toggle('hidden', incoming);
            text('duel-hud-title', incoming ? 'DUEL CHALLENGE RECEIVED' : 'WAITING FOR DUEL CONSENT');
            text('duel-hud-pot', `${offer.wager} coins each · ${offer.wager * 2} pot`);
            text('duel-hud-detail', 'Review the terms before accepting. No coins taken yet.');
        }
        if (duel) {
            const other = state.players.find(o => o.id !== p.id && duel.players.includes(o.id));
            const countdown = Math.max(0, Math.ceil((duel.startsAt - state.time) / 1000));
            const outside = duel.outside[p.id];
            text('duel-hud-title', `${p.name} vs ${other?.name ?? 'opponent'}`);
            text('duel-hud-pot', `${duel.pot} COINS LOCKED`);
            text('duel-hud-detail', countdown ? `STARTS IN ${countdown} · movement and attacks locked` : outside !== undefined ? `RETURN TO THE RING · ${Math.max(0, ((DUEL_RULES.exitGraceMs - (state.time - outside)) / 1000)).toFixed(1)}s OR FORFEIT` : `FIGHT · ${Math.max(0, Math.ceil((duel.endsAt - state.time) / 1000))}s remaining · ${Math.ceil(other?.hp ?? 0)} opponent HP`);
            $('duel-hud').classList.toggle('outside', outside !== undefined);
            text('duel-active-summary', `${other?.name ?? 'Opponent'} · ${duel.wager} coins each · pot ${duel.pot}`);
            text('duel-forfeit', `Forfeit ${duel.wager} coins`);
            text('duel-confirm-forfeit', `Confirm loss of ${duel.wager}`);
        }
        else {
            this.confirmForfeit = false;
            $('duel-hud').classList.remove('outside');
        }
        $('duel-forfeit-confirm').classList.toggle('hidden', !duel || !this.confirmForfeit);
        const recent = [...state.duels].reverse().find(d => d.phase === 'finished' && d.players.includes(p.id));
        $('duel-result').classList.toggle('hidden', !recent);
        if (recent)
            text('duel-result', recent.result);
    }
}
