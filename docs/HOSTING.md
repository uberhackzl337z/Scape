# Hosting one interconnected world

Reviewed October 17, 2026. Hosting configuration is prepared, not purchased or publicly deployed.

## What players will need

Players open one HTTPS URL in a desktop browser. That browser downloads the small interface and graphics code, but does not own a private copy of the world, coins or character progress. There is no offline gameplay or player-hosted server requirement. One authoritative Node.js process owns movement, combat, gear, market orders, wagers and saved profiles. All players connected to that process share its world and economy. The previous v0.5 local-test ZIP is an old testing artifact, not the release model going forward.

The development server at 127.0.0.1 is still reachable only on this computer. An internet host is the next operational step. Steam is not required.

## Providers and contacts

My initial recommendation is a **DigitalOcean Basic Droplet with 2 GiB RAM / 1 vCPU** for a small private playtest. Its listed base price is **$12/month**, with 50 GiB SSD and 2,000 GiB transfer; backups, excess usage, taxes and a domain can add costs. This is a starting configuration to measure, not a claim about player capacity. [Current pricing](https://www.digitalocean.com/pricing/droplets).

You can sign up directly; no publisher or negotiated hosting contract is necessary for a small test. If you want a person to advise on hosting, contact [DigitalOcean sales](https://www.digitalocean.com/company/contact/sales). This is a Linux VM: we still administer deployment, updates, backups and monitoring.

**Railway** is the easier managed-deployment alternative. Hobby has a **$5 monthly minimum including $5 usage credit**, rather than an unlimited $5 server; resource usage and outbound traffic affect the bill. [Pricing and published team contact](https://railway.com/pricing). Its published contact is team@railway.com; no message has been sent. It supports [WebSockets over HTTP/1.1](https://docs.railway.com/networking/public-networking/specs-and-limits) and [persistent volumes](https://docs.railway.com/volumes/reference). Attach a volume, disable sleeping, and run exactly one game replica. Do not put SQLite on an ephemeral filesystem.

For either provider, describe the requirement as: a small always-on multiplayer browser game, Node.js 24.12+, HTTP/WebSockets behind HTTPS, one authoritative process, writable persistent SQLite storage, backups, health checks and a region near the initial players. Avoid static-only hosting or request-only serverless functions for this continuous simulation.

## Prepared deployment

- `Dockerfile`: builds/tests TypeScript, retains production dependencies, runs as an unprivileged user and exposes an HTTP health check. Docker is unavailable on this development machine, so the container image and gateway have **not** been built or exercised here.
- `compose.yaml`: one game container, persistent world volume, Caddy HTTPS gateway and certificate volumes. It requires an actual `GAME_DOMAIN` with DNS pointing to the host. Only the gateway publishes ports 80/443.
- `deploy/Caddyfile`: terminates HTTPS and proxies HTTP/WebSocket traffic to the game container.
- `APP_ENV=production` requires `PUBLIC_ORIGIN=https://your-domain` and SQLite. Origin checks use that exact configured origin instead of trusting a proxy Host header. Set `WORLD_ID` once and keep it stable. The database rejects another world ID, and an OS-backed SQLite writer lock rejects a second simulation using the same data directory. This is intentionally not a horizontally scaled architecture.
- `MAX_PLAYERS` defaults to 16. This is a connection cap, not a tested population promise. Measure tick time, memory, bandwidth, disk use and latency before increasing it.

On a configured Linux host, set GAME_DOMAIN and use Docker Compose to build/start the prepared services. Deploy source without data/, artifacts/, tokens or development backups. Import a **consistent** world backup separately if retaining this prototype's progress; copying raw live SQLite files can omit WAL transactions.

## Saves and backups

SQLite is now the default. START-GAME.cmd also selects it explicitly. On first creation, valid existing profiles.json data is imported into world.sqlite; subsequent starts load SQLite, not the old JSON file. Profiles, equipped slots, market orders and wager escrows commit together in a transaction with WAL and FULL synchronous mode. Legacy JSON remains untouched as a migration backup. `STORAGE=json` remains available for isolated compatibility tests, not production.

Run `pnpm backup:world`, or `node scripts/backup-world.mjs`, to create a consistent SQLite backup under data/backups even while the world runs. Copy backups off the hosting machine, encrypt/restrict them, rotate them and perform restore drills. In the container the same script is available. Restore into a **fresh data directory** with all game writers stopped, preserving WORLD_ID; do not overlay a backup on an open database or mix it with old WAL files.

Player location, monsters, resource timers and dropped field bags are transient; saved progression/equipment, wallets, listings and unsettled wagers persist. This is not a full map/timer snapshot. If a save fails the simulation pauses, economic actions stop and health returns 503 until storage recovers. Recent actions can still roll back if the process dies before their queued commit.

Private bearer access keys now resume characters across browsers/devices, and duplicate active sessions are rejected. They are not verified accounts or email recovery. Before charging money or public competitive play, add proper recoverable accounts, stronger abuse controls, load testing and an operations pass. Checkout remains absent.

## Recommended next steps

1. Start with a small invite-only browser alpha on one DigitalOcean Basic 2 GiB / 1 vCPU Droplet near the first players. Current base price was rechecked at $12/month; the 50 GiB disk and 2,000 GiB transfer are included. Allow a planning budget of roughly $20-30/month for the VM plus backup/monitoring overhead, with domain registration and taxes separate; that range is an estimate, not a quoted bundle. No Steam agreement is needed.
2. Review and integrate the Scape feature PR stack in dependency order, then freeze a verified release commit. Keep development/test worlds separate from the hosted world. Do not deploy an arbitrary main branch that lacks the tested features.
3. Build the production container on Linux. The new container CI job builds the actual image, tests its assets/WebSockets under production origin checks, restarts it with the same persistent volume and resumes the same private character identity. This complements the rules/economy suite. Consult the exact commit's CI result; a local build alone does not prove the container works. Real HTTPS/domain and gateway behavior still need a staging check.
4. Configure a domain, DNS, HTTPS gateway, exactly one simulation, persistent disk, restart policy, budget alerts, off-host consistent backups and external health monitoring. Keep GAME_DOMAIN, PUBLIC_ORIGIN and stable WORLD_ID consistent. Never scale this SQLite world to multiple replicas.
5. Import a consistent backup into a fresh stopped volume only if intentionally keeping prototype progress. Perform an off-host backup restoration drill before inviting testers. Verify cross-device login, two real remote players, restart retention, network interruption, and database/storage failure behavior.
6. Start with 5-10 invited testers as a controlled experiment; this is a proposed test group, not measured capacity. Leave the connection cap at 16 until concurrency/soak tests establish actual CPU, memory, bandwidth and latency limits. Add verified recoverable accounts, abuse controls, support/rollback procedures and privacy handling before broad public competitive play or purchases.

The rented host keeps the game online when the developer's PC is off. It still needs paid hosting, monitoring, backups, updates and occasional incident handling; it will not maintain itself indefinitely. Cloud AI development and live game hosting are separate services. For previously recorded development scheduling evidence, consult CLOUD_STATUS.md; this hosting guide does not certify a current automation state.

Railway remains a managed alternative: its current Hobby minimum is $5 including $5 usage, with actual resources billed beyond that. It needs a persistent volume and exactly one awake replica. DigitalOcean is the recommendation here because the existing Compose/Caddy plan maps directly to a single VM and gives a clear starting resource allocation; it does require Linux administration.
