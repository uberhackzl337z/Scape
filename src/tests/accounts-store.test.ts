import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';
import { Accounts, emailAddress, accountName } from '../accounts.js';
import { Commerce } from '../commerce.js';
import { AccountHttp } from '../account-http.js';
import { createServer } from 'node:http';

function fixture() {
    const db = new DatabaseSync(':memory:'), accounts = new Accounts(db);
    return { db, accounts };
}
const env = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test-only',
    STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', PUBLIC_ORIGIN: 'https://scape.test' };
test('account names/emails are normalized, reserved and case-insensitive unique; sessions are hashed, revocable and expire', () => {
    const { db, accounts } = fixture();
    try {
        assert.equal(emailAddress(' Owner@Example.test '), 'owner@example.test');
        assert.throws(() => emailAddress('bad address')); assert.throws(() => accountName('Admin'));
        assert.throws(() => accountName('x')); assert.throws(() => accountName('<script>'));
        const first = accounts.register('verified-a', 'a@example.test', 'TrailWalker', 'old-character');
        assert.ok(accounts.bound('old-character'));
        assert.throws(() => accounts.register('b', 'b@example.test', 'trailwalker'));
        assert.throws(() => accounts.register('c', 'a@example.test', 'NewName'));
        assert.throws(() => accounts.register('d', 'd@example.test', 'NewName', 'old-character'));
        assert.equal(accounts.register('verified-a', 'a@example.test', 'Renamed').name, first.name);
        const token = accounts.session(first.id, 1000);
        assert.equal(accounts.resolve(token, 2000)?.character, 'old-character');
        assert.notEqual(db.prepare('SELECT hash FROM account_sessions').get()!.hash, token);
        assert.equal(accounts.resolve('forged'), undefined);
        assert.equal(accounts.resolve(token, 1000 + 7 * 86400000), undefined);
        accounts.logout(token); assert.equal(accounts.resolve(token, 2000), undefined);
        accounts.limit('attempts', 1, 100, 10); assert.throws(() => accounts.limit('attempts', 1, 100, 11));
        accounts.limit('attempts', 1, 100, 111);
    } finally { db.close(); }
});

test('email confirmation is obtained from the provider and must match the requested email', async () => {
    const { db, accounts } = fixture();
    try {
        let verified = true;
        const request: typeof fetch = async (url, init) => {
            assert.ok(String(url).startsWith('https://auth.example.test/auth/v1/'));
            const body = JSON.parse(String(init?.body)); assert.equal(body.email, 'a@example.test');
            return new Response(JSON.stringify({ user: { id: 'verified-id', email: 'a@example.test', email_confirmed_at: verified ? '2026-10-17' : null } }));
        };
        const commerce = new Commerce(accounts, env, request);
        assert.deepEqual(await commerce.verify('A@example.test', '123456'), { id: 'verified-id', email: 'a@example.test' });
        verified = false; await assert.rejects(commerce.verify('a@example.test', '123456'));
        await assert.rejects(commerce.verify('a@example.test', 'malformed'));
        await commerce.code('a@example.test', undefined); await assert.rejects(commerce.code('a@example.test', undefined));
        assert.throws(() => new Commerce(accounts, { ...env, STRIPE_SECRET_KEY: 'sk_live_forbidden' }));
        assert.throws(() => new Commerce(accounts, { ACCOUNTS_REQUIRED: '1' }));
    } finally { db.close(); }
});

test('checkout is server-priced; only signed matching paid events grant one cosmetic; browser return and replays cannot mint coins or duplicate ownership', async () => {
    const { db, accounts } = fixture();
    try {
        const account = accounts.register('a', 'a@example.test', 'SunWalker');
        const request: typeof fetch = async (_url, init) => {
            const body = new URLSearchParams(String(init?.body));
            assert.equal(body.get('line_items[0][price_data][unit_amount]'), '499');
            assert.equal(body.get('payment_method_types[0]'), 'card');
            return new Response(JSON.stringify({ id: 'cs_test_order', url: 'https://checkout.stripe.com/c/pay/test' }));
        };
        const commerce = new Commerce(accounts, env, request);
        await assert.rejects(commerce.checkout(account, 'paid-coins'));
        await commerce.checkout(account, 'sunset-name');
        await commerce.checkout(account, 'sunset-name');
        assert.equal(db.prepare('SELECT count(*) AS n FROM store_orders').get()!.n, 1, 'repeat checkout resumes the pending order');
        assert.deepEqual(accounts.owned('a'), []);
        assert.throws(() => accounts.select('a', 'sunset-name'));
        const order = db.prepare('SELECT id FROM store_orders').get()!;
        const event = { id: 'evt_test', livemode: false, type: 'checkout.session.completed', data: { object: {
            id: 'cs_test_order', payment_status: 'paid', mode: 'payment', amount_total: 499, currency: 'usd', metadata: { order_id: order.id } } } };
        const now = 1800000000000, stamp = String(now / 1000);
        const signature = (raw: Buffer) => `t=${stamp},v1=${createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(stamp + '.').update(raw).digest('hex')}`;
        const raw = Buffer.from(JSON.stringify(event));
        await assert.rejects(commerce.webhook(raw, 't=1,v1=bad', now));
        await assert.rejects(commerce.webhook(raw, signature(raw), now + 301000));
        event.data.object.amount_total = 1; const wrong = Buffer.from(JSON.stringify(event));
        await assert.rejects(commerce.webhook(wrong, signature(wrong), now));
        assert.equal(db.prepare('SELECT count(*) AS n FROM store_events').get()!.n, 0);
        await commerce.webhook(raw, signature(raw), now); await commerce.webhook(raw, signature(raw), now);
        assert.deepEqual(accounts.owned('a'), ['sunset-name']);
        assert.equal(db.prepare('SELECT count(*) AS n FROM store_events').get()!.n, 1);
        accounts.select('a', 'sunset-name'); assert.equal(accounts.byId('a')?.selected, 'sunset-name');
        await assert.rejects(commerce.checkout(account, 'sunset-name'));
        assert.equal(new Commerce(accounts, {}).checkoutEnabled, false);
    } finally { db.close(); }
});

test('full refunds and disputes revoke appearances, late completion cannot restore them, and live checkout is explicitly gated', async () => {
    const { db, accounts } = fixture();
    try {
        accounts.register('a', 'a@example.test', 'RefundTester');
        db.prepare("INSERT INTO store_orders (id,account,sku,amount,currency,session,status) VALUES ('order','a','sunset-name',499,'usd','cs_test','paid')").run();
        accounts.select('a', 'sunset-name');
        const request: typeof fetch = async () => new Response(JSON.stringify({ livemode: false, metadata: { order_id: 'order' } }));
        const commerce = new Commerce(accounts, env, request), now = 1800000000000, stamp = String(now / 1000);
        const deliver = async (event: object) => {
            const raw = Buffer.from(JSON.stringify(event));
            const sig = `t=${stamp},v1=${createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(stamp + '.').update(raw).digest('hex')}`;
            await commerce.webhook(raw, sig, now);
        };
        await deliver({ id: 'refund', livemode: false, type: 'charge.refunded', data: { object: { amount: 499, amount_refunded: 499, payment_intent: 'pi_test' } } });
        assert.deepEqual(accounts.owned('a'), []); assert.equal(accounts.byId('a')?.selected, '');
        await deliver({ id: 'late-completion', livemode: false, type: 'checkout.session.completed', data: { object: { id: 'cs_test', amount_total: 499, currency: 'usd', payment_status: 'paid', mode: 'payment', metadata: { order_id: 'order' } } } });
        assert.deepEqual(accounts.owned('a'), []);
        db.prepare("UPDATE store_orders SET status='paid' WHERE id='order'").run(); accounts.select('a', 'sunset-name');
        await deliver({ id: 'dispute', livemode: false, type: 'charge.dispute.created', data: { object: { payment_intent: 'pi_test' } } });
        assert.deepEqual(accounts.owned('a'), []);
        const live = { ...env, STORE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_fixture' };
        assert.equal(new Commerce(accounts, live).checkoutEnabled, false);
        assert.equal(new Commerce(accounts, { ...live, STORE_LIVE_ENABLED: '1', STORE_SUPPORT_EMAIL: 'support@example.test', STORE_TERMS_URL: 'https://scape.test/terms', STORE_PRIVACY_URL: 'https://scape.test/privacy' }).checkoutEnabled, true);
        assert.equal(new Commerce(accounts, { ...env, STORE_CHANNEL: 'steam' }).checkoutEnabled, false);
        assert.throws(() => new Commerce(accounts, { APP_ENV: 'production' }));
    } finally { db.close(); }
});

test('HTTP email verification sets an HttpOnly session; CSRF, forged codes, private-field disclosure and unowned cosmetics fail', async () => {
    const { db, accounts } = fixture();
    const provider: typeof fetch = async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (body.token !== '123456') return new Response('{}', { status: 400 });
        return new Response(JSON.stringify({ user: { id: 'provider-user', email: 'player@example.test', email_confirmed_at: '2026-10-17' } }));
    };
    const commerce = new Commerce(accounts, { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_ANON_KEY: 'test' }, provider);
    let ensured = '';
    const controller = new AccountHttp(commerce, () => true, token => token === 'legacy-key', async a => { ensured = a.character; }, () => {});
    const server = createServer((req, res) => { void controller.handle(req, res, req.url!); });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as import('node:net').AddressInfo).port, base = `http://127.0.0.1:${port}`;
    const post = (path: string, body: object, cookie = '', origin = base) => fetch(base + path, { method: 'POST',
        headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    try {
        const body = { email: 'player@example.test', code: '123456', name: 'ChosenName', legacyToken: 'legacy-key' };
        assert.equal((await post('/api/account/verify', body, '', 'https://evil.test')).status, 403);
        assert.equal((await post('/api/account/verify', { ...body, code: '999999' })).status, 400);
        const login = await post('/api/account/verify', body); assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie')!;
        assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.equal(ensured, 'legacy-key');
        const state = await (await fetch(base + '/api/account', { headers: { Cookie: cookie.split(';')[0] } })).json();
        assert.equal(state.account.name, 'ChosenName');
        assert.ok(!JSON.stringify(state).includes('player@example.test'));
        assert.ok(!JSON.stringify(state).includes('legacy-key'));
        assert.equal((await post('/api/store/select', { sku: 'sunset-name' }, cookie.split(';')[0])).status, 400);
        assert.equal((await post('/api/store/select', { sku: '' })).status, 401);
        await post('/api/account/logout', {}, cookie.split(';')[0]);
        assert.equal(accounts.resolve(cookie.split(';')[0].split('=')[1]), undefined);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); db.close(); }
});
