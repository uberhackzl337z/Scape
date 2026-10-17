# Scape project guide

Start with the root [README](../README.md) for controls and launch instructions, then [project context](../PROJECT_CONTEXT.md) for the core design and constraints.

## Source and generated files

| Location | Responsibility |
| --- | --- |
| `src/client/` | Canvas drawing, browser input, menus and feedback |
| `src/shared/` | Authoritative rules, catalogs, contracts, inventory and economy |
| `src/server.ts`, persistence/storage modules | Connections, validation and saved worlds |
| `src/tests/` | Rules, economy, migration and persistence regression tests |
| `public/` | Original browser HTML, CSS and small visual assets |
| `scripts/` | Verification, protocol checks, backup and packaging commands |
| `deploy/`, Dockerfile, compose.yaml | Prepared hosting configuration |
| `dist/` | Generated JavaScript; rebuild rather than edit or commit |
| `artifacts/` | Disposable test worlds, reports and historical packages; do not ship as source |
| `data/` | Private saved worlds and backups; never commit or package |
| `docs/private/` | Optional private history and operational notes; ignored by Git and excluded from deployment |

Keep new module filenames descriptive and in kebab-case. Use **Scape** in player-facing titles and **scape** for the package and new artifact prefixes. Legacy identity keys and the saved-world ID are compatibility data; renaming those can break existing characters. Historical packages are evidence of older builds, not the current multiplayer release.

## Current reference documents

- [Development priorities](DEVELOPMENT_PRIORITIES.md): authorized work and constraints.
- [Cloud handoff](CLOUD_HANDOFF.md): completed contracts/combat slice, checks and remaining work.
- [Cloud development](CLOUD_DEVELOPMENT.md) and [status](CLOUD_STATUS.md): environment and automation boundaries.
- [Equipment design](GEAR_DESIGN.md): inventory, rarity, sets and elemental effects.
- [Hosting](HOSTING.md): the separate always-on game-server requirement.
- [Validation](../VALIDATION.md): recorded checks and their limits.
- [Rendering performance](PERFORMANCE.md): measured interpolation costs, caching and profiling limits.
- [Gathering animations](GATHERING_ANIMATIONS.md): skill tools, shared action state and cancellation behavior.
- [Resource hauls](RESOURCE_HAULS.md): uncapped carrying and bounded inventory rendering.
- [Stability review](STABILITY_REVIEW.md): observed PR checks and remaining operational limits.
- [Release assessment](RELEASE_PLAN.md): historical local-test packaging and distribution research; check its recorded date.

## Keeping the browser game light

After building, run `pnpm run check:assets`. It reports public assets and served client/shared JavaScript, sorted by size, and rejects totals above 512 KiB raw or 128 KiB estimated gzip. The full `verify:cloud` command includes this check. These are explicit development budgets, not player-capacity or network-performance promises. Source maps, server code, tests, notes and saved data are excluded from the browser measurement. Gzip is estimated per file; real transfer depends on negotiation and excludes ongoing WebSocket traffic. The prepared Caddy configuration already enables compression, but deployment remains separate and unverified.

Prefer measured improvements over broad rewrites. Explain any deliberate budget increase in the pull request. Do not add heavy media or dependencies just to change the appearance of progress.

`pnpm run package:local` remains a developer testing aid. Players ultimately join one hosted world; distributing this package starts separate worlds. Generated instructions derive skill/recipe counts from compiled catalogs so they match the packaged build.

- [Email accounts and store](ACCOUNTS_AND_STORE.md): chosen-name email OTP accounts, browser Stripe checkout, operational setup and release limits.
