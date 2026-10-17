import type { Snapshot } from '../shared/world.js';
type Splat = {
    x: number;
    y: number;
    r: number;
    angle: number;
    at: number;
};
type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    at: number;
    r: number;
};
type Float = {
    x: number;
    y: number;
    text: string;
    at: number;
    reward: boolean;
};
export class CombatView {
    blood = true;
    private seen = new Map<string, number>();
    private splats: Splat[] = [];
    private particles: Particle[] = [];
    private floats: Float[] = [];
    constructor(private ctx: CanvasRenderingContext2D) { }
    consume(snapshot: Snapshot) {
        for (const e of snapshot.effects) {
            if (this.seen.has(e.id))
                continue;
            this.seen.set(e.id, e.at);
            if (e.kind === 'reward')
                this.floats.push({ x: e.x, y: e.y - 35, text: `+${e.amount} COMBAT XP`, at: e.at, reward: true });
            if (e.kind === 'blood') {
                this.floats.push({ x: e.x, y: e.y - 35, text: `−${e.amount}`, at: e.at, reward: false });
                if (this.blood)
                    for (let i = 0; i < 9; i++) {
                        const a = (i * 2.4 + e.at * .01) % (Math.PI * 2), speed = 25 + (i % 4) * 35;
                        this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, at: e.at, r: 1.8 + i % 3 });
                        this.splats.push({ x: e.x + Math.cos(a) * (7 + i * 2), y: e.y + Math.sin(a) * (7 + i * 2), r: 2 + i % 4, angle: a, at: e.at });
                    }
            }
        }
        for (const [id, at] of this.seen)
            if (snapshot.time - at > 5000)
                this.seen.delete(id);
        this.splats = this.splats.slice(-240);
        this.particles = this.particles.slice(-240);
        this.floats = this.floats.slice(-40);
    }
    ground(snapshot: Snapshot, now: number) {
        const c = this.ctx;
        this.splats = this.splats.filter(s => now - s.at < 11000);
        if (this.blood)
            for (const s of this.splats) {
                c.save();
                c.globalAlpha = Math.min(.8, (11000 - (now - s.at)) / 2500);
                c.fillStyle = '#651f20';
                c.beginPath();
                c.ellipse(s.x, s.y, s.r * 1.8, s.r, s.angle, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = '#a3332c';
                c.beginPath();
                c.arc(s.x - 1, s.y - 1, s.r * .6, 0, Math.PI * 2);
                c.fill();
                c.restore();
            }
        for (const w of snapshot.warnings) {
            const progress = Math.max(0, Math.min(1, (now - w.start) / (w.at - w.start)));
            c.save();
            c.translate(w.x, w.y);
            c.strokeStyle = '#f19d68';
            c.lineWidth = 2;
            c.fillStyle = `rgba(177,49,30,${.13 + progress * .2})`;
            if (w.kind === 'slam' || w.kind === 'slash') {
                c.beginPath();
                if (w.kind === 'slash') {
                    c.moveTo(0, 0);
                    c.arc(0, 0, w.radius, w.angle - 1.1, w.angle + 1.1);
                    c.closePath();
                }
                else
                    c.arc(0, 0, w.radius, 0, Math.PI * 2);
                c.fill();
                c.stroke();
                c.strokeStyle = '#ffca84';
                c.lineWidth = 3;
                c.beginPath();
                c.arc(0, 0, w.radius * progress, 0, Math.PI * 2);
                c.stroke();
            }
            else
                for (const offset of w.kind === 'fan' ? [-.55, -.275, 0, .275, .55] : [0]) {
                    c.save();
                    c.rotate(w.angle + offset);
                    c.fillStyle = `rgba(183,63,28,${.12 + progress * .2})`;
                    c.fillRect(0, -14, w.radius, 28);
                    c.setLineDash([7, 5]);
                    c.beginPath();
                    c.moveTo(0, 0);
                    c.lineTo(w.radius, 0);
                    c.stroke();
                    c.restore();
                }
            c.textAlign = 'center';
            c.font = 'bold 10px "Segoe UI",sans-serif';
            c.fillStyle = '#ffd69a';
            c.fillText(w.kind === 'slam' ? 'SLAM · DODGE' : w.kind === 'slash' ? 'SLASH' : w.kind === 'fan' ? 'BOLT FAN · SIDESTEP' : 'SHOT · SIDESTEP', 0, -w.radius - 9);
            c.restore();
        }
    }
    foreground(snapshot: Snapshot, now: number) {
        const c = this.ctx;
        for (const bolt of snapshot.projectiles) {
            const angle = Math.atan2(bolt.vy, bolt.vx);
            c.save();
            c.translate(bolt.x, bolt.y);
            c.rotate(angle);
            c.strokeStyle = bolt.skill === 'archery' ? '#b7c1a1' : bolt.skill === 'pyromancy' ? '#d38b46' : '#a75b36';
            c.lineWidth = 7;
            c.beginPath();
            c.moveTo(-19, 0);
            c.lineTo(4, 0);
            c.stroke();
            c.strokeStyle = '#ffdda0';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(-13, 0);
            c.lineTo(7, 0);
            c.stroke();
            c.restore();
        }
        this.particles = this.particles.filter(p => now - p.at < 550);
        if (this.blood)
            for (const p of this.particles) {
                const t = (now - p.at) / 1000;
                c.globalAlpha = 1 - t / .55;
                c.fillStyle = '#d45440';
                c.beginPath();
                c.arc(p.x + p.vx * t, p.y + p.vy * t + t * t * 35, p.r * (1 - t), 0, Math.PI * 2);
                c.fill();
            }
        c.globalAlpha = 1;
        this.floats = this.floats.filter(f => now - f.at < 1100);
        for (const f of this.floats) {
            const t = (now - f.at) / 1100;
            c.globalAlpha = Math.min(1, (1 - t) * 3);
            c.textAlign = 'center';
            c.font = f.reward ? 'bold 12px "Segoe UI",sans-serif' : 'bold 17px "Segoe UI",sans-serif';
            c.strokeStyle = '#182017';
            c.lineWidth = 3;
            c.strokeText(f.text, f.x, f.y - t * 44);
            c.fillStyle = f.reward ? '#dfce85' : '#f0b0a0';
            c.fillText(f.text, f.x, f.y - t * 44);
        }
        c.globalAlpha = 1;
    }
}
