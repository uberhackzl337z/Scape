# First compiled test package and distribution assessment

Recorded October 16, 2026. This is a project assessment, not a revenue forecast or a platform decision approved by the user.

## Completed package

Version 0.5.0 compiles from TypeScript to JavaScript. The local-test ZIP includes the browser files, compiled authoritative Node.js server, its ws 8.22.0 dependency/license, a Windows launcher, instructions and a SHA-256 file manifest. It excludes source maps, tests, compiler, personal saves, backups and resume tokens. Node.js 24.12+ and a desktop browser are prerequisites; no runtime installer is bundled.

- ZIP: `artifacts/releases/ (historical test archive)`, 106,302 bytes (103.8 KiB).
- SHA-256: `b216f4c26b6b5c0352bebf38b2b89729536c2bc59875781777775887955539b4`.
- Local launcher: extract the ZIP, run START-LOCAL.cmd, then open http://127.0.0.1:3030/ when ready. Normal development remains on 3000. Each recipient starts a separate world; recipients do not automatically join one shared server.
- Compilation and 57 rules tests passed. Verified every extracted file against the manifest, the isolated bundled ws dependency, actual server startup on 3035, HTTP assets/private-file protection, two network clients, movement replication, weapons/dodge, rejected forged XP/coins and a new v4 save. A read-only normalization check retained current saved wallets, bank balances, inventory and skill records. These checks do not establish zero defects or production readiness.

`pnpm package:local` rebuilds, tests and creates a fresh uniquely named runtime folder under artifacts/releases. ZIP creation is separate. Never archive the entire project or include data/ when sharing a fresh test build.

## Browser versus Steam economics

No comparable evidence found establishes that either distribution method is universally more profitable for small game developers. Platform-wide revenue or standout successes do not establish typical developer profit. Compare paying players, retention, acquisition cost, fees, operating costs and development/support time.

Direct browser sales can retain more per transaction. Stripe currently lists US domestic-card processing at 2.9% + $0.30: an illustrative $10 purchase leaves $9.41 before other costs. This is payment processing, not a complete merchant-of-record/tax/support service. We would have to attract players ourselves and pay for the multiplayer backend. [Stripe pricing](https://stripe.com/pricing).

Steam gives a commercial storefront and distribution channel; it does not guarantee traffic or profit. Budget around the standard 30% commission at a small game's likely revenue scale; higher tiers apply to earnings beyond $10m/$50m. On a simplified $10 transaction with a 30% share, $7 remains before tax, refunds, operations and other costs. At identical prices and all other costs held equal, approximately 34.4% more Steam purchases would offset the difference versus the Stripe illustration. This is arithmetic, not a sales forecast. Current reporting summarizes Valve's tier structure: [GamesMarket, March 9, 2026](https://www.gamesmarket.global/average-cut-for-all-non-valve-games-sold-on-steam-in-2025-was-24/).

Steam Direct costs $100 per product, recoupable after at least $1,000 Adjusted Gross Revenue, rather than $1,000 profit. It requires onboarding, bank/tax details, store/build review, and release timing requirements. It does not require pitching a publisher. [Steam Direct](https://partner.steamgames.com/steamdirect).

A browser portal differs from our own website. Poki describes a 50/50 split for users it acquires and 100% developer revenue for directly acquired users under its model; it also requests web exclusivity. These are platform-specific terms, not universal browser economics or a guaranteed acceptance offer. [Poki developer guide](https://developers.poki.com/guide/working-with-poki).

## Recommendation for this game

Browser first for small-group playtests and evidence that people return to the gather/risk/bank loop. Consider Steam once gameplay has earned that interest. A later downloadable client can retain the TypeScript rules and Node backend; desktop packaging, runtime footprint, Steam integration and a polished release still require work. Moving to Steam does not require moving to 3D. Both clients could use one hosted authoritative world after suitable deployment work.

Before shared public play: replace temporary identities with recoverable accounts, harden persistence/backups and economic abuse controls, then test realistic concurrent play and reconnects. Before charging: establish repeat play, tune the economy/combat and build a complete player-facing release. Current saves use local files and the server caps connections at 16; no population benchmark or production economy audit has been completed. Keep earned-only wager coins separate from any future paid monetization. No desktop executable, public deployment, Steam registration/payment or monetization was performed in this step.
