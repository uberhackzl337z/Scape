import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the compiled production connect() callback wiring with controlled
// browser events and timers. No real network, player world or wall-clock race.
function browser() {
    const source = readFileSync(new URL('../client/main.js', import.meta.url), 'utf8');
    const start = source.indexOf('function connect() {');
    const end = source.indexOf("$('join-form').addEventListener", start);
    assert.ok(start >= 0 && end > start, 'production connect() extraction boundary');
    const sockets: Socket[] = [], timers: (() => void)[] = [], statuses: string[] = [];
    class Socket {
        listeners = new Map<string, ((event: unknown) => void)[]>();
        sent: string[] = [];
        constructor(_url: string) { sockets.push(this); }
        addEventListener(type: string, listener: (event: unknown) => void) {
            this.listeners.set(type, [...this.listeners.get(type) ?? [], listener]);
        }
        send(data: string) { this.sent.push(data); }
        fire(type: string, data?: unknown) { for (const listener of this.listeners.get(type) ?? []) listener({ data: JSON.stringify(data) }); }
    }
    const context = {
        WebSocket: Socket, location: { protocol: 'http:', host: 'disposable.test' },
        status: (label: string) => statuses.push(label), toast: () => {},
        setTimeout: (callback: () => void) => timers.push(callback),
        $: () => ({ value: '', classList: { remove() {} } }), store: () => 'disposable-identity',
    };
    const api = runInNewContext(`
        let socket, entered = true, joinRejected = false, hasJoined = true;
        const keys = new Set(['KeyW']); let mouseAttack = true, target = { x: 1, y: 2 };
        ${source.slice(start, end)}
        ({ connect, state: () => ({ entered, hasJoined, keyCount: keys.size, mouseAttack, target }) });
    `, context) as { connect(): void; state(): { entered: boolean; hasJoined: boolean; keyCount: number; mouseAttack: boolean; target: unknown } };
    return { ...api, sockets, timers, statuses };
}

test('superseded socket events cannot join, reject identity, or clear the active connection controls', () => {
    const b = browser(); b.connect(); const old = b.sockets[0];
    b.connect(); const current = b.sockets[1];
    old.fire('open');
    assert.equal(old.sent.length + current.sent.length, 0, 'late open must not send a join to either socket');
    const statuses = b.statuses.length;
    old.fire('message', { type: 'joinError', message: 'late rejection' });
    old.fire('close'); old.fire('error');
    assert.equal(b.state().entered, true);
    assert.equal(b.state().hasJoined, true);
    assert.equal(b.state().keyCount, 1);
    assert.equal(b.state().mouseAttack, true);
    assert.ok(b.state().target);
    assert.equal(b.statuses.length, statuses);
    assert.equal(b.timers.length, 0);
    current.fire('open');
    assert.equal(current.sent.length, 1);
    assert.equal(JSON.parse(current.sent[0]).token, 'disposable-identity');
    current.fire('close');
    assert.equal(b.state().keyCount, 0);
    assert.equal(b.state().mouseAttack, false);
    assert.equal(b.state().target, undefined);
    assert.equal(b.timers.length, 1, 'current close still reconnects and releases input');
});

test('a queued reconnect from an old connection cannot replace a newer manual connection', () => {
    const b = browser(); b.connect(); b.sockets[0].fire('close');
    assert.equal(b.timers.length, 1);
    b.connect(); b.sockets[1].fire('open');
    b.timers[0]();
    assert.equal(b.sockets.length, 2, 'stale retry must not start a third socket');
    b.sockets[1].fire('close');
    b.timers[1]();
    assert.equal(b.sockets.length, 3, 'current retry still works');
});
