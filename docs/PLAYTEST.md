# Hands-on playtest and hosting preparation

October 17, 2026. A fresh disposable world and an ordinary new browser character were used; no seeded wallet, items or admin grants. The saved owner character was not played.

## Played and observed

- Gathered six berries, exhausted the site, released gathering and crossed contested ground.
- Died while browsing a journal in contested ground, recovered the dropped haul, reached sanctuary and banked it. The world continuing during dialogs is intentional and documented.
- Claimed the first 30-coin contract, purchased four stored wood with earned coins, crafted two planks in one batch, then claimed the 45-coin workshop contract. Purchased resources granted no gathering XP.
- Bought and used a healing tonic, switched to spear, used basic attacks/weapon ability and earned 65 combat XP from two ordinary monster defeats. Also exercised left/right mouse inputs and retreat to sanctuary. This is not a completed boss/balance playthrough.
- Inspected the leaderboard, reloaded and resumed: 31 coins, 65 combat XP, two defeats, the spear and one bank run remained. No console warnings/errors were captured.

## Findings and changes

Exhausting a site produced a misleading move-closer message and generic exploration hint. The server and nearby HUD now show depletion and seconds until regrowth; a regression verifies no premature collection and successful collection after regrowth. Archery skill text incorrectly said all shots use arrows; it now distinguishes free basics from Twin shot's ammunition.

The hosting container had not been built here because Docker is absent. A separate GitHub Linux job now builds it, exercises production-origin multiplayer/assets on a disposable volume, restarts and verifies the same character identity survives. Its result must be checked on the final commit; this does not exercise Caddy certificates, a real host, off-host backup restoration, public security, latency or load.

See HOSTING.md for the staged single-server alpha plan and currently checked provider prices. Keep the player cap at 16 until measured load tests justify a change. Account recovery, abuse prevention and restore drills remain release work.

The first Linux container image built successfully and passed 92 tests during image build. Its probe ran immediately after Docker published the port and received a transient connection reset before Node listened. The readiness probe now retries connection resets as well as refusals, with a 60-second overall bound and two-second attempt timeout. No game assertion was weakened; subsequent asset/multiplayer/restart checks must still pass. Final-commit CI is separate.
