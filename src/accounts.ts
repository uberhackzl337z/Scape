import { randomBytes, createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
export type Account = { id: string; name: string; character: string; selected: string };
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function accountName(value: unknown) {
    if (typeof value !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{2,15}$/.test(value) || /^(admin|moderator|support|system|scape)$/i.test(value)) throw new Error('Choose 3–16 letters, numbers or underscores, starting with a letter. That name may be reserved.');
    return value;
}
export function emailAddress(value: unknown) {
    if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new Error('Enter a valid email address.');
    return value.trim().toLowerCase();
}
export class Accounts {
    constructor(readonly db: DatabaseSync) {
        db.exec(`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, name_key TEXT UNIQUE NOT NULL, character TEXT UNIQUE NOT NULL, selected TEXT NOT NULL DEFAULT '');
          CREATE TABLE IF NOT EXISTS account_sessions (hash TEXT PRIMARY KEY, account TEXT NOT NULL, expires INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS account_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS store_orders (id TEXT PRIMARY KEY, account TEXT NOT NULL, sku TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL, session TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'pending');
          CREATE TABLE IF NOT EXISTS store_events (id TEXT PRIMARY KEY);`);
        const columns = db.prepare('PRAGMA table_info(store_orders)').all().map(c => c.name);
        if (!columns.includes('url')) db.exec('ALTER TABLE store_orders ADD COLUMN url TEXT');
        if (!columns.includes('expires')) db.exec('ALTER TABLE store_orders ADD COLUMN expires INTEGER NOT NULL DEFAULT 0');
    }
    byId(id: string): Account | undefined { return this.db.prepare('SELECT id,name,character,selected FROM accounts WHERE id=?').get(id) as Account | undefined; }
    bound(character: string) { return !!this.db.prepare('SELECT id FROM accounts WHERE character=?').get(character); }
    register(id: string, email: string, name: unknown, character?: string) {
        const existing = this.byId(id); if (existing) return existing;
        const chosen = accountName(name);
        if (this.db.prepare('SELECT id FROM accounts WHERE name_key=? OR email=? OR character=?').get(chosen.toLowerCase(), email, character ?? '')) throw new Error('That name or character is already linked. Choose another name or sign in to its existing account.');
        this.db.prepare('INSERT INTO accounts (id,email,name,name_key,character) VALUES (?,?,?,?,?)').run(id, email, chosen, chosen.toLowerCase(), character ?? randomBytes(32).toString('base64url'));
        return this.byId(id)!;
    }
    session(id: string, now = Date.now()) {
        const token = randomBytes(32).toString('base64url');
        this.db.prepare('DELETE FROM account_sessions WHERE expires<=?').run(now);
        this.db.prepare('INSERT INTO account_sessions VALUES (?,?,?)').run(hash(token), id, now + 7 * 86400000); return token;
    }
    resolve(token: string, now = Date.now()) {
        if (!/^[\w-]{43}$/.test(token)) return undefined;
        const row = this.db.prepare('SELECT account FROM account_sessions WHERE hash=? AND expires>?').get(hash(token), now);
        return row ? this.byId(String(row.account)) : undefined;
    }
    logout(token: string) { this.db.prepare('DELETE FROM account_sessions WHERE hash=?').run(hash(token)); }
    limit(key: string, maximum: number, period: number, now = Date.now()) {
        this.db.prepare('DELETE FROM account_limits WHERE expires<=?').run(now);
        const digest = hash(key);
        this.db.prepare('INSERT INTO account_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(digest, now + period);
        if (Number(this.db.prepare('SELECT count FROM account_limits WHERE key=?').get(digest)!.count) > maximum) throw new Error('Too many attempts. Please wait before trying again.');
    }
    owned(id: string) { return this.db.prepare("SELECT DISTINCT sku FROM store_orders WHERE account=? AND status='paid'").all(id).map(row => String(row.sku)); }
    select(id: string, sku: string) {
        if (sku && !this.owned(id).includes(sku)) throw new Error('This appearance is not owned.');
        this.db.prepare('UPDATE accounts SET selected=? WHERE id=?').run(sku, id);
    }
    fulfill(event: string, orderId: string, session: string, amount: number, currency: string) {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const order = this.db.prepare('SELECT * FROM store_orders WHERE id=?').get(orderId);
            if (!order || order.session !== session || order.amount !== amount || order.currency !== currency) throw new Error('Payment does not match the stored order.');
            if (!this.db.prepare('SELECT id FROM store_events WHERE id=?').get(event)) {
                this.db.prepare('INSERT INTO store_events VALUES (?)').run(event);
                this.db.prepare("UPDATE store_orders SET status='paid' WHERE id=? AND status IN ('pending','expired')").run(orderId);
            }
            this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    }
    revoke(event: string, orderId: string) {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const order = this.db.prepare('SELECT account,sku FROM store_orders WHERE id=?').get(orderId);
            if (!order) throw new Error('Unknown payment order.');
            if (!this.db.prepare('SELECT id FROM store_events WHERE id=?').get(event)) {
                this.db.prepare('INSERT INTO store_events VALUES (?)').run(event);
                this.db.prepare("UPDATE store_orders SET status='revoked' WHERE id=?").run(orderId);
                if (!this.owned(String(order.account)).includes(String(order.sku))) this.db.prepare('UPDATE accounts SET selected=\'\' WHERE id=? AND selected=?').run(order.account, order.sku);
            }
            this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    }
}
