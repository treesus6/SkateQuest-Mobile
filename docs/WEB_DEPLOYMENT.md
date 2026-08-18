# SkateQuest web deployment

## Production origin

The production PWA origin is:

- `https://skatequest.me`
- `https://www.skatequest.me` may redirect to the apex domain.

GitHub Pages is the hosting backend, but production auth links and user-facing URLs should use the custom domain rather than the old repository subpath.

## Client-safe build variables

Set these as GitHub repository secrets used by `.github/workflows/deploy-web-pages.yml`:

- `EXPO_PUBLIC_SUPABASE_URL` — existing Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — existing publishable/anon key. Never use the service-role key.
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` — public Mapbox token restricted to production origins.
- `EXPO_PUBLIC_SENTRY_DSN` — public browser DSN.
- `EXPO_PUBLIC_ENV=production` is set by the workflow.

`MAPBOX_DOWNLOADS_TOKEN` is native-build-only and must remain secret. It must not use the `EXPO_PUBLIC_` prefix.

## GitHub Pages deploy

`.github/workflows/deploy-web-pages.yml` builds the Expo web/PWA output and deploys it to GitHub Pages for free.

The workflow runs on every push to `main` so changes cannot silently miss the production PWA because they live in a folder that was not included in a path filter. It can also be run manually with `workflow_dispatch`.

The workflow sets an empty `EXPO_PUBLIC_BASE_URL` because `skatequest.me` serves the app from `/`, not from `/SkateQuest-Mobile`.

Repository Pages settings must remain:

1. `Settings` → `Pages`.
2. `Source` = `GitHub Actions`.
3. `Custom domain` = `skatequest.me`.
4. Enable `Enforce HTTPS` as soon as GitHub finishes issuing the certificate.

## Supabase Auth URLs

The Supabase project Auth URL configuration must allow the production PWA routes used by email confirmation and password recovery:

- `https://skatequest.me/`
- `https://skatequest.me/callback`
- `https://skatequest.me/reset-password`

If `www.skatequest.me` is used directly instead of redirecting immediately to the apex domain, allow the equivalent `www` URLs too.

The app generates browser auth redirects from `window.location.origin`, so production email links naturally target `https://skatequest.me` once the PWA is opened there. The Android `com.treesus6.skatequest` scheme remains unchanged for the native app.

## PWA behavior

The app uses Expo Router static web output. The manifest, service worker, browser location adapter, Mapbox GL web map, browser media upload path, password recovery route, and iPhone Add-to-Home-Screen guide are part of the production web build.

The service worker caches only the application shell and same-origin static assets. Navigations are network-first. Supabase responses, authenticated API calls, Mapbox tiles, uploads, and mutations are never cached or replayed by the service worker.

## Web push status

Web push is intentionally unavailable until the backend has all of the following: a VAPID key pair; a versioned push-subscriptions table with user ownership/RLS and endpoint/key fields; an authenticated registration/removal API; and a server/Edge Function that sends standards-based Web Push and removes expired subscriptions. The existing Expo push-token column and Expo notification sender are not a valid Safari Web Push subscription backend.

## Remaining physical-device validation

Before treating the PWA as production-ready, validate on a physical iPhone in Safari and Home Screen standalone mode:

- open `https://skatequest.me` over HTTPS;
- create an account and confirm the email back into `/callback`;
- sign in, terminate Safari/Home Screen app, reopen, and confirm session persistence;
- request a password reset and complete `/reset-password` without being redirected away;
- allow location, deny it once, re-enable it, and confirm the map recenters correctly;
- open a real spot and confirm direct route navigation works;
- use camera/QR scanning where supported;
- select and upload a real video, then read it back from Supabase storage;
- install with Safari Share → Add to Home Screen and verify safe areas/standalone mode;
- rerun the Android critical-flow regression suite against the same connected Supabase project.
