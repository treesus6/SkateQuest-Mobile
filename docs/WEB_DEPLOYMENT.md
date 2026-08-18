# SkateQuest web deployment

## Client-safe build variables

Set these in the EAS `production` environment before exporting or deploying:

- `EXPO_PUBLIC_SUPABASE_URL` — existing Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — existing publishable/anon key. Never use the service-role key.
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` — public Mapbox token restricted to production origins.
- `EXPO_PUBLIC_SENTRY_DSN` — public browser DSN.
- `EXPO_PUBLIC_ENV=production`.
- Optional: `EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`.

`MAPBOX_DOWNLOADS_TOKEN` is native-build-only and must remain secret. It must not use the `EXPO_PUBLIC_` prefix.

## Export and deploy

```sh
npm ci
npm run export:web
npx eas-cli@latest deploy --environment production --prod
```

The app uses Expo's static web output. Add the deployed EAS Hosting origin and `/\(auth\)/callback` redirect URL to the existing Supabase project's Auth URL allowlist. OAuth providers must redirect through that allowlisted URL. The Android `com.treesus6.skatequest` scheme remains unchanged.

## Offline policy

The service worker caches only the application shell and same-origin static assets. Navigations are network-first. Supabase responses, authenticated API calls, Mapbox tiles, uploads, and mutations are never cached or replayed by the service worker.

## Web push status

Web push is intentionally unavailable until the backend has all of the following: a VAPID key pair; a versioned push-subscriptions table with user ownership/RLS and endpoint/key fields; an authenticated registration/removal API; and a server/Edge Function that sends standards-based Web Push and removes expired subscriptions. The existing Expo push-token column and Expo notification sender are not a valid Safari Web Push subscription backend.

## Remaining physical-device validation

Before production promotion, validate on a physical iPhone in Safari and Home Screen standalone mode: OAuth return, session persistence after termination, camera capture, large video selection/upload/read-back, location denial and re-enable, Mapbox gestures, safe areas, and restart/second-device visibility. Also rerun the existing Android critical-flow regression suite against the connected Supabase project.
