# Gathering animations

Hold E at a stocked resource site. Successful server gathering creates a short shared visual action, so nearby players see the same activity. It replaces the held combat weapon temporarily and displays the resource action above the player.

| Resource | Visual |
| --- | --- |
| Wood | Axe swing and wood chips |
| Ore, crystal | Pickaxe stroke with resource-colored fragments |
| Clay | Shovel stroke and dirt fragments |
| Raw fish | Bobbing rod, line, float and pool ripples |
| Berries, herbs | Reaching/picking hand and colored leaves |
| Grain, flax | Harvesting hand and sickle |
| Hide | Checking a snare loop |

These cover all ten resources and eight gathering skills. Tool animation and subtle body movement use the existing Canvas renderer. No images, sprites, audio, dependencies or additional animation timers are required. Reduced-motion preferences use a static tool/action indicator and suppress body movement and flying fragments.

The server authors an optional transient `gathering` state only after a resource is actually collected. It expires at the existing gathering recovery time and clears on release, stale input, movement, attacking, dodging, death or a duel. Full bags, depleted/out-of-range sites and banking do not start a gathering action. Existing gathering rewards, cooldowns and combat rules are unchanged. A final successful stroke can finish after exhausting a node or filling the bag.

The client animates against the last server snapshot time plus elapsed monotonic frame time, avoiding a requirement that observers' wall clocks match. It yields to combat/dodge poses and rejects expired or distant actions. Legacy snapshots with no action simply draw normally. `profileOf` excludes visual state, so no saved-world migration or character reset is needed.

Four regression tests cover all resource kinds, authoritative snapshot state, save exclusion, cooldowns, cancellations, invalid attempts and rendering expiration/precedence. The multiplayer smoke check verifies a second socket sees the real action, ignores forged animation input and sees release cancellation. The smoke driver waits for its earlier dodge to finish before approaching a resource. A disposable browser check observed another player picking berries and captured no console warnings/errors. Every individual tool style and reduced-motion appearance have not been inspected on multiple devices.
