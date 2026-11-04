# Profile privacy: staged compatibility repair

This change is client preparation, **not a completed database privacy fix**.
Do not restrict production profile SELECT until compatible clients are installed.
No migration or live database grant change is included in this PR.

## Verified on 2026-11-04

- Connected project: `hreeuqdgrwvnxquxohod`.
- `public.profiles` has RLS enabled. Its SELECT policy permits public rows or the
  signed-in owner's row, but RLS does not hide columns within visible rows.
- Both `anon` and `authenticated` can SELECT `birthdate`, `is_minor`,
  `parental_consent_given`, `parent_email`, `account_verified`, `push_token`, and
  `push_token_updated_at` on visible profiles.
- A read-only transaction under `anon` saw 15 profiles and zero non-null
  birthdates, parent emails, or push tokens. No private values were fetched.
  This establishes an access-control risk, not evidence of disclosed values.
- Existing profile service reads and mutation read-backs used wildcard SELECT.
  Home also queried all profile columns. These fail if sensitive-column SELECT
  is revoked, even when reading one's own row.

## Client preparation in this PR

- All four profile-service SELECT/RETURNING paths explicitly request the 30
  current non-sensitive columns in `lib/profileColumns.ts`.
- Home uses `profilesService.getById`, sharing the same projection.
- Existing profile fields, owner filter, leaderboard ordering/limit, mutation
  payloads, API errors, and database persistence semantics remain unchanged.
- Push-token registration still updates `profiles.push_token` without returning
  it. This change does not revoke UPDATE or change notification behavior.
- Current app source has no birthdate, parent-email, or minor-status read flow.
  Any future owner-only access needs a dedicated reviewed owner-authorized API,
  not SELECT permission for all authenticated users on public profile rows.

## Gates before database enforcement

1. Pass full CI and review. Build the exact compatible APK; verify login, restart
   restoration, own/public profile, Home, leaderboard, profile update read-back,
   and notification registration on Android. Signup/profile creation must retain
   its existing backend contract; mocked request tests are not live write proof.
2. Decide supported old-build behavior and roll out the compatible build/web
   client. Installed wildcard clients will break after grant restriction; merging
   this PR alone does not update those devices. Record approval and rollout
   evidence in #343/#37 before scheduling enforcement.
3. In a separate reviewed change, inventory role inheritance, table/column grants,
   views, callable functions, and Realtime exposure. Revoke table-level SELECT
   and sensitive-column SELECT from PUBLIC/anon/authenticated, then grant only
   the explicit public-column allowlist. Preserve writes and server-side access.
   Test anon, owner, and another authenticated user: allowed public projection,
   denied sensitive-column/wildcard reads, private-row hiding, legitimate owner
   updates, public embedded joins, and notification registration. Verify through
   the real Data API and after restart. Do not claim enforcement from this PR.

Supabase's GitHub app reports automatic migration execution on merge. At this
audit it also fails `Supabase Preview` on main with `Remote migration versions
not found in local migrations directory.` Resolve that history mismatch by
reviewing actual remote versions; do not repair history blindly or add empty
migrations. This rollout note is outside `supabase/migrations` intentionally.
