# No-cost deployment readiness checklist

This document prepares deployment choices; it does **not** deploy a server, create paid resources, or authorize public access.

## Before inviting players

1. Merge only reviewed changes with a green `Game stability checks` workflow on the **PR head commit**. Run `pnpm run verify:cloud` in a disposable environment. A successful older main-branch run does not verify a newer PR.
2. Start with a small invite-only playtest. The default `MAX_PLAYERS=16` is a connection limit, **not** proven capacity. Test two real browsers, simultaneous gathering/combat, disconnect/reconnect, market and duel settlement.
3. Never upload `data/`, `artifacts/`, `profiles.json`, `world.sqlite*`, bearer keys, environment secrets or live backups to GitHub. Do not reuse real player saves in tests.
4. Verify that saves survive a container restart and that an off-host backup can be restored into a **new** data directory. Test a consistent SQLite backup, not a copy of a live WAL database.
5. Require HTTPS for the public origin. Production requires `APP_ENV=production`, `STORAGE=sqlite` and `PUBLIC_ORIGIN=https://actual-hostname`. The origin must exactly match the URL players open.
6. Run exactly **one** authoritative game instance against the SQLite volume. Do not use multiple replicas or an ephemeral filesystem.
7. Check `/health` returns HTTP 200 and `/api/world` identifies the expected world. Verify a browser can establish `/live` WebSocket through the chosen HTTPS proxy.
8. Review resource consumption, crash/restart behavior, service limits, backups, privacy, and cost alerts before sharing broadly. Do not promise 24/7 uptime or secure account recovery.

## Option A: no-cost temporary playtest from your computer

- Run the local server using the documented development startup, with disposable test profiles.
- Use a reputable HTTPS tunnel with WebSocket support. Configure the game server's `PUBLIC_ORIGIN` to the **exact** externally assigned HTTPS origin before inviting players. Restart if the tunnel hostname changes.
- Avoid router port forwarding; limit the invited audience and shut down the tunnel and server after the test.
- Your computer must remain awake and connected. Tunnel free-tier terms, hostname stability and access controls vary; verify them before use.
- This is a temporary test, **not** always-on hosting.

## Option B: free-tier cloud VM, subject to provider eligibility

- Confirm that compute, storage, outbound bandwidth, public IPv4, backup storage and any required verification are actually free **for the selected account and region**. Free-tier capacity can be unavailable.
- Use a small Linux VM with Docker/Compose and a DNS name you control. The repository includes `compose.yaml`, `deploy/Caddyfile` and a `Dockerfile`; these have not been validated as a complete deployed stack.
- Point DNS at the VM, set `GAME_DOMAIN` to that hostname, and allow inbound TCP 80/443 for Caddy. Keep SSH restricted; never expose the game process's port 3000 directly.
- Start only after a successful isolated container build and verified backups. Do not copy live SQLite files while the world is running.
- Set billing alerts and confirm that the provider will not automatically bill beyond the intended free allowance.

## Option C: managed application host

- Confirm support for an always-on Node.js process, WebSocket upgrades, **persistent mounted storage**, health checks, and a single instance. Sleeping services and ephemeral disks are not suitable for durable player progress.
- Deploy the existing Dockerfile with a persistent volume mounted at `/game/data`. Set `APP_ENV=production`, `STORAGE=sqlite`, `DATA_DIR=/game/data`, `WORLD_ID=the-crossing`, `MAX_PLAYERS=16` and `PUBLIC_ORIGIN` to the assigned HTTPS origin. Use the provider's assigned `PORT` where applicable.
- Disable automatic deployments until changes are tested and approved. Confirm billing before creating resources.

## Release acceptance checklist

- [ ] PR-head GitHub Actions checks pass
- [ ] Container build and HTTP health endpoint pass
- [ ] Two remote browsers connect to the same world
- [ ] Equipment, market, crafting, duels and reconnection smoke-tested
- [ ] Graceful restart preserves character progression and balances
- [ ] Consistent backup restored successfully to a clean isolated world
- [ ] WebSocket disconnect and stale-session recovery tested
- [ ] Cost/usage alerts configured; access limited to test participants
- [ ] Explicit owner approval obtained before any deployment or spending

## Current blockers

The October 17 WebSocket-heartbeat PR had a failed `verify:cloud` run: `scripts/equipment-e2e.mjs` timed out waiting for an elemental burn effect. A diagnostic update on that PR captures player/enemy state if it recurs. **Do not treat this as fixed until a newer PR-head run passes.** No public server is currently deployed.
