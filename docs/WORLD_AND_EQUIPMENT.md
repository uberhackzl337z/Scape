# Larger world and equipment body view

The world expands from 1600 by 1100 units to 3200 by 2200: four times the area. Bounds now run from (-800, -550) to (2400, 1650), keeping the original bank at (800, 550) exactly in the center. Original resource IDs, central crossing, boss and duel ring remain in place. This avoids moving existing routes or changing character/world identity. Character progression has no coordinate migration.

Eight additional resource groves and sixteen additional profession sites extend the oldgrowth, marsh, highlands, ash and crystal regions. Every resource node remains outside combat areas. Four named outer camps add eight monsters using the existing rusher/ranged/heavy roles. Ruins and dashed boundaries mark these areas: both PvE and PvP are enabled inside, explicitly labeled before entry. Monster patrols and respawns stay in their own camps. There is still one bank and no teleport or resource-weight system. These frontier mechanics are new additions, not a verbatim recovered Discord specification.

Rendering and click destinations use the same world bounds as the authoritative server. Camera clamps and minimap include the negative coordinates; terrain and minimap are cached. The larger terrain bitmap is about 26.9 MiB RGBA, up from 6.7 MiB, excluding browser overhead; browser downloads remain small. This is a deliberately bounded first expansion, not an infinitely generated world or a load-tested MMO.

Equipment now includes original inline vector body artwork. Body, offhand, charm and boots glow with the rarity color of equipped gear; empty areas remain dashed. Main hand is displayed beside the weapon silhouette. Text cards provide names, rarity, stats and occupied-slot counts. No new gear slots, stats or paid unlocks were added. Existing bank-only equipment changes and set synergies remain. Small screens stack the slot cards below the body.

## Validation

Full local verification passed 100 rules/storage tests, boss simulation, asset/replication/input checks, account-cookie authorization/restart, contracts, leaderboards, market/offline seller payments, skills/crafting, equipment/elemental combat and SQLite duel/crash recovery. New regressions cover accessible resource placement, original core locations, expanded-edge movement and camp patrol/respawn positions. An initial check found two nodes overlapping camps; their groves were moved before the complete passing run. Browser checks use disposable characters/worlds, including a seeded equipped character for visual proof; no owner progress or demo progress is granted or edited. Exact public CI status is separate from local checks.

## Cloud development

The owner authorized a dedicated cloud agent. Its standing prompt is [CLOUD_AGENT.md](CLOUD_AGENT.md). Initial responsibilities are persistence, network reconnects and economy integrity while the parent implements these UI/world changes. The existing daily cloud review remains at 10 a.m. America/Chicago; a duplicate optimization schedule was paused. Production account/payment/hosting activation remains on hold.
