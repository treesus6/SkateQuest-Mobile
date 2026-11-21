# Spot discovery upgrade — existing SkateQuest-Mobile stack

Adapted from the owner's implementation_plan.md on November 21, 2026.

## Architecture

Keep Expo Router, React Native, TypeScript, Supabase/Postgres/Auth/Realtime/Storage,
Mapbox native and Mapbox GL JS web, Zustand auth, and the existing trick field manual.
No Compose, Room, Firestore, Firebase AI migration, new app package, signing change,
or replacement repository. The existing AI Coach remains the coaching destination.

| Requested capability  | Implementation and authoritative data                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spot-first Home       | NearbySpotRadar above the existing scene modules; optional foreground GPS; real nearby_spots RPC results                                                                                                            |
| Conditions/live radar | get_spot_discovery returns per-spot distinct active users and the newest unexpired condition, capped at four hours                                                                                                  |
| Map discovery filters | All, Partners, Live Now, Dry, Park, Street, DIY, Saved on native and web; original native layer controls retained                                                                                                   |
| Partner activation    | Existing active map_sponsors, exact spot_id association, Home card, map badge/count, selected-spot card, own Profile history                                                                                        |
| Attribution           | Immutable partner_referrals, auth-bound RPC, server time/source, partner's authoritative spot, 60-second count debounce, +10 XP once per partner per UTC day                                                        |
| Live check-in         | Direct Home/native-map/web-map session sheet; duration 30/60/120/240 minutes, stance, note, server 150m distance check, one current spot, rejoin without repeated daily XP, owned checkout                          |
| Trick mastery         | 27-entry field manual, five curriculum tiers, highlighted SVG prerequisite connections, immediate node detail sheet, tracker aliases, existing Supabase user_tricks, offline read cache, progress log and XP claims |
| Coach handoff         | Trick node opens existing /ai-coach with the requested trick preselected                                                                                                                                            |
| Clip spotlight        | Active time-bounded spotlight_challenges linked to real skate_spots; SkateTV spotlight filter/banner, spot search, challenge selection, verified insert/read-back                                                   |
| Community review      | Spotlight/First Land Friday clips enter Judge's Booth; three distinct reviews determine majority status; no self-votes, duplicate votes or invented XP; participation alone never implies approval                  |
| Hype                  | Existing server transactional likes, optimistic rollback, overlapping-tap guard, success haptics                                                                                                                    |
| Existing modules      | Home action tiles, quests, bounties, crews, arena, existing routes and community hub remain accessible                                                                                                              |

Counts are recorded outbound referrals, not verified conversions or physical presence.
Legacy sponsor_clicks remain separate. Anonymous users can visit the partner site but
cannot earn XP or write attributed referrals. No fake visitors, clips, votes, counts or partners are seeded. One real, prize-free weekly community prompt, "Newport: show us your line," is open through November 28, 2026. Its submissions/votes remain empty until real skaters participate. Later empty challenge windows are shown truthfully.

## Backend repairs and verification

Applied additive migrations:

1. 20261121142852_spot_discovery_upgrade.sql
2. 20261121143050_repair_mapped_spot_visit_contract.sql
3. 20261121143304_link_portal_dimension_newport_spot.sql
4. 20261121155043_complete_clip_spotlight_review.sql

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
- Completed: bundled Space Grotesk, Plus Jakarta Sans and JetBrains Mono; applied a shared hierarchy across Home, Map, Quests, Crew, Profile, Tracker, Coach and SkateTV. Included font licenses and sources.
- Completed: real Newport weekly prompt plus community review and First Land Friday labeling. Three distinct reviews are required; first-land history/location are not claimed independently verified.
- Completed in source: the visual pass covers all five tabs, including Quests and Crew, with consistent fonts/colors, tactical frames and textures. Physical-device visual review remains required.
- No merge, Alpha publication, Play signing change, or production web release is implied by passing source checks.

## Source checks recorded

- TypeScript and ESLint passed.
- Full Jest run: 57 suites, 455 tests passed.
- Android and web JavaScript/static exports passed; this does not produce a signed APK or verify device behavior.
- Database integration assertions passed with every test mutation rolled back. Follow-up counts confirmed zero committed QA clips/check-ins/challenges.
- Three additional UI regression tests passed: a locked node opens the real coach without creating progress; attempts use the existing tracker record; failed check-in read-back never produces a success alert.
- GitHub CI and CodeQL passed on af1cb9f; signed preview/emulator run 44914840339 passed. Authenticated device flows remain unverified.

## Completion pass — November 21

- Home live activity moved ahead of missions; failures preserve real results and expose retry states.
- Direct check-in sheets on Home and both map implementations support persisted create/update/checkout.
- Skill tree edges use actual measured node layouts; selected connections highlight and details open immediately in a bottom sheet.
- Five tier assignments follow the actual trick categories rather than leaving the Mastery stage empty.
- Tracker create/status/attempt/delete operations now require an independent server read-back and block overlapping writes.
- Clips can be marked First Land Friday (self-reported); pending clips enter the existing Judge's Booth beside the original proof queues.
- Clip review uses an immutable per-user vote table, row-locked RPC, server-managed counters/status and independent vote read-back. Three distinct votes decide a majority; judging these clips awards zero XP.
- Extended database test also passed forged-status reset, self-vote rejection, repeat-vote rejection, three-review majority, and count/status read-back. All QA mutations rolled back; there are zero QA clips or votes in the app.
- Fonts are bundled locally (no runtime CDN), and the completion pass preserves package/signing identity.

Earlier test APK (application source af1cb9f): signed preview/emulator run 44914840339 passed. Independently checked ZIP/APK integrity, established upload-certificate fingerprint, both startup screenshots, and zero fatal-line files. APK SHA-256 e729dcaf96623d8a1c32c56bc185809afb87317e58dc233eb8c960923d29b7f3. This APK predates the completion pass and must not certify the newer source.

## Competitive benchmark

Checked official product pages on November 21, 2026. No rankings or unverifiable catalogue-size claims are used.

| Reference                   | Observed focus                                                                       | Applied decision                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| https://www.shredspots.com/ | Community map; obstacle/difficulty/bust-risk discovery                               | Put actual spots and conditions before feature-launcher content; retain existing spot metadata and layer controls        |
| https://www.getloke.com/    | Map, clips, community and brand-sponsored challenges                                 | Connect clips/challenges to mapped spots, expose partner links directly, preserve the broader crew/arena tools           |
| https://www.smap-app.com/   | Discovery paired with step-by-step trick progression in its official product summary | Keep discovery and personal progression together; derive the skill tree from the existing field manual and saved tracker |

These are feature-direction comparisons, not claims of tested competitor performance or copied designs.

Latest completion-pass source checks: TypeScript and ESLint passed; full Jest **60 suites / 462 tests passed**. A new signed APK must be built from this pass before these changes are called Android-verified.
