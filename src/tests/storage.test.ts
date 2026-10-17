import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { WorldStore } from '../storage.js';
import { serverConfig, validOrigin } from '../server-config.js';
test('SQLite atomically commits a shared world and reopens it without replacing it from stale JSON', async () => {
    await mkdir('artifacts', { recursive: true });
    const dir = await mkdtemp(resolve('artifacts/sqlite-test-'));
    const old = { version: 4, profiles: {}, marketListings: [], escrows: [] };
    await writeFile(join(dir, 'profiles.json'), JSON.stringify(old));
    const store = new WorldStore(dir, 'sqlite', 'crossing');
    assert.deepEqual(await store.open(), old);
    const duplicate = new WorldStore(dir, 'sqlite', 'crossing');
    await assert.rejects(() => duplicate.open(), /already owns/);
    duplicate.close();
    const current = { ...old, version: 5, profiles: { a: { coins: 70 } }, escrows: [{ wager: 10 }] };
    await store.write(JSON.stringify(current));
    store.close();
    await writeFile(join(dir, 'profiles.json'), 'not a valid old save');
    const again = new WorldStore(dir, 'sqlite', 'crossing');
    assert.deepEqual(await again.open(), current);
    again.close();
    const wrong = new WorldStore(dir, 'sqlite', 'other');
    await assert.rejects(() => wrong.open(), /different WORLD_ID/);
    wrong.close();
});
test('JSON import corruption fails before accepting a new world or silently resetting progress', async () => {
    const dir = await mkdtemp(resolve('artifacts/corrupt-store-'));
    await writeFile(join(dir, 'profiles.json'), '{');
    const store = new WorldStore(dir, 'sqlite', 'crossing');
    await assert.rejects(() => store.open());
    store.close();
});
test('production requires secure explicit origin, durable storage and bounded configuration', () => {
    assert.throws(() => serverConfig({ APP_ENV: 'production' }));
    assert.throws(() => serverConfig({ APP_ENV: 'production', PUBLIC_ORIGIN: 'http://game.example' }));
    assert.throws(() => serverConfig({ APP_ENV: 'production', PUBLIC_ORIGIN: 'https://game.example', STORAGE: 'json' }));
    const c = serverConfig({ APP_ENV: 'production', PUBLIC_ORIGIN: 'https://game.example' });
    assert.equal(c.storage, 'sqlite');
    assert.equal(c.capacity, 16);
    assert.ok(validOrigin('https://game.example', 'internal:3000', c.origin));
    assert.equal(validOrigin('https://game.example.attacker.test', 'internal:3000', c.origin), false);
    assert.equal(validOrigin('null', 'localhost:3000'), false);
    assert.equal(validOrigin('http://localhost:3000', 'localhost:3000'), true);
    for (const value of ['0', '-1', '201', 'NaN'])
        assert.throws(() => serverConfig({ MAX_PLAYERS: value }));
});
