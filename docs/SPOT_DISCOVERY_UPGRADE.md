# Spot discovery upgrade — existing SkateQuest-Mobile stack

Adapted from the owner's implementation_plan.md on November 21, 2026.

## Architecture

Keep Expo Router, React Native, TypeScript, Supabase/Postgres/Auth/Realtime/Storage,
Mapbox native and Mapbox GL JS web, Zustand auth, and the existing trick field manual.
No Compose, Room, Firestore, Firebase AI migration, new app package, signing change,
or replacement repository. The existing AI Coach remains the coaching destination.

| Requested capability  | Implementation and authoritative data                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spot-first Home       | NearbySpotRadar above the existing scene modules; optional foreground GPS; real nearby_spots RPC results                                                                                           |
| Conditions/live radar | get_spot_discovery returns per-spot distinct active users and the newest unexpired condition, capped at four hours                                                                                 |
| Map discovery filters | All, Partners, Live Now, Dry, Park, Street, DIY, Saved on native and web; original native layer controls retained                                                                                  |
| Partner activation    | Existing active map_sponsors, exact spot_id association, Home card, map badge/count, selected-spot card, own Profile history                                                                       |
| Attribution           | Immutable partner_referrals, auth-bound RPC, server time/source, partner's authoritative spot, 60-second count debounce, +10 XP once per partner per UTC day                                       |
| Live check-in         | Duration 30/60/120/240 minutes, stance, note, server 150m distance check, one current spot, rejoin without repeated daily XP, owned checkout                                                       |
| Trick mastery         | 27-entry existing field manual, prerequisite nodes, tracker aliases, TODO/LEARNING/LANDED/LOCKED, existing Supabase user_tricks, persisted offline read cache, original progress log and XP claims |
| Coach handoff         | Trick node opens existing /ai-coach with the requested trick preselected                                                                                                                           |
| Clip spotlight        | Active time-bounded spotlight_challenges linked to real skate_spots; SkateTV spotlight filter/banner, spot search, challenge selection, verified insert/read-back                                  |
| Community review      | Existing Judge's Booth navigation and voting remain accessible; spotlight participation never labels a clip verified                                                                               |
| Hype                  | Existing server transactional likes, optimistic rollback, overlapping-tap guard, success haptics                                                                                                   |
| Existing modules      | Home action tiles, quests, bounties, crews, arena, existing routes and community hub remain accessible                                                                                             |

Counts are recorded outbound referrals, not verified conversions or physical presence.
Legacy sponsor_clicks remain separate. Anonymous users can visit the partner site but
cannot earn XP or write attributed referrals. No fake visitors, clips, votes, counts,
partners, or weekly challenge records are seeded. If no challenge is configured,
the banner truthfully says none is open.

## Backend repairs and verification

Applied additive migrations:

1. 20261121142852_spot_discovery_upgrade.sql
2. 20261121143050_repair_mapped_spot_visit_contract.sql
3. 20261121143304_link_portal_dimension_newport_spot.sql

An integration test exposed the pre-existing verified_web_check_in failure: a real
skate_spots ID was inserted into park_visits.park_id, whose FK targets skateparks.
park_visits now has a separate spot_id FK, retains the original park_id relationship
and historical rows, and requires at least one location. Pioneer/mission triggers
understand both catalogs. The original verified check-in RPC is repaired for all callers.

The existing unnamed Oregon park at approximately 44.64137, -124.05955 was identified
using Newport's official Sam Moore Parkway inventory and the existing OSM park polygon.
It was named, associated with Portal Dimension, and the brand marker moved beside it.
The unrelated Newport, Rhode Island spot was left intact. No duplicate park was created.

Sources:

- https://cdd.newportoregon.gov/dept/par/parks.asp (Sam Moore Parkway, 656 NW High St.)
- https://www.openstreetmap.org/way/1080964135
- https://mapcarta.com/W1080964135

Run supabase/tests/spot_discovery_upgrade.sql against the project. It uses existing
profiles/spots with simulated authenticated roles inside one transaction and rolls
back ALL visit/referral/clip/XP writes. It verifies distance rejection, independent
read-back, rejoin/XP deduplication, radar counts, referral cooldown, direct-write denial,
spotlight spot association, private history RLS, cross-user checkout denial, own
checkout persistence, and anonymous-write denial. This is database contract evidence,
not evidence of a physical GPS fix, Android rendering, or a real purchase.

## Remaining release gates

- Authenticated Android installation, GPS check-in/join/checkout, restart and second-device restoration.
- Native Mapbox marker/image/counter rendering and responsive sheet layout on a physical device.
- Clip upload/playback, spotlight participation and failure recovery on Android with real media.
- Native typography assets named in the concept are not bundled in the existing repository; existing fonts are preserved.
- Weekly spotlight needs an actual organizer-created challenge row before a challenge can be offered; no sample contest is presented as real.
- UI polish across tabs outside the affected Home/Map/Tracker/SkateTV/Profile screens remains outside this branch's verified coverage.
- No merge, Alpha publication, Play signing change, or production web release is implied by passing source checks.

## Source checks recorded

- TypeScript and ESLint passed.
- Full Jest run: 57 suites, 455 tests passed.
- Android and web JavaScript/static exports passed; this does not produce a signed APK or verify device behavior.
- Database integration assertions passed with every test mutation rolled back. Follow-up counts confirmed zero committed QA clips/check-ins/challenges.
- Three additional UI regression tests passed: a locked node opens the real coach without creating progress; attempts use the existing tracker record; failed check-in read-back never produces a success alert.
- GitHub CI and CodeQL passed on af1cb9f; signed preview/emulator run 44914840339 is in progress. Authenticated device flows remain unverified.
