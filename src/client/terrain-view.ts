// Cached once by the renderer: no texture downloads or per-frame terrain generation.
export function biomeAt(x: number, y: number) {
    if (x > 1100 && y < 340)
        return 'Frostspine';
    if (x > 1100 && y > 760)
        return 'Crystal Vale';
    if (x > 1150 && y >= 340 && y <= 760)
        return 'The Ashen Reach';
    if (x < 430 && y > 355 && y < 760)
        return 'Reedwater Shallows';
    if (x < 650 && y >= 760)
        return 'Sunfield';
    return 'Cedar Reach';
}
export function paintBiomes(c: CanvasRenderingContext2D) {
    let seed = 90617;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    function patch(points: number[][], colors: [
        string,
        string
    ], x: number, y: number, radius: number) {
        c.beginPath();
        points.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py));
        c.closePath();
        const g = c.createRadialGradient(x, y, 10, x, y, radius);
        g.addColorStop(0, colors[0]);
        g.addColorStop(1, colors[1]);
        c.fillStyle = g;
        c.fill();
    }
    patch([[0, 340], [240, 350], [420, 430], [465, 615], [330, 800], [0, 810]], ['#3c6962', '#304d43'], 110, 560, 400);
    patch([[0, 790], [330, 735], [650, 815], [675, 1100], [0, 1100]], ['#84734c', '#575c3e'], 260, 960, 510);
    patch([[970, 0], [1600, 0], [1600, 390], [1350, 340], [1120, 285]], ['#a1b6b0', '#586f68'], 1380, 120, 580);
    patch([[1150, 360], [1600, 330], [1600, 805], [1220, 750], [1130, 610]], ['#6e4f3b', '#454638'], 1460, 560, 450);
    patch([[1050, 815], [1280, 740], [1600, 790], [1600, 1100], [1040, 1100]], ['#515d73', '#394e49'], 1380, 970, 450);
    for (let i = 0; i < 600; i++) {
        const x = random() * 1600, y = random() * 1100, b = biomeAt(x, y);
        if (b === 'Frostspine') {
            c.fillStyle = '#c5d3cc88';
            c.fillRect(x, y, 2 + random() * 9, 2);
        }
        if (b === 'The Ashen Reach') {
            c.strokeStyle = '#342e27';
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + 9, y + 3);
            c.lineTo(x + 4, y + 8);
            c.stroke();
        }
        if (b === 'Crystal Vale') {
            c.fillStyle = '#8b99b477';
            c.beginPath();
            c.moveTo(x, y - 8);
            c.lineTo(x + 4, y + 3);
            c.lineTo(x - 4, y + 3);
            c.fill();
        }
        if (b === 'Cedar Reach') {
            c.fillStyle = '#91aa6544';
            c.fillRect(x, y, 1, 6);
        }
    }
    // Shallow decorative water; gathering spots remain on their banks and accessible.
    for (const [x, y, rx, ry] of [[105, 414, 75, 58], [1495, 410, 65, 45], [180, 650, 82, 26]]) {
        c.fillStyle = '#203d3d';
        c.beginPath();
        c.ellipse(x, y, rx, ry, -.2, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#77aaa366';
        c.lineWidth = 2;
        c.stroke();
        for (let i = 0; i < 5; i++) {
            c.beginPath();
            c.ellipse(x - 20 + i * 9, y - 14 + i * 7, 18 + i * 2, 2, 0, 0, Math.PI);
            c.stroke();
        }
    }
    // Crop rows and low stone remnants give each corner a recognizable silhouette.
    for (let row = 0; row < 6; row++)
        for (let col = 0; col < 12; col++) {
            const x = 65 + col * 28, y = 875 + row * 28;
            c.fillStyle = '#4d4c30';
            c.fillRect(x - 4, y - 4, 19, 15);
            c.strokeStyle = '#c8ac63';
            c.beginPath();
            c.moveTo(x, y + 5);
            c.lineTo(x, y - 7);
            c.moveTo(x, y);
            c.lineTo(x + 4, y - 4);
            c.stroke();
        }
    for (let i = 0; i < 15; i++) {
        const x = 1180 + random() * 340, y = 830 + random() * 220;
        c.fillStyle = '#464b62';
        c.fillRect(x, y, 19, 7);
        c.fillStyle = '#8795a077';
        c.fillRect(x, y, 19, 2);
    }
    c.font = '11px "Segoe UI",sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#e1debd99';
    for (const [name, x, y] of [['CEDAR REACH', 235, 145], ['REEDWATER', 130, 525], ['SUNFIELD', 260, 1060], ['FROSTSPINE', 1360, 40], ['CRYSTAL VALE', 1360, 1070]] as const)
        c.fillText(name, x, y);
}
