# Google Play Data Safety Worksheet — SkateQuest

Use this as the working source when completing **Play Console → App content → Data safety**. Verify every answer against the exact production build before submitting the form.

## Data collection likely applicable

SkateQuest currently has code paths for the following categories:

| Google Play category | SkateQuest examples | Purpose | User initiated / optional? |
|---|---|---|---|
| Personal info | Email, username, display/profile fields, birthdate/age-safety fields | Account management, profile, safety | Account data required; many profile fields optional |
| Precise / approximate location | Device GPS, spot/check-in coordinates | Nearby spots, maps, check-ins, location features | Permission-based |
| Photos and videos | User uploads, spot photos, trick/challenge media | Community content and skate features | User initiated |
| Audio | Microphone while recording video | Video capture | Permission-based / user initiated |
| Messages | Direct/community messages and comments | Social/community features | User initiated |
| App activity | Challenges, sessions, crews, XP, streaks, likes/votes, feature usage | Core app functionality, progression, analytics | Generated through use |
| App info and performance | Crash reports, stack traces, performance/diagnostic events | Reliability, debugging, security | Automatic in production where enabled |
| Device or other identifiers | Push token, Supabase user ID, diagnostic/device identifiers supplied by SDKs | Notifications, authentication, diagnostics | Depending on feature/SDK |

## Third parties / processors visible in the production code

- **Supabase** — authentication, database, storage, realtime/server functions.
- **Mapbox** — maps and map-related functionality.
- **Sentry** — crash/error and performance diagnostics in production.
- **Expo / EAS** — application build, delivery, updates and notification infrastructure as applicable.

Review any additional analytics SDKs before submission and include them if they are enabled in the production build.

## Security disclosures

- Data is transmitted over HTTPS/TLS through the service providers used by the app.
- Authentication is provided through Supabase Auth.
- Public-schema user data is protected with Supabase row-level-security policies where applicable.
- Privileged account deletion and other sensitive operations run server-side.

## Account deletion

SkateQuest allows account creation, so the Play Console account-deletion answers should reflect:

- **In-app deletion:** Yes — Profile → **Delete Account Permanently**.
- **External deletion resource:** Use the public URL for `DELETE_ACCOUNT.md` (or move the same content to the final SkateQuest website before production).
- Deletion removes the authentication account and associated account-linked data, subject to limited security/legal retention described in the privacy policy.

## Before moving beyond internal testing

1. Publish a stable public privacy-policy URL and enter it in Play Console.
2. Enter the external account-deletion URL in the Data safety deletion section.
3. Re-check every SDK and permission in the final production AAB.
4. Complete the Data safety form before closed/open/production distribution.
5. Keep screenshots or notes supporting each declaration in case Google asks for clarification.

Internal-only testing is exempt from the Data safety form, but closed, open, and production tracks require it.
