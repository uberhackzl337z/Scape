import { gearStats } from '../shared/equipment.js';
import type { Snapshot } from '../shared/world.js';
type Actor = Snapshot['players'][number];
type Enemy = Snapshot['raiders'][number];
export class ElementView {
    private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    constructor(private c: CanvasRenderingContext2D) { }
    aura(p: Actor, now: number) {
        if (p.hp <= 0 || p.duelId)
            return;
        const c = this.c, s = gearStats(p), phase = this.reduced ? 0 : now / 900;
        c.save();
        if (s.ranks.fire) {
            const radius = s.counts.fire >= 3 ? 120 : 90;
            c.strokeStyle = '#f2a16a44';
            c.lineWidth = 1;
            c.beginPath();
            c.ellipse(0, 6, radius, radius * .52, 0, 0, Math.PI * 2);
            c.stroke();
            c.strokeStyle = '#f2ac76';
            c.lineWidth = 2;
            for (let i = 0; i < 10; i++) {
                const a = i * Math.PI / 5 + phase * .2, r = 27 + Math.sin(phase + i) * 2;
                c.beginPath();
                c.moveTo(Math.cos(a) * r, Math.sin(a) * r * .55 + 5);
                c.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5) * .55 - 3);
                c.stroke();
            }
        }
        if (s.ranks.storm) {
            c.strokeStyle = '#e2d68c';
            c.lineWidth = 1.7;
            for (let i = 0; i < 3; i++) {
                const a = phase + i * 2.1, x = Math.cos(a) * 34, y = Math.sin(a) * 17;
                c.beginPath();
                c.moveTo(x - 3, y - 5);
                c.lineTo(x + 2, y);
                c.lineTo(x - 2, y + 2);
                c.lineTo(x + 4, y + 8);
                c.stroke();
            }
        }
        if (s.ranks.frost) {
            c.strokeStyle = '#a6e3ef99';
            c.lineWidth = 1;
            c.beginPath();
            for (let i = 0; i <= 6; i++) {
                const a = i * Math.PI / 3 - phase * .05, x = Math.cos(a) * 28, y = Math.sin(a) * 17 + 7;
                i ? c.lineTo(x, y) : c.moveTo(x, y);
            }
            c.stroke();
        }
        c.restore();
    }
    status(e: Enemy, now: number) {
        const c = this.c, labels: string[] = [];
        c.save();
        if (e.burnUntil > now) {
            c.fillStyle = '#ef9a65';
            for (let i = 0; i < 3; i++) {
                const x = (i - 1) * 12;
                c.beginPath();
                c.moveTo(x - 4, 9);
                c.lineTo(x, -5 - (this.reduced ? 0 : Math.sin(now / 130 + i) * 3));
                c.lineTo(x + 4, 9);
                c.fill();
            }
            labels.push('BURN');
        }
        if (e.chillUntil > now) {
            c.strokeStyle = '#94ddf0';
            c.beginPath();
            c.ellipse(0, 8, 24, 12, 0, 0, Math.PI * 2);
            c.stroke();
            labels.push('CHILL');
        }
        if (e.stunUntil > now) {
            c.strokeStyle = '#f0e6a1';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(-2, -40);
            c.lineTo(6, -32);
            c.lineTo(-3, -30);
            c.lineTo(4, -23);
            c.stroke();
            labels.push('STUN');
        }
        if (labels.length) {
            c.font = 'bold 8px "Segoe UI",sans-serif';
            c.textAlign = 'center';
            c.fillStyle = e.stunUntil > now ? '#eee1a3' : e.chillUntil > now ? '#b2e7ee' : '#f1b38a';
            c.fillText(labels.join(' · '), 0, -63);
        }
        c.restore();
    }
    effects(s: Snapshot, now: number) {
        const c = this.c;
        for (const e of s.effects) {
            if (!['fire', 'storm', 'frost', 'gear'].includes(e.kind))
                continue;
            const t = (now - e.at) / 700;
            if (t < 0 || t > 1)
                continue;
            c.save();
            c.globalAlpha = 1 - t;
            c.translate(e.x, e.y);
            c.strokeStyle = e.kind === 'storm' ? '#f5e7a0' : e.kind === 'frost' ? '#a7e3f3' : e.kind === 'gear' ? '#d9c084' : '#ffab72';
            c.lineWidth = 2;
            if (e.kind === 'storm') {
                c.beginPath();
                c.moveTo(-10, -75);
                c.lineTo(7, -48);
                c.lineTo(-4, -35);
                c.lineTo(8, 0);
                c.stroke();
            }
            else if (e.kind === 'gear') {
                c.fillStyle = '#e3d99b';
                c.font = 'bold 12px "Segoe UI",sans-serif';
                c.textAlign = 'center';
                c.fillText(`T${e.amount} GEAR FOUND`, 0, -65 - t * 25);
            }
            else {
                const radius = this.reduced ? 25 : 18 + t * (e.kind === 'frost' && e.amount > 50 ? e.amount : 45);
                c.beginPath();
                c.ellipse(0, 4, radius, radius * .6, 0, 0, Math.PI * 2);
                c.stroke();
            }
            c.restore();
        }
    }
}
