import { GearView } from './gear-view.js';
import { GEAR, RARITIES, isGear } from '../shared/equipment.js';
import { ITEMS, ITEM_IDS, stackLimit, type ItemId } from '../shared/items.js';
import { owned } from '../shared/market.js';
import { zone, type Snapshot } from '../shared/world.js';
import { ScoreView } from './score-view.js';
import { SkillView } from './skill-view.js';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const e = document.createElement(tag);
    if (text)
        e.textContent = text;
    return e;
};
export class TownView {
    private snapshot?: Snapshot;
    private selfId = '';
    private listingKey = '';
    readonly scores: ScoreView;
    readonly skills: SkillView;
    readonly gear: GearView;
    private feedbackKey = '';
    private cards = new Map<ItemId, {
        stock: HTMLElement;
        buy: HTMLButtonElement;
        sell: HTMLButtonElement;
        equip: HTMLButtonElement;
    }>();
    constructor(private send: (message: Record<string, unknown>) => void, private opening: () => void, private closed: () => void) {
        this.scores = new ScoreView(send);
        this.skills = new SkillView(send);
        this.gear = new GearView(send);
        for (const name of ['market', 'scores', 'skills', 'gear']) {
            const dialog = get<HTMLDialogElement>(name);
            get(`open-${name}`).addEventListener('click', () => this.open(name as 'market' | 'scores' | 'skills' | 'gear'));
            get(`close-${name}`).addEventListener('click', () => { dialog.close(); closed(); });
            dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); closed(); });
            dialog.addEventListener('close', () => requestAnimationFrame(closed));
        }
        for (const item of ITEM_IDS) {
            const d = ITEMS[item], card = element('article');
            card.className = 'market-card';
            card.dataset.kind = d.kind;
            if (isGear(item)) {
                card.style.borderColor = RARITIES[GEAR[item].rarity].color;
                titleRarity(card, item);
            }
            const heading = element('div'), title = element('h3', d.name), stock = element('span');
            heading.className = 'row';
            heading.append(title, stock);
            const restricted = isGear(item) && GEAR[item].rarity >= 4;
            const description = element('p', d.description), prices = element('p', restricted ? `Craft / loot / player trade · vendor resale ${d.sell} coins` : `Buy ${d.buy} / sell ${d.sell} coins each`), actions = element('div');
            actions.className = 'trade-actions';
            const buy = element('button', 'Buy'), sell = element('button', 'Sell'), equip = element('button', 'Equip');
            if (restricted)
                buy.textContent = 'Craft / loot';
            buy.setAttribute('aria-label', `Buy ${d.name}`);
            sell.setAttribute('aria-label', `Sell ${d.name}`);
            equip.setAttribute('aria-label', `Equip ${d.name}`);
            buy.addEventListener('click', () => this.trade('buy', item));
            sell.addEventListener('click', () => this.trade('sell', item));
            equip.addEventListener('click', () => this.trade('equip', item));
            actions.append(buy, sell);
            if (d.kind === 'gear' || d.kind === 'armor')
                actions.append(equip);
            card.append(heading, description, prices, actions);
            get('market-catalog').append(card);
            this.cards.set(item, { stock, buy, sell, equip });
            get<HTMLSelectElement>('listing-item').append(new Option(d.name, item));
        }
        get('market-quantity').addEventListener('input', () => { this.listingKey = ''; this.render(); });
        get('market-filter').addEventListener('change', () => {
            const kind = get<HTMLSelectElement>('market-filter').value;
            for (const card of get('market-catalog').querySelectorAll<HTMLElement>('.market-card'))
                card.classList.toggle('hidden', !!kind && card.dataset.kind !== kind);
        });
        get('listing-item').addEventListener('change', () => this.render());
        get('listing-price').addEventListener('input', () => this.render());
        get('listing-form').addEventListener('submit', event => { event.preventDefault(); this.send({ type: 'market', action: 'list', item: get<HTMLSelectElement>('listing-item').value, quantity: this.quantity(), unitPrice: Number(get<HTMLInputElement>('listing-price').value) }); });
        for (const item of ['tonic', 'ration'])
            get(`use-${item}`).addEventListener('click', () => { this.use(item); closed(); });
    }
    open(name: 'market' | 'scores' | 'skills' | 'gear') {
        this.opening();
        for (const other of ['market', 'scores', 'skills', 'gear'])
            if (other !== name)
                get<HTMLDialogElement>(other).close();
        if (name === 'market') {
            const p = this.snapshot?.players.find(p => p.id === this.selfId);
            this.feedbackKey = JSON.stringify([p?.message, p?.messageUntil]);
            get('market-feedback').textContent = '';
        }
        const dialog = get<HTMLDialogElement>(name);
        if (!dialog.open)
            dialog.showModal();
        if (name === 'scores')
            this.scores.open();
        if (name === 'skills')
            this.skills.open();
        this.render();
    }
    use(item: string) { this.send({ type: 'supply', item }); }
    private quantity() { return Number(get<HTMLInputElement>('market-quantity').value); }
    private trade(action: string, item: ItemId) { this.send({ type: 'market', action, item, quantity: this.quantity() }); }
    update(snapshot: Snapshot, selfId: string) { this.snapshot = snapshot; this.selfId = selfId; this.scores.update(snapshot, selfId); this.skills.update(snapshot, selfId); this.gear.update(snapshot, selfId); this.render(); }
    private render() {
        const s = this.snapshot, p = s?.players.find(p => p.id === this.selfId);
        if (!s || !p)
            return;
        const atBank = zone(p) === 'bank' && p.hp > 0 && !p.duelId, q = this.quantity(), valid = Number.isSafeInteger(q) && q > 0 && q <= 99;
        get('market-wallet').textContent = `${p.coins.toLocaleString()} coins`;
        get('market-access').textContent = atBank ? 'Bank market open. Trades use earned game coins.' : 'Browse here; visit the central bank alive to trade. No trading during duels.';
        for (const [item, card] of this.cards) {
            const d = ITEMS[item], n = owned(p, item);
            card.stock.textContent = `Owned: ${n}`;
            card.buy.disabled = (isGear(item) && GEAR[item].rarity >= 4) || !atBank || !valid || p.coins < d.buy * q || n + q > stackLimit(item);
            card.sell.disabled = !atBank || !valid || n < q;
            const equipped = p.weapon === item || (isGear(item) && p.equipment[GEAR[item].slot] === item);
            card.equip.disabled = !atBank || n < 1 || equipped;
            card.equip.textContent = equipped ? 'Equipped' : 'Equip';
        }
        const listingItem = get<HTMLSelectElement>('listing-item').value as ItemId, price = Number(get<HTMLInputElement>('listing-price').value);
        get<HTMLButtonElement>('listing-submit').disabled = !atBank || !valid || owned(p, listingItem) < q || !Number.isSafeInteger(price) || price < 1 || price > 5000 || s.marketListings.filter(l => l.sellerId === p.publicId).length >= 5 || s.marketListings.length >= 200;
        const feedbackKey = JSON.stringify([p.message, p.messageUntil]);
        if (get<HTMLDialogElement>('market').open && feedbackKey !== this.feedbackKey) {
            this.feedbackKey = feedbackKey;
            get('market-feedback').textContent = p.message;
        }
        for (const item of ['tonic', 'ration'] as const) {
            const b = get<HTMLButtonElement>(`use-${item}`), cooldown = Math.max(0, Math.ceil((p.supplyAt - s.time) / 1000));
            b.textContent = `${item === 'tonic' ? 'Q · Tonic' : 'R · Ration'} (${p.items[item]})${cooldown ? ` · ${cooldown}s` : ''}`;
            b.disabled = p.hp <= 0 || !!p.duelId || p.items[item] < 1 || cooldown > 0 || (item === 'tonic' ? p.hp >= 100 : p.stamina >= 100);
        }
        if (get<HTMLDialogElement>('market').open) {
            const listingKey = JSON.stringify([s.marketListings, p.publicId, p.coins, p.items, p.banked, atBank, q]);
            if (listingKey !== this.listingKey) {
                this.listingKey = listingKey;
                const rows = s.marketListings.map(l => {
                    const card = element('article');
                    card.className = 'listing-card';
                    const own = l.sellerId === p.publicId;
                    card.append(element('strong', `${ITEMS[l.item].name} × ${l.quantity}`), element('p', `${l.unitPrice} coins each · ${l.sellerName}${own ? ' · your listing' : ''}`));
                    const b = element('button', own ? 'Cancel & reclaim' : `Buy ${valid ? q : '…'} for ${valid ? q * l.unitPrice : '…'} coins`);
                    b.disabled = !atBank || (own ? owned(p, l.item) + l.quantity > stackLimit(l.item) : !valid || q > l.quantity || p.coins < q * l.unitPrice || owned(p, l.item) + q > stackLimit(l.item));
                    b.addEventListener('click', () => this.send({ type: 'market', action: own ? 'cancel' : 'buyListing', listingId: l.id, quantity: this.quantity() }));
                    card.append(b);
                    return card;
                });
                get('market-listings').replaceChildren(...(rows.length ? rows : [element('p', 'No player listings yet. Sell something from your stored inventory below.')]));
            }
        }
    }
}
function titleRarity(card: HTMLElement, item: keyof typeof GEAR) { const g = GEAR[item]; const span = document.createElement('span'); span.className = 'rarity-label'; span.textContent = 'T' + g.rarity + ' ' + RARITIES[g.rarity].name + (g.set ? ' · SET ITEM' : ''); card.append(span); }
