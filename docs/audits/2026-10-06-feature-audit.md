# SkateQuest feature audit — 2026-10-06

Release status: **NOT COMPLETE / NOT VERIFIED END TO END**.

Inspected main commit `e25e307037b391a3a1821811eb7613648d2bcfd0`, the live Supabase project named Sk8_quest, the deployed website's signed-out entry, and open feature PRs. This audit is not a release approval. No production data, schema, Play release, or deployed website was changed.

## Confirmed defects and missing behavior

| Area                | Evidence                                                                                                                                                                                                                                                                                                                                                       | Disposition                                                                                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trick Bingo proof   | `UploadMediaScreen.tsx` checked `Number.isInteger` before converting Expo Router's string parameter. A URL square such as `"0"` became null, allowing an ordinary upload instead of the Bingo proof RPC.                                                                                                                                                       | Fixed on this branch. Strictly accept integer indices 0–24; malformed/incomplete Bingo routes fail before upload and never fall back to an ordinary post. 14 screen regression tests cover serialized and numeric edge squares, malformed inputs, server rejection, and ordinary uploads. Original code fails 11 of those 14 tests. |
| Expo SDK validation | Pinned Expo Doctor 1.20.2 reported 20/21 checks, with eight SDK 57 patch mismatches.                                                                                                                                                                                                                                                                           | Align the eight reported packages and generated lockfile on this branch. No SDK-major upgrade.                                                                                                                                                                                                                                      |
| Invite/referrals    | Profile links to `ReferralScreen`, which calls `referralService`. Live `referral_codes` and `referral_uses` tables do not exist. Existing `apply_referral_code` expects `p_code,p_user_id`, while the client sends `p_referral_code,p_new_user_id`. `get_referral_stats` returns `{total,claimed}`, while the service expects an array with other field names. | OPEN. Reconcile the full referral contract, creation, redemption, rewards, and owner policies; verify actual write/read-back. Do not merely add empty tables or report fake zero stats.                                                                                                                                             |
| Moderation queue    | Routed `ModerationQueueScreen` calls `moderationService.getModerationQueue`, which reads missing `content_moderation_queue`. A differently named `moderation_queue` exists; schema compatibility was not established.                                                                                                                                          | OPEN. Reconcile the queue contract and moderator authorization before claiming review actions work.                                                                                                                                                                                                                                 |
| Quest discovery     | Current `DailyQuestsVerifiedScreen` is a claim board; it lacks the side-adventure discovery section described in open PR #312.                                                                                                                                                                                                                                 | OPEN PR #312 adds links to GPS routes, Passport and Bingo. It is a draft, not part of main, and destination persistence/device verification is outstanding.                                                                                                                                                                         |
| Home actions/data   | Main POST tile opens SkateTV, and failed list reads are converted to empty data.                                                                                                                                                                                                                                                                               | Existing draft PR #314 covers POST upload navigation, errors/retry, stale responses, account isolation and clearer counts. Do not duplicate or silently treat it as merged.                                                                                                                                                         |
| Add Spot GPS races  | Existing draft PR #313 documents and tests delayed GPS overwriting a manual pin.                                                                                                                                                                                                                                                                               | Still open. Physical Android remote pin/photo/save/read-back/duplicate verification remains required.                                                                                                                                                                                                                               |
| Active Session      | Existing draft PR #316 documents local-only pause vs server wall-clock duration and an invalid client-authored session feed event.                                                                                                                                                                                                                             | Still open. Its migration is not applied by this audit. Atomic completion/feed/reward read-back and Android restart verification remain required.                                                                                                                                                                                   |
| Profile editing     | Current `ProfileScreen` displays profile and account actions but has no username/avatar edit controls. The test named `profileUpdate.test.tsx` mocks profile reads; its filename is not evidence of a working editor.                                                                                                                                          | Product gap to resolve; profile/session restore also needs runtime checks.                                                                                                                                                                                                                                                          |
| Messaging           | `/messages` explicitly renders a connection directory and says direct messaging is not a public feature.                                                                                                                                                                                                                                                       | An inbox is not implemented by this screen. Preserve the current policy until the owner chooses messaging scope; do not describe the route as working DMs.                                                                                                                                                                          |

## Backend evidence

Read-only inspection confirmed core spot/session/media/quest/crew/Bingo tables and the Bingo submission RPC exist. The four storage buckets are `spot-photos`, `skatetv-clips`, `quest-proofs`, and `user-avatars`. General media uploads intentionally use `skatetv-clips`; folder names such as `user_videos` are not missing bucket names.

At inspection time: 24,766 `skate_spots`; zero `spot_photos`, `skate_sessions`, `session_attendees`, `media`, and `bingo_cell_submissions`. Empty tables do not prove writes are broken, but provide no evidence that these workflows have been completed successfully.

`submit_bingo_cell_proof(p_bingo_card_id uuid, p_cell_index integer, p_media_id uuid)` exists, allows `authenticated` execution, denies `anon` execution, and its migration validates card/media ownership, video type, current week and duplicate pending/approved proof. `bingo_cell_submissions` has RLS enabled and an authenticated SELECT policy. This is schema/policy inspection, **not** an authenticated RLS execution or persistence test.

A wider literal contract scan also found references to absent `seasonal_user_progress`, `charity_stats`, `crash_reports`, `clip_of_week_nominations`, and `submit_clip_of_week_nomination`. These are in service/legacy paths; reachability must be established before labeling their corresponding visible features broken. In particular, current `ClipOfWeekScreen` uses `clip_of_week_submissions` directly, so absence of the old nominations table does not establish failure of the current contest screen.

## Verification and limits

- Baseline: locked `npm ci`; TypeScript and ESLint passed; 31 suites / 257 tests passed.
- Bingo fix: 14 new tests passed. Running those tests against original main produced 11 failures and 3 passes.
- Changed branch before SDK patch alignment: TypeScript and lint passed; 32 suites / 271 tests passed.
- Final SDK-aligned branch: TypeScript and ESLint passed; 32 suites / 271 tests passed; Expo Doctor 21/21; web export succeeded and all 15 checked route/policy/PWA files exist. Expo reported a forced exit after export because a handle remained open; export artifacts were present, but this is not runtime verification.
- Static web export is a compilation/route check. Local Supabase/Mapbox runtime credentials are not configured; it is not signed-in app validation.
- Live `https://skatequest.me` renders `/login`, beta notice, support link, email/password and Google sign-in. This browser has no authenticated app session.
- No physical Android device/emulator is connected. No camera, actual GPS, Play-install restart, second-device persistence, or authenticated upload/write was claimed.
- Backend inspection was read-only. No user impersonation or privileged write was used as a substitute for real sign-in.

## Required end-to-end checklist

Each row remains open until the real flow is exercised with the intended account/role and recorded evidence. Existence of a route or database object is insufficient.

| Flow                                                     | Required proof                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Signup / email / Google / password recovery              | Successful login, useful errors, return route, session restore and sign-out                                  |
| Map / GPS                                                | Android rendering, real permission allow/deny, location, spot selection, web fallback                        |
| Add Spot                                                 | Remote pin stays chosen; ratings and photo save; duplicate rejected; exact row/photo read back after restart |
| Spot detail / conditions / ratings                       | Correct spot and gallery, write/read-back, ownership and failure behavior                                    |
| Scheduled sessions / RSVP                                | Create/join/leave, capacity, attendee row consistency, restart persistence                                   |
| Active Session                                           | Start/resume/end, authoritative duration/XP and one feed event, retry idempotence                            |
| Daily quests / challenges / call-outs / bounties / Bingo | Discover feature, submit real proof, review with permitted second account, award once, refresh/restart       |
| QR / routes / Passport / territory                       | Real location checks, ordered progress, proof and reward persistence                                         |
| Crews / battles / invitations                            | Create/invite/join/leave, permissions and vote persistence                                                   |
| Media / SkateTV / feed / weekly contest                  | Real upload and playback, proof linkage, likes/votes, error recovery and read-back                           |
| Profile / referrals / notifications / achievements       | Correct profile, restore, missing edit/referral behavior resolved, real notification/award data              |
| Shops / events / mentorship / playlists                  | Current listings and links, permitted actions and persistent results                                         |
| Moderation / report / account deletion                   | Moderator-only review, report read-back, deletion verified only using an explicitly disposable test account  |
| Release                                                  | Tested signed Android build, deep links, Play compliance and qualifying tester evidence from issue #37       |

## Next action

Complete secure sign-in to the deployed app for authenticated browser checks, then use a connected Android test device for the required hardware and restart checks. Keep this PR and the existing feature PRs in draft until their runtime gates pass. Issue #37 remains the release source of truth.

## Route inventory

These 68 route entries exist in source. Platform-specific exports may select different screens. This is not a runtime pass list.

| URL                    | Entry file                              | First imported/exported module              |
| ---------------------- | --------------------------------------- | ------------------------------------------- |
| `/callback`            | `app/(auth)/callback.tsx`               | `react`                                     |
| `/forgot-password`     | `app/(auth)/forgot-password.tsx`        | `../../screens/ForgotPasswordScreen`        |
| `/login`               | `app/(auth)/login.tsx`                  | `expo-router`                               |
| `/reset-password`      | `app/(auth)/reset-password.tsx`         | `../../screens/ResetPasswordScreen`         |
| `/signup`              | `app/(auth)/signup.tsx`                 | `expo-router`                               |
| `/achievements`        | `app/(screens)/achievements.tsx`        | `../../screens/AchievementsScreen`          |
| `/active-session`      | `app/(screens)/active-session.tsx`      | `../../screens/ActiveSessionScreen`         |
| `/add-spot`            | `app/(screens)/add-spot.tsx`            | `../../screens/AddSpotScreen`               |
| `/ai-coach`            | `app/(screens)/ai-coach.tsx`            | `../../screens/AiCoachScreen`               |
| `/bounty-board`        | `app/(screens)/bounty-board.tsx`        | `../../screens/BountyBoardScreen`           |
| `/call-outs`           | `app/(screens)/call-outs.tsx`           | `../../screens/CallOutsScreenVerified`      |
| `/challenges`          | `app/(screens)/challenges.tsx`          | `../../screens/ChallengesScreen`            |
| `/changelog`           | `app/(screens)/changelog.tsx`           | `../../screens/ChangelogScreen`             |
| `/check-in`            | `app/(screens)/check-in.tsx`            | `../../screens/CheckInScreen`               |
| `/clip-of-week`        | `app/(screens)/clip-of-week.tsx`        | `../../screens/ClipOfWeekScreen`            |
| `/crew-battles`        | `app/(screens)/crew-battles.tsx`        | `../../screens/CrewBattlesScreen`           |
| `/crew-details`        | `app/(screens)/crew-details.tsx`        | `../../screens/CrewDetailsScreen`           |
| `/crews`               | `app/(screens)/crews.tsx`               | `../../screens/CrewsScreen`                 |
| `/daily-quests`        | `app/(screens)/daily-quests.tsx`        | `../../screens/DailyQuestsScreen`           |
| `/demo-day`            | `app/(screens)/demo-day.tsx`            | `../../screens/DemoDayScreen`               |
| `/donate-xp`           | `app/(screens)/donate-xp.tsx`           | `../../screens/DonateXPScreen`              |
| `/events`              | `app/(screens)/events.tsx`              | `../../screens/EventsScreen`                |
| `/feed`                | `app/(screens)/feed.tsx`                | `../../screens/FeedScreen`                  |
| `/game-detail`         | `app/(screens)/game-detail.tsx`         | `../../screens/GameDetailScreen`            |
| `/gopro-import`        | `app/(screens)/gopro-import.tsx`        | `../../screens/GoProImportScreen`           |
| `/hidden-gems`         | `app/(screens)/hidden-gems.tsx`         | `../../screens/HiddenGemsScreen`            |
| `/hide-qr-code`        | `app/(screens)/hide-qr-code.tsx`        | `../../screens/HideQRCodeScreenVerified`    |
| `/judges-booth`        | `app/(screens)/judges-booth.tsx`        | `../../screens/JudgesBoothScreen`           |
| `/leaderboard`         | `app/(screens)/leaderboard.tsx`         | `../../screens/LeaderboardScreen`           |
| `/live-check-in`       | `app/(screens)/live-check-in.tsx`       | `../../screens/LiveCheckInScreen`           |
| `/mentorship-list`     | `app/(screens)/mentorship-list.tsx`     | `../../screens/MentorshipListScreen`        |
| `/mentorship`          | `app/(screens)/mentorship.tsx`          | `../../screens/MentorshipScreen`            |
| `/messages`            | `app/(screens)/messages.tsx`            | `../../screens/MessagesScreen`              |
| `/moderation-queue`    | `app/(screens)/moderation-queue.tsx`    | `../../screens/ModerationQueueScreen`       |
| `/notifications`       | `app/(screens)/notifications.tsx`       | `../../screens/NotificationsScreen`         |
| `/playlists`           | `app/(screens)/playlists.tsx`           | `../../screens/PlaylistsScreen`             |
| `/qr-scanner`          | `app/(screens)/qr-scanner.tsx`          | `../../screens/QRCodeScannerScreenVerified` |
| `/referral`            | `app/(screens)/referral.tsx`            | `../../screens/ReferralScreen`              |
| `/scene`               | `app/(screens)/scene.tsx`               | `../../screens/SceneScreen`                 |
| `/seasonal-events`     | `app/(screens)/seasonal-events.tsx`     | `../../screens/SeasonalEventsScreen`        |
| `/seasonal-pass`       | `app/(screens)/seasonal-pass.tsx`       | `../../screens/SeasonalPassScreen`          |
| `/sessions`            | `app/(screens)/sessions.tsx`            | `../../screens/SessionsScreen`              |
| `/shops`               | `app/(screens)/shops.tsx`               | `../../screens/ShopsScreen`                 |
| `/skate-forecast`      | `app/(screens)/skate-forecast.tsx`      | `../../screens/SkateForecastScreen`         |
| `/skate-game`          | `app/(screens)/skate-game.tsx`          | `../../screens/SkateGameScreen`             |
| `/skate-passport`      | `app/(screens)/skate-passport.tsx`      | `../../screens/SkatePassportScreen`         |
| `/skate-tv`            | `app/(screens)/skate-tv.tsx`            | `../../screens/SkateTVScreen`               |
| `/sponsor-leaderboard` | `app/(screens)/sponsor-leaderboard.tsx` | `../../screens/SponsorLeaderboardScreen`    |
| `/spot-claims`         | `app/(screens)/spot-claims.tsx`         | `../../screens/SpotClaimsScreen`            |
| `/spot-conquer`        | `app/(screens)/spot-conquer.tsx`        | `../../screens/CrewTerritoryScreen`         |
| `/spot-detail`         | `app/(screens)/spot-detail.tsx`         | `expo-router`                               |
| `/spot-mission-routes` | `app/(screens)/spot-mission-routes.tsx` | `../../screens/SpotMissionRoutesScreen`     |
| `/spot-of-the-day`     | `app/(screens)/spot-of-the-day.tsx`     | `../../screens/SpotOfTheDayScreen`          |
| `/spot-reviews`        | `app/(screens)/spot-reviews.tsx`        | `../../screens/SpotReviewsScreen`           |
| `/spots`               | `app/(screens)/spots.tsx`               | `../../screens/SpotsScreen`                 |
| `/streaks`             | `app/(screens)/streaks.tsx`             | `../../screens/StreaksScreen`               |
| `/trick-bingo`         | `app/(screens)/trick-bingo.tsx`         | `../../screens/TrickBingoScreen`            |
| `/trick-of-week`       | `app/(screens)/trick-of-week.tsx`       | `../../screens/TrickOfWeekScreen`           |
| `/trick-tracker`       | `app/(screens)/trick-tracker.tsx`       | `../../screens/TrickTrackerScreenVerified`  |
| `/trick-tutorials`     | `app/(screens)/trick-tutorials.tsx`     | `../../screens/TrickTutorialsScreen`        |
| `/upload-media`        | `app/(screens)/upload-media.tsx`        | `../../screens/UploadMediaScreen`           |
| `/weather-spots`       | `app/(screens)/weather-spots.tsx`       | `../../screens/WeatherSpotsScreen`          |
| `/xp-rewards`          | `app/(screens)/xp-rewards.tsx`          | `../../screens/XPRewardsScreen`             |
| `/crew`                | `app/(tabs)/crew.tsx`                   | `../../screens/CrewScreen`                  |
| `/`                    | `app/(tabs)/index.tsx`                  | `../../screens/HomeScreen`                  |
| `/map`                 | `app/(tabs)/map.tsx`                    | `../../screens/MapScreen`                   |
| `/profile`             | `app/(tabs)/profile.tsx`                | `../../screens/ProfileScreen`               |
| `/quests`              | `app/(tabs)/quests.tsx`                 | `../../screens/DailyQuestsScreen`           |
