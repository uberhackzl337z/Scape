import type { IncomingMessage, ServerResponse } from 'node:http';
import { Commerce } from './commerce.js';
import type { Account } from './accounts.js';
import { PRODUCTS } from './shared/shop.js';
import { validOrigin } from './server-config.js';

export function sessionCookie(req: IncomingMessage) {
    return /(?:^|;\s*)scape_session=([\w-]{43})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
}
export async function readBody(req: IncomingMessage, maximum = 8192) {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > maximum) throw new Error('Request too large.'); chunks.push(Buffer.from(chunk)); }
    return Buffer.concat(chunks);
}
export class AccountHttp {
    constructor(readonly commerce: Commerce, readonly healthy: () => boolean,
        readonly linkable: (token: string) => boolean, readonly ensureCharacter: (account: Account) => Promise<void>,
        readonly disconnect: (character: string) => void, readonly safeToLeave: (character: string) => boolean = () => true) { }
    async handle(req: IncomingMessage, res: ServerResponse, path: string) {
        if (!path.startsWith('/api/account') && !path.startsWith('/api/store/')) return false;
        const { accounts, env } = this.commerce;
        const reply = (status: number, data: object) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
        const cookie = sessionCookie(req), account = accounts?.resolve(cookie);
        try {
            if (req.method === 'GET' && path === '/api/account') {
                reply(200, { enabled: this.commerce.authEnabled, required: this.commerce.authRequired,
                    account: account ? { name: account.name } : null,
                    store: { enabled: this.commerce.checkoutEnabled, mode: this.commerce.mode, products: PRODUCTS,
                        terms: env.STORE_TERMS_URL ?? '', privacy: env.STORE_PRIVACY_URL ?? '', support: env.STORE_SUPPORT_EMAIL ?? '',
                        owned: account ? accounts!.owned(account.id) : [], selected: account?.selected ?? '' } });
                return true;
            }
            if (req.method !== 'POST') { reply(405, { error: 'Method not allowed.' }); return true; }
            if (!this.healthy()) { reply(503, { error: 'World storage is unavailable. Please retry shortly.' }); return true; }
            if (path === '/api/store/webhook') {
                await this.commerce.webhook(await readBody(req, 262144), String(req.headers['stripe-signature'] ?? ''));
                reply(200, { received: true }); return true;
            }
            if (!validOrigin(req.headers.origin, req.headers.host, env.PUBLIC_ORIGIN)) { reply(403, { error: 'Request origin rejected.' }); return true; }
            if (!this.commerce.authEnabled) throw new Error('Email sign-in is not available yet.');
            // Use the socket address, not spoofable X-Forwarded-For headers. Gateway-wide limits are deliberately conservative.
            accounts!.limit('http:' + req.socket.remoteAddress, 60, 60000);
            const body = JSON.parse((await readBody(req)).toString('utf8'));
            if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request.');
            if (path === '/api/account/code') {
                await this.commerce.code(body.email, body.captcha);
                reply(200, { message: 'Check your email for a sign-in code.' });
            } else if (path === '/api/account/verify') {
                const identity = await this.commerce.verify(body.email, body.code);
                let user = accounts!.byId(identity.id);
                if (!user) {
                    const legacy = typeof body.legacyToken === 'string' ? body.legacyToken : '';
                    if (legacy && !this.linkable(legacy)) throw new Error('This character cannot be linked now. Bank your haul, close its other game sessions, then request a new code.');
                    user = accounts!.register(identity.id, identity.email, body.name, legacy || undefined);
                }
                await this.ensureCharacter(user);
                const token = accounts!.session(user.id);
                res.setHeader('Set-Cookie', `scape_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${env.PUBLIC_ORIGIN?.startsWith('https:') ? '; Secure' : ''}`);
                reply(200, { name: user.name });
            } else if (path === '/api/account/logout') {
                if (account) this.disconnect(account.character);
                accounts!.logout(cookie);
                res.setHeader('Set-Cookie', 'scape_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
                reply(200, { signedOut: true });
            } else if (!account) { reply(401, { error: 'Sign in with your email first.' }); }
            else if (path === '/api/store/checkout') {
                if (!this.safeToLeave(account.character)) throw new Error('Bank your haul and leave any duel before opening checkout.');
                accounts!.limit('checkout:' + account.id, 4, 60000);
                reply(200, { url: await this.commerce.checkout(account, body.sku) });
            } else if (path === '/api/store/select') {
                if (typeof body.sku !== 'string' || body.sku && !PRODUCTS.some(p => p.id === body.sku)) throw new Error('Unknown appearance.');
                accounts!.select(account.id, body.sku); reply(200, { selected: body.sku });
            } else reply(404, { error: 'Not found.' });
        } catch (error) {
            // Provider messages, emails, codes, cookie values and webhook bodies never enter logs or error responses.
            const message = error instanceof Error ? error.message : 'Request failed.';
            reply(400, { error: /^(Choose|That name|Enter|Too many|Email sign-in|The verification|Unable to send|Email verification|This character|Checkout|This appearance|Unknown appearance|Sign in|Bank your)/.test(message) ? message : 'Request could not be completed.' });
        }
        return true;
    }
}
