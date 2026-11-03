# Add Spot location fix — prepared for review

Date: 2026-10-01 UTC (September 30, Pacific).
Base: `c6d2578e99bd80722ac7cc2cc21a6a4a7b6ce62a`.
Local branch: `fix/add-spot-location-races`.

## Problem and changes

On Android, Add Spot automatically requests GPS on mount. A user can choose a
remote pin before GPS resolves; the old response then replaces that pin. Web
also allowed an older GPS request to replace manually entered coordinates or a
newer GPS result. These races could cause submission at the wrong location.

Both screens now invalidate pending GPS responses when a manual location is
selected. Only the latest request may update coordinates or location errors.
Unmounting invalidates outstanding requests. Android also stops after the
permission prompt if the user has since selected a pin.

Android route coordinates, map presses, and GPS results use the existing shared
coordinate parser. Empty/null inputs and out-of-range coordinates are rejected;
explicit zero coordinates remain valid. The native GPS button has an accessible
name and button role.

## Verification

- TypeScript: passed (`npm run type-check`).
- Repository lint: passed (`npm run lint`).
- Full Jest suite: 32 suites, 268 tests passed.
- New regression coverage: 11 tests cover late GPS success/failure, selection
  during permission prompts, invalid route coordinates, valid zero coordinates,
  manual web coordinates, and out-of-order web GPS requests.
- The new suite failed on the original screen code (10 failures, 1 pass).
- `git diff --check`: passed.

These tests use mocked native/browser APIs. They do not establish physical GPS,
Mapbox rendering, or live Supabase persistence.

## Persistence and Android acceptance gate

The existing submission contract is unchanged: `find_duplicate_spot`, then
`create_spot_with_full_details`, then `spotsService.getById` and
`getSpotPersistenceError` for read-back. Photo upload remains optional. No backend
migration or local-only replacement feature is introduced. Stale location errors
are ignored; errors from the current request remain visible.

Before merge, test a real Android build against the connected Supabase project:

1. Delay GPS, select a remote pin, and confirm GPS completion does not move it.
2. Save a named spot with a photo and ratings. Verify its coordinates, ownership,
   ratings, and photo through read-back, after restart, and on a second device.
3. Submit the same location again and verify duplicate rejection.
4. Deny location permission and confirm manual pin selection still works.

Live persistence and physical Android testing were not performed in this session.
The repository's AGENTS.md requires both before merge. No merge, remote push,
Play upload, or publication has been performed.

## Release evidence retrieved this session

- [Alpha source of truth, issue #37](https://github.com/treesus6/SkateQuest-Mobile/issues/37)
  records version 46 active in Alpha as of September 25, with installation,
  startup, relaunch, and login user-confirmed. It records five opted-in testers
  and pending Data Safety review; these counts/review results need a fresh Play
  Console check and should not be presented as current live values.
- [Current-main quality gate](https://github.com/treesus6/SkateQuest-Mobile/actions/runs/36330834337)
  passed.
- [Current-main signed AAB build](https://github.com/treesus6/SkateQuest-Mobile/actions/runs/36330834350)
  passed. Artifact `skatequest-play-aab` (ID `10936690231`) was unexpired when
  checked and expires October 11. It contains the base revision, not this fix.
- Current-main web deployment and web-auth checks passed. These do not establish
  the remaining device and database acceptance requirements.

Next release actions: review/push this patch with owner approval, verify the
Android acceptance gate, build the approved revision, and separately check the
current Play review and tester status. Do not infer that the newer AAB has already
been uploaded or activated.
