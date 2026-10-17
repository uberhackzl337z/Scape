import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { Accounts, emailAddress, type Account } from './accounts.js';
import { PRODUCTS } from './shared/shop.js';
export class Commerce {
    readonly authEnabled: boolean;
    readonly checkoutEnabled: boolean;
    readonly authRequired: boolean;
    readonly mode: 'test' | 'live';
    constructor(readonly accounts: Accounts | undefined, readonly env: NodeJS.ProcessEnv, readonly request: typeof fetch = fetch) {
        this.authEnabled = !!(accounts && env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
        this.authRequired = env.ACCOUNTS_REQUIRED === '1' || env.APP_ENV === 'production' && env.ALLOW_GUEST_ALPHA !== '1';
        if (env.STORE_MODE && !['test', 'live'].includes(env.STORE_MODE)) throw new Error('STORE_MODE must be test or live.');
        this.mode = env.STORE_MODE === 'live' ? 'live' : 'test';
        if (!!env.SUPABASE_URL !== !!env.SUPABASE_ANON_KEY) throw new Error('Configure both Supabase URL and publishable/anon key.');
        if (env.SUPABASE_URL && !/^https:\/\/[a-z0-9.-]+$/.test(env.SUPABASE_URL)) throw new Error('SUPABASE_URL must be an HTTPS origin without a path.');
        if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith(this.mode === 'live' ? 'sk_live_' : 'sk_test_')) throw new Error('Stripe key does not match the selected store mode.');
        const liveReady = this.mode === 'test' || env.STORE_LIVE_ENABLED === '1' && !!env.STORE_SUPPORT_EMAIL &&
            /^https:\/\//.test(env.STORE_TERMS_URL ?? '') && /^https:\/\//.test(env.STORE_PRIVACY_URL ?? '');
        this.checkoutEnabled = !!(this.authEnabled && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.PUBLIC_ORIGIN?.startsWith('https://') && liveReady && env.STORE_CHANNEL !== 'steam');
        if (this.authRequired && !this.authEnabled) throw new Error('Required email accounts are not configured.');
    }
    async auth(path: string, body: object): Promise<any> {
        if (!this.authEnabled) throw new Error('Email sign-in is not available yet.');
        const response = await this.request(`${this.env.SUPABASE_URL}/auth/v1/${path}`, { method: 'POST',
            headers: { apikey: this.env.SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(path === 'verify' ? 'The verification code is invalid or expired.' : 'Unable to send a code. Please wait and try again.');
        return response.json();
    }
    async code(email: unknown, captcha: unknown) {
        const address = emailAddress(email); this.accounts!.limit('email:' + address, 1, 60000);
        await this.auth('otp', { email: address, create_user: true, gotrue_meta_security: { captcha_token: typeof captcha === 'string' ? captcha : undefined } });
    }
    async verify(email: unknown, code: unknown) {
        const address = emailAddress(email);
        if (typeof code !== 'string' || !/^\d{6,8}$/.test(code)) throw new Error('Enter the code from your email.');
        this.accounts!.limit('verify:' + address, 8, 600000);
        const data = await this.auth('verify', { email: address, token: code, type: 'email' });
        const user = data.user;
        if (!user || typeof user.id !== 'string' || !user.email_confirmed_at || emailAddress(user.email) !== address) throw new Error('Email verification was not completed.');
        return { id: user.id as string, email: address };
    }
    async checkout(account: Account, sku: unknown) {
        if (!this.checkoutEnabled) throw new Error('Checkout is not available yet.');
        const product = PRODUCTS.find(p => p.id === sku);
        if (!product || this.accounts!.owned(account.id).includes(product.id)) throw new Error('Choose an appearance you do not already own.');
        const now = Math.floor(Date.now() / 1000);
        this.accounts!.db.prepare("UPDATE store_orders SET status='expired' WHERE status='pending' AND expires<=?").run(now);
        const pending = this.accounts!.db.prepare("SELECT id,url,expires FROM store_orders WHERE account=? AND sku=? AND status='pending'").get(account.id, product.id);
        if (pending?.url) return String(pending.url);
        const id = pending ? String(pending.id) : randomUUID(), expires = pending ? Number(pending.expires) : now + 1860;
        if (!pending) this.accounts!.db.prepare('INSERT INTO store_orders (id,account,sku,amount,currency,expires) VALUES (?,?,?,?,?,?)').run(id, account.id, product.id, product.cents, 'usd', expires);
        const body = new URLSearchParams({ mode: 'payment', 'payment_method_types[0]': 'card',
            'line_items[0][price_data][currency]': 'usd', 'line_items[0][price_data][unit_amount]': String(product.cents),
            'line_items[0][price_data][product_data][name]': product.name, 'line_items[0][quantity]': '1',
            'metadata[order_id]': id, client_reference_id: id,
            'payment_intent_data[metadata][order_id]': id, expires_at: String(expires),
            success_url: this.env.PUBLIC_ORIGIN! + '/?store=return', cancel_url: this.env.PUBLIC_ORIGIN! + '/?store=cancelled' });
        if (this.mode === 'live') {
            body.set('automatic_tax[enabled]', 'true'); body.set('billing_address_collection', 'required');
            body.set('customer_creation', 'always'); body.set('consent_collection[terms_of_service]', 'required');
        }
        const response = await this.request('https://api.stripe.com/v1/checkout/sessions', { method: 'POST',
            headers: { Authorization: 'Bearer ' + this.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': id },
            body, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Checkout could not be opened. No appearance has been granted.');
        const session = await response.json();
        if (typeof session.id !== 'string' || typeof session.url !== 'string' || new URL(session.url).origin !== 'https://checkout.stripe.com') throw new Error('Invalid checkout response.');
        this.accounts!.db.prepare('UPDATE store_orders SET session=?,url=? WHERE id=?').run(session.id, session.url, id);
        return session.url as string;
    }
    async webhook(raw: Buffer, signature: string, now = Date.now()) {
        if (!this.accounts || !this.env.STRIPE_SECRET_KEY || !this.env.STRIPE_WEBHOOK_SECRET) throw new Error('Checkout is disabled.');
        const pieces = signature.split(','), stamp = pieces.find(p => p.startsWith('t='))?.slice(2);
        if (!stamp || !/^\d+$/.test(stamp) || Math.abs(now / 1000 - Number(stamp)) > 300) throw new Error('Invalid payment signature.');
        const expected = createHmac('sha256', this.env.STRIPE_WEBHOOK_SECRET!).update(stamp + '.').update(raw).digest();
        if (!pieces.some(p => /^v1=[a-f0-9]{64}$/.test(p) && timingSafeEqual(Buffer.from(p.slice(3), 'hex'), expected))) throw new Error('Invalid payment signature.');
        const event = JSON.parse(raw.toString('utf8'));
        if (typeof event.id !== 'string' || event.livemode !== (this.mode === 'live')) throw new Error('Payment event mode mismatch.');
        if (this.accounts.db.prepare('SELECT id FROM store_events WHERE id=?').get(event.id)) return;
        if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
            const object = event.data?.object;
            if (event.type === 'charge.refunded' && !(Number.isSafeInteger(object?.amount) && Number.isSafeInteger(object?.amount_refunded) && object.amount_refunded >= object.amount && object.amount > 0)) return;
            let payment = object?.payment_intent;
            if (!payment && event.type === 'charge.dispute.created') {
                const charge = typeof object?.charge === 'string' ? object.charge : object?.charge?.id;
                if (!/^ch_[a-zA-Z0-9_]+$/.test(charge ?? '')) throw new Error('Invalid charge.');
                payment = (await this.stripeGet('charges/' + charge)).payment_intent;
            }
            if (typeof payment !== 'string') payment = payment?.id;
            if (!/^pi_[a-zA-Z0-9_]+$/.test(payment ?? '')) throw new Error('Invalid payment.');
            const intent = await this.stripeGet('payment_intents/' + payment);
            if (intent.livemode !== (this.mode === 'live') || typeof intent.metadata?.order_id !== 'string') throw new Error('Invalid payment identity.');
            this.accounts!.revoke(event.id, intent.metadata.order_id); return;
        }
        if (event.type !== 'checkout.session.completed') return;
        const session = event.data?.object;
        if (!session || session.payment_status !== 'paid' || session.mode !== 'payment') return;
        const subtotal = session.amount_subtotal ?? (this.mode === 'test' ? session.amount_total : undefined);
        if (typeof session.metadata?.order_id !== 'string' || typeof session.id !== 'string' || !Number.isSafeInteger(subtotal) || !Number.isSafeInteger(session.amount_total) || session.amount_total < subtotal || session.currency !== 'usd') throw new Error('Invalid order details.');
        this.accounts!.fulfill(event.id, session.metadata.order_id, session.id, subtotal, session.currency);
    }
    private async stripeGet(path: string): Promise<any> {
        const result = await this.request('https://api.stripe.com/v1/' + path, { headers: { Authorization: 'Bearer ' + this.env.STRIPE_SECRET_KEY }, signal: AbortSignal.timeout(10000) });
        if (!result.ok) throw new Error('Payment lookup failed.'); return result.json();
    }
}
