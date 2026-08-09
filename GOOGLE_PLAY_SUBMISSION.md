# SkateQuest — Google Play Release Guide

**Updated:** August 9, 2026

This guide matches the current SkateQuest EAS configuration and current Google Play testing requirements.

## 1. Internal testing first

The repository is configured so an Android **production** run of `.github/workflows/eas-manual-build.yml`:

1. runs type checks, tests, and Expo Doctor;
2. creates an Android App Bundle (`.aab`) with EAS Build;
3. writes the Google service-account credential from GitHub Secrets; and
4. submits the latest successful production build to the Google Play **internal** track.

Run it from **GitHub → Actions → EAS Build (Manual) → Run workflow** with:

- Platform: `android`
- Profile: `production`

`eas.json` uses remote app versioning and production `autoIncrement`, so each production build receives a new developer-facing build version/versionCode.

## 2. Test the actual Play build

Before moving to a wider track, install the internal-testing build and smoke test at minimum:

- launch and authentication;
- signup and password reset;
- map loading, nearby spots, spot detail and check-ins;
- sessions and RSVPs;
- challenges, XP, achievements and streaks;
- crews/social features;
- photo/video upload and playback;
- messaging/report/block flows;
- notifications where enabled;
- Profile → **Delete Account Permanently**.

Treat any launch crash, auth failure, broken navigation, failed Supabase query/RPC, or upload failure as a release blocker.

## 3. Store listing assets

Prepare and upload real assets from the app:

- 512×512 app icon;
- 1024×500 feature graphic;
- portrait phone screenshots from the real application;
- short description;
- full description;
- support/developer contact information;
- release notes.

Recommended screenshot sequence: Map, spot detail/check-in, challenges/XP, crews/community, media/profile.

Do not use screenshots that show functionality the release does not actually provide.

## 4. Privacy, Data safety and account deletion

Repository references:

- `PRIVACY_POLICY.md`
- `DELETE_ACCOUNT.md`
- `PLAY_DATA_SAFETY.md`

For internal-only testing, Google currently exempts the app from the Data safety section. Before using closed, open, or production tracks, complete the Data safety form and provide a public privacy-policy URL.

Because SkateQuest supports account creation, Google Play requires both:

- an in-app path to request/delete the user's account; and
- an external web resource where a user can request deletion without reinstalling the app.

SkateQuest now includes the in-app Profile deletion control and a repo deletion-request document. Prefer hosting the privacy policy and deletion page on the final SkateQuest website before production; until then, the public GitHub documents can serve as the working source text.

## 5. Closed testing requirement for newer personal accounts

If the Google Play developer account is a **personal account created after November 13, 2023**, production access requires a closed test with at least **12 testers opted in continuously for at least 14 days**. Internal testing does not satisfy this requirement.

When that requirement applies:

1. finish required Play app setup;
2. create a Closed testing release;
3. invite at least 12 testers;
4. keep at least 12 testers opted in continuously for 14 days;
5. collect real testing feedback and fix release-blocking issues;
6. apply for production access in Play Console after the requirement is satisfied.

## 6. Android API requirement

SkateQuest currently uses Expo SDK 57. Expo SDK 57 targets Android 16 / API level 36, matching Google Play's requirement for new apps and updates beginning August 31, 2026.

## 7. Production release

After internal/closed testing and Play Console requirements are satisfied:

1. review crash/ANR and testing feedback;
2. confirm Data safety, privacy policy, account deletion and content-rating answers;
3. create/select the production release in Play Console;
4. use the tested AAB or build a fresh production version if fixes changed native/runtime code;
5. add accurate release notes;
6. use a staged rollout for the first public release when possible;
7. monitor crashes, ANRs, reviews, Supabase logs and Sentry after rollout.

## Current release notes draft

**SkateQuest 1.0.x — Initial testing release**

- Interactive skate-spot map and spot details
- Sessions, challenges, XP, achievements and streak tracking
- Crews and community features
- Photo/video skate content
- Messaging, reporting and safety tools
- Performance and backend reliability fixes
- Account deletion and privacy-compliance improvements

Update this list to match the exact build sent to Google Play.
