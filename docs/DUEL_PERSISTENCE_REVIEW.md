# Duel persistence review

## Scope and baseline

Cloud continuation on October 17, 2026 (America/Chicago). A managed remote Linux runtime was observed, and a real HTTPS clone and remote-branch fetch succeeded for this repository. The baseline is PR #9, `scape-email-accounts-store`, at `b80ca759d4de0cde274ac0b96ff272d72b1be1c8`. This branch builds directly on that baseline; it does not integrate PR #8 or change main.

Read AGENTS.md, PROJECT_CONTEXT.md, CLOUD_HANDOFF.md and DEVELOPMENT_PRIORITIES.md. CLOUD_AGENT.md was absent. Production account/payment/hosting activation remains paused. No provider activation, purchase, deployment, merge, save reset or real player-world test was performed. Parent-owned equipment UI, HTML/CSS, shared world and layout/render files are untouched.

## Reproduced failure and fix

The real WebSocket duel test gathered two pieces of wood, entered a wagered duel, waited for its SQLite escrow commit, killed the server and resumed the same identities. On the baseline, the wager refunded but the carried wood changed from 2 to 0. Existing recovery tests manually constructed a `duelBag`; they missed that the server's normal profile capture did not write it.

The server now uses a persistence capture function that deep-copies a duelist's carried haul into the existing `duelBag` field. No save format or world rules change is required. Ordinary players do not receive protected-haul snapshots. Graceful shutdown remembers duel membership before cancellation clears it, captures the refunded wallets and protected hauls together, and ignores further socket messages/close-handler saves during that final snapshot. Repeated shutdown signals cannot settle again.

Regression coverage includes large uncapped haul copies, recovery/refund behavior, and real SQLite/WebSocket forced-crash plus graceful-shutdown recovery with the same character keys and exact bag and wallet assertions. Existing assertions remain. Consent setup disables attacks while approaching the opponent, and the extra gathering step chooses the nearest stocked wood node, avoiding an unnecessary dangerous expedition. Initial extended-test setup runs timed out; they are not counted as verification passes. Failed consent/escrow checkpoints now include disposable-state diagnostics.

## Review observations

- Persistence serializes snapshots before queued writes; world, wallets, market listings and escrow share one SQLite snapshot. A writer lock excludes a second authoritative process. Existing corruption/restart checks remain enabled.
- Client blur, hidden-page and socket-close handlers clear held movement, attack and target state. Server input expires after 350 ms; unanswered heartbeat pings terminate stalled sockets. This is source review plus existing tests, not a browser reconnection stress test.
- Market purchases check safe recipient coin balances and stock limits before mutation; offline seller payments and escrow refunds have existing protocol coverage. This focused pass does not establish complete economy safety.

## Validation and next work

Validation results and exact published commit/CI links are recorded in the associated PR. Use Node 24.19.0, pnpm 10.28.0, locked dependencies and `pnpm run verify:cloud`; all protocol worlds are disposable directories under ignored artifacts. No data or logs from those worlds belong in source.

Next priorities are a deterministic browser reconnection/overlapping-socket test, storage-write failure/recovery injection, and safe-integer boundary review across duel winnings/refunds and seller payments received during a duel. These remain separate follow-up work. No browser visual check, load test, external-provider exercise, deployment or backup-restoration drill was performed in this pass.
