import type { Bag } from '../shared/world.js';
import { RESOURCE_IDS, RESOURCES } from '../shared/skills.js';

// One entry per resource kind, regardless of how many units the player carries.
export const bagEntries = (bag: Bag) => RESOURCE_IDS
    .filter(kind => (bag[kind] ?? 0) > 0)
    .map(kind => ({ kind, quantity: bag[kind]! }));

export function renderBag(container: HTMLElement, bag: Bag) {
    const entries = bagEntries(bag);
    if (!entries.length) {
        const empty = document.createElement('p');
        empty.className = 'bag-empty';
        empty.textContent = 'Gather resources to build your haul. No carrying limit.';
        container.replaceChildren(empty);
        return;
    }
    container.replaceChildren(...entries.map(({ kind, quantity }) => {
        const card = document.createElement('div'), icon = document.createElement('i');
        const name = document.createElement('span'), amount = document.createElement('strong');
        card.className = 'resource-stack';
        card.title = `${RESOURCES[kind].name}: ${quantity.toLocaleString()}`;
        icon.className = kind === 'wood' || kind === 'ore' ? kind + '-icon' : 'resource-token';
        icon.style.color = RESOURCES[kind].color;
        icon.setAttribute('aria-hidden', 'true');
        if (kind !== 'wood' && kind !== 'ore') icon.textContent = RESOURCES[kind].name.slice(0, 2).toUpperCase();
        name.textContent = RESOURCES[kind].name;
        amount.textContent = quantity.toLocaleString();
        card.append(icon, name, amount);
        return card;
    }));
}
