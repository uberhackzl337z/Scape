# Resource hauls without a carrying cap

The owner's October 17 instruction supersedes the earlier 12-resource prototype pouch. Gathering now uses counted resource stacks with no gameplay weight, slot or carrying cap. Stock availability and skill cooldowns still apply. Banking remains the source of gathering XP and earned coins; death/disconnect risk is unchanged.

The haul UI creates one card per occupied resource kind, at most ten cards with the current catalog. It never creates a DOM element or array entry per carried unit. Quantities use grouped numbers, and the old full-bag hint and capacity fraction are removed.

Dropped loot transfers complete stacks into an existing haul without stopping at twelve. The former 100-million stored-raw-resource ceiling is also removed. Finite exact-integer checks protect against JavaScript precision overflow, rather than imposing a gameplay inventory limit. Deposits check total coins, stored amounts and combined per-skill XP before changing anything; an unrepresentable deposit leaves the entire haul intact. Resource stacks continue to use ordinary numbers, so mathematically infinite storage is not claimed.

Regression coverage gathers 1,000 actual units on top of an existing haul above 100 million, banks the mixed haul once, recovers its save, checks combined crop XP, restores a large interrupted-duel bag, collects a full dropped haul and rejects numeric overflow atomically. The old capacity tests now assert the newly requested behavior. No character reset, new dependencies or save-version change is required.
