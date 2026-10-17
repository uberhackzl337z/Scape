# Scape rendering performance

October 17, 2026. This pass keeps TypeScript, Canvas 2D and the existing server protocol. No new dependencies, gameplay rules or saved-data changes.

## Changes

- Actor interpolation used to concatenate the player/enemy rosters for every tracked actor, then linearly search each copy. It now reuses a membership set, visits each actor once and removes missing actors in one pass: O(n) rather than O(n squared). The interpolation coefficient is calculated once per frame. Join, disconnect, reconnect and the 160-unit teleport threshold retain their behavior.
- The screen vignette gradient is created on canvas resize and reused per frame. Its coordinates retain the canvas device-pixel scaling.
- HUD text updates skip textContent writes when the displayed value is unchanged. Time-sensitive values still update with incoming snapshots.

## Measurement and scope

Run `node scripts/benchmark-motion.mjs` after building. It compares the previous interpolation loop with the new one using stationary synthetic actors, 500 warm-up frames, five alternating samples of 2,000 frames and median CPU times. It is an isolated routine benchmark, not a browser FPS, multiplayer capacity or whole-game performance claim. The 512-actor case is a stress fixture, not supported server capacity.

On the local Node24.19.0 run used during development:

| Synthetic actors | Before, ms / 2,000 frames | After, ms / 2,000 frames |
| --- | --- | --- |
| 32 | 10.32 | 3.03 |
| 128 | 129.38 | 11.70 |
| 512 | 2,438.84 | 49.67 |

Timings vary with the machine and load. Browser asset totals are 249.1 KiB raw / 73.5 KiB estimated gzip, below the existing guard. Two motion regression tests cover interpolation, position reuse, the exact teleport boundary, absent actors and rejoining actors. Browser inspection in an isolated world checked the scene, movement, basic attack feedback, live HUD and reload/rejoin; no warnings/errors were captured. High-DPI appearance and actual frame-time profiling on multiple devices remain follow-up work.

Full local checks exposed existing equipment-driver timing assumptions. A diagnostic run captured full-speed destination oscillation while health remained 100; the test now eases its final approach and retains the exact arrival threshold. Aura pursuit now selects wild monsters and stops only when the player is also on wild ground, avoiding an immune target or a player waiting inside sanctuary near a monster across its boundary. Failures report test positions, health and eligibility. No combat rules or effect assertions were removed.

Keep future work driven by profiles. Server capacity/load tests, renderer culling and broader UI caching need evidence before adding complexity.

GitHub also exposed a cross-client duel-test race: the winner's completed snapshot and the loser's older active snapshot can already sum to the expected conserved coins, while the latter still has zero losses. The test now waits for both sockets to observe the same completed duel before its unchanged payout, win/loss and restart assertions. No fixed sleep or relaxed assertion is used.

## Runtime and wilderness readability pass

Nearest eligible target selection now scans once using squared distances, preserving first ties and strict range boundaries. Server NPC AI, resource gathering and client resource/threat hints use it. The renderer skips offscreen nodes, loot and living actors with padding for sprite edges, and sorts visible actors by their interpolated depth. Static minimap terrain is downscaled once instead of every frame. SQLite reuses its snapshot statement; empty joined-client rosters skip snapshot serialization. WebSocket pings every 30 seconds terminate sockets that miss the following pong window, using existing disconnect/save cleanup. The inactive shop-concept tab and unused CSS were removed; the disabled future shop API remains.

Reproducible synthetic benchmark: build, then run node scripts/benchmark-spatial.mjs. Median of five samples, 20,000 nearest selections each: 32 players 33.79 to 1.37 ms; 128 players 152.38 to 4.29 ms; 200 players 277.63 to 6.75 ms on the development machine. These are routine CPU measurements, not overall FPS, load-test results or supported server capacity.

The full disposable verification passed 91 rules/storage tests, boss simulation and every multiplayer protocol stage. Four new tests cover selection boundaries/ties, padded viewport culling and heartbeat responsiveness/failure. The standalone package booted with its new heartbeat module, all 54 packaged file hashes matched and no player data/tests/Git files were included. Browser movement in a disposable packaged world showed the minimap, threat hints, enemy role/XP labels and two equipment tabs; no warnings/errors were captured. Final browser assets: 27 files, 258.0 KiB raw / 76.4 KiB estimated gzip. A padding test is not a substitute for device frame profiling. See WILDERNESS_PVE.md for researched design recommendations and remaining limitations.
