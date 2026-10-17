// Disposable CI world only. Keep the generated bearer key in ignored artifacts/.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import WebSocket from 'ws';

const mode = process.argv[2];
assert.ok(['create', 'resume'].includes(mode), 'Expected create or resume');
const file = new URL('../artifacts/container-identity.json', import.meta.url);
const expected = mode === 'resume' ? JSON.parse(await readFile(file, 'utf8')) : undefined;
const base = process.env.GAME_URL ?? 'http://127.0.0.1:3080';
const ws = new WebSocket(base.replace(/^http/, 'ws') + '/live', { origin: process.env.GAME_ORIGIN ?? new URL(base).origin });
try {
    const identity = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(Error('Container identity check timed out')), 10000);
        let welcome;
        const fail = error => { clearTimeout(timeout); reject(error); };
        ws.on('error', fail);
        ws.on('close', () => fail(Error('Socket closed before identity verification')));
        ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name: 'Container recovery', token: expected?.token })));
        ws.on('message', raw => {
            try {
                const message = JSON.parse(raw);
                if (message.type === 'welcome') welcome = message;
                if (message.type !== 'state' || !welcome) return;
                const player = message.players.find(p => p.id === welcome.id);
                if (!player) return;
                if (expected) {
                    assert.equal(welcome.token, expected.token);
                    assert.equal(player.publicId, expected.publicId, 'Container restart must retain the same saved character');
                }
                clearTimeout(timeout);
                resolve({ token: welcome.token, publicId: player.publicId });
            } catch (error) { fail(error); }
        });
    });
    if (!expected) {
        await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
        await writeFile(file, JSON.stringify(identity), { mode: 0o600 });
    }
    console.log(`PASS: container character ${expected ? 'resumed from persistent storage' : 'created for restart verification'}.`);
} finally { ws.close(); }
