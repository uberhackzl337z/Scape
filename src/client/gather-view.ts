import type { GatherAction, Snapshot } from '../shared/world.js';
import { RESOURCES } from '../shared/skills.js';

type Gatherer = Pick<Snapshot['players'][number], 'x' | 'y' | 'hp' | 'duelId' | 'dodgeUntil' | 'swingAt' | 'gathering'>;
export function gatherPose(player: Gatherer, now: number) {
    const action = player.gathering;
    if (!action || player.hp <= 0 || player.duelId || now < player.dodgeUntil || now - player.swingAt < 250 ||
        now < action.at || now >= action.until || action.until <= action.at ||
        Math.hypot(player.x - action.x, player.y - action.y) >= 75) return undefined;
    return { action, progress: (now - action.at) / (action.until - action.at) };
}

/** Small procedural tools and contact effects; coordinates are local to the actor. */
export class GatherView {
    constructor(private ctx: CanvasRenderingContext2D, public reducedMotion = false) {}

    draw(player: Gatherer, action: GatherAction, progress: number) {
        const c = this.ctx, kind = action.kind;
        const reach = this.reducedMotion ? .65 : Math.sin(progress * Math.PI);
        const pulse = this.reducedMotion ? 0 : Math.sin(progress * Math.PI * 2);
        const angle = Math.atan2(action.y - player.y, action.x - player.x);
        const distance = Math.hypot(action.x - player.x, action.y - player.y);
        c.save();
        c.rotate(angle);
        c.lineCap = 'round';
        c.lineWidth = 3;
        c.strokeStyle = '#bda778';

        if (kind === 'rawFish') {
            // Rod, taut line, float and expanding water rings at the pool.
            c.beginPath(); c.moveTo(8, 3); c.lineTo(41, -19 + pulse * 3); c.stroke();
            c.lineWidth = 1; c.strokeStyle = '#d9e2cb';
            c.beginPath(); c.moveTo(41, -19 + pulse * 3); c.lineTo(distance, 0); c.stroke();
            c.fillStyle = '#e2bd78'; c.fillRect(distance - 2, -2 + pulse, 4, 4);
            c.strokeStyle = '#a9d7df88';
            for (let i = 0; i < 2; i++) {
                c.beginPath(); c.ellipse(distance, 3, 5 + i * 6 + reach * 4, 2 + i * 2, 0, 0, Math.PI * 2); c.stroke();
            }
        } else if (kind === 'wood' || kind === 'ore' || kind === 'crystal' || kind === 'clay') {
            c.save();
            c.translate(9, 2); c.rotate(-1.25 + reach * 1.65);
            c.beginPath(); c.moveTo(0, 0); c.lineTo(31, 0); c.stroke();
            c.fillStyle = kind === 'crystal' ? '#a6d3c5' : '#b9c1b3';
            if (kind === 'wood') {
                c.beginPath(); c.moveTo(23, -4); c.lineTo(34, -10); c.lineTo(39, 3); c.lineTo(26, 7); c.closePath(); c.fill();
            } else if (kind === 'clay') {
                c.beginPath(); c.moveTo(26, -6); c.lineTo(38, -6); c.lineTo(41, 0); c.lineTo(38, 6); c.lineTo(26, 6); c.closePath(); c.fill();
            } else {
                c.strokeStyle = c.fillStyle; c.lineWidth = 4;
                c.beginPath(); c.moveTo(28, -12); c.quadraticCurveTo(40, 0, 28, 12); c.stroke();
            }
            c.restore();
        } else {
            // A reaching hand, with a sickle for crops or a loop for hide snares.
            c.beginPath(); c.moveTo(10, 4); c.lineTo(22 + reach * 17, 4 + pulse * 2); c.stroke();
            c.fillStyle = '#dbc79b'; c.beginPath(); c.arc(23 + reach * 17, 4 + pulse * 2, 4, 0, Math.PI * 2); c.fill();
            if (kind === 'grain' || kind === 'flax') {
                c.strokeStyle = '#c9cec0'; c.lineWidth = 2;
                c.beginPath(); c.arc(29 + reach * 13, -2, 9, -.9, 1.9); c.stroke();
            } else if (kind === 'hide') {
                c.strokeStyle = '#c9ad7e'; c.lineWidth = 1.5;
                c.beginPath(); c.ellipse(31 + reach * 8, 0, 8, 11 - reach * 4, 0, 0, Math.PI * 2); c.stroke();
            }
        }
        // Only three transient chips/leaves: no per-frame particle allocations.
        if (!this.reducedMotion && kind !== 'rawFish' && progress > .22 && progress < .88) {
            c.fillStyle = RESOURCES[kind].color;
            const flight = (progress - .22) / .66;
            c.globalAlpha = 1 - flight;
            for (let i = 0; i < 3; i++) {
                c.fillRect(34 + flight * (8 + i * 5), -3 - Math.sin(flight * Math.PI) * (8 + i * 5) + i * 3, 3, 2);
            }
        }
        c.restore();
    }
}
