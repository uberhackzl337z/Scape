# Scape project context

Updated October 17, 2026. Source repository: https://github.com/uberhackzl337z/Scape.
Scape is a working title.

## Core concept and constraints

The recovered design is a lightweight multiplayer gathering game: collect resources into a limited bag, cross a dangerous PvP area, and deposit at one central bank to earn XP. The central bank concentrates encounters. This is a recovered concept, not a verbatim original specification. The current map, enemies, equipment and economy are prototype mechanics added during implementation.

Keep graphics minimal and downloads small. Prefer improving a playable loop over speculative systems. Keep decisions and verification notes in this repository. Do not claim unlimited cross-chat memory.

## Implemented prototype

TypeScript compiles to browser/server JavaScript. Canvas 2D draws the client; a Node.js 24 server owns movement, combat, inventories, market trades, skills, duels and scores. WebSockets replicate one shared world. SQLite stores progression, equipment, economy and interrupted duel refunds. Rendering is separate from simulation, supporting a future 3D client with substantial additional work.

The playable prototype includes 25 skills, ten resources, 27 recipes, a 12-resource haul, five equipment slots, five rarity tiers, three elemental sets, six simple biomes, three enemy types and a boss. The fixed-price player exchange supports partial purchases and offline seller payments. High scores separate PvE, PvP, overall and individual skills. Earned-coin duels escrow 10-500 coins per player. No real-money purchases or cash-out exist.

Left mouse is a free basic attack: tap or hold, weapon recovery 0.35-0.5 seconds, no stamina/arrows/runes. Right mouse is the weapon secondary with its own costs and cooldown. Keep those controls intact. Elemental gear procs affect PvE monsters; base armor and direct damage also affect PvP. All combat equipment slots are free.

## Operational limits

Character bearer keys are private access credentials, not verified recoverable accounts. Do not publish saves, keys, environment files or private discussions. Public competitive play and payments need account hardening, abuse controls, backups, load testing and an operations review. Docker/Caddy files are prepared but have not been exercised in a verified container environment.

Source availability, automated checks, cloud AI development and public game hosting are separate milestones. Uploading this repository does not start a live game server or prove a cloud coding environment is active. The Scape cloud environment is published and a 10 a.m. America/Chicago cloud review targets this repository. The old local review is paused. See docs/CLOUD_STATUS.md for observed checks and remaining trial-run/restoration verification.

## Development and handoff

Use the pinned Node version in .nvmrc and pnpm version in package.json. Install with pnpm install --frozen-lockfile. Run pnpm run verify:cloud for compilation, rules/storage tests, boss simulation and disposable multiplayer/economy checks. Never test against a live player's world or invent a successful check. Preserve production data; changes should be small and reviewable.

## Scape naming and continued development

The game is named Scape. Display titles, default world name, package name and new packaging use this name. The browser migrates pre-rename identity keys to scape-name/scape-token so existing characters remain accessible; the legacy read and stable world ID are compatibility details. Do not remove them as cosmetic cleanup. See docs/DEVELOPMENT_PRIORITIES.md for newly authorized implementation priorities.

## Expedition journal implementation (October 17 cloud continuation)

Four sequential, one-time prototype contracts now connect site gathering/banking, workshop planks/bars, ordinary PvE and the Warden. The server owns progress and fixed coin rewards (30/45/60/120); J opens a native dialog with exact objectives, status and claim access. Legacy journals start empty without inferring historical actions. Journal and wallet share the existing transactional snapshot; rewards cannot be claimed repeatedly or from client-supplied progress. Free basics, separate secondaries, PvP and duel rules remain intact. Equipment comparison includes set-threshold stat changes; secondary feedback explains missing resources and cooldown; boss warnings show time to impact. See docs/CLOUD_HANDOFF.md for actual execution and next work.
