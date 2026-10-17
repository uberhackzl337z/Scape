type Point = { x: number; y: number };

/** Stable nearest selection without allocating or sorting a candidate roster. */
export function nearestWithin<T extends Point>(items: Iterable<T>, origin: Point,
    radius: number, eligible: (item: T) => boolean): T | undefined {
    if (!(radius > 0)) return undefined;
    let nearest: T | undefined, best = radius * radius;
    for (const item of items) {
        if (!eligible(item)) continue;
        const dx = item.x - origin.x, dy = item.y - origin.y, squared = dx * dx + dy * dy;
        if (squared < best) { best = squared; nearest = item; }
    }
    return nearest;
}

export function inView(point: Point, camera: Point, halfWidth: number, halfHeight: number, padding = 160) {
    return Math.abs(point.x - camera.x) <= halfWidth + padding &&
        Math.abs(point.y - camera.y) <= halfHeight + padding;
}
