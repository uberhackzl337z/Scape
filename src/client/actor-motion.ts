type Position = { x: number; y: number };
type Actor = Position & { id: string };

/** Frame interpolation with linear roster cleanup and reusable membership storage. */
export class ActorMotion {
    readonly positions = new Map<string, Position>();
    private readonly active = new Set<string>();

    update(players: readonly Actor[], raiders: readonly Actor[], dt: number) {
        this.active.clear();
        const blend = 1 - Math.exp(-16 * dt);
        for (const group of [players, raiders]) {
            for (const actor of group) {
                this.active.add(actor.id);
                let pos = this.positions.get(actor.id);
                if (!pos) {
                    pos = { x: actor.x, y: actor.y };
                    this.positions.set(actor.id, pos);
                }
                if (Math.hypot(pos.x - actor.x, pos.y - actor.y) > 160) {
                    pos.x = actor.x;
                    pos.y = actor.y;
                }
                pos.x += (actor.x - pos.x) * blend;
                pos.y += (actor.y - pos.y) * blend;
            }
        }
        for (const id of this.positions.keys()) {
            if (!this.active.has(id)) this.positions.delete(id);
        }
    }
}
