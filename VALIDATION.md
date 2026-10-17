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
