# Wilderness PvE direction

These are new design recommendations, not a recovered Discord specification. Keep Scape's lightweight shared map, central bank, uncapped resource stacks and server-owned combat. Do not replace the working loop with a large content framework.

## Implemented in the runtime pass

Living monsters show their combat role and base XP reward. In contested ground the HUD identifies the nearest eligible monster within 300 world units, its distance and a concise response to its attack. Rusher: sidestep the slash. Hunter: strafe across the bolt line. Brute: bait the slam and leave its circle. Warden: avoid bolt fans and leave the slam area; retreat can reset the encounter. Existing attack warnings, reward rules, boss reset and sanctuary boundaries remain authoritative.

This adds readable information, not new enemies, random affixes or increased rewards. Threat advice is advisory: another monster or player can still attack. PvP status remains visible.

## Research and next small experiments

- Old School RuneScape's official [Wilderness Boss Rework design blog](https://secure.runescape.com/m=news/wilderness-boss-rework---poll-blog?oldschool=1) discusses simple PvE patterns that leave attention for other players, distinct lairs/escape choices and lower-reward alternatives. This is a 2022 design source, not a claim about every current live rule. For Scape: retain clear tells and refuge boundaries; consider one marked camp with a visible retreat route before adding more bosses.
- Albion Online's official [Horizons overview](https://albiononline.com/update/horizons) describes temporary camps, guarded rewards and exploration objectives. For Scape: trial one temporary, server-owned PvE hotspot with a capped reward and clear expiration. Avoid rewarding AFK presence or creating endlessly farmable payouts. This hotspot is proposed, not implemented.
- Guild Wars 2's official [dynamic events overview](https://www.guildwars2.com/en-gb/the-game/dynamic-events/) emphasizes cooperative encounters in the shared world. For Scape: test contribution-based participation in a small public encounter before building a quest-instance system. Existing monster contribution rewards are retained; a new event framework is not implemented.

Measure completion time, deaths, reward per minute and return-to-bank behavior with disposable characters first. Then compare ordinary gathering, ordinary PvE and the boss so one route does not dominate. Mixed PvE/PvP needs escape opportunities and readable hazards; copying another game's reward rates would not establish balance here.

## Still needed before public release

Human balance sessions, multi-device frame profiling, concurrent-client soak/load testing, verified identity/recovery and abuse controls. Current protocol tests establish specific rules and persistence behavior, not commercial readiness or a supported player count.
