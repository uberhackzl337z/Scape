import { CONTRACTS, complete, unlocked } from '../shared/contracts.js';
import { ABILITIES } from '../shared/combat.js';
import { gearStats } from '../shared/equipment.js';
import { paintBiomes, biomeAt } from './terrain-view.js';
import { ElementView } from './element-view.js';
import { MAP, World, WEAPONS, ENEMIES, bestWeapon, inBossArena, count, haulXp, distance, zone, level, xpForLevel, type WeaponId, type Snapshot, type Input, type Node, type Raider } from '../shared/world.js';
import { RESOURCES, RESOURCE_IDS, weaponSkill, skillXp } from '../shared/skills.js';
import { ActorMotion } from './actor-motion.js';
import { GatherView, gatherPose } from './gather-view.js';
import { CombatView } from './combat-view.js';
import { DuelView } from './duel-view.js';
import { DUEL_RULES } from '../shared/duels.js';
import { TownView } from './town-view.js';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('world');
const ctx = canvas.getContext('2d')!;
const combatView = new CombatView(ctx);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const gatherView = new GatherView(ctx, reducedMotion.matches);
reducedMotion.addEventListener('change', event => { gatherView.reducedMotion = event.matches; });
const elementView = new ElementView(ctx);
let mouseAttack = false;
let mousePoint: {
    x: number;
    y: number;
} | undefined;
let joinRejected = false;
let worldName = 'Scape';
let selectedWeapon: WeaponId | undefined;
const mini = $<HTMLCanvasElement>('minimap');
const mctx = mini.getContext('2d')!;
const guide = $<HTMLDialogElement>('guide');
const menu = $('menu');
let snapshot: Snapshot = new World().snapshot(Date.now());
let selfId = '';
let socket: WebSocket | undefined;
let entered = false;
let hasJoined = false;
let width = 0, height = 0, dpr = 1;
let now = Date.now();
let snapshotAt = performance.now(), gatherNow = now;
let camera = { x: 800, y: 550 };
let zoom = .9;
let toastUntil = 0;
let lastMessage = 0;
let lastBag = '';
let journal = '';
let lastFrame = performance.now();
const keys = new Set<string>();
let target: {
    x: number;
    y: number;
} | undefined;
const motion = new ActorMotion();
const smoothed = motion.positions;
let vignette: CanvasGradient;
const me = () => snapshot.players.find(p => p.id === selfId);
const dialogOpen = () => !!document.querySelector('dialog[open]');
const townView = new TownView(message => {
    selectedWeapon = undefined;
    if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(message));
}, () => { keys.clear(); mouseAttack = false; target = undefined; guide.close(); }, () => canvas.focus());
const contractDialog = $<HTMLDialogElement>('contracts');
let contractKey = '';
function openContracts() {
    if (!entered || dialogOpen())
        return;
    keys.clear();
    mouseAttack = false;
    target = undefined;
    contractDialog.showModal();
}
$('open-contracts').addEventListener('click', openContracts);
$('close-contracts').addEventListener('click', () => contractDialog.close());
contractDialog.addEventListener('close', () => canvas.focus());
function updateContracts() {
    const p = me();
    if (!p)
        return;
    const canClaim = p.hp > 0 && !p.duelId && zone(p) === 'bank';
    text('contract-access', canClaim ? 'Bank reward desk open. Ready rewards can be claimed below.' : 'Return alive to the bank, outside a duel, to claim rewards.');
    const key = JSON.stringify([p.contracts, canClaim]);
    if (key === contractKey)
        return;
    contractKey = key;
    $('contract-list').replaceChildren(...CONTRACTS.map((c, index) => {
        const card = document.createElement('section');
        card.className = 'contract-card';
        const heading = document.createElement('h3');
        heading.textContent = `${index + 1}. ${c.name}`;
        const hint = document.createElement('p');
        hint.textContent = c.hint;
        const list = document.createElement('ul');
        for (const [i, o] of c.objectives.entries()) {
            const li = document.createElement('li');
            li.textContent = `${o.label}: ${p.contracts.progress[c.id]?.[i] ?? 0} / ${o.target}`;
            list.append(li);
        }
        const button = document.createElement('button');
        const claimed = p.contracts.claimed.includes(c.id), locked = !unlocked(p.contracts, index), ready = complete(p.contracts, c.id);
        button.textContent = claimed ? `Earned ${c.reward} coins · claimed` : locked ? `Locked · claim previous contract first · ${c.reward} coins` : ready ? `Claim ${c.reward} coins` : `In progress · reward ${c.reward} coins`;
        button.disabled = claimed || locked || !ready || !canClaim;
        button.addEventListener('click', () => {
            if (socket?.readyState === WebSocket.OPEN)
                socket.send(JSON.stringify({ type: 'contract', contract: c.id }));
        });
        card.append(heading, hint, list, button);
        return card;
    }));
}
let lastDuelId = '';
const duelView = new DuelView(message => {
    if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: 'duel', ...message }));
});
const slots = $('bag-slots');
for (let i = 0; i < MAP.capacity; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slots.append(slot);
}
function store(key: string, value?: string) {
    try {
        if (value !== undefined) {
            sessionStorage.setItem(key, value);
            localStorage.setItem(key, value);
        }
        return sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? '';
    }
    catch {
        return '';
    }
}
// Preserve browser characters created before the Scape rename.
try {
    for (const storage of [sessionStorage, localStorage]) {
        for (const suffix of ['name', 'token']) {
            const key = 'scape-' + suffix;
            const legacy = storage.getItem('codyscape-' + suffix);
            if (storage.getItem(key) === null && legacy !== null)
                storage.setItem(key, legacy);
        }
    }
}
catch { /* Storage can be unavailable in restricted browser sessions. */ }
$<HTMLInputElement>('name').value = store('scape-name') || 'Wanderer';
function toast(text: string) { $('toast').textContent = text; $('toast').classList.add('visible'); toastUntil = Date.now() + 3000; }
function status(text: string, online: boolean) { $('connection').textContent = text; $('connection-dot').style.backgroundColor = online ? '#98b58a' : '#c4966f'; }
function connect() {
    joinRejected = false;
    status('CONNECTING', false);
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/live`);
    socket.addEventListener('open', () => socket!.send(JSON.stringify({ type: 'join', name: $<HTMLInputElement>('name').value, token: $<HTMLInputElement>('resume-key').value.trim() || store('scape-token') })));
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.type === 'notice')
            toast(message.message);
        if (message.type === 'joinError') {
            joinRejected = true;
            entered = false;
            hasJoined = false;
            menu.classList.remove('hidden');
            $('join-error').textContent = message.message;
        }
        if (message.type === 'scores')
            townView.scores.receive(message);
        if (message.type === 'welcome') {
            selfId = message.id;
            store('scape-token', message.token);
            store('scape-name', $<HTMLInputElement>('name').value);
            menu.classList.add('hidden');
            entered = true;
            hasJoined = true;
            worldName = message.world?.name ?? 'Scape';
            $<HTMLInputElement>('resume-key').value = '';
            status(`${worldName.toUpperCase()} · LIVE`, true);
            canvas.focus();
        }
        if (message.type === 'state') {
            snapshot = message;
            snapshotAt = performance.now();
            if (me()?.weapon === selectedWeapon)
                selectedWeapon = undefined;
            const duelId = me()?.duelId ?? '';
            if (duelId !== lastDuelId) {
                target = undefined;
                keys.clear();
                lastDuelId = duelId;
            }
            combatView.consume(snapshot);
            updateHud();
        }
    });
    socket.addEventListener('close', () => {
        status('CONNECTION LOST', false);
        keys.clear();
        mouseAttack = false;
        target = undefined;
        if (entered && !joinRejected) {
            toast('World connection lost. Reconnecting…');
            setTimeout(connect, 1500);
        }
        else {
            if (!joinRejected)
                $('join-error').textContent = 'Could not reach this world. Check your connection and try again.';
            $<HTMLButtonElement>('join-button').disabled = false;
        }
    });
    socket.addEventListener('error', () => status('WORLD UNAVAILABLE', false));
}
$<HTMLFormElement>('join-form').addEventListener('submit', event => {
    event.preventDefault();
    if (socket?.readyState === WebSocket.CONNECTING)
        return;
    $('join-error').textContent = '';
    $<HTMLButtonElement>('join-button').disabled = true;
    connect();
});
function showGuide() {
    keys.clear();
    mouseAttack = false;
    target = undefined;
    if (!guide.open)
        guide.showModal();
}
$('help-button').addEventListener('click', showGuide);
$('close-guide').addEventListener('click', () => { guide.close(); canvas.focus(); });
$('resume').addEventListener('click', () => { guide.close(); canvas.focus(); });
guide.addEventListener('close', () => canvas.focus());
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-weapon]'))
    button.addEventListener('click', () => { const family = button.dataset.weapon; selectedWeapon = family === 'bow' ? 'shortbow' : family === 'staff' ? 'emberStaff' : bestWeapon(me(), family as 'sword' | 'spear' | 'axe'); canvas.focus(); });
$('blood-button').addEventListener('click', () => { combatView.blood = !combatView.blood; text('blood-button', combatView.blood ? 'Blood: on' : 'Blood: off'); });
window.addEventListener('keydown', event => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((event.target as HTMLElement).tagName))
        return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE'].includes(event.code))
        event.preventDefault();
    if (event.code === 'Escape' && entered) {
        if (!dialogOpen()) {
            event.preventDefault();
            showGuide();
        }
        return;
    }
    if (entered && !dialogOpen() && event.code === 'KeyJ') {
        event.preventDefault();
        openContracts();
        return;
    }
    if (entered && !dialogOpen() && ['KeyM', 'KeyL', 'KeyK', 'KeyI'].includes(event.code)) {
        event.preventDefault();
        townView.open(event.code === 'KeyM' ? 'market' : event.code === 'KeyK' ? 'skills' : event.code === 'KeyI' ? 'gear' : 'scores');
        return;
    }
    if (entered && !dialogOpen() && !event.repeat && event.code === 'KeyB') {
        event.preventDefault();
        castAbility();
        return;
    }
    if (entered && !dialogOpen() && !event.repeat && event.code === 'KeyF') {
        if (socket?.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify({ type: 'restore' }));
        return;
    }
    if (entered && !dialogOpen() && !event.repeat && ['KeyQ', 'KeyR', 'KeyT'].includes(event.code)) {
        event.preventDefault();
        townView.use(event.code === 'KeyQ' ? 'tonic' : event.code === 'KeyT' ? 'cookedFish' : 'ration');
        return;
    }
    if (entered && !dialogOpen() && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
        selectedWeapon = bestWeapon(me(), ({ 'Digit1': 'sword', 'Digit2': 'spear', 'Digit3': 'axe' } as const)[event.code as 'Digit1' | 'Digit2' | 'Digit3']);
        event.preventDefault();
    }
    if (entered && !dialogOpen() && ['Digit4', 'Digit5'].includes(event.code)) {
        const id = event.code === 'Digit4' ? 'shortbow' : 'emberStaff';
        if (me()?.items[id])
            selectedWeapon = id;
        else
            toast('Craft or buy this weapon at the bank first.');
        event.preventDefault();
    }
    if (entered && !dialogOpen()) {
        keys.add(event.code);
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code))
            target = undefined;
    }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); mouseAttack = false; target = undefined; });
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        keys.clear();
        mouseAttack = false;
        target = undefined;
    }
});
function aimAngle() {
    const p = me();
    return mousePoint && p ? Math.atan2((mousePoint.y - height / 2) / zoom + camera.y - p.y, (mousePoint.x - width / 2) / zoom + camera.x - p.x) : undefined;
}
function castAbility() {
    if (!entered || dialogOpen() || socket?.readyState !== WebSocket.OPEN)
        return;
    socket.send(JSON.stringify({ type: 'ability', aim: aimAngle() }));
}
$('cast-ability').addEventListener('click', () => { castAbility(); canvas.focus(); });
$('copy-access-key').addEventListener('click', async () => {
    const key = store('scape-token');
    if (!key)
        return;
    try {
        await navigator.clipboard.writeText(key);
        $('access-key-status').textContent = 'Copied. Keep it private; it grants access to your character.';
    }
    catch {
        $('access-key-status').textContent = 'Clipboard access unavailable in this browser.';
    }
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointermove', event => { const box = canvas.getBoundingClientRect(); mousePoint = { x: event.clientX - box.left, y: event.clientY - box.top }; });
canvas.addEventListener('pointerdown', event => {
    if (!entered || dialogOpen())
        return;
    event.preventDefault();
    canvas.focus();
    const box = canvas.getBoundingClientRect();
    mousePoint = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (event.button === 0) {
        mouseAttack = true;
        target = undefined;
        canvas.setPointerCapture(event.pointerId);
        sendInput();
    }
    if (event.button === 2)
        castAbility();
    if (event.button === 1)
        target = { x: Math.max(25, Math.min(MAP.width - 25, (mousePoint.x - width / 2) / zoom + camera.x)), y: Math.max(25, Math.min(MAP.height - 25, (mousePoint.y - height / 2) / zoom + camera.y)) };
});
window.addEventListener('pointerup', event => {
    if (event.button === 0) {
        mouseAttack = false;
        sendInput();
    }
});
canvas.addEventListener('pointercancel', () => { mouseAttack = false; sendInput(); });
function input(): Input {
    if (!entered || dialogOpen() || document.hidden || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName ?? ''))
        return { x: 0, y: 0, interact: false, attack: false, dodge: false };
    let x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    let y = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    const p = me();
    if (target && p) {
        const d = distance(p, target);
        if (d < 9 || p.hp <= 0)
            target = undefined;
        else {
            x = (target.x - p.x) / d;
            y = (target.y - p.y) / d;
        }
    }
    return { x, y, interact: keys.has('KeyE'), attack: mouseAttack || keys.has('Space'), aim: aimAngle(), dodge: keys.has('ShiftLeft') || keys.has('ShiftRight'), weapon: selectedWeapon };
}
function sendInput() {
    if (socket?.readyState === WebSocket.OPEN && hasJoined)
        socket.send(JSON.stringify({ type: 'input', ...input() }));
}
setInterval(sendInput, 50);
function text(id: string, value: string | number) {
    const element = $(id), next = String(value);
    if (element.textContent !== next) element.textContent = next;
}
function updateHud() {
    const p = me();
    if (!p)
        return;
    duelView.update(snapshot, selfId);
    townView.update(snapshot, selfId);
    updateContracts();
    text('player-name', p.name);
    text('player-count', `${snapshot.players.length} online`);
    document.querySelector('.avatar')!.textContent = p.name[0].toUpperCase();
    text('health-value', `${Math.ceil(p.hp)} / 100`);
    $('health-bar').style.width = `${p.hp}%`;
    const area = zone(p);
    text('zone-label', inBossArena(p) ? 'The Warden’s Hollow' : area === 'wild' ? 'The Contested Crossing' : area === 'bank' ? 'The Last Bank' : biomeAt(p.x, p.y));
    text('zone-description', area === 'wild' ? 'Your haul is at risk. Keep moving.' : area === 'bank' ? 'You made it. Secure your haul.' : 'Gather here. Bank your haul to earn XP.');
    text('zone-badge', area === 'wild' ? 'PVP ENABLED' : area === 'bank' ? 'SANCTUARY' : 'SAFE GROUND');
    $('zone-badge').className = `badge ${area === 'wild' ? 'danger' : area === 'bank' ? 'bank' : ''}`;
    text('health-note', area === 'wild' ? 'Space to strike. Shift to dodge red warnings.' : 'Safe ground restores your health.');
    if (p.duelId) {
        text('zone-label', 'The Duel Ring');
        text('zone-description', 'Agreed stakes. No outside interference.');
        text('zone-badge', 'WAGERED DUEL');
        $('zone-badge').className = 'badge bank';
        text('health-note', 'No regeneration. Only your opponent can hit you.');
    }
    text('stamina-value', `${Math.floor(p.stamina)} / 100`);
    $('stamina-bar').style.width = `${p.stamina}%`;
    text('combat-level', `LV. ${level(p.combatXp)}`);
    text('combat-xp', `${p.combatXp} combat XP · ${p.kills} defeats`);
    const cl = level(p.combatXp);
    $('combat-progress').style.width = `${(p.combatXp - xpForLevel(cl)) / (xpForLevel(cl + 1) - xpForLevel(cl)) * 100}%`;
    text('weapon-name', WEAPONS[p.weapon].name);
    const equipped = WEAPONS[p.weapon], bonus = Math.min(6, Math.floor((level(skillXp(p, weaponSkill(equipped.family))) - 1) / 3));
    text('weapon-detail', `${equipped.damage + bonus + gearStats(p).power} damage${bonus ? ` (+${bonus} skill)` : ''} · ${equipped.cooldown / 1000}s between attacks · ${equipped.description}`);
    const primaryRecovery = Math.max(0, p.attackAt - snapshot.time);
    text('basic-status', `LMB · Basic attack · ${p.hp <= 0 ? 'RESPAWNING' : snapshot.time < p.dodgeUntil ? 'DODGING' : primaryRecovery ? (Math.ceil(primaryRecovery / 100) / 10).toFixed(1) + 's' : 'READY'}`);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weapon]')) {
        b.disabled = b.dataset.weapon === 'bow' ? p.items.shortbow < 1 : b.dataset.weapon === 'staff' ? p.items.emberStaff < 1 : false;
        b.classList.toggle('selected', b.dataset.weapon === WEAPONS[p.weapon].family);
        b.setAttribute('aria-pressed', String(b.dataset.weapon === WEAPONS[p.weapon].family));
    }
    const gear = gearStats(p);
    text('gear-summary', `${gear.armor} equipped armor · +${gear.power} power · ${(['fire', 'storm', 'frost'] as const).filter(e => gear.ranks[e]).join(' / ') || 'No elemental passives'}`);
    const secondary = ABILITIES[equipped.family], recovery = Math.max(0, Math.ceil((p.abilityAt - snapshot.time) / 1000));
    const blocked = p.hp <= 0 ? 'RESPAWNING' : recovery ? `${recovery}s recovery` : p.stamina < secondary.stamina ? `Need ${secondary.stamina} stamina` : equipped.family === 'bow' && p.items.arrow < 2 ? 'Need 2 arrows' : equipped.family === 'staff' && p.items.focusRune < 1 ? 'Need 1 focus rune' : 'READY';
    text('ability-status', `${secondary.name} · ${blocked}`);
    $('cast-ability').title = `${secondary.description} · ${secondary.stamina} stamina · ${secondary.cooldown / 1000}s recovery · B alternative`;
    $<HTMLButtonElement>('cast-ability').disabled = p.hp <= 0 || recovery > 0 || p.stamina < secondary.stamina || equipped.family === 'bow' && p.items.arrow < 2 || equipped.family === 'staff' && p.items.focusRune < 1;
    text('dodge-status', p.stamina < 32 - Math.min(6, Math.floor((level(skillXp(p, 'agility')) - 1) / 3)) ? 'LOW STAMINA' : snapshot.time < p.dodgeAt ? 'RECOVERING' : 'DODGE READY');
    const boss = snapshot.raiders.find(r => r.kind === 'boss');
    const nearBoss = !!boss && distance(p, { x: MAP.bossX, y: MAP.bossY }) < 230;
    $('boss-hud').classList.toggle('hidden', !nearBoss);
    if (boss) {
        $('boss-health').style.width = `${boss.hp / ENEMIES.boss.hp * 100}%`;
        text('boss-hp', `${Math.ceil(boss.hp)} / ${ENEMIES.boss.hp}`);
        const warning = snapshot.warnings.find(w => w.source === boss.id);
        text('boss-phase', boss.hp <= 0 ? `Defeated · returns in ${Math.max(1, Math.ceil((boss.respawnAt - snapshot.time) / 1000))}s` : warning ? `${warning.kind === 'fan' ? 'BOLT FAN · SIDESTEP' : 'GROUND SLAM · DODGE'} · ${Math.max(0, (warning.at - snapshot.time) / 1000).toFixed(1)}s` : boss.hp < 325 ? 'ENRAGED · FASTER ATTACKS' : 'WATCH THE WARNING ZONES');
    }
    text('bag-count', `${count(p.bag)} / ${MAP.capacity}`);
    text('wood-count', p.bag.wood);
    text('ore-count', p.bag.ore);
    text('haul-xp', `${haulXp(p.bag)} XP`);
    text('other-count', count(p.bag) - p.bag.wood - p.bag.ore);
    const bagKey = JSON.stringify(p.bag);
    if (bagKey !== lastBag) {
        lastBag = bagKey;
        const gathered = RESOURCE_IDS.flatMap(r => Array.from({ length: p.bag[r] ?? 0 }, () => r));
        Array.from(slots.children).forEach((slot, i) => {
            const kind = gathered[i] ?? '';
            slot.className = `slot ${kind ? 'filled ' + kind : ''}`;
            slot.replaceChildren();
            if (kind) {
                const icon = document.createElement('i');
                icon.className = kind === 'wood' || kind === 'ore' ? kind + '-icon' : 'resource-token';
                icon.textContent = kind === 'wood' || kind === 'ore' ? '' : RESOURCES[kind].name.slice(0, 2).toUpperCase();
                icon.style.color = RESOURCES[kind].color;
                slot.append(icon);
            }
            slot.setAttribute('aria-label', kind ? RESOURCES[kind].name : 'Empty slot');
            slot.setAttribute('title', kind ? RESOURCES[kind].name : 'Empty slot');
        });
    }
    for (const kind of ['wood', 'ore'] as const) {
        const lv = level(p.xp[kind]);
        text(kind + '-level', `LV. ${lv}`);
        const start = xpForLevel(lv), end = xpForLevel(lv + 1);
        $(kind + '-progress').style.width = `${(p.xp[kind] - start) / (end - start) * 100}%`;
        text(kind + '-xp', `${p.xp[kind]} XP · ${end - p.xp[kind]} to next level`);
        text('bank-' + kind, p.banked[kind]);
    }
    text('runs', p.runs);
    const entries = snapshot.events.slice(0, 3);
    const eventKey = entries.join('|');
    if (eventKey !== journal) {
        journal = eventKey;
        $('journal').replaceChildren(...entries.map(entry => { const p = document.createElement('p'); p.textContent = entry; return p; }));
    }
    const hint = $('context-hint');
    const hintText = hint.querySelector('span')!;
    const nearby = snapshot.nodes.filter(n => n.stock > 0 && distance(n, p) < 62).sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (area === 'bank')
        hintText.textContent = count(p.bag) ? `Hold to bank ${count(p.bag)} resources` : 'Haul secured. Head back to a grove.';
    else if (count(p.bag) >= 12)
        hintText.textContent = 'Bag full. Reach the central bank.';
    else if (snapshot.loot.some(l => distance(l, p) < 48))
        hintText.textContent = 'Hold to recover dropped resources';
    else if (nearby)
        hintText.textContent = `Hold to ${RESOURCES[nearby.kind].action} · ${nearby.stock} left`;
    else
        hintText.textContent = inBossArena(p) ? 'Boss ground. Dodge warnings; strike between attacks.' : area === 'wild' ? 'Space to fight. Shift to dodge.' : 'Gather, or seek the Warden in the east →';
    if (p.duelId)
        hintText.textContent = 'Stay inside the gold ring. Space attacks; Shift dodges.';
    $('death').classList.toggle('hidden', p.hp > 0);
    text('respawn-count', `Returning in ${Math.max(1, Math.ceil((p.respawnAt - snapshot.time) / 1000))}…`);
    if (p.messageUntil !== lastMessage) {
        lastMessage = p.messageUntil;
        if (!p.message.startsWith('Wood collected') && !p.message.startsWith('Ore collected'))
            toast(p.message);
    }
}
function resize() { const box = canvas.getBoundingClientRect(); width = box.width; height = box.height; dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); zoom = Math.max(.62, Math.min(1, width / 900));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vignette = ctx.createRadialGradient(width / 2, height / 2, width * .15, width / 2, height / 2, Math.max(width, height) * .75);
    vignette.addColorStop(0, '#07110b00');
    vignette.addColorStop(1, '#07110b80');
}
new ResizeObserver(resize).observe(canvas);
resize();
function circle(x: number, y: number, r: number, fill: string, stroke?: string) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}
function polygon(points: number[][], fill: string, stroke?: string) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}
function resourceNode(n: Node, near: boolean) {
    const d = RESOURCES[n.kind];
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.globalAlpha = n.stock > 0 ? 1 : .35;
    circle(0, 0, near ? 31 : 26, '#172a2366', near ? '#d5bf75' : d.color + '66');
    if (n.kind === 'rawFish') {
        ctx.fillStyle = '#426d7c';
        ctx.beginPath();
        ctx.ellipse(0, 0, 23, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = d.color;
        ctx.beginPath();
        ctx.moveTo(-15, -2);
        ctx.lineTo(10, -2);
        ctx.moveTo(-8, 6);
        ctx.lineTo(16, 6);
        ctx.stroke();
    }
    else if (n.kind === 'berries' || n.kind === 'herb') {
        for (let i = 0; i < 4; i++) {
            circle(Math.cos(i * 2.4) * 12, Math.sin(i * 2.4) * 9, 8, '#567849');
            circle(Math.cos(i * 2.4) * 12, Math.sin(i * 2.4) * 9, 3, d.color);
        }
    }
    else if (n.kind === 'grain' || n.kind === 'flax') {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 7, 14);
            ctx.lineTo(i * 7, -14);
            ctx.moveTo(i * 7, -5);
            ctx.lineTo(i * 7 + 5, -11);
            ctx.stroke();
        }
    }
    else if (n.kind === 'crystal')
        polygon([[-15, 10], [-18, -6], [-5, -22], [8, -9], [16, 10]], d.color, '#5e958e');
    else if (n.kind === 'hide') {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-15, -14, 30, 28);
        ctx.beginPath();
        ctx.moveTo(-15, -14);
        ctx.lineTo(15, 14);
        ctx.moveTo(15, -14);
        ctx.lineTo(-15, 14);
        ctx.stroke();
    }
    else {
        circle(0, 0, 18, '#8d7058');
        circle(-6, -3, 8, d.color);
    }
    label(d.name.toUpperCase(), 0, -35, d.color, 8);
    if (near)
        label(`${n.stock} LEFT · E`, 0, 40, '#e5d6a9', 8);
    ctx.restore();
}
function label(value: string, x: number, y: number, color: string, size = 11) { ctx.fillStyle = color; ctx.font = `${size}px "Segoe UI",sans-serif`; ctx.textAlign = 'center'; ctx.fillText(value, x, y); }
let seed = 4917;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const terrain = document.createElement('canvas');
terrain.width = MAP.width;
terrain.height = MAP.height;
const ground = terrain.getContext('2d')!;
ground.fillStyle = '#354935';
ground.fillRect(0, 0, 1600, 1100);
paintBiomes(ground);
for (let i = 0; i < 4300; i++) {
    const x = random() * 1600, y = random() * 1100;
    ground.fillStyle = ['#46573a', '#2d4231', '#50603e', '#394d32'][i % 4];
    ground.fillRect(x, y, 2 + random() * 4, 1 + random() * 3);
}
for (const g of [{ x: 220, y: 240 }, { x: 240, y: 810 }, { x: 1370, y: 250 }, { x: 1360, y: 820 }, { x: 800, y: 100 }, { x: 800, y: 1000 }]) {
    ground.beginPath();
    ground.moveTo(g.x, g.y);
    ground.quadraticCurveTo((g.x + 800) / 2 + 70, (g.y + 550) / 2, 800, 550);
    ground.strokeStyle = '#706e4c';
    ground.lineWidth = 30;
    ground.stroke();
    ground.strokeStyle = '#7d7852';
    ground.lineWidth = 22;
    ground.stroke();
}
ground.fillStyle = '#b07e5a0e';
ground.beginPath();
ground.arc(800, 550, 330, 0, Math.PI * 2);
ground.fill();
ground.strokeStyle = '#bf8b7055';
ground.lineWidth = 2;
ground.setLineDash([8, 12]);
ground.stroke();
ground.setLineDash([]);
ground.strokeStyle = '#b5946244';
ground.lineWidth = 1;
ground.beginPath();
ground.arc(800, 550, 322, 0, Math.PI * 2);
ground.stroke();
for (let i = 0; i < 52; i++) {
    const a = i / 52 * Math.PI * 2;
    const x = 800 + Math.cos(a) * 330, y = 550 + Math.sin(a) * 330;
    ground.fillStyle = '#8f7460';
    ground.fillRect(x - 2, y - 4, 4, 8);
}
ground.fillStyle = '#55583c';
ground.beginPath();
ground.arc(800, 550, 96, 0, Math.PI * 2);
ground.fill();
ground.strokeStyle = '#c7b378';
ground.lineWidth = 2;
ground.stroke();
ground.strokeStyle = '#c7b37844';
ground.lineWidth = 1;
ground.beginPath();
ground.arc(800, 550, 87, 0, Math.PI * 2);
ground.stroke();
for (let i = 0; i < 34; i++) {
    const a = i / 34 * Math.PI * 2;
    ground.fillStyle = '#c2b17c';
    ground.beginPath();
    ground.arc(800 + Math.cos(a) * 91, 550 + Math.sin(a) * 91, 1.5, 0, Math.PI * 2);
    ground.fill();
}
ground.fillStyle = '#473f32';
ground.beginPath();
ground.arc(MAP.bossX, MAP.bossY, MAP.bossRadius, 0, Math.PI * 2);
ground.fill();
ground.strokeStyle = '#bf745b';
ground.lineWidth = 3;
ground.setLineDash([12, 9]);
ground.stroke();
ground.setLineDash([]);
ground.strokeStyle = '#a47a5755';
ground.lineWidth = 1;
for (const radius of [125, 150]) {
    ground.beginPath();
    ground.arc(MAP.bossX, MAP.bossY, radius, 0, Math.PI * 2);
    ground.stroke();
}
for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, x = MAP.bossX + Math.cos(a) * 154, y = MAP.bossY + Math.sin(a) * 154;
    ground.fillStyle = '#716e59';
    ground.fillRect(x - 7, y - 13, 14, 26);
    ground.fillStyle = '#c28e66';
    ground.fillRect(x - 2, y - 8, 4, 10);
}
// Trees and rocks are rendered from world data; the terrain contains only decoration.
function tree(n: Node, highlight: boolean) {
    ctx.save();
    ctx.translate(n.x, n.y);
    circle(0, 10, n.stock ? 22 : 11, '#172e2066');
    ctx.fillStyle = '#8b7652';
    ctx.fillRect(-4, -6, 8, 19);
    if (n.stock) {
        polygon([[-24, -5], [0, -49], [24, -5]], '#223b2c', '#6c805447');
        polygon([[-21, -18], [0, -57], [21, -18]], '#2c4c32');
        polygon([[-17, -32], [0, -64], [17, -32]], '#486440');
        polygon([[0, -64], [0, -32], [17, -32]], '#3b5737');
    }
    else {
        ctx.fillStyle = '#a59465';
        ctx.fillRect(-6, 1, 12, 5);
    }
    if (highlight) {
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        circle(0, 3, 31, '', '#ced19eaa');
        ctx.setLineDash([]);
        label('WOOD', 0, -74, '#d0d3ab', 9);
    }
    ctx.restore();
}
function rock(n: Node, highlight: boolean) {
    ctx.save();
    ctx.translate(n.x, n.y);
    circle(0, 5, 22, '#12261d77');
    if (n.stock) {
        polygon([[-24, 4], [-20, -15], [-7, -28], [13, -25], [26, -7], [20, 9], [-3, 15]], '#82918a', '#acb5a077');
        polygon([[-20, -15], [-7, -28], [13, -25], [2, -8]], '#a3afa2');
        polygon([[2, -8], [13, -25], [26, -7], [20, 9]], '#647973');
        ctx.strokeStyle = '#c4cbb0';
        ctx.beginPath();
        ctx.moveTo(-10, -11);
        ctx.lineTo(-1, -3);
        ctx.lineTo(4, -14);
        ctx.stroke();
    }
    else {
        polygon([[-12, 4], [-3, -5], [10, 3], [6, 9]], '#728174');
    }
    if (highlight) {
        ctx.setLineDash([3, 4]);
        circle(0, 0, 34, '', '#c6d0ceaa');
        ctx.setLineDash([]);
        label('ORE', 0, -40, '#c5d0c5', 9);
    }
    ctx.restore();
}
function bank() { ctx.save(); ctx.translate(800, 524); circle(0, 13, 51, '#14291c66'); ctx.fillStyle = '#696d52'; ctx.fillRect(-38, -12, 76, 48); ctx.fillStyle = '#b3ac7c'; ctx.fillRect(-34, -10, 68, 41); ctx.fillStyle = '#d0c28c'; ctx.fillRect(-40, 29, 80, 7); polygon([[-48, -12], [0, -46], [48, -12]], '#3e5640', '#b1ac72'); polygon([[-40, -16], [0, -43], [40, -16]], '#526748'); ctx.fillStyle = '#2a392c'; ctx.fillRect(-10, 5, 20, 26); ctx.fillStyle = '#d2bc76'; ctx.fillRect(-24, 0, 8, 12); ctx.fillRect(16, 0, 8, 12); ctx.strokeStyle = '#dac17f'; ctx.strokeRect(-10, 5, 20, 26); label('THE LAST BANK', 0, -61, '#e4d5a1', 11); label('HOLD E TO DEPOSIT', 0, 62, '#d9cc96', 8); ctx.restore(); }
type Actor = Snapshot['players'][number] | Raider;
function actor(a: Actor) {
    if (a.hp <= 0)
        return;
    const isPlayer = 'bag' in a;
    const own = a.id === selfId;
    let pos = smoothed.get(a.id);
    if (!pos) {
        pos = { x: a.x, y: a.y };
        smoothed.set(a.id, pos);
    }
    ctx.save();
    ctx.translate(pos.x, pos.y);
    if (!isPlayer)
        ctx.scale(a.kind === 'boss' ? 2.1 : a.kind === 'brute' ? 1.45 : a.kind === 'skirmisher' ? .88 : 1, a.kind === 'boss' ? 2.1 : a.kind === 'brute' ? 1.45 : a.kind === 'skirmisher' ? .88 : 1);
    if (isPlayer && now < a.dodgeUntil) {
        ctx.globalAlpha = .5;
        circle(-Math.cos(a.facing) * 18, 5, 20, '#d6d0a933');
        ctx.globalAlpha = .8;
    }
    const moving = isPlayer && Math.hypot(pos.x - a.x, pos.y - a.y) > 1;
    const gathering = isPlayer ? gatherPose(a, gatherNow) : undefined;
    const bob = gathering && !gatherView.reducedMotion ? Math.sin(gathering.progress * Math.PI * 2) * 1.8 : moving ? Math.sin(now / 80) * 1.2 : Math.sin(now / 600) * .5;
    if (isPlayer)
        elementView.aura(a, now);
    else
        elementView.status(a, now);
    circle(0, 10, 17, '#12291c88');
    if (own) {
        ctx.lineWidth = 1.5;
        circle(0, 5, 23, '', '#d7d7a077');
    }
    const color = own ? '#d3c792' : isPlayer ? '#8ebbb2' : ENEMIES[a.kind].color;
    if (!isPlayer) {
        ctx.strokeStyle = '#c1856a55';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        circle(0, 5, 21, '', '#c1856a55');
        ctx.setLineDash([]);
    }
    ctx.fillStyle = '#253c2c';
    ctx.fillRect(-9, 7 + bob, 6, 9);
    ctx.fillRect(4, 7 - bob, 6, 9);
    polygon([[-11, 7], [-9, -11], [0, -16], [9, -11], [12, 7], [0, 13]], now - a.hitAt < 180 ? '#e9c5af' : color, '#233429');
    circle(0, -15 + bob, 8, '#d4ba8f', '#4b4c32');
    polygon([[-8, -16 + bob], [0, -25 + bob], [8, -16 + bob]], own ? '#596f4b' : isPlayer ? '#42776d' : '#67483a');
    if (!isPlayer && a.kind === 'boss') {
        polygon([[-14, -8], [-20, -23], [-10, -20], [0, -16], [10, -20], [20, -23], [14, -8]], '#7f8876', '#cab888');
        polygon([[-8, -21], [-15, -34], [-3, -27]], '#d2ba8c');
        polygon([[8, -21], [15, -34], [3, -27]], '#d2ba8c');
        ctx.fillStyle = '#f7b36b';
        ctx.fillRect(-5, -17, 3, 3);
        ctx.fillRect(3, -17, 3, 3);
    }
    if (!isPlayer && a.kind === 'brute') {
        ctx.fillStyle = '#69776b';
        ctx.fillRect(-17, -12, 9, 12);
        ctx.fillRect(8, -12, 9, 12);
    }
    ctx.fillStyle = '#28372c';
    ctx.fillRect(1, -16 + bob, 2, 2);
    if (isPlayer && count(a.bag) > 0) {
        ctx.fillStyle = '#a88c58';
        ctx.fillRect(-15, -6, 7, 11);
        ctx.strokeStyle = '#564e32';
        ctx.strokeRect(-15, -6, 7, 11);
    }
    if (gathering && isPlayer) {
        gatherView.draw(a, gathering.action, gathering.progress);
        label(RESOURCES[gathering.action.kind].action.toUpperCase(), 0, -62, RESOURCES[gathering.action.kind].color, 8);
    } else {
        const facing = a.facing;
        const weapon = isPlayer ? WEAPONS[a.weapon].family : a.kind === 'hunter' ? 'bow' : a.kind === 'boss' || a.kind === 'brute' ? 'axe' : 'sword';
        ctx.save();
        ctx.rotate(facing);
        ctx.strokeStyle = '#c5c3a5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(12, 5);
        ctx.lineTo(weapon === 'spear' ? 53 : 28, 5);
        ctx.stroke();
        ctx.strokeStyle = '#87734e';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(16, 10);
        ctx.stroke();
        if (weapon === 'axe')
            polygon([[21, -7], [35, -10], [39, 1], [28, 6]], '#b5b6a1', '#444a3a');
        if (weapon === 'spear')
            polygon([[53, 0], [65, 5], [53, 10]], '#ded2ad');
        if (weapon === 'staff') {
            ctx.strokeStyle = '#b89666';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(5, 4);
            ctx.lineTo(45, 4);
            ctx.stroke();
            circle(45, 4, 6, '#e6aa64', '#e6d09b');
        }
        if (weapon === 'bow') {
            ctx.strokeStyle = '#d7b97c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(11, 0, 22, -1.2, 1.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(19, -20);
            ctx.lineTo(19, 20);
            ctx.stroke();
        }
        if (now - a.swingAt < 250) {
            ctx.strokeStyle = `rgba(234,218,164,${1 - (now - a.swingAt) / 250})`;
            ctx.lineWidth = weapon === 'axe' ? 6 : 3;
            ctx.beginPath();
            if (weapon === 'spear') {
                ctx.moveTo(20, 5);
                ctx.lineTo(125, 5);
            }
            else
                ctx.arc(0, 0, weapon === 'axe' ? 62 : 45, -1.2, 1.2);
            ctx.stroke();
        }
        ctx.restore();
    }
    const maxHp = isPlayer ? 100 : ENEMIES[a.kind].hp;
    if (a.hp < maxHp) {
        ctx.fillStyle = '#17261d';
        ctx.fillRect(-20, -39, 40, 4);
        ctx.fillStyle = isPlayer ? '#afbe87' : '#cc937c';
        ctx.fillRect(-20, -39, 40 * a.hp / maxHp, 4);
    }
    label(own ? `${a.name} · YOU` : a.name, 0, -47, own ? '#f2e5b8' : isPlayer ? '#b7d3c5' : '#dcac91', 10);
    if (!isPlayer)
        label(a.kind === 'boss' ? 'WORLD BOSS · +300 XP' : `+${ENEMIES[a.kind].xp} COMBAT XP`, 0, -60, '#bb927d', 7);
    ctx.restore();
}
function drawMini() {
    mctx.fillStyle = '#293d2d';
    mctx.fillRect(0, 0, 180, 124);
    const sx = 180 / 1600, sy = 124 / 1100;
    mctx.save();
    mctx.scale(sx, sy);
    mctx.drawImage(terrain, 0, 0);
    for (const n of snapshot.nodes) {
        mctx.fillStyle = RESOURCES[n.kind].color;
        mctx.fillRect(n.x - 10, n.y - 10, 20, 20);
    }
    for (const r of snapshot.raiders)
        if (r.hp > 0) {
            mctx.fillStyle = '#d7967b';
            mctx.beginPath();
            mctx.arc(r.x, r.y, 17, 0, Math.PI * 2);
            mctx.fill();
        }
    for (const p of snapshot.players) {
        mctx.fillStyle = p.id === selfId ? '#f9e5a2' : '#9bc8c2';
        mctx.beginPath();
        mctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        mctx.fill();
    }
    mctx.strokeStyle = '#ddd6ae55';
    mctx.lineWidth = 8;
    mctx.strokeRect(camera.x - width / zoom / 2, camera.y - height / zoom / 2, width / zoom, height / zoom);
    mctx.restore();
}
function frame(time: number) {
    const dt = Math.min(.1, (time - lastFrame) / 1000);
    lastFrame = time;
    now = Date.now();
    gatherNow = snapshot.time + Math.max(0, time - snapshotAt);
    const p = me();
    motion.update(snapshot.players, snapshot.raiders, dt);
    if (p) {
        const pos = smoothed.get(p.id)!;
        if (distance(camera, pos) > 450)
            camera = { ...pos };
        camera.x += (pos.x - camera.x) * (1 - Math.exp(-5 * dt));
        camera.y += (pos.y - camera.y) * (1 - Math.exp(-5 * dt));
    }
    const halfW = width / zoom / 2, halfH = height / zoom / 2;
    camera.x = halfW > 800 ? 800 : Math.max(halfW, Math.min(1600 - halfW, camera.x));
    camera.y = halfH > 550 ? 550 : Math.max(halfH, Math.min(1100 - halfH, camera.y));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#23372b';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    ctx.drawImage(terrain, 0, 0);
    combatView.ground(snapshot, now);
    const activeDuel = snapshot.duels.find(d => d.phase !== 'finished');
    ctx.save();
    ctx.lineWidth = activeDuel ? 3 : 1;
    ctx.setLineDash(activeDuel ? [] : [8, 10]);
    circle(DUEL_RULES.x, DUEL_RULES.y, DUEL_RULES.radius, activeDuel ? '#c5a4560d' : '', activeDuel ? '#e1bf75' : '#a99e6744');
    ctx.setLineDash([]);
    label(activeDuel ? `${activeDuel.pot} COIN DUEL` : 'WAGERED DUEL RING', DUEL_RULES.x, DUEL_RULES.y - DUEL_RULES.radius - 15, '#c9b77c', 10);
    ctx.restore();
    label('THE WARDEN’S HOLLOW', MAP.bossX, MAP.bossY - 190, '#d9ab88', 13);
    // Low contrast location lettering stays part of the world rather than the interface.
    ctx.globalAlpha = .45;
    label('WESTERN GROVES', 210, 560, '#a2b28b', 13);
    label('EASTERN GROVES', 1390, 560, '#a2b28b', 13);
    label('CONTESTED GROUND', 800, 272, '#d5a488', 12);
    ctx.globalAlpha = 1;
    for (const l of snapshot.loot) {
        circle(l.x, l.y, 20 + Math.sin(now / 200) * 2, '#cbb97816', '#cbb97888');
        ctx.fillStyle = '#b89a5f';
        ctx.fillRect(l.x - 8, l.y - 5, 16, 17);
        label('DROPPED HAUL', l.x, l.y - 18, '#e6cea0', 8);
    }
    if (target) {
        ctx.strokeStyle = '#ddd5a58a';
        ctx.lineWidth = 1;
        circle(target.x, target.y, 8, '', '#ddd5a58a');
        ctx.beginPath();
        ctx.moveTo(target.x - 12, target.y);
        ctx.lineTo(target.x + 12, target.y);
        ctx.moveTo(target.x, target.y - 12);
        ctx.lineTo(target.x, target.y + 12);
        ctx.stroke();
    }
    const drawables: [
        number,
        () => void
    ][] = [];
    for (const n of snapshot.nodes)
        drawables.push([n.y, () => n.kind === 'wood' ? tree(n, !!p && distance(n, p) < 62 && n.stock > 0) : n.kind === 'ore' ? rock(n, !!p && distance(n, p) < 62 && n.stock > 0) : resourceNode(n, !!p && distance(n, p) < 62)]);
    drawables.push([540, bank]);
    for (const a of [...snapshot.raiders, ...snapshot.players])
        drawables.push([a.y, () => actor(a)]);
    drawables.sort((a, b) => a[0] - b[0]);
    for (const [, draw] of drawables)
        draw();
    combatView.foreground(snapshot, now);
    elementView.effects(snapshot, now);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    drawMini();
    if (now > toastUntil)
        $('toast').classList.remove('visible');
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
