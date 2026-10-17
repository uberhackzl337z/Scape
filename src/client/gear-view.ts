import { GEAR, GEAR_SLOTS, RARITIES, SETS, gearStats, type GearId } from '../shared/equipment.js';
import { SHOP } from '../shared/shop.js';
import { WEAPONS } from '../shared/combat.js';
import { zone, type Snapshot } from '../shared/world.js';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
    const e = document.createElement(tag);
    e.textContent = text;
    e.className = className;
    return e;
}
export class GearView {
    private key = '';
    private tab = 'loadout';
    constructor(private send: (message: Record<string, unknown>) => void) {
        for (const tab of ['loadout', 'sets', 'shop'])
            get(`gear-tab-${tab}`).addEventListener('click', () => {
                this.tab = tab;
                this.key = '';
                for (const name of ['loadout', 'sets', 'shop']) {
                    get(`gear-${name}`).classList.toggle('hidden', tab !== name);
                    get(`gear-tab-${name}`).setAttribute('aria-selected', String(tab === name));
                }
            });
        for (const id of ['gear-filter', 'gear-owned'])
            get(id).addEventListener('change', () => { this.key = ''; });
        for (const product of SHOP.products) {
            const card = el('article', '', 'shop-card');
            card.append(el('span', product.kind, 'eyebrow'), el('h3', product.name), el('p', product.description));
            const button = el('button', 'Concept only · unavailable');
            button.disabled = true;
            card.append(button);
            get('shop-products').append(card);
        }
        get('shop-rules').replaceChildren(...SHOP.rules.map(rule => el('li', rule)));
    }
    update(s: Snapshot, selfId: string) {
        if (!get<HTMLDialogElement>('gear').open)
            return;
        const p = s.players.find(p => p.id === selfId);
        if (!p)
            return;
        const atBank = p.hp > 0 && !p.duelId && zone(p) === 'bank';
        const filter = get<HTMLSelectElement>('gear-filter').value, owned = get<HTMLInputElement>('gear-owned').checked;
        const key = JSON.stringify([this.tab, p.items, p.equipment, p.weapon, atBank, filter, owned, p.message, p.messageUntil]);
        if (key === this.key)
            return;
        this.key = key;
        const stats = gearStats(p);
        get('gear-totals').textContent = `Equipment: ${stats.armor} armor · +${stats.power} attack power · all five combat slots are free`;
        get('gear-access').textContent = atBank ? 'Bank sanctuary · equipment changes available' : 'Inspect anywhere. Equip and unequip at the bank, alive and outside a duel.';
        get('gear-feedback').textContent = p.message;
        const weapon = el('article', '', 'paper-slot');
        weapon.append(el('span', 'MAIN HAND', 'eyebrow'), el('strong', WEAPONS[p.weapon].name), el('small', 'Choose with 1–5 or the weapon bar'));
        const slots: HTMLElement[] = [weapon];
        for (const slot of GEAR_SLOTS) {
            const id = p.equipment[slot], card = el('article', '', 'paper-slot');
            card.append(el('span', slot.toUpperCase(), 'eyebrow'), el('strong', id ? GEAR[id].name : 'Empty slot'));
            if (id) {
                const g = GEAR[id];
                card.style.borderColor = RARITIES[g.rarity].color;
                card.append(el('small', `T${g.rarity} ${RARITIES[g.rarity].name} · ${g.armor} armor · +${g.power} power`));
            }
            slots.push(card);
        }
        get('gear-slots').replaceChildren(...slots);
        const cards: HTMLElement[] = [];
        for (const id of Object.keys(GEAR) as GearId[]) {
            const g = GEAR[id], n = p.items[id];
            if (filter && g.slot !== filter || owned && n < 1)
                continue;
            const card = el('article', '', 'gear-card');
            card.style.setProperty('--rarity', RARITIES[g.rarity].color);
            card.append(el('span', `T${g.rarity} ${RARITIES[g.rarity].name.toUpperCase()} · ${g.slot.toUpperCase()}`, 'rarity-label'), el('h3', g.name), el('p', g.description));
            if (g.set)
                card.append(el('span', `${SETS[g.set].name} · SET ITEM`, 'set-badge'));
            if (g.set || g.legendary)
                card.append(el('p', SETS[(g.set ?? g.legendary)!].effect, 'gear-passive'));
            card.append(el('small', `${n} owned · ${g.armor} armor · +${g.power} power`));
            const equipped = p.equipment[g.slot] === id;
            const button = el('button', equipped ? 'Unequip' : n ? 'Equip' : 'Find, craft or buy');
            button.disabled = !atBank || n < 1;
            button.addEventListener('click', () => this.send({ type: 'equipment', slot: g.slot, item: equipped ? null : id }));
            card.append(button);
            cards.push(card);
        }
        get('gear-items').replaceChildren(...(cards.length ? cards : [el('p', 'No equipment matches. Your first monster defeat grants boots. Browse all to plan your build.')]));
        const sets: HTMLElement[] = [];
        for (const element of ['fire', 'storm', 'frost'] as const) {
            const set = SETS[element], pieces = stats.counts[element], card = el('article', '', `set-card element-${element}`);
            card.append(el('span', `${pieces} / 3 EQUIPPED`, 'set-badge'), el('h3', set.name), el('p', set.effect), el('p', `One piece: unlock the passive. Scales with ${set.skill}.`), el('p', `${pieces >= 2 ? 'ACTIVE' : 'LOCKED'} · 2 pieces: ${set.two}`), el('p', `${pieces >= 3 ? 'ACTIVE' : 'LOCKED'} · 3 pieces: ${set.three}`));
            sets.push(card);
        }
        get('gear-set-cards').replaceChildren(...sets);
    }
}
