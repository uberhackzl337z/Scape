# Scape

A lightweight 2D multiplayer prototype: gather in the outer groves, risk your haul in the contested crossing, and reach the central bank to earn XP.

## Development playtest

The Scape cloud environment is published and the daily cloud review targets this repository at 10 a.m. America/Chicago. Current evidence and remaining verification limits are in [docs/CLOUD_STATUS.md](docs/CLOUD_STATUS.md); setup details are in [docs/CLOUD_DEVELOPMENT.md](docs/CLOUD_DEVELOPMENT.md). `pnpm run verify:cloud` runs the full automated verification against disposable worlds. GitHub Actions also runs these checks independently of the owner's PC.

Double-click **START-GAME.cmd**, keep its window open, and play at **http://127.0.0.1:3000**. If a copy is already running, use the browser link instead. Press Ctrl+C in its window to stop the server gracefully.

The release direction is one hosted, interconnected browser world. Players will open a URL; they will not install their own server or run separate game copies. The old v0.5 test ZIP is a historical testing artifact. Hosting/configuration and provider contacts are in `docs/HOSTING.md`; equipment, inventory and shop research are in `docs/GEAR_DESIGN.md`. This URL remains a local development preview until a host is configured.

- **WASD / arrow keys:** move. Middle click also moves to a point.
- **Hold E:** gather near a tree/rock, collect dropped loot, or deposit inside the bank circle.
- **Left click:** free basic attack. Tap once or hold to repeat every 0.35–0.5s, depending on the weapon. No stamina, arrows or runes are spent. **Space** remains an alternative.
- **Right click / B:** weapon secondary: Crescent strike, Piercing thrust, Groundbreaker, Twin shot or Frost nova. Costs stamina; bow/staff abilities also need ammo/runes.
- **I / Equipment:** inspect/equip body, offhand, charm and boots, compare set bonuses, and copy your private character access key. All combat slots are free.
- **1 / 2 / 3:** choose the iron sword, ash spear, or felling axe. You can also click the weapon bar.
- **Shift + direction:** dodge. It costs 32 stamina and briefly avoids damage; stamina regenerates.
- **M / Market:** browse the outfitter and player exchange; trades require being alive at the central bank, outside a duel.
- **L / High scores:** separate PvE and PvP leaderboards for this server's saved characters.
- **Q / R:** use a healing tonic or stamina ration; eight-second shared cooldown, disabled in duels.
- **K / Skills:** all 25 skills, training instructions, and the bank workshop.
- **4 / 5:** select an owned shortbow / ember staff. Basic shots are free; Twin shot uses two arrows and Frost nova uses one focus rune.
- **F:** Restoration spell; spends a focus rune to heal unhealed PvE damage. **T:** eat cooked fish, sharing the Q/R supply cooldown.
- **Escape / Field guide:** release movement controls and open instructions. The shared world continues running.

Wood earns 10 XP and ore earns 14 XP when banked. Skill levels increase gathering speed. The bag holds 12 resources. Dying drops carried resources and respawns you after three seconds; banked progress is retained. Dropped bags expire after 90 seconds. Disconnecting also drops carried resources.

## Equipment and elemental expedition — study 006

I opens a five-slot loadout (main hand, body, offhand, charm, boots). Gear survives death; only the 12-unit raw-resource haul drops. Five rarity tiers label armor/accessory quality: Common, Uncommon, Rare, Epic, Legendary. Green set membership is separate from rarity. Emberguard burns nearby monsters, Stormcaller bursts/stuns, and Rimebound chills. Equip matching pieces for two-/three-piece bonuses, or mix elements. Legendary alternatives are Warden drops. Base armor and attack power also affect PvP; elemental procs/control currently affect monsters only.

The world now has six distinct Canvas biomes without texture downloads. Left click performs a free repeatable basic attack; right click casts a weapon secondary on its own cooldown, and every combat slot is free. Equipment > Shop concept shows proposed cosmetics/storage and clearly disables purchases; no paid coins, paid gear, checkout or real-money wagering exists. Details, exact skill interactions, costs and acquisition rules are in `docs/GEAR_DESIGN.md`.

## Skills and crafting — study 005

There are **25 trainable skills**, all connected to playable actions and individual leaderboards:

| Group | Skills |
| --- | --- |
| Gathering (8) | Woodcutting, Mining, Fishing, Foraging, Herbalism, Hunting, Farming, Excavation |
| Crafting (8) | Smithing, Carpentry, Cooking, Alchemy, Leatherworking, Weaving, Enchanting, Runecrafting |
| Combat (9) | Combat, Swordsmanship, Spear mastery, Axe mastery, Archery, Pyromancy, Restoration, Defence, Agility |

**Gathering:** hold E at a marked site, then bank the haul to receive that skill's XP and earned coins. Ten raw resources share the same 12-slot bag: wood, ore, raw fish, berries, herbs, hides, grain, flax, clay and crystals. New sites use simple colored Canvas shapes. Higher gathering levels reduce the collection cooldown, as wood/mining levels already did. Farming uses regrowing grain/flax harvest patches; Hunting uses hide snares. Fields/snare sites refill automatically. Resources in the field remain at risk; purchased resources enter storage and grant no gathering XP. Banked wood/ore use the original bank balances; other stored materials appear in Skills > Bank workshop and the market.

**Crafting:** press K, choose Bank workshop, and be alive inside the bank, outside a duel. Twenty-seven recipes turn stored inputs into actual goods. Recipes display materials, quantities, profession level, output and XP before crafting; batch sizes are 1–10 with an 800ms recovery. Missing stock, insufficient levels, or full output stacks reject the entire operation. Higher profession levels unlock advanced weapons/armor in the listed recipes. Example chains: ore → bars → weapons/shields; wood → planks → arrows/bows; flax → cloth → bows/vests/charms; hides → leather → vests; fish → cooked food; herbs/berries → tonics; crystals/clay/herbs → spell runes → staves/charms. Finished goods can be traded like other items. The outfitter sells materials and common/uncommon/rare equipment, with catalog filters. Epic sigils are crafted or looted; legendary pieces are boss drops. Both can be traded with players. None of the recipes has a profitable immediate shop buy/craft/sell loop at the listed prices.

**Combat:** swords, spears, axes, shortbows and ember staves train their own skills from actual damage dealt to living PvE enemies. Repeated attacks against a corpse and player damage grant no weapon-skill XP. General Combat still earns the original enemy-defeat XP. Weapon levels add 1 damage every three levels, capped at +6; the HUD includes the bonus. Bows and staves fire free traveling basic projectiles, which can miss. Right-click Twin shot costs two arrows, and Frost nova costs one focus rune; damage and resource costs remain server-controlled. Basic attacks never spend stamina or ammunition.

Restoration (F) spends one focus rune to heal up to 25 unhealed PvE damage, increasing to 35 with levels, with an eight-second spell cooldown. It trains only for health restored from that damage pool; safe-ground regeneration, supplies and respawning clear healed damage. It does not consume a rune at full health or when no PvE damage remains. Defence trains from damage received from enemies; every three levels adds 1 damage reduction, up to 5. Equipped leather vest, iron shield and ward charm additionally reduce damage by 2/3/1 respectively; ownership alone no longer activates armor. Only the selected piece in each slot counts. Agility trains once per dodge that actually avoids an enemy hit, and reduces dodge cost by up to 6 stamina. Swinging or firing without hitting a living enemy, healing nothing, and dodging empty ground do not train these skills.

Skills and armor remain active in wagered duels; basic shots are free and Twin shot still costs arrows. Consumable and Restoration healing are disabled there. This is progression-based PvP rather than equal-stat duelling. Human balance remains provisional.

Overall high scores now sum all 25 skill levels and XP. New characters therefore have a base total level of 25, and need earned XP for a rank. Existing combat, woodcutting and mining XP is retained; new skills begin at zero. No historical weapon training is invented. The save envelope is version5; old raw/v2/v3/v4 profiles migrate, along with inventory/listings and outstanding wager refunds. Keep a consistent backup before migrating an existing saved world.

`pnpm test:skills` runs a separate port3034 test world. A test wallet is seeded, while gathering, banking, crafting chains, ranged hits and healing use normal network messages. It checks skill forgery rejection and forced-restart retention without changing the main player's progress.

## Wagered duels — study 003

Banking also earns **5 coins per wood** and **8 per ore**. New characters start with zero coins. Existing banked resources receive that same earned value once when an older save is upgraded. Coins are game-only, with no purchase, cash-out, or external payment system.

Both players must be alive, within 220 world units, and in the main PvP crossing outside the boss arena. In **Wagered duels**, choose a nearby player, enter a whole-number stake of **10–500 coins each**, and send a challenge. The other player must accept that exact stored stake; an offer alone takes no coins and expires after 20 seconds. Declining or cancelling an unaccepted challenge is free.

Acceptance atomically deducts both stakes into a pot and moves the players to the gold ring west of the bank. Both start at 100 health and stamina, with a 3-second movement/attack lock. During the duel, only the opponent can damage you; enemies and outsiders cannot interfere. Gathering, banking, health regeneration, and attacks against outsiders are disabled. The first version has one active duel ring.

| Outcome | Wager result |
| --- | --- |
| Knockout, confirmed forfeit, or disconnect | Opponent gets the full pot; no house cut |
| Outside the ring for 2 continuous seconds | Forfeit; returning before the deadline clears the warning |
| 120-second fight timeout | Both stakes refunded |
| Graceful server restart or recovered interrupted save | Both unsettled stakes refunded |

Duel knockouts are nonlethal and preserve carried resources and XP. After settlement, both players return to the western groves at full health. Disconnecting during a duel stores the carried bag for the same temporary identity to resume; ordinary disconnects still drop it. Duels award wins/losses and coins, not combat or gathering XP. Player kills outside duels retain the original rules.

The server validates wagers and affordability again on acceptance, ignores client-supplied balances/pots, and prevents repeated settlement. The version5 SQLite payload stores wallets, equipment, inventory/listings, skill XP, scores, and unsettled duel escrows together; startup refunds recorded interrupted duel escrows before accepting players. Economy changes queue transactional saves immediately. SQLite is the default; JSON atomic writes remain available for compatibility tests. A bearer access key can resume a character across devices, but verified accounts, account recovery and competitive economy hardening remain unfinished.

`pnpm test:duels` starts a separate local server on port 3031 with its own test data under `artifacts/`. Two test clients earn coins, duel through normal controls, verify payout, then force-stop/restart the test server to check refunds. It does not alter the normal server's wallets.

Outer groves and the central bank are safe and restore health. The marked crossing and eastern boss arena allow PvP. Enemies are AI opponents, not simulated human connections. Blood particles, temporary ground splashes, damage numbers, and XP numbers make hits visible; the sidebar has a blood toggle.

## Market and high scores — study 004

Press **M** or click **Market**. The bank outfitter buys and sells three upgraded weapons (steel sword, war spear, battle axe), healing tonics, trail rations, and banked wood/ore. Each item shows its price and owned stock. Choose a trade quantity from 1–99. Coins and item ownership are checked by the server; free starter weapons cannot be sold. Bought resources enter bank storage and award no XP or banking coins. Shop resale prices are below purchase prices.

The **player exchange** lets you list owned goods at 1–5,000 coins per item. Posting removes the goods into market custody. Other characters can buy all or part of a listing; the server charges the stored price and credits the seller even if offline. Cancelling returns only the unsold goods. Five listings per character and 200 across the world; listings persist until sold or cancelled. Unsold goods must fit your inventory to reclaim them. There are no fees or timed auctions.

Purchased gear and supplies persist through death and disconnect, separate from the carried resource bag. They stack to 99 per item. Equip an owned upgraded weapon in the market; **1 / 2 / 3** select the best owned sword/spear/axe. Selling or listing your last equipped copy restores that family's free starter weapon. Upgrades have 32 / 30 / 58 damage with the starter family's reach and recovery. Upgraded weapons are allowed in wagered duels, so equipment affects those fights.

**Q** consumes one tonic for up to 35 health; **R** consumes one ration for up to 45 stamina. They share an eight-second cooldown, do not waste stock at full health/stamina, and cannot be used while dead or duelling. These consumables are useful in ordinary PvE/PvP; safe-ground regeneration remains available.

Press **L** or click **High scores** for the Hall of Records, inspired by the supplied MMO reference. Category navigation sits on the left, a paginated ranking table in the center, and name/rank searches plus **View your rank** on the right. Gold borders, blue player names, compact rows, online indicators, and a highlighted personal row use only HTML/CSS and a small inline crown drawing. The game implements the layout using its own HTML and CSS without external artwork.

The Hall includes Overall, PvE combat, PvP combat, Boss defeats, Duel knockouts and a board for every skill (general Combat uses PvE combat). Overall sums all 25 levels and breaks ties by combined XP; earning XP is required to enter. Skill boards use earned skill XP. Boss/duel boards use tracked defeats. PvE ranks combat XP, then boss/enemy defeats. PvP grants 100 points per duel knockout or 25 per open-world player kill; ties use knockout/kill counts and then name/stable identity. Forfeits, disconnects, ring exits, and cancelled duels grant no PvP points. Each opponent grants points once per ten minutes, shared across duel and world kills and retained across reconnects/restarts. Kill counts still record repeated defeats. This discourages simple repeat farming; temporary extra identities can bypass it, so this is not a secure ranking system for public competition.

The boards combine live and offline saved characters and refresh about every 1.5 seconds while open. They show 25 rows per page and search all eligible saved characters, keeping global ranks in name-filtered results. Rank search and View your rank select the appropriate page and highlight/scroll to that row. Unranked categories show how to earn a score. Queries return a bounded page and your own entry; private resume tokens are never returned. Existing combat XP is retained; separate PvE/boss/PvP counters began at zero with study004 because older saves only tracked a combined defeat count. Scores and listings belong to this local server, with no internet-wide service, clans, or seasons.

`pnpm test:scores` starts an isolated server on port3033 with 60 seeded test characters. It checks name search, direct rank lookup, locating your rank beyond page one, independent categories, invalid requests, and privacy without changing the normal world.

`pnpm test:market` runs a separate test server on port 3032, seeded with test inventory/balances under `artifacts/`, to check shop trades, player listings, offline payment, partial fills, equipment, supplies, scoreboards, forced-restart persistence, and cancellation. It does not spend the normal character's coins.

## Combat study 002

| Enemy | Behavior | Combat XP |
| --- | --- | --- |
| Thornrunner | Fast pursuit and a telegraphed slash | 25 |
| Cinder hunter | Keeps range and fires aimed, traveling bolts | 40 |
| Ironhide brute | More health; slow, heavy area slams | 70 |
| The Hollow Warden | Eastern arena boss; slams and five-bolt fans; faster below half health | 300 |

Red ground warnings lock in an attack's position/direction before impact. Step out or time a dodge. Attacking during a dodge is disabled. The sword is quick and balanced, the spear has long reach with a narrow thrust, and the axe has a wide, heavy swing with a longer recovery. Weapon changes wait for recovery, preventing cooldown bypasses.

Combat XP is separate from gathering XP and is awarded immediately to recent, living contributors near an enemy's defeat. It tracks combat level; it does not currently multiply damage. Player kills give no combat XP. Combat XP, kill counts, and the chosen weapon save with the profile. Gathering XP still requires banking.

Regular enemies return after 18 seconds. The boss has 650 HP, returns 90 seconds after defeat, and resets to full health after six seconds without a player in its arena. Stay inside the marked eastern stone circle to keep the encounter active. There is a solo fight simulation check in `scripts/boss-balance.mjs`; balance against human players remains an initial experiment.

Character progress is stored in `data/world.sqlite`, imported from valid legacy JSON once. The browser keeps a private access key; copy it from Equipment and keep it secret to resume on another device. A character can have only one active session. These bearer identities are not verified accounts or email recovery. Equipment/stored progress survive disconnect; the unbanked field haul follows the documented drop/duel rules. `pnpm backup:world` makes a consistent SQLite backup; see `docs/HOSTING.md`.

## Development

Requires Node.js 24.12+ and a package manager (pnpm recommended). On a new machine:

```text
pnpm install
pnpm run build
pnpm test
pnpm start
```

Install the Node version specified in .nvmrc and the pnpm version in package.json. The Windows launcher uses node from PATH.

- `src/shared/world.ts`: authoritative game rules and world data, independent of browser rendering.
- `src/shared/combat.ts`: enemy and weapon balance definitions.
- `src/shared/duels.ts`: consent, stakes, ring rules, settlement, and refunds.
- `src/server.ts`: HTTP/WebSocket server, input validation, sessions, and transactional shared-world saves.
- `src/client/main.ts`: Canvas renderer, browser controls, and interface updates.
- `src/client/combat-view.ts`: blood, hit/XP text, warning zones, and projectiles.
- `src/client/duel-view.ts`: wallet, challenge/accept controls, stake terms, and duel HUD.
- `src/shared/items.ts` and `src/shared/market.ts`: catalog, owned inventory, bank trading, and player listings.
- `src/shared/skills.ts`, `src/shared/crafting.ts`, `src/client/skill-view.ts`: 25-skill catalog/training, gathering resources, workshop recipes and skill UI.
- `src/shared/leaderboards.ts`, `src/client/score-view.ts` and `src/client/town-view.ts`: ranking metrics/search, the Hall of Records, and the market screen.
- `src/persistence.ts` and `src/save-file.ts`: save migration, interrupted-escrow refunds, and atomic writes with Windows lock retries.
- `public/`: HTML, CSS, favicon; no external images, fonts, analytics, or CDN calls.
- `src/tests/`: simulation tests.
- `PROJECT_CONTEXT.md`: recovered game concept, decisions, and project handoff.

TypeScript compiles to JavaScript under `dist/`. The only production dependency is `ws`. The server defaults to loopback (`127.0.0.1`), making this a local playable build rather than an internet deployment. `APP_ENV=production` requires a secure `PUBLIC_ORIGIN` and SQLite. Docker/Caddy deployment files are prepared; public access still needs a host/domain and an operations pass, account hardening, abuse controls, off-host backups and load testing. Do not expose saved profile files.

After building, `node scripts/boss-balance.mjs` checks a solo boss fight through normal simulation inputs. With the server running, `pnpm smoke` checks assets, multiplayer replication, weapon selection, dodge stamina, and rejection of client-supplied XP. `node scripts/format.mjs` formats TypeScript source with the existing compiler; it installs no extra formatter.

## Toward 3D

The simulation keeps flat world coordinates (`x`, `y`) and does not depend on Canvas. A future 3D client could map those to a horizontal (`x`, `z`) plane and keep resource, banking, XP, and combat rules. The renderer, camera, 3D assets, terrain/collision, targeting, animation, and UI integration would need substantial new work. A genuine 3D world with elevation would also require simulation and networking changes. This separation supports migration; it does not make migration automatic.

The current map and rules are a compact first experiment.
