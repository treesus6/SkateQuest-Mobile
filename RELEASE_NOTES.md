# SkateQuest Release Candidate Notes

Updated: 2026-09-07

SkateQuest is an Expo/React Native application backed by Supabase, PostGIS, Mapbox, and GitHub Pages web hosting. Earlier notes describing Firebase, Netlify, Leaflet, `sk8.quest`, or a completed production launch were obsolete and have been removed.

## Current candidate

- Android and web/PWA are the active release targets.
- Source-level type checking, linting, tests, Expo diagnostics, and static web export pass.
- The production web deployment and automated public-route checks are healthy.
- Server-managed progression and competitive flows exist, but their authorization boundaries still require focused review.

## Release gates

- Complete authenticated persistence testing for auth, profiles, spots, conditions, media, and sessions.
- Reconcile the repository migration ledger with the connected production project without destructive production changes.
- Build and install an exact-branch Android preview, complete physical-device QA, then inspect the production AAB.
- Verify Play disclosures, signing, deep links, runtime public configuration, Sentry, and account deletion.

See [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md) for the authoritative status and [`CHANGELOG.md`](CHANGELOG.md) for detailed changes.
