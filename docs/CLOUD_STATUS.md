# Cloud development status

Verified October 17, 2026.

Source lives in https://github.com/uberhackzl337z/Scape. The sanitized game source is public by the owner's explicit choice. Player saves, character keys, private conversations and personal machine paths are excluded.

The Codex GitHub connector is restricted to Scape. The Scape cloud environment has been prepared, tested and published with private Only me access. Setup uses Node24.19.0 and pnpm10.28.0, retains dependencies, and records installation/startup instructions without production secrets. The complete verification suite and development-server smoke test passed during cloud setup. A fresh task subsequently restored the published snapshot, implemented expedition contracts and pushed its work to pull request #1; see the restoration evidence below.

The first GitHub-hosted Linux run passed for commit 16b21791675b22448f18117aac7512bb6047e7b4: [Game stability checks](https://github.com/uberhackzl337z/Scape/actions/runs/39007604310). Compilation, all 74 rules/storage tests, boss simulation and disposable multiplayer, market, scores, skills, equipment and SQLite duel/restart checks passed. This is not a load test or a claim of bug-free balance.

The owner's Daily Scape stability review is ACTIVE in ChatGPT's cloud scheduler, daily at 10 a.m. America/Chicago. Its UI confirms Runs on Cloud. It targets the same repository through connected GitHub tools and uses the published environment when available. A manual trial was dispatched; completion of that scheduled review has not yet been observed. The old desktop review is paused to prevent duplicate local work. GitHub's checks-only daily workflow is separate from the AI review.

No public game server has been deployed. Cloud development and checks do not keep the multiplayer game online for players. The local preview still needs the machine running it; public play needs an always-on game host, persistent storage and operations work.

For later reviews: read the latest repository documents, investigate actual failures, keep changes small and reviewable, preserve free left-click attacks and separate right-click abilities, test disposable worlds and use actual CI evidence. Never expose production saves, add purchases, spend money, deploy publicly, auto-merge or invent completed tests.

## Restored cloud task observed

A fresh task restored this published environment on October 17 and executed development and disposable multiplayer verification with Node24.19.0/pnpm10.28.0. The snapshot was older than the feature branch; an explicit fetch/checkout restored `scape-name-and-completion` at d8c4986 before implementation. Network-enabled execution supports local protocol test servers. See [CLOUD_HANDOFF.md](CLOUD_HANDOFF.md) for implemented contracts, evidence, limitations and next review priorities. This verifies restoration and hands-on cloud execution; completion of the separately scheduled review remains unobserved.
