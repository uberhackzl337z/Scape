import assert from 'node:assert/strict';
import test from 'node:test';
import { reportCheckpointFailure } from './checkpoint-diagnostics.mjs';

test('a failed SQLite diagnostic cannot replace the original checkpoint timeout', async () => {
  const timeout = new Error('Timed out waiting for game state');
  const calls = [];
  await assert.rejects(reportCheckpointFailure('Escrow checkpoint', timeout, {
    persisted: async () => { throw new Error('SQLITE_BUSY'); },
    server: async () => ({ exitCode: null }),
  }, (...args) => calls.push(args)), error => error === timeout);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'Escrow checkpoint');
  assert.deepEqual(calls[0][1].persisted, { ok: false, error: 'Error: SQLITE_BUSY' });
  assert.deepEqual(calls[0][1].server, { ok: true, value: { exitCode: null } });
});

test('one broken diagnostic source does not prevent other diagnostics', async () => {
  const timeout = new Error('original');
  let reached = false;
  let snapshot;
  await assert.rejects(reportCheckpointFailure('Consent checkpoint', timeout, {
    players: () => { throw new TypeError('no player state'); },
    offers: async () => { reached = true; return ['pending']; },
  }, (_label, details) => { snapshot = details; }), error => error === timeout);
  assert.equal(reached, true);
  assert.deepEqual(snapshot.players, { ok: false, error: 'TypeError: no player state' });
  assert.deepEqual(snapshot.offers, { ok: true, value: ['pending'] });
});

test('a broken diagnostic logger cannot replace the checkpoint failure', async () => {
  const timeout = new Error('original timeout');
  await assert.rejects(reportCheckpointFailure('Escrow checkpoint', timeout, {
    saved: async () => ({ escrows: [] }),
  }, () => { throw new Error('logger failure'); }), error => error === timeout);
});
