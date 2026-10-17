# Cloud development for Scape

Repository: https://github.com/uberhackzl337z/Scape. Keep game work in this repository.

## Fresh environment

Use Node from .nvmrc and pnpm from package.json. Install locked dependencies:

```text
pnpm install --frozen-lockfile
pnpm run verify:cloud
```

The verification command builds TypeScript, runs rules/storage tests and a boss simulation, then starts disposable multiplayer worlds for replication, market, scores, skills, equipment and SQLite wager settlement. Never provide production data or character keys to an automated coding environment. No application secrets are required for these checks.

For interactive development, build and run pnpm start. The normal preview listens on loopback port3000. Use the platform's private preview facility if available; it is not production hosting.

## Cloud checks versus AI refinement

.github/workflows/game-checks.yml prepares GitHub-hosted checks on pushes, pull requests, manual dispatch and daily at 10 a.m. America/Chicago. These jobs run without the owner's PC. They test code and report failures; they do not independently implement improvements.

The Scape Codex cloud environment has been prepared, tested and published. The daily cloud review is ACTIVE at 10 a.m. America/Chicago; the local duplicate is paused. The manual scheduled review trial and fresh snapshot restoration remain unverified. See [CLOUD_STATUS.md](CLOUD_STATUS.md) for evidence. Routine reviews use connected GitHub tools, cloud execution when available, and actual GitHub Actions results.

[Official cloud environment setup](https://learn.chatgpt.com/docs/environments/cloud-environments)
[Official automation guidance](https://learn.chatgpt.com/docs/automations?surface=app)

## Recurring refinement scope

Read AGENTS.md, PROJECT_CONTEXT.md, README.md and current verification notes. Review recent changes, run verify:cloud, diagnose failures and make small justified fixes in a reviewable branch/PR. Preserve the free left-click basic attack and separate right-click ability. Keep graphics lightweight and preserve progression/economy data. Avoid purchases, paid services, public deployment, automatic merges and sweeping balance changes. Record actual evidence and notify only for meaningful findings, completion, failure or required user action.
