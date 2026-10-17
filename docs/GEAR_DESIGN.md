# Equipment, elemental combat and shop direction

Implemented study006, October 16, 2026. Proposed pricing/monetization is distinguished from playable systems below.

## Inventory model and references

The game now separates three jobs: the 12-unit resource haul at risk in the field; persistent stacked materials/supplies/gear; and a five-slot combat loadout consisting of the selected main-hand weapon, body, offhand, charm and boots. Equipment survives ordinary death. Every combat slot is free. Gear changes require the bank, life and no active duel.

This is deliberately simpler than Diablo II's spatial inventory. Identical copies of a named gear template stack to99; arrows and spell runes stack to999; raw resource storage retains the existing larger limits. There is no inventory Tetris, random affix roll, individual durability or unique equipment-instance ID. A unique roll/affix system would need individual ownership and auction-instance records rather than these quantity stacks. That is future work, not hidden functionality.

Diablo II's set design is the direct inspiration for equipped partial/full bonuses: its official guide distinguishes equipped set pieces from those sitting in storage. Our set label is green **independently** of tier, so players can read both rarity and membership. We use original set/item names and Canvas effects rather than copying assets. [Diablo II set basics](https://classic.battle.net/diablo2exp/items/sets/basics.shtml).

Path of Exile provides a relevant example of selling storage through its [stash-tab shop](https://www.pathofexile.com/shop/category/stash-tabs). That establishes a monetization pattern, not proof that copying it will make this game profitable. A bigger bank can still confer economic convenience; preserve a useful free allowance instead of manufacturing storage frustration.

## Rarity and acquisition

T1 Common, T2 Uncommon, T3 Rare, T4 Epic, T5 Legendary. Names and numeric tiers accompany colors. There are17 armor/accessory templates: three legacy pieces plus14 new ones. Existing weapon families remain eight definitions, chosen with1–5; this pass does not add randomly rolled or legendary weapons.

The first ordinary PvE defeat grants Wayfarer boots. Subsequent ordinary kills have a25% gear-roll chance (13%common boots,8%uncommon boots,4%rare set body/offhand). An eligible nearby living Warden contributor gets one gear roll:65%rare,30%epic,5%legendary, with a split between pieces inside each band. No paid rolls or loot-box purchase exists. Full stocks do not overflow.

Outfitter buys/sells starter armor, boots and rare body/offhand pieces for **earned game coins**. Epic sigils are crafted or looted; legendary pieces come from the Warden. Neither tier is sold by the NPC outfitter. All can be exchanged between players through stored fixed-price listings. The current auction-house-like exchange still has no bids or timed auctions. Listing/removing the last equipped copy clears its slot and bonuses; reclaiming it does not silently re-equip it.

The workshop now has27 recipes, including nine set pieces. Recipe cards retain bank checks, skill gates, atomic materials/outputs and the batch/cooldown rules. Immediate vendor-input/crafted-output price-loop checks pass; this is not a complete economy audit.

## Sets and passives

Each elemental set has a body, offhand and charm. One piece unlocks the passive; two and three pieces improve it. Different elements can be mixed, sacrificing full-set specialization for multiple effects.

| Set | Passive | Two pieces | Three pieces |
| --- | --- | --- | --- |
| Emberguard | Ward within90 units; ignite monsters for3s, base2 damage/second, one burn per monster | +1 burn damage/second, +1 armor | Radius120, pulse every2s instead of3s, +1 power |
| Stormcaller | On weapon hit, base7 lightning damage and0.45s monster stun;4s recovery | +2 burst damage, +1 armor | Recovery3s, +1 power |
| Rimebound | On hit,25% monster slow for2s;3s recovery |35% slow, +1 armor | Slow3s, +1 power |

Phoenix aegis, Thunderheart and Heart of winter are legendary alternatives. They strengthen fire/burst/chill individually and provide different base stats; they do not count as set pieces. Higher rarity does not automatically beat a complementary full set. Inventory ownership without equipping grants no passive.

Pyromancy scales fire damage; Runecrafting scales lightning; Enchanting scales chill. Elemental damage bonuses cap at+3 from skill, while chill caps at40%. Real burn damage trains Pyromancy and real lightning damage trains Runecrafting. Empty attacks/chill application do not award free XP. Frost nova's actual PvE damage trains Enchanting. Defence adds its existing capped mitigation; Agility reduces dodge cost; Restoration remains deliberate healing with a focus rune.

Boss stun lasts0.15s. Burns refresh without stacking, burst procs have server timers, and elemental damage cannot trigger another elemental proc recursively. Dead/duelling/safe-ground sources stop burn damage. Effects are PvE-only for this pass: base equipment armor/power and weapon secondary damage still affect PvP, but passive burn, lightning and slow do not affect players. A future PvP control pass must consider duration reductions, immunity windows and telegraph clarity rather than allowing stun locks in wagered fights.

Visible indicators use fire rings/flames, lightning arcs/bolts, icy outlines and BURN/CHILL/STUN labels. Reduced-motion preferences limit animation. Biome art is cached Canvas geometry: Cedar Reach, Reedwater Shallows, Sunfield, Frostspine, Ashen Reach and Crystal Vale. It changes scenery rather than collisions or combat boundaries.

## Mouse controls

Aim with the mouse, hold **left click** for the selected weapon's primary attack, and **right click** for its secondary. Movement uses WASD/arrows; middle click moves to a point. Space attacks and B casts the secondary as alternatives. Basic attacks cost no stamina or ammunition and recover in 350–500ms. Right-click abilities have their own cooldown and can be used between basics; casting creates only a brief 120ms minimum recovery for the next basic, preserving any already-running basic recovery. Switching weapons cannot reset basic recovery. Quick mouse presses are sent immediately and buffered once for up to 200ms so a press/release between server ticks still registers. Both mouse actions are disabled while a menu is open or the page is hidden.

Sword: Crescent strike (25 stamina/4.5s); spear: Piercing thrust (25/4.5s); axe: Groundbreaker (35/6s); bow: Twin shot (25/4.5s and2 arrows); staff: Frost nova (20/6s and1 focus rune). Nova slows monsters, including when its direct damage can hit a duel opponent; it does not slow players. Damage, costs, targets, ownership and cooldowns are server-authoritative. Paid UI fields cannot assign damage or inventory.

## Shop proposal, not a live store

The in-game Shop concept tab is explicitly unavailable. It proposes non-tradeable Crowns for appearances and possibly bank storage, without prices, checkout, a payable currency balance or any grant endpoint. Earned coins remain the only market/wager currency. No paid currency can currently be obtained, converted, wagered or cashed out. Buying a combat equipment slot would buy extra power and a set-bonus advantage, so all five slots remain free.

Before a real store: verified/recoverable accounts; explicit products/prices; payment-provider terms; signed webhooks; an idempotent receipt/entitlement ledger; refund and chargeback handling; and transactional grants only after verified payments. Never let a client purchase message grant coins/gear. A provider and business setup have not been selected. This pass does not enable real-money wagering.
