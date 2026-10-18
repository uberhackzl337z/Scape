# Overlapping connection review

## Baseline and reproduced defects

This separate feature branch starts from integrated PR11 commit `8c4bed031ca3eb2185edc5ca660ca4c041224532`, including PR10's persistence fix. PR11 and its packaging work were not edited concurrently. Direct shell Git fetch was blocked by the runtime network policy; the GitHub connector supplied the commit's changed files and Git metadata. Every fetched blob, the complete tree (`f47e9835bc67a3d85cd822f13933a335de77dac4`) and reconstructed commit object matched their published SHA values before checkout. This is an exact baseline, not a recreated feature merge.

The deterministic tests exercise the compiled production `connect()` function with controlled socket events and timers. Both failed before the fix:

- Opening a superseded socket sent a join through the current socket (one unexpected send).
- Firing an old reconnect timer after a manual connection created a third socket instead of retaining the second.

The client now captures each socket in its callbacks and checks that it remains current before handling open/message/close/error events or firing a retry. A join is sent through its own connection. Late events cannot replace identity/state, clear active controls, change connection status, or start a stale retry. Current close still clears held input/target and reconnects normally. Server ownership, identity policy, input expiry and heartbeat remain unchanged.

The tests cover late open, rejection, close and error events, identity/input/status isolation, successful current joins, current close cleanup, and both stale/current timer callbacks. They use production callback wiring rather than an alternate connection implementation. The extraction boundary is asserted explicitly so refactoring cannot silently skip coverage. No existing assertion was removed or relaxed.

## Storage investigation

The earlier SQLite reader error 522 is still unreproduced. An isolated disposable WAL/FULL-synchronous two-process experiment performed 215,300 read-only open/query/close cycles alongside 21,144 committed writes over 25 seconds with zero reader errors. Writer exit was 0 and its stderr was empty; writer-side and post-stop integrity checks returned ok. Eight recent disposable duel databases also passed integrity checks and JSON payload parsing, including the failed focused-run directory. This does not prove the full duel protocol reader is race-free or diagnose its earlier error, and it is not evidence of authoritative save corruption.

The duel checkpoint currently retries read failures and can replace its original timeout with an unguarded diagnostic-reader failure. Follow-up work should preserve the original timeout, last reader error, child process output/exit and independent server health in a single failure report. Do not convert reader exceptions into a passing checkpoint or silently reset data.

## Verification and limits

Both deterministic regressions failed on the integrated baseline and passed after the fix. Full local `pnpm run verify:cloud` and exact-head GitHub CI results are recorded in the associated PR, using pinned Node 24.19.0 and pnpm 10.28.0. All server worlds are disposable. No real browser reconnect stress, load test, external provider, production world or saved-player data was exercised. No rendering/layout/gear/world files, service activation, deployment, purchases, merges or schedules were changed.

Next priority: deterministic failure diagnostics for the duel storage checkpoint, followed by real browser rapid logout/rejoin/offline scenarios. Keep any broader connection policy changes separate from this callback ownership fix.
