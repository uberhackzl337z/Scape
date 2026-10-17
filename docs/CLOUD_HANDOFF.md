# Scape cloud continuation handoff

October 17, 2026 (America/Chicago). Continue PR #1 on `scape-name-and-completion`, based on `d8c4986eeca2d680eb56bb2bccd8fb05f0822e89`. Main was not edited or merged. The restored snapshot was older; explicit feature-ref fetch was required because origin's fetch mapping selected only main. Existing changes were preserved; the feature checkout was clean before implementation.

## Completed slice

- Four sequential server-owned contracts: gather/bank, workshop planks/bars, ordinary monster patrol, Warden expedition. Fixed one-time rewards total 255 earned game coins. Each requires an explicit bank claim; no material turn-in or paid currency.
- J / Contracts opens a keyboard-accessible native journal showing objective counts, hints, exact rewards, locked/ready/claimed states and bank access. Progress comes from successful simulation actions; client progress/reward fields cannot grant anything.
- Optional journal migrates older profiles to zero progress without inferring kills, XP or inventory history. Deep-copied journal, wallet and claims share the existing transactional version5 snapshot. Reject malformed or inconsistent journal data rather than resetting it. Do not downgrade a world to pre-journal source.
- Secondary HUD explains cooldown/stamina/ammunition requirements; boss warnings show time to impact. Gear cards compare total replacement loadout stats including set thresholds and report changed set/passive state. Small desktop navigation wraps.
- Fixed full-storage banking: reject the entire deposit before spending the haul or granting coins/XP/progress, preventing over-limit saves that fail on restart.
- Equipment protocol test explicitly approaches a monster for its aura assertion. A baseline fixed-position wait timed out; isolated rerun passed, consistent with wall-clock-dependent patrol positions. Assertions and gameplay rules remain intact.

## Actual cloud evidence

Pinned Node24.19.0 / pnpm10.28.0 used in `/workspace/Scape`; invoke `/workspace/.scape-tools/node_modules/.bin/pnpm`. Network-enabled execution is necessary for loopback server binds in this sandbox. Initial default-sandbox baseline stopped with `listen EPERM 127.0.0.1:3047`; this was an execution restriction, not a game failure.

The full `pnpm run verify:cloud` passed during implementation, including compilation, rules/storage checks, solo boss, assets/replication, new contract protocol checks, scores, market/offline seller/restart, skills/crafting/healing, equipment/elementals/restart and SQLite duel knockout/crash refunds. The final full run after the banking fix also passed: 78 rules/storage tests, zero failures, and every protocol/simulation stage completed. A subsequent refinement to the partial-progress regression passed all four focused contract tests; the final equipment comparison adjustment compiled successfully. Local evidence: `artifacts/verified-final.log` and `artifacts/contracts-e2e.log` (ignored, not uploaded). Disposable logs and worlds stay in ignored `artifacts/`; no player data was used.

New regression coverage exercises successful real simulation gathering/banking/crafting/monster/boss actions, fixed reward amounts, invalid/duplicate/dead/duelling/remote claims, locked action rejection, malformed journals, full-storage atomicity, actual SQLite close/reopen and legacy migration. The new WebSocket test earns rewards normally, waits for SQLite commits, SIGKILLs/restarts, resumes the character and rejects duplicate/forged rewards. No test-only grant endpoint was added.

No browser/computer visual inspection, human balance test, load test, container deployment or public deployment was performed. No real users were granted test items. Browser identity compatibility reads and stable saved-world ID remain in place.

## Next review priorities

1. Human/browser pass at smaller desktop sizes: journal focus/scroll/status feedback, gear comparison clarity and telegraph visibility. Automated protocol checks do not establish visual quality.
2. Playtest the full four-contract journey with ordinary starter gear; adjust onboarding text/rewards only with evidence. Boss contract has simulation eligibility coverage; the live protocol test covers the first two contracts rather than a complete live boss journey.
3. Continue inventory/crafting/market/leaderboard empty/error-state polish and combat readability. Consider more explicit set threshold comparisons and per-enemy warning accessibility.
4. Review economy saturation/overflow beyond the fixed bank-storage path, save failure/recovery, reconnect pressure and public-competition abuse. Bearer identities still lack verified recovery; one-time contracts are per character, not per human.
5. Keep all further commits on the feature branch and update PR #1. No auto-merge, main push, public deployment, payment work or production-world tests.
