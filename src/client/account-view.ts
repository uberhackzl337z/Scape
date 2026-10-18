import { drawStorePreview } from './cosmetic-view.js';
type State = { enabled: boolean; required: boolean; account: { name: string } | null;
    store: { enabled: boolean; mode: string; owned: string[]; selected: string; selectedAura: string; terms: string; privacy: string; support: string;
        products: { id: string; kind: string; name: string; cents: number; color: string; description: string }[] } };
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
export class AccountView {
    readonly dialog = get<HTMLDialogElement>('account-store');
    state?: State;
    private previewFrame = 0;
    private motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    constructor(readonly legacy: () => string, readonly signedIn: (name: string) => void,
        readonly signedOut: () => void, readonly isPlaying: () => boolean) {
        get('close-account').onclick = () => this.dialog.close();
        this.dialog.addEventListener('close', () => cancelAnimationFrame(this.previewFrame));
        for (const id of ['open-account', 'menu-account']) get(id).onclick = () => { this.dialog.showModal(); void this.refresh(); };
        get('email-code-form').onsubmit = event => { event.preventDefault(); void this.action(async () => {
            await this.post('/api/account/code', { email: get<HTMLInputElement>('account-email').value });
            get('account-feedback').textContent = 'Check your email for a sign-in code.';
        }); };
        get('account-verify-form').onsubmit = event => { event.preventDefault(); void this.action(async () => {
            const result = await this.post('/api/account/verify', { email: get<HTMLInputElement>('account-email').value,
                code: get<HTMLInputElement>('account-code').value, name: get<HTMLInputElement>('account-name').value, legacyToken: this.legacy() });
            get<HTMLInputElement>('account-code').value = '';
            this.signedIn(result.name); await this.refresh();
        }); };
        get('account-logout').onclick = () => void this.action(async () => {
            await this.post('/api/account/logout', {}); this.signedOut(); await this.refresh();
        });
        if (new URLSearchParams(location.search).get('store') === 'preview') { this.dialog.showModal(); void this.refresh(); }
    }
    async post(path: string, data: object): Promise<any> {
        const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Please try again.'); return body;
    }
    async action(run: () => Promise<void>) {
        for (const button of this.dialog.querySelectorAll('button')) button.disabled = true;
        try { await run(); } catch (error) { get('account-feedback').textContent = error instanceof Error ? error.message : 'Unable to complete this request.'; }
        finally { this.render(); }
    }
    async refresh() {
        try { const response = await fetch('/api/account'); if (!response.ok) throw Error(); this.state = await response.json(); this.render(); }
        catch { get('account-feedback').textContent = 'Account service is unavailable. Please retry shortly.'; }
    }
    render() {
        cancelAnimationFrame(this.previewFrame);
        const state = this.state; get<HTMLButtonElement>('close-account').disabled = false; if (!state) return;
        get('account-status').textContent = state.account ? `Signed in as ${state.account.name}` : state.enabled ? 'Verify your email to create or resume your account.' : 'Email sign-in is not available yet. Your existing test character remains playable.';
        get('account-auth').classList.toggle('hidden', !!state.account);
        get('account-link-note').textContent = this.isPlaying() && !state.account ? 'Bank your haul, reload the game, then sign in here to link your test character.' : 'Your email stays private. New accounts choose a unique name; returning accounts keep their name. This browser’s existing test character will be linked when available.';
        for (const id of ['account-send-code', 'account-verify']) get<HTMLButtonElement>(id).disabled = !state.enabled || this.isPlaying();
        get<HTMLButtonElement>('account-logout').disabled = !state.account;
        get('store-mode').textContent = state.store.mode === 'test'
            ? state.store.enabled ? 'TEST CHECKOUT · Test payments only. No real money is charged.' : 'STORE PREVIEW · Payments are disabled in this demo. No money is charged.'
            : 'Permanent account-bound appearances. USD prices plus applicable tax. No combat bonuses, trade value or duel coins.';
        const policies = get('store-policies'); policies.replaceChildren();
        for (const [label, value] of [['Terms', state.store.terms], ['Privacy', state.store.privacy], ['Support', state.store.support]]) {
            if (label === 'Support' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : !/^https:\/\//.test(value)) continue;
            const link = document.createElement('a'); link.textContent = label; link.href = label === 'Support' ? 'mailto:' + value : value; link.target = '_blank'; link.rel = 'noopener noreferrer'; policies.append(link, document.createTextNode(' · '));
        }
        const previews: { canvas: HTMLCanvasElement; product: State['store']['products'][number] }[] = [];
        get('store-products').replaceChildren(...state.store.products.map(product => {
            const card = document.createElement('article'); card.className = `set-card store-product ${product.kind === 'aura' ? 'store-featured' : ''}`;
            const badge = document.createElement('span'); badge.className = 'eyebrow'; badge.textContent = product.kind === 'aura' ? 'CHARACTER AURA · COSMETIC' : 'NAMEPLATE · COSMETIC';
            const preview = document.createElement('canvas'); preview.width = 200; preview.height = 140;
            preview.setAttribute('role', 'img'); preview.setAttribute('aria-label', `${product.name} visual preview`);
            previews.push({ canvas: preview, product });
            const title = document.createElement('h3'); title.textContent = product.name; title.style.color = product.color;
            const detail = document.createElement('p'); detail.textContent = product.description;
            const price = document.createElement('strong'); price.className = 'store-price'; price.textContent = `$${(product.cents / 100).toFixed(2)} USD`;
            const terms = document.createElement('small'); terms.textContent = 'One-time purchase · permanent account unlock';
            const button = document.createElement('button'), owned = state.store.owned.includes(product.id);
            const selected = product.kind === 'aura' ? state.store.selectedAura === product.id : state.store.selected === product.id;
            button.textContent = owned ? selected ? 'Equipped' : 'Equip cosmetic' : !state.store.enabled ? 'Checkout unavailable in demo' : state.store.mode === 'test' ? 'Test checkout' : 'Buy cosmetic';
            button.disabled = !state.account || (!owned && !state.store.enabled) || selected;
            button.onclick = () => void this.action(async () => {
                const result = await this.post(owned ? '/api/store/select' : '/api/store/checkout', { sku: product.id });
                if (owned) await this.refresh(); else location.assign(result.url);
            });
            card.append(badge, preview, title, detail, price, terms, button); return card;
        }));
        const animate = (now: number) => {
            if (!this.dialog.open) return;
            for (const { canvas, product } of previews) drawStorePreview(canvas, product.kind, product.color, now, this.motion.matches);
            if (!this.motion.matches) this.previewFrame = requestAnimationFrame(animate);
        };
        animate(performance.now());
        const clear = get<HTMLButtonElement>('appearance-clear'); clear.disabled = !state.account || !(state.store.selected || state.store.selectedAura);
        clear.onclick = () => void this.action(async () => { await this.post('/api/store/select', { sku: '' }); await this.refresh(); });
    }
}
