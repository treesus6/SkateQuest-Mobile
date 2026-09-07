# Android Release Checklist

Updated: 2026-09-07

## Configuration verified in source

- [x] Package: `com.treesus6.skatequest`
- [x] App version: `1.0.1`
- [x] EAS app version source: remote
- [x] Production build: Android App Bundle
- [x] Production distribution: store
- [x] Production channel: `production`
- [x] Production version code: auto-incremented remotely
- [x] Play submit track: `alpha`
- [x] EAS runtime version policy: app version
- [x] Mapbox native config plugin present
- [x] Supabase, Mapbox, and Sentry public runtime values are read through Expo config
- [x] Broad Android media/storage permissions blocked on this branch
- [ ] Confirm target SDK from the built AAB
- [ ] Confirm Play signing identity and upload certificate
- [ ] Confirm all production EAS/GitHub secrets exist without printing them

## Required automated checks

- [x] `npm ci`
- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm test -- --runInBand`
- [x] `npx expo-doctor@1.20.2`
- [x] `npm run export:web`
- [ ] Exact-branch EAS preview APK
- [ ] Exact-branch EAS production AAB
- [ ] Inspect AAB manifest, package, version code, target SDK, permissions, and intent filters

## Physical Android smoke matrix

- [ ] Clean install and cold start without crash
- [ ] Upgrade from the previous alpha without losing the session or local cache
- [ ] Email signup, confirmation, profile creation, logout, and login restoration
- [ ] Google OAuth return through `com.treesus6.skatequest://auth/callback`
- [ ] Password reset deep link
- [ ] Map render, GPS allow/deny/retry, nearby spots, clusters, and filters
- [ ] Open canonical spot link from another app and after login
- [ ] Add spot with pin, ratings, metadata, photo, read-back, and duplicate rejection
- [ ] Report condition and verify reporter/timestamp after restart
- [ ] Start/join/leave session and verify capacity and persistence
- [ ] Record/select/upload photo and video; cancel, fail, retry, and play
- [ ] Check-in, quest proof, SKATE game, crew, and progression server verification
- [ ] Notification permission, receive, tap, and deep-link destination
- [ ] Offline launch, reconnect, failed mutation rollback, and no fake success
- [ ] Account deletion and post-deletion token behavior

## Google Play review

- [ ] Data safety matches actual collection, analytics, location, camera, microphone, and uploads
- [ ] Photo/video declarations match the system-picker approach
- [ ] Privacy policy and account deletion instructions are live
- [ ] Screenshots and feature graphics match the tested build
- [ ] Closed-alpha tester list and release notes are current
- [ ] Artifact is uploaded only after the smoke matrix passes

## iOS readiness

- Bundle identifier is `com.treesus6.skatequest`; build number remains `1` in source.
- Location, camera, photos, photo-add, and microphone usage descriptions exist.
- Universal/associated domains are not configured in source; custom URL scheme behavior must be tested.
- Google OAuth, password reset, notification permissions, Mapbox, camera, library selection, video playback, and background/foreground auth restoration are unverified.
- No iOS production build or device matrix has been completed.
