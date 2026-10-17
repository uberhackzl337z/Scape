import { SKILLS, SKILL_IDS, skillXp, type SkillId } from '../shared/skills.js';
import { RECIPES } from '../shared/crafting.js';
import { ITEMS, ITEM_IDS, stackLimit } from '../shared/items.js';
import { owned } from '../shared/market.js';
import { level, xpForLevel, zone, type Snapshot } from '../shared/world.js';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };
export class SkillView {
    private snapshot?: Snapshot;
    private selfId = '';
    private storageKey = '';
    private cards = new Map<SkillId, {
        lv: HTMLElement;
        xp: HTMLElement;
        bar: HTMLElement;
        node: HTMLElement;
    }>();
    private recipes = new Map<string, {
        button: HTMLButtonElement;
        inputs: HTMLElement;
        detail: HTMLElement;
    }>();
    constructor(private send: (m: Record<string, unknown>) => void) {
        for (const id of SKILL_IDS) {
            const d = SKILLS[id], card = make('article');
            card.className = 'skill-card';
            card.dataset.group = d.group;
            const top = make('div');
            top.className = 'row';
            const lv = make('strong', 'LV. 1'), xp = make('span'), meter = make('div'), bar = make('i');
            meter.className = 'meter';
            meter.append(bar);
            top.append(make('h3', d.name), lv);
            card.append(top, make('span', d.group), make('p', d.training), meter, xp);
            get('all-skills').append(card);
            this.cards.set(id, { lv, xp, bar, node: card });
        }
        for (const group of ['All', 'Gathering', 'Crafting', 'Combat']) {
            const b = make('button', group);
            b.setAttribute('aria-pressed', String(group === 'All'));
            b.addEventListener('click', () => {
                for (const [, c] of this.cards)
                    c.node.classList.toggle('hidden', group !== 'All' && c.node.dataset.group !== group);
                for (const other of get('skill-filters').querySelectorAll('button'))
                    other.setAttribute('aria-pressed', String(other === b));
            });
            get('skill-filters').append(b);
        }
        for (const tab of ['overview', 'workshop'])
            get(`skills-tab-${tab}`).addEventListener('click', () => {
                for (const name of ['overview', 'workshop']) {
                    get(`skills-${name}`).classList.toggle('hidden', name !== tab);
                    get(`skills-tab-${name}`).setAttribute('aria-pressed', String(name === tab));
                }
            });
        for (const id of SKILL_IDS.filter(id => SKILLS[id].group === 'Crafting'))
            get<HTMLSelectElement>('recipe-filter').append(new Option(SKILLS[id].name, id));
        get('recipe-filter').addEventListener('change', () => {
            const selected = get<HTMLSelectElement>('recipe-filter').value;
            for (const r of RECIPES)
                get(`recipe-${r.id}`).classList.toggle('hidden', !!selected && r.skill !== selected);
        });
        get('craft-quantity').addEventListener('input', () => this.render());
        for (const r of RECIPES) {
            const card = make('article');
            card.id = `recipe-${r.id}`;
            card.className = 'recipe-card';
            const inputs = make('p'), detail = make('p'), button = make('button', 'Craft');
            button.setAttribute('aria-label', `Craft: ${r.name}`);
            button.addEventListener('click', () => this.send({ type: 'craft', recipe: r.id, quantity: Number(get<HTMLInputElement>('craft-quantity').value) }));
            card.append(make('h3', r.name), inputs, detail, button);
            get('recipe-list').append(card);
            this.recipes.set(r.id, { button, inputs, detail });
        }
        for (const item of ['cookedFish', 'restore'])
            get(`skill-use-${item}`).addEventListener('click', () => this.send(item === 'restore' ? { type: 'restore' } : { type: 'supply', item }));
    }
    update(s: Snapshot, id: string) {
        this.snapshot = s;
        this.selfId = id;
        if (get<HTMLDialogElement>('skills').open)
            this.render();
    }
    open() { this.render(); }
    private render() {
        const s = this.snapshot, p = s?.players.find(p => p.id === this.selfId);
        if (!s || !p)
            return;
        let total = 0, totalXp = 0;
        for (const [id, c] of this.cards) {
            const xp = skillXp(p, id), lv = level(xp);
            total += lv;
            totalXp += xp;
            c.lv.textContent = `LV. ${lv}`;
            c.xp.textContent = `${xp.toLocaleString()} XP · ${xpForLevel(lv + 1) - xp} to next`;
            c.bar.style.width = `${(xp - xpForLevel(lv)) / (xpForLevel(lv + 1) - xpForLevel(lv)) * 100}%`;
        }
        get('skills-total').textContent = `25 skills · total level ${total} · ${totalXp.toLocaleString()} XP`;
        const atBank = p.hp > 0 && !p.duelId && zone(p) === 'bank', q = Number(get<HTMLInputElement>('craft-quantity').value), valid = Number.isSafeInteger(q) && q >= 1 && q <= 10;
        get('workshop-access').textContent = atBank ? 'Workshop open · uses stored materials · no coin fee' : 'Visit the central bank alive, outside a duel, to craft.';
        get('workshop-feedback').textContent = s.time < p.messageUntil ? p.message : '';
        for (const r of RECIPES) {
            const row = this.recipes.get(r.id)!, lv = level(skillXp(p, r.skill)), n = valid ? q : 1;
            row.inputs.textContent = Object.entries(r.inputs).map(([i, amount]) => `${amount! * n} ${ITEMS[i as keyof typeof ITEMS].name} (${owned(p, i as keyof typeof ITEMS)} stored)`).join(' + ');
            row.detail.textContent = `${SKILLS[r.skill].name} Lv. ${r.level} · ${r.xp * n} XP · makes ${r.amount * n} ${ITEMS[r.output].name}`;
            row.button.disabled = !atBank || !valid || lv < r.level || s.time < p.craftAt || Object.entries(r.inputs).some(([i, amount]) => owned(p, i as keyof typeof ITEMS) < amount! * n) || owned(p, r.output) + r.amount * n > stackLimit(r.output);
            row.button.textContent = lv < r.level ? `Requires level ${r.level}` : 'Craft';
        }
        get<HTMLButtonElement>('skill-use-cookedFish').disabled = p.hp <= 0 || p.hp >= 100 || !!p.duelId || p.items.cookedFish < 1 || s.time < p.supplyAt;
        get('skill-use-cookedFish').textContent = `Eat fish · T (${p.items.cookedFish})`;
        get<HTMLButtonElement>('skill-use-restore').disabled = p.hp <= 0 || p.hp >= 100 || !!p.duelId || p.items.focusRune < 1 || p.recentEnemyDamage <= 0 || s.time < p.restoreAt;
        get('skill-use-restore').textContent = `Restoration · F (${p.items.focusRune} runes)`;
        const key = JSON.stringify([p.items, p.banked]);
        if (key !== this.storageKey) {
            this.storageKey = key;
            const stock = ITEM_IDS.filter(i => owned(p, i) > 0).map(i => { const e = make('span', `${ITEMS[i].name} × ${owned(p, i)}`); e.className = 'stored-item'; return e; });
            get('workshop-storage').replaceChildren(...(stock.length ? stock : [make('p', 'Your stored supplies will appear here after banking or buying items.')]));
        }
    }
}
