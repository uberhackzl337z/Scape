type Socket = { readyState: number; ping(): void; terminate(): void };

/** Browsers answer protocol pings automatically; stalled sockets cannot hold characters forever. */
export class SocketHeartbeat {
    private readonly pending = new WeakSet<Socket>();
    pong(socket: Socket) { this.pending.delete(socket); }
    tick(sockets: Iterable<Socket>) {
        for (const socket of sockets) {
            if (socket.readyState !== 1) continue;
            if (this.pending.has(socket)) { socket.terminate(); continue; }
            this.pending.add(socket);
            try { socket.ping(); } catch { socket.terminate(); }
        }
    }
}
