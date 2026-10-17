import test from 'node:test';
import assert from 'node:assert/strict';
import { SocketHeartbeat } from '../socket-heartbeat.js';

test('responsive sockets remain online while an unanswered ping terminates a stalled socket', () => {
    const heartbeat = new SocketHeartbeat();
    const socket = { readyState: 1, pings: 0, stops: 0, ping() { this.pings++; }, terminate() { this.stops++; } };
    heartbeat.tick([socket]); heartbeat.pong(socket); heartbeat.tick([socket]);
    assert.equal(socket.pings, 2); assert.equal(socket.stops, 0);
    heartbeat.tick([socket]); assert.equal(socket.stops, 1);
});

test('heartbeat ignores closing sockets and cleans up ping failures', () => {
    const heartbeat = new SocketHeartbeat();
    const closing = { readyState: 2, ping() { throw Error('must not ping'); }, terminate() { throw Error('must not terminate'); } };
    let stops = 0;
    const broken = { readyState: 1, ping() { throw Error('network failed'); }, terminate() { stops++; } };
    heartbeat.tick([closing, broken]); assert.equal(stops, 1);
});
