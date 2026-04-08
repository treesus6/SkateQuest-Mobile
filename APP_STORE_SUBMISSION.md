# iOS App Store Submission Guide

**Target**: Apple App Store
**Timeline**: 24-48 hours (review time)
**Cost**: $99/year Apple Developer Account

---

## Prerequisites Checklist

- [ ] Apple Developer Account (https://developer.apple.com)
- [ ] Mac computer OR access to Apple developer tools
- [ ] Production build ready (from `eas build --platform ios --profile production`)
- [ ] App Store Connect access (https://appstoreconnect.apple.com)
- [ ] Icon: 1024x1024px (from assets/icon.png)
- [ ] Screenshots: 5-7 in high-res
- [ ] Privacy policy URL ready

---

## Step-by-Step Submission

### 1. Create App in App Store Connect

**If first time:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps"
3. Click "+" → "New App"
4. Choose:
   - Platform: `iOS`
   - App Name: `SkateQuest`
   - Primary Language: English
   - Bundle ID: `com.skatequest.app`
   - SKU: `skatequest-001` (internal reference)
   - Access Level: `Full Access`
5. Click "Create"

### 2. Fill in App Information

**App > Information**

| Field | Value |
|-------|-------|
| **App Name** | SkateQuest |
| **Subtitle** | Discover Skate Spots & Join Challenges |
| **Positive Rating** | Skateboarding maps, social gaming, trick challenges |
| **Description** | The ultimate skateboarding companion app. Find skate spots with an interactive map of 27,000+ parks worldwide, track your trick progression, compete in SKATE challenges, earn XP, and join a crew. Features AI-powered trick analysis, social feed, crew battles, leaderboards, offline support, and a thriving global skating community. Build for skaters, by skaters. |
| **Keywords** | skateboarding, skate maps, skateparks, challenges, gaming, social, tricks, XP, crews |
| **Support URL** | https://www.skatequest.com/support |
| **Privacy Policy URL** | https://www.skatequest.com/privacy |
| **Category** | Sports |
| **Content Rating** | Requires questionnaire (see below) |

### 3. Content Rating Questionnaire

**App > Compliance > Content Ratings**

Go through questionnaire:
- Violence: `None`
- Profanity: `Infrequent/Mild` (user-generated video content possible)
- Mature content: `None`
- Alcohol/Tobacco: `None`
- Medical: `None`
- Gambling: `None`

Result should be: **12+ or 4+**

### 4. Upload Screenshots

**App > Manage > iOS Screenshots**

Upload 5-7 screenshots for these dimensions:
- **6.5" display (required)**: 1242 × 2688 px
- **5.5" display (required)**: 1242 × 2208 px
- **iPad Pro 12.9" (recommended)**: 2048 × 2732 px

**Screenshot order (best practice):**
1. **Screen**: Map with skateparks (main feature)
   - Caption: "Discover 27,000+ skateparks worldwide"
2. **Screen**: Challenges/XP system
   - Caption: "Complete challenges and earn XP"
3. **Screen**: Crew system
   - Caption: "Join a crew and compete"
4. **Screen**: Video upload/trick analysis
   - Caption: "Record tricks with AI analysis"
5. **Screen**: Profile/leaderboard
   - Caption: "Join the global skateboarding community"

**📸 Screenshot Tips:**
- Use light text on dark background for contrast
- Show main features clearly
- No fake devices or borders
- Captions max 30 characters

### 5. Set App Icon & Preview Video

**App > Manage > iOS App Preview**

- **App Icon**: Upload 1024×1024 px PNG (from assets/icon.png)
- **Preview Video (optional)**: 15-30 sec .mov or .mp4 (max 500MB)
  - Shows app in action
  - No music copyright issues
  - Helps conversion rate

### 6. Setup App Pricing & Availability

**App > Pricing & Availability**

- **Price**: `Free` (or set price if paid)
- **App Pricing Tier**: Select tier (or free)
- **Availability**:
  - Worldwide (recommended)
  - OR select specific countries
- **Age Rating**: 12+

### 7. Setup App Review Information

**Build > App Review Information**

| Field | Value |
|-------|-------|
| **Test Account Email** | (optional) |
| **Demo Account** | If sign-up required, provide test credentials |
| **Demo Notes** | "The app requires location permission and loads skateparks from map. Use demo account if empty." |
| **First Name** | Your name |
| **Last Name** | Your name |
| **Email** | Your email |
| **Phone Number** | Your phone |
| **Address** | Your address |
| **Country/Region** | Your country |

### 8. Upload Build

**Build > iOS Builds**

**Option A: EAS (Automated)**
```bash
eas submit --platform ios --profile production
```
- Automatically uploads build to App Store
- Creates certificate if needed
- Requires one-time setup: `eas build --platform ios --profile production --setup`

**Option B: Manual (Transporter App)**

1. Download build from EAS:
   ```bash
   eas build:download --id <BUILD_ID>
   ```

2. Download [Transporter App](https://apps.apple.com/us/app/transporter/id1450874784) from Mac App Store

3. Open Transporter → Drag .ipa file → Click "Deliver"

4. Follow prompts to sign in with Apple ID

### 9. Submit for Review

**Build > iOS Builds > [Your Build] > Submit for Review**

- Click "Submit for Review"
- Choose export compliance: `No` (unless you use encryption)
- Agree to terms
- Click "Submit"

### 10. Monitor Review Status

**App Status > Version Release**

- Watch status bar: **Waiting for Review** → **In Review** → **Ready for Sale**
- Typical timeline: 24-48 hours
- If rejected, Apple will email reasons (usually trivial fixes)

---

## Common Rejection Reasons & Fixes

| Reason | Fix |
|--------|-----|
| **Crash on launch** | Test more thoroughly; check Sentry |
| **Missing privacy policy** | Add URL; make it real (not placeholder) |
| **Spam/low quality** | Improve app description; add more features |
| **Competitor SDK** | Disable non-essential analytics |
| **Incomplete functionality** | Ensure all features work as described |

---

## Post-Approval

Once status is **Ready for Sale**:
1. Set release date (immediately or schedule)
2. App will appear in App Store within 24h
3. Monitor reviews & ratings daily
4. Fix critical bugs within 24h

---

## Update Process (v1.1+)

For subsequent updates:
1. Increment `buildNumber` in app.config.js
2. Create new build: `eas build --platform ios --profile production`
3. Submit: `eas submit --platform ios`
4. Review takes 24-48h again
5. Can expedite if only bug fixes

---

## Troubleshooting

**Build rejected "Doesn't match provisioning profile"**
- Run: `eas build --platform ios --profile production --setup`
- Regenerate certificates

**Submitter certificate expired**
- Go to App Store Connect > Certificates > Renew
- Or run `eas build --setup` again

---

✅ **Process complete when status is "Ready for Sale"**

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
