# SkateQuest: Uptodown submission packet

Status: Prepared, NOT uploaded or submitted for review.
Last reviewed: 2026-11-05.
Official workflow: https://en.uptodown.com/developers-console
Uptodown submission instructions: https://support.uptodown.com/hc/en-us/articles/360053260491-How-to-publish-an-app-on-Uptodown

## Listing data
- App name: SkateQuest
- OS: Android
- Package: `com.treesus6.skatequest`
- App version declared in `app.config.js`: 1.0.2 (verify actual APK versionName/versionCode with `aapt dump badging` before submitting; remote EAS version may differ)
- Stage: Alpha (change to Beta/Final Release only after real-device QA)
- Suggested category: Sports (select nearest available actual Uptodown category)
- Languages: English (verify other language localizations before claiming)
- Official website: https://skatequest.me
- Support: support@skatequest.me
- Availability: Worldwide, subject to applicable laws and distribution rights
- Author/publisher: Verify the authorized developer/organization in Uptodown Console before submission
- License: Determine from project ownership and LICENSE terms; do not guess
- IAP / subscriptions / advertisements: Audit actual production behavior and declare truthfully

## Short description
Find skate spots, track tricks, join crews, and take on skateboarding challenges.

## Full description
SkateQuest connects skateboarders with real places to skate and a community of riders.

Explore a map of skate spots, discover nearby parks and street locations, and open details to learn more about each spot. Track trick progression, take on challenges, join crews, and organize sessions with other skateboarders. Share photos and clips and discover what the skate scene is doing.

SkateQuest is designed for skaters everywhere. It is currently in testing, and some features may change as reliability, safety, and usability improve.

Location access helps show spots around you. Camera, microphone, and media access are used when you choose to capture or share content.

## Alpha release notes
Initial Android testing release with skate-spot exploration, community crews, sessions, challenges, trick tracking, and media features. Stability, sign-in, navigation, and Android startup are under active verification.

## Required assets / evidence
- [ ] Upload the current standalone APK **only after its signing certificate matches the established Expo/Play upload certificate** and the package name and bundled configuration pass inspection.
- [ ] Confirm Android cold start, relaunch, sign-in, map, spot details, crew flows, and content uploads on an emulator and physical phone.
- [ ] Confirm the exact APK versionName, versionCode, minimum Android version, and SHA-256 hash for the submission record.
- [ ] App icon: verify actual `assets/icon.png` size and transparency; Uptodown recommends square PNG at least 256x256.
- [ ] Capture genuine screenshots from the **tested** APK (map, spot detail, challenges, crews, profile).
- [ ] Confirm live privacy policy, data collection/permissions, account deletion webpage, reporting/blocking, and user-generated content moderation.
- [ ] Verify developer account and organization identity; existing registration/login does not prove a submitted listing.
- [ ] Choose license and truthful distribution model, IAP, subscription, and ads declarations.
- [ ] In Console: Apps -> Add new app -> Android -> select tested APK -> complete listing and screenshots -> Submit for review.
- [ ] Record Uptodown app ID, submission receipt, publication status, exact uploaded APK hash, and final listing URL here.

## Constraints
- Keep Google Play closed Alpha unchanged; no production rollout or Play signing-key changes.
- Do not upload a debug APK or mismatched-signer release to Uptodown.
- Do not mark this as submitted, approved, or published without Uptodown Console proof.
- Uptodown publishes via editorial review; posting a file does not itself guarantee approval.
