import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { WorldStore } from './storage.js';
import { serverConfig, validOrigin } from './server-config.js';
import { SHOP } from './shared/shop.js';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { World, createPlayer, cleanInput, profileOf, type Profile } from './shared/world.js';
import { recoverState, type SaveState, type EscrowRecord } from './persistence.js';
import { buildLeaderboards, queryScores } from './shared/leaderboards.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const config = serverConfig(process.env);
const world = new World();
const profiles = new Map<string, Profile>();
world.savedProfiles = profiles;
const tokens = new Map<string, string>();
const clients = new Map<WebSocket, string>();
const responsiveSockets = new Set<WebSocket>();
const storage = new WorldStore(resolve(process.env.DATA_DIR ?? resolve(root, 'data')), config.storage, config.worldId);
let storageHealthy = true;
try {
    const saved = await storage.open();
    const recovered = saved === undefined ? { profiles: new Map<string, Profile>(), marketListings: [], refunded: 0 } : recoverState(saved);
    const publicIds = new Set<string>();
    for (const [token, profile] of recovered.profiles) {
        if (!profile.publicId || publicIds.has(profile.publicId))
            profile.publicId = randomUUID();
        publicIds.add(profile.publicId);
        profiles.set(token, profile);
    }
    world.market.listings = recovered.marketListings;
    if (recovered.refunded)
        console.log(`Refunded ${recovered.refunded} interrupted duel wager(s).`);
}
catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error('Could not load saved profiles; the existing save has been left untouched.', { cause: error });
}
function capture() {
    for (const [id, token] of tokens) {
        const p = world.players.get(id);
        if (p)
            profiles.set(token, profileOf(p));
    }
}
let saving = Promise.resolve();
let savedEconomyRevision = -1;
function save() {
    capture();
    const escrows: EscrowRecord[] = world.dueling.matches.filter(d => d.phase !== 'finished').map(d => ({ id: d.id, tokens: [tokens.get(d.players[0])!, tokens.get(d.players[1])!], wager: d.wager }));
    const snapshot: SaveState = { version: 5, profiles: Object.fromEntries(profiles), escrows, marketListings: world.market.listings };
    const data = JSON.stringify(snapshot);
    savedEconomyRevision = world.economyRevision;
    saving = saving.then(async () => { await storage.write(data); storageHealthy = true; }).catch(e => { storageHealthy = false; savedEconomyRevision = -1; console.error('Save failed; world paused until storage recovers:', e); });
    return saving;
}
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
    if (req.method !== 'GET') {
        res.writeHead(405);
        res.end();
        return;
    }
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (pathname === '/health') {
        res.writeHead(storageHealthy ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: storageHealthy, players: world.players.size }));
        return;
    }
    if (pathname === '/api/world' || pathname === '/api/shop') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(pathname === '/api/shop' ? SHOP : { id: config.worldId, name: config.worldName,
            online: world.players.size, capacity: config.capacity, shared: true, purchasesEnabled: false }));
        return;
    }
    let base = resolve(root, 'public');
    let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (pathname.startsWith('/game/')) {
        base = resolve(root, 'dist/client');
        relative = pathname.slice(6);
    }
    else if (pathname.startsWith('/shared/')) {
        base = resolve(root, 'dist/shared');
        relative = pathname.slice(8);
    }
    try {
        const file = resolve(base, decodeURIComponent(relative));
        if (!file.startsWith(base + sep) || !mime[extname(file)]) {
            res.writeHead(404);
            res.end();
            return;
        }
        const data = await readFile(file);
        res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'" });
        res.end(data);
    }
    catch {
        res.writeHead(404);
        res.end('Not found');
    }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
server.on('upgrade', (req, socket, head) => {
    const origin = req.headers.origin;
    if (req.url !== '/live' || !validOrigin(origin, req.headers.host, config.origin) || wss.clients.size >= config.capacity) {
        socket.destroy();
        return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
wss.on('connection', ws => {
    responsiveSockets.add(ws);
    ws.on('pong', () => { responsiveSockets.add(ws); });
    let joined = false;
    let messages = 0;
    let scoreRequests = 0;
    let windowAt = Date.now();
    const timer = setTimeout(() => {
        if (!joined)
            ws.close(1008, 'Join required');
    }, 5000);
    ws.on('message', raw => {
        const now = Date.now();
        if (now - windowAt > 1000) {
            windowAt = now;
            messages = 0;
            scoreRequests = 0;
        }
        if (++messages > 65) {
            ws.close(1008, 'Too many inputs');
            return;
        }
        try {
            const message = JSON.parse(raw.toString());
            if (!storageHealthy) {
                ws.send(JSON.stringify({ type: 'notice', message: 'World paused: storage unavailable. Progress is protected; retry shortly.' }));
                return;
            }
            if (message.type === 'join' && !joined) {
                const supplied = typeof message.token === 'string' ? message.token : '';
                if (supplied && !profiles.has(supplied)) {
                    ws.send(JSON.stringify({ type: 'joinError', message: 'Access key not recognized by this world. Check the key or clear it to start a new character.' }));
                    ws.close(1008, 'Unknown access key');
                    return;
                }
                const token = supplied || randomBytes(32).toString('base64url');
                if ([...tokens.values()].includes(token)) {
                    ws.send(JSON.stringify({ type: 'joinError', message: 'This character is already online. Close its other session before resuming.' }));
                    ws.close(1008, 'Character already online');
                    return;
                }
                const id = randomUUID();
                const saved = profiles.get(token);
                const p = createPlayer(id, saved);
                p.name = (typeof message.name === 'string' ? message.name : 'Wanderer').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 16) || 'Wanderer';
                world.players.set(id, p);
                tokens.set(id, token);
                clients.set(ws, id);
                joined = true;
                clearTimeout(timer);
                profiles.set(token, profileOf(p));
                world.leaderboards = buildLeaderboards(profiles.values(), world.players.values());
                ws.send(JSON.stringify({ type: 'welcome', id, token, world: { id: config.worldId, name: config.worldName } }));
                ws.send(JSON.stringify({ type: 'state', ...world.snapshot(now) }));
            }
            else if (message.type === 'scores' && joined) {
                const p = world.players.get(clients.get(ws)!);
                if (p && ++scoreRequests <= 5)
                    ws.send(JSON.stringify({ type: 'scores', ...queryScores(profiles.values(), world.players.values(), p.publicId, message) }));
            }
            else if (message.type === 'equipment' && joined) {
                world.equip(clients.get(ws)!, message, now);
                if (savedEconomyRevision !== world.economyRevision)
                    void save();
            }
            else if (message.type === 'ability' && joined) {
                world.ability(clients.get(ws)!, now, cleanInput(message).aim);
                if (savedEconomyRevision !== world.economyRevision)
                    void save();
            }
            else if (message.type === 'craft' && joined) {
                world.craft(clients.get(ws)!, message, now);
                if (savedEconomyRevision !== world.economyRevision)
                    void save();
            }
            else if (message.type === 'restore' && joined) {
                world.restore(clients.get(ws)!, now);
                if (savedEconomyRevision !== world.economyRevision)
                    void save();
            }
            else if (message.type === 'market' && joined) {
                world.market.handle(clients.get(ws)!, message, now);
                if (savedEconomyRevision !== world.economyRevision)
                    void save();
            }
            else if (message.type === 'supply' && joined) {
                world.useSupply(clients.get(ws)!, message.item, now);
                if (savedEconomyRevision !== world.economyRevision)
                    void save();
            }
            else if (message.type === 'duel' && joined) {
                world.dueling.handle(clients.get(ws)!, message, now);
                if (savedEconomyRevision !== world.economyRevision)
                    void save();
            }
            else if (message.type === 'input' && joined) {
                world.receiveInput(clients.get(ws)!, message, now);
            }
        }
        catch {
            ws.close(1008, 'Invalid message');
        }
    });
    ws.on('close', () => {
        responsiveSockets.delete(ws);
        clearTimeout(timer);
        const id = clients.get(ws);
        if (id) {
            const p = world.players.get(id);
            if (p) {
                const wasDuelling = !!p.duelId;
                world.dueling.disconnect(id, Date.now());
                if (!wasDuelling)
                    world.drop(p, Date.now());
                capture();
                if (wasDuelling) {
                    const profile = profiles.get(tokens.get(id)!);
                    if (profile)
                        profile.duelBag = { ...p.bag };
                }
            }
            world.players.delete(id);
            tokens.delete(id);
            clients.delete(ws);
            void save();
        }
    });
    ws.on('error', () => { });
});
const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
        if (ws.readyState !== WebSocket.OPEN)
            continue;
        if (!responsiveSockets.has(ws)) {
            ws.terminate();
            continue;
        }
        responsiveSockets.delete(ws);
        ws.ping();
    }
}, 30000);
let last = Date.now();
let step = 0;
const loop = setInterval(() => {
    const now = Date.now();
    if (storageHealthy)
        world.tick(Math.min(.1, (now - last) / 1000), now);
    last = now;
    if (step % 20 === 0)
        world.leaderboards = buildLeaderboards(profiles.values(), world.players.values());
    if (storageHealthy && savedEconomyRevision !== world.economyRevision)
        void save();
    if (++step % 2 === 0) {
        const data = JSON.stringify({ type: 'state', ...world.snapshot(now) });
        for (const ws of clients.keys())
            if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 128000)
                ws.send(data);
    }
}, 50);
const saves = setInterval(() => void save(), 10000);
const { host, port } = config;
await save();
if (!storageHealthy)
    throw new Error('World storage unavailable; refusing to start.');
server.listen(port, host, () => console.log(`CodyScape is ready: http://${host}:${port}`));
async function stop() {
    clearInterval(loop);
    clearInterval(saves);
    clearInterval(heartbeat);
    world.dueling.cancelAll(Date.now());
    await save();
    for (const ws of wss.clients)
        ws.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
