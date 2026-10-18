// Expand around the original bank without moving existing routes or save identities.
export const MAP = { minX: -800, minY: -550, width: 3200, height: 2200, bankX: 800, bankY: 550, safeRadius: 96, dangerRadius: 330, bossX: 1360, bossY: 550, bossRadius: 170 };
export const GROVES = [
    { x: 220, y: 240 }, { x: 240, y: 810 }, { x: 1370, y: 250 }, { x: 1360, y: 820 }, { x: 800, y: 100 }, { x: 800, y: 1000 },
    { x: -570, y: -280 }, { x: 710, y: -310 }, { x: 2110, y: -260 },
    { x: -610, y: 1430 }, { x: 750, y: 1410 }, { x: 2200, y: 1390 },
    { x: -590, y: 570 }, { x: 2150, y: 570 }
];
export const EXPEDITIONS = [
    { id: 'cedar-watch', name: 'Cedar Watch', x: -300, y: -180, radius: 200, kinds: ['skirmisher', 'hunter'] },
    { id: 'sunken-camp', name: 'Sunken Camp', x: -290, y: 1180, radius: 200, kinds: ['skirmisher', 'brute'] },
    { id: 'frostwatch', name: 'Frostwatch Ruins', x: 1850, y: -220, radius: 200, kinds: ['hunter', 'brute'] },
    { id: 'crystal-breach', name: 'Crystal Breach', x: 1820, y: 1280, radius: 200, kinds: ['hunter', 'brute'] }
] as const;
export const expeditionAt = (p: { x: number; y: number }) => EXPEDITIONS.find(e => Math.hypot(p.x - e.x, p.y - e.y) < e.radius);
