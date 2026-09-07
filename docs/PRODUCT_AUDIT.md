# SkateQuest Product Audit

Updated: 2026-09-07

## Product rule

Every surface should strengthen the loop: discover somewhere or someone to skate, start or join a session, skate, capture progress, interact locally, and return for relevant activity.

## Feature triage

| Area                                           | Classification                  | Direction                                                                                                                                                                       |
| ---------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map and nearby discovery                       | CORE / IMPROVE                  | Make this the fastest route to a real spot, skater, or session. Improve permission, empty, retry, selection, and list/map states.                                               |
| Spot details and conditions                    | CORE / IMPROVE                  | Lead with location, skateability, obstacles, directions, current conditions, sessions, clips, and check-in. Keep competitive modules secondary.                                 |
| Add Spot                                       | CORE / IMPROVE                  | Preserve remote pin placement, duplicate prevention, ratings, photo persistence, read-back, and honest failure handling. Reduce form uncertainty.                               |
| Sessions                                       | CORE / IMPROVE                  | Connect discovery to skating and progression. Verify persistence before expanding tracking.                                                                                     |
| Clip creation and SkateTV                      | CORE / IMPROVE                  | Make trick/spot tagging and retry reliable. Improve upload progress, media constraints, playback, and feed pagination.                                                          |
| Profiles                                       | CORE / IMPROVE                  | Make identity, local scene, recent skating, and understandable progress primary.                                                                                                |
| Crews and local community                      | CORE / IMPROVE                  | Keep creation, membership, chat, and nearby activity; verify authorization and reduce duplicate entry points.                                                                   |
| Quests and challenges                          | KEEP / MERGE                    | Present one understandable challenge path. Merge overlapping reward explanations and prevent duplicate reward loops.                                                            |
| XP, levels, achievements                       | CORE / MERGE                    | Keep server-managed progression but expose one clear progress model and reward ledger semantics.                                                                                |
| Streaks, seasonal pass, Passport, bingo        | KEEP / MERGE                    | Treat as views of verified activity, not separate competing economies. Surface only when relevant.                                                                              |
| SKATE games and call-outs                      | KEEP / IMPROVE                  | Preserve the differentiated competition loop; require media/server validation and clear turn/failure state.                                                                     |
| Crew territory and battles                     | KEEP / IMPROVE                  | Keep for established crews; move out of first-session navigation and verify abuse/cooldown rules.                                                                               |
| QR hunts                                       | KEEP / IMPROVE                  | Keep as an advanced real-world mode; verify payment, placement, proof, and reward integrity before promotion.                                                                   |
| Shops, events, Demo Day                        | KEEP / IMPROVE                  | Use real local discovery data only. Link directly from map/scene when relevant.                                                                                                 |
| Playlists                                      | KEEP / HIDE FROM PRIMARY        | Useful session accessory, not a top-level acquisition or release blocker.                                                                                                       |
| AI Coach                                       | HIDE / DEPRECATE CURRENT CLAIMS | The current heuristic/optional analyzer should not be marketed as authoritative AI trick recognition. Reintroduce prominence only with proven user value and honest capability. |
| GoPro import                                   | HIDE / IMPROVE                  | Keep available as an advanced tool but do not place in first-run navigation until device compatibility is verified.                                                             |
| Sponsor leaderboard / donate XP                | HIDE / REVIEW                   | Validate product purpose, security, and relationship to the core loop before promotion.                                                                                         |
| Duplicate `Verified`, `Live`, and base screens | MERGE                           | Trace the routed implementation, port missing behavior, test, then remove dead variants in a dedicated cleanup PR.                                                              |

## First 60 seconds

A new user should see nearby skate options quickly, understand why location helps, and have one obvious action: open a spot, join a session, or add a real spot. Progression education should follow the first useful action instead of preceding it.

## Proposed next features after P0-P3

1. Nearby-session cards tied to map spots.
2. Condition freshness reminders and alerts for saved spots.
3. A session recap that connects tricks, clips, friends, spot, and verified progression.
4. Weekly personal recap based on real activity.
5. Better spot share previews and links after hosting supports path rewrites.

No new marketplace, currency, generic feed, or AI feature is recommended before the core loop is verified.
