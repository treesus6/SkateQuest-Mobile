# Google Play Store Submission Guide

**Target**: Google Play Store
**Timeline**: 1-3 hours (review time, usually automatic)
**Cost**: $25 one-time (Google Play Developer Account)

---

## Prerequisites Checklist

- [ ] Google Play Developer Account (https://play.google.com/console)
- [ ] Production build ready (from `eas build --platform android --profile production`)
- [ ] Icon: 512x512px PNG (from assets/icon.png)
- [ ] Feature graphic: 1024x500px PNG
- [ ] Screenshots: 2-8 (1080x1920px recommended)
- [ ] Privacy policy URL ready
- [ ] Signing certificate configured in EAS

---

## Step-by-Step Submission

### 1. Create App in Google Play Console

**If first time:**
1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - **App name**: `SkateQuest`
   - **Default language**: English
   - **App type**: Application (not game)
   - **Category**: Sports
   - **Contact email**: Your email
4. Click "Create app"

### 2. Fill in App Details

**All apps > About this app**

| Field | Value |
|-------|-------|
| **Short description (max 80 char)** | Discover skateparks, join challenges, level up |
| **Full description (max 4,000 char)** | The ultimate skateboarding companion app. Find skate spots with an interactive map of 27,000+ parks worldwide, track your trick progression, compete in SKATE challenges, earn XP, and join a crew. Features AI-powered trick analysis, social feed, crew battles, leaderboards, offline support, and a thriving global skating community. Build for skaters, by skaters. Donate 10% of profits to help kids who can't afford boards. Support DIY skate spots. Community-first, anti-corporate, authentic. |
| **App category** | Sports |
| **Content rating declaration** | Add via questionnaire below |

### 3. Content Rating Questionnaire

**All apps > Content rating**

1. Click "Go to questionnaire"
2. Select **Email**: Your email
3. Answer questions:
   - **Violence**: No
   - **Profanity**: Maybe (user-generated video)
   - **Sexual content**: No
   - **Alcohol/Tobacco**: No
   - **Gambling**: No
   - **Other**: No
4. Submit → You'll get rating (usually 12+ or PEGI 3)

### 4. Upload Graphics

**Setup > App content > Manage metadata**

**1. App Icon** (512×512px PNG)
- Upload from assets/icon.png
- Must be square
- No transparency required (but ok)

**2. Feature Graphic** (1024×500px PNG)
- Displays at top of store listing
- Show main app feature visually
- No app name/text (branding only)

**3. Screenshots** (1080×1920px recommended)
- Upload 2-8 screenshots
- **Portrait orientation** required
- **Recommended**: 4-5 screenshots

**Screenshot order:**
1. Map screen (skateparks)
2. Challenges/XP screen
3. Crew system
4. Video upload
5. Profile/leaderboard

**4. Promotional Graphic** (optional, 1800×1080px)
- Horizontal image for top of store listing

**5. Promo Video** (optional, 15-30 sec)
- 1080p resolution (.mp4)
- Shows app in action
- Increases install rate

### 5. Set Pricing & Distribution

**Setup > Pricing & distribution**

- **Pricing**: `Free` (or set if paid)
- **Countries**: Select `Worldwide` (default)
- **Device categories**:
  - [x] Phones and tablets
  - [ ] Wear OS (not needed)
  - [ ] Android TV (not needed)
  - [ ] Google Glass (not needed)

### 6. Configure Target Audience

**Setup > Target audience > Manage**

- **Children (under 13)**: No
- **COPPA compliance**: N/A
- **Restricted content**: None
- **Intended users**: Teenagers & Adults (13+)
- **Privacy policies**: Required (add URL)

### 7. Add Privacy Policy

**Setup > App content > Privacy policy**

- Click "Add privacy policy URL"
- URL: `https://www.skatequest.com/privacy`
- **Must be real, accessible URL**
- Can be simple one-page document

### 8. Upload Build

**Testing > Internal testing**

**Step 1: Create release**
- Click "Create new release"
- Select "Internal testing" (first time)
- Click "Create release"

**Step 2: Add AAB (Android App Bundle)**

**Option A: EAS (Automated)**
```bash
eas submit --platform android --profile production
```
- Automatically uploads .aab from latest build
- One-time setup: `eas build --platform android --profile production`

**Option B: Manual Upload**

1. Download build:
   ```bash
   eas build:download --id <BUILD_ID>
   ```

2. Go to Google Play Console > Releases > Create release > Internal testing
3. Click "Upload" next to "Android App Bundle"
4. Select the .aab file (65MB typical)
5. Wait for processing (2-3 min)

### 9. Review Release & Submit

**Release notes** (what's new in this version):
```
v1.0.0 - Launch Release

Major Features:
✅ Interactive map of 27,000+ skateparks worldwide
✅ XP/gamification system with levels & streaks
✅ Crew system with territory control
✅ Video challenges with AI trick analysis
✅ Social feed & leaderboards
✅ Offline support

This is our official launch. Enjoy SkateQuest!
```

### 10. Progress Through Release Tracks

**Sequence (for first app):**

1. **Internal Testing** ← Start here
   - Test with your own Google account
   - Verify everything works
   - 1-2 hours

2. **Closed Testing** (optional)
   - Invite 50+ testers via email
   - Get beta feedback
   - 1-2 days

3. **Open Testing** (optional)
   - Public beta, limited rollout
   - Final QA before production
   - 1-2 days

4. **Production** ← Final step
   - Visible to all users
   - Once you go live, you're live
   - ~1-3 hours for approval

### 11. Submit to Production

**For First App (Quick Path):**

1. Go to **Release** > **Create release**
2. Select **Production**
3. Upload AAB (if not already done)
4. Fill in release notes (see Step 9 above)
5. Click **Review release**
6. Verify all info is correct
7. Click **Start rollout to production**
8. Choose rollout %:
   - **100%** for immediate release
   - **10-50%** for staged rollout (safer)
9. Click **Confirm rollout**

**Status tracking:**
- Usually "Pending publication" for 1-3 hours
- Becomes "Published" when live in store
- Visible to all users worldwide (if country selection = worldwide)

### 12. Monitor After Launch

**All apps > Analytics**

- Track installs, crashes, ratings
- Monitor user feedback
- Check for errors in console

---

## Common Rejection Reasons & Fixes

| Reason | Fix |
|--------|-----|
| **Crash on launch** | Test via Internal testing track; check Android logs |
| **Missing privacy policy** | Add real, accessible URL |
| **Permissions not justified** | Ensure permissions match app features |
| **Copy paste errors** | Proofread description (no "Demo" versions) |
| **Identical to competitor** | Ensure unique features/UI |
| **Malware/unsafe** | Run security scan; check for SDK issues |

---

## Version Updates (v1.1+)

1. Increment `android.buildNumber` in app.config.js
2. Create new build: `eas build --platform android --profile production`
3. Go to **Release > Create release > Production**
4. Upload new AAB
5. Update release notes
6. Click "Start rollout to production"
7. **Published in 1-3 hours** (faster than iOS usually)

---

## Important Notes

- **No build signing needed**: EAS auto-signs with app signing key
- **First app takes 1-3 hours typically**
- **Subsequent updates 30 min - 1 hour**
- **No manual code review** (usually automatic)
- **Can pause rollout** (click "Manage rollout" → change % to 0%)
- **Can't unpublish** (best to update instead)

---

## Troubleshooting

**"Build not compatible"**
- Ensure minSdk matches app.config.js
- Check targetSdk (should be 34+)

**"Upload didn't match release"**
- Clear cache: `eas cache:clean`
- Rebuild: `eas build --platform android --profile production`

**"Pending publication" for hours**
- Normal first time (Google reviews manually)
- Usually auto-approves within 24h
- Contact support if >24h

---

✅ **Process complete when status shows "Published"**

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
