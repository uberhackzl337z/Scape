// Cosmetic-only drawing: never participates in hit tests, stats or combat effects.
export function drawAstralAura(c: CanvasRenderingContext2D, now: number, reduced = false) {
    const phase = reduced ? 0 : now / 1300;
    c.save();
    const glow = c.createRadialGradient(0, 2, 8, 0, 2, 43);
    glow.addColorStop(0, '#bc8fff00'); glow.addColorStop(.65, '#bc8fff25'); glow.addColorStop(1, '#bc8fff00');
    c.fillStyle = glow; c.fillRect(-44, -42, 88, 88);
    c.strokeStyle = '#c5a3ffbb'; c.lineWidth = 1.7;
    c.beginPath(); c.ellipse(0, 8, 31, 14, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#dfcdff55'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(0, 8, 37, 18, 0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 4; i++) {
        const angle = phase + i * Math.PI / 2;
        c.fillStyle = i % 2 ? '#e7dcff' : '#bb91ff';
        c.beginPath(); c.arc(Math.cos(angle) * 31, 8 + Math.sin(angle) * 14, 2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
}

export function drawStorePreview(canvas: HTMLCanvasElement, kind: string, color: string, now: number, reduced: boolean) {
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, canvas.width, canvas.height); c.save(); c.translate(100, 88); c.scale(1.25, 1.25);
    if (kind === 'aura') drawAstralAura(c, now, reduced);
    c.fillStyle = '#22392d'; c.beginPath(); c.ellipse(0, 13, 13, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#92a783'; c.fillRect(-8, -16, 16, 25);
    c.fillStyle = '#d7c697'; c.beginPath(); c.arc(0, -23, 8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c8bb8d'; c.lineWidth = 2; c.beginPath(); c.moveTo(11, -8); c.lineTo(22, -22); c.stroke();
    c.fillStyle = kind === 'nameplate' ? color : '#e8e0c5'; c.textAlign = 'center'; c.font = '10px "Segoe UI",sans-serif'; c.fillText('Wanderer', 0, -40);
    c.restore();
}
