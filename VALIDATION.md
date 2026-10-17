# Verification status

The current source snapshot was checked locally on Windows before its repository import on October 17, 2026.

- TypeScript compilation and 74 rules/storage tests passed.
- Disposable multiplayer checks covered replication, invalid input, marketplace transactions, offline seller payment, high-score searches, gathering/crafting/ranged combat/healing, equipment and persistence.
- SQLite duel checks covered actual knockout payout and interrupted-wager refunds.
- A solo simulation defeated the boss; human balance and player capacity remain unverified.
- The latest free basic attack was checked by simulation, WebSocket tests and browser play. Basic ranged attacks require no ammunition.

These are historical local results, not proof that a fresh Linux cloud run passed. Consult GitHub Actions for current run results. The complete verification command is pnpm run verify:cloud and uses disposable test worlds.

Docker deployment, public hosting, recoverable accounts, payment processing, load testing, and a scheduled cloud coding task have not been verified by this source import.

## Verified cloud execution

The complete GitHub-hosted Linux verification passed for the imported source commit on October 17, 2026: https://github.com/uberhackzl337z/Scape/actions/runs/39007604310 . Cloud environment onboarding independently passed the same full suite plus a development-server smoke check. See docs/CLOUD_STATUS.md for environment publication and scheduling limits.

## October 17 cloud continuation

The restored published workspace was refreshed to the PR feature branch, retaining Scape naming, identity compatibility and the stable world ID. The cloud continuation added four contract regressions plus a disposable WebSocket/SQLite contract suite. Checks cover actual server reward amounts and eligibility, duplicate/forged claims, ordinary/boss contributor progress, locked and failed actions, partial journal persistence, legacy migration, atomic bank-storage rejection and forced-restart reward retention. See docs/CLOUD_HANDOFF.md for the final complete-run result and limitations.

The baseline equipment test had a fixed-point burn timeout; an isolated rerun passed. Its input driver now approaches an enemy for the existing burn assertion rather than relying on a wall-clock patrol phase. No assertion was removed. Browser visual testing remains unperformed in this cloud task.

## Runtime and wilderness readability pass

Nearest eligible target selection now scans once using squared distances, preserving first ties and strict range boundaries. Server NPC AI, resource gathering and client resource/threat hints use it. The renderer skips offscreen nodes, loot and living actors with padding for sprite edges, and sorts visible actors by their interpolated depth. Static minimap terrain is downscaled once instead of every frame. SQLite reuses its snapshot statement; empty joined-client rosters skip snapshot serialization. WebSocket pings every 30 seconds terminate sockets that miss the following pong window, using existing disconnect/save cleanup. The inactive shop-concept tab and unused CSS were removed; the disabled future shop API remains.

Reproducible synthetic benchmark: build, then run node scripts/benchmark-spatial.mjs. Median of five samples, 20,000 nearest selections each: 32 players 33.79 to 1.37 ms; 128 players 152.38 to 4.29 ms; 200 players 277.63 to 6.75 ms on the development machine. These are routine CPU measurements, not overall FPS, load-test results or supported server capacity.

The full disposable verification passed 91 rules/storage tests, boss simulation and every multiplayer protocol stage. Four new tests cover selection boundaries/ties, padded viewport culling and heartbeat responsiveness/failure. The standalone package booted with its new heartbeat module, all 54 packaged file hashes matched and no player data/tests/Git files were included. Browser movement in a disposable packaged world showed the minimap, threat hints, enemy role/XP labels and two equipment tabs; no warnings/errors were captured. Final browser assets: 27 files, 258.0 KiB raw / 76.4 KiB estimated gzip. A padding test is not a substitute for device frame profiling. See WILDERNESS_PVE.md for researched design recommendations and remaining limitations.
