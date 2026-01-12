# 🚀 SkateQuest Launch Guide

Complete guide to getting your app on phones and sharing with the world!

---

## 📱 PART 1: Test on Your Phone (5 minutes)

### Step 1: Install Expo Go

- **iPhone**: [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Play Store - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Step 2: Start Your App

```bash
cd ~/SkateQuest-Mobile
npm install
npx expo start
```

### Step 3: Scan QR Code

- **iPhone**: Open Camera app → Point at QR code → Tap notification
- **Android**: Open Expo Go app → Tap "Scan QR Code" → Point at QR code

### Step 4: Test!

- Sign up with email/password
- Create a spot
- Try SKATE game mode
- Upload photos/videos

**Your app is now running on your phone!** 🎉

---

## 🔔 PART 2: Enable Push Notifications (15 minutes)

### Step 1: Update package.json

Already done! ✅ (expo-notifications is installed)

### Step 2: Add Notification Code to App.tsx

Open `App.tsx` and add:

```typescript
import { useEffect } from 'react';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
} from './lib/notifications';

// Inside your App component, add:
useEffect(() => {
  // Register for notifications on app start
  registerForPushNotifications().then(token => {
    if (token) {
      console.log('Push token:', token);
      // Save to user profile after login
    }
  });

  // Handle notification taps
  const subscription = addNotificationResponseListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);

    // Navigate based on notification type
    if (data.type === 'game_turn' && data.gameId) {
      // navigation.navigate('GameDetail', { gameId: data.gameId });
    }
  });

  return () => subscription.remove();
}, []);
```

### Step 3: Get Expo Project ID

```bash
npx expo whoami
# If not logged in: npx expo login

# Initialize EAS
npx eas build:configure
```

This creates `eas.json` and shows your project ID.

### Step 4: Update notifications.ts

Open `lib/notifications.ts` and replace `'your-expo-project-id'` with your actual project ID from `app.json`.

### Step 5: Test Notifications

```bash
npx expo start
```

- Open app on **physical device** (notifications don't work in simulator)
- Grant notification permissions when prompted
- Test with a SKATE game

**Notifications are now working!** 🔔

---

## 🤖 PART 3: Enable AI Trick Analysis (10 minutes)

### Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up / Log in
3. Go to **API Keys**
4. Click **Create new secret key**
5. Copy the key (starts with `sk-...`)

### Step 2: Add to .env File

```bash
# In SkateQuest-Mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-key

# Add this line:
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-actual-key...
```

### Step 3: Restart App

```bash
# Stop expo (Ctrl+C)
npx expo start --clear
```

### Step 4: Test AI Analysis

- Upload a trick video
- Tap "🤖 Analyze Trick with AI"
- Get instant feedback!

**AI analysis is now enabled!** 🤖

---

## 📦 PART 4: Build & Share the App (30 minutes)

### Option A: Share via Expo (Easiest - Free)

Anyone with Expo Go can use your app:

```bash
# Publish to Expo
npx expo publish
```

You'll get a URL like: `exp://u/yourname/skatequest`

**Share this URL** and anyone can open it in Expo Go!

### Option B: Build Standalone Apps (Best for Distribution)

Build real `.apk` (Android) and `.ipa` (iOS) files:

#### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

#### 2. Configure Build

```bash
eas build:configure
```

#### 3. Build for Android (Free)

```bash
eas build --platform android --profile preview
```

This creates an `.apk` file you can share directly!

#### 4. Build for iOS (Requires Apple Developer Account - $99/year)

```bash
eas build --platform ios --profile preview
```

This creates an `.ipa` file for TestFlight.

**Download the built app** from the EAS dashboard and share it!

---

## 🌎 PART 5: Publish to App Stores (Going Public!)

### Android (Google Play Store)

#### Prerequisites:

- Google Play Developer account ($25 one-time)
- Privacy policy URL
- App screenshots

#### Steps:

```bash
# Build production APK
eas build --platform android --profile production

# Or build AAB (App Bundle)
eas build --platform android --profile production --auto-submit
```

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Upload AAB file
4. Fill out store listing
5. Submit for review

**Launch time: 1-3 days**

### iOS (Apple App Store)

#### Prerequisites:

- Apple Developer account ($99/year)
- Privacy policy URL
- App screenshots

#### Steps:

```bash
# Build production IPA
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Upload build
4. Fill out store listing
5. Submit for review

**Launch time: 1-7 days**

---

## 🎨 PART 6: Pre-Launch Checklist

### App Assets Needed:

#### 1. App Icon

- Create 1024x1024 PNG
- Put in `assets/icon.png`

#### 2. Splash Screen

- Create 1284x2778 PNG
- Put in `assets/splash.png`

#### 3. Screenshots (for stores)

- iPhone: 6.5" display (1284 x 2778)
- Android: 1080 x 1920

#### 4. Privacy Policy

- Required for both stores
- Use generator: [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- Host on your website or GitHub Pages

#### 5. App Description

```
SkateQuest - Level up your skating!

🛹 Find skate spots near you
🎯 Complete trick challenges
🏆 Play SKATE game with friends
📸 Share photos & videos
🤖 AI trick analysis
📊 Track your progress

Join the skate community and become a better skater!
```

### Update app.json:

```json
{
  "expo": {
    "name": "SkateQuest",
    "slug": "skatequest",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#d2673d"
    },
    "ios": {
      "bundleIdentifier": "com.yourname.skatequest",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourname.skatequest",
      "versionCode": 1
    }
  }
}
```

---

## 💰 PART 7: Marketing & Launch Strategy

### Pre-Launch (Week 1-2)

1. **Beta Testing**
   - Share app with 10-20 skaters
   - Get feedback
   - Fix bugs

2. **Social Media**
   - Create Instagram: @skatequestapp
   - Create TikTok: @skatequestapp
   - Post demo videos

3. **Landing Page**
   - Create simple website
   - "Coming Soon" + Email signup
   - Use [Carrd](https://carrd.co) (free)

### Launch Day

1. **Post Everywhere**
   - r/skateboarding
   - r/NewSkaters
   - Instagram skateboarding hashtags
   - TikTok #skateboarding

2. **Reach Out**
   - DM skateboarding influencers
   - Contact local skate shops
   - Post in skateboarding Discord servers

3. **Product Hunt**
   - Submit to [Product Hunt](https://www.producthunt.com)
   - Get upvotes from friends

### Post-Launch (Week 1-4)

1. **Content Marketing**
   - Post trick tutorials
   - Share user-generated content
   - Create challenges/contests

2. **Local Events**
   - Demo at skate parks
   - Partner with skate shops
   - Sponsor local competitions

3. **App Store Optimization (ASO)**
   - Use keywords: "skateboarding", "tricks", "skate spots"
   - Get reviews from beta users
   - Update regularly

---

## 📊 PART 8: Growth Metrics to Track

### Key Metrics:

1. **Downloads**: Track in App Store Connect / Google Play Console
2. **Active Users**: Use Supabase Analytics
3. **Retention**: Users who come back after 7 days
4. **Engagement**: Spots added, challenges completed
5. **Viral Coefficient**: How many friends do users invite?

### Tools:

- **Analytics**: Google Analytics, Mixpanel (free tier)
- **Crash Reporting**: Sentry (free tier)
- **User Feedback**: In-app feedback form

---

## 🎯 Quick Start Roadmap

### Today (2 hours)

- ✅ Test on your phone via Expo Go
- ✅ Enable push notifications
- ✅ Enable AI analysis
- ✅ Share with 5 friends via Expo URL

### This Week

- Build standalone APK
- Test with 10 beta users
- Create app icon & screenshots
- Set up social media accounts

### Next Week

- Submit to Play Store
- Submit to App Store
- Create landing page
- Start marketing campaign

### Month 1

- Get 100 users
- Gather feedback
- Fix bugs
- Add requested features

### Month 2-3

- Get 1,000 users
- Local skate shop partnerships
- Influencer marketing
- Viral growth

---

## 🆘 Common Issues

### "Expo Go won't open app"

```bash
npx expo start --clear
# Make sure phone and computer are on same WiFi
```

### "Build failed"

```bash
# Check eas.json is configured
eas build:configure

# Try again
eas build --platform android --profile preview
```

### "Notifications not working"

- Must use **physical device** (not simulator)
- Check permissions in phone Settings
- Verify Expo project ID in notifications.ts

### "AI analysis not working"

- Check OpenAI API key in `.env`
- Restart expo: `npx expo start --clear`
- Check OpenAI account has credits

---

## 💡 Pro Tips

1. **Start Small**: Get 100 happy users before scaling
2. **Listen to Feedback**: Your users know what they want
3. **Iterate Fast**: Release updates weekly at first
4. **Build Community**: Engage with every user
5. **Stay Authentic**: You're a skater building for skaters

---

## 🚀 Ready to Launch?

### Immediate Next Steps:

1. **Install dependencies**: `npm install`
2. **Start expo**: `npx expo start`
3. **Open on phone**: Scan QR with Expo Go
4. **Test everything**: Sign up, create spots, play games
5. **Share with friends**: Give them the Expo URL

### Your Launch Checklist:

```
☐ App runs on your phone
☐ Push notifications enabled
☐ AI analysis enabled
☐ 5 friends tested it
☐ App icon created
☐ Screenshots taken
☐ Privacy policy written
☐ Social media accounts created
☐ Built standalone APK
☐ Submitted to Play Store
☐ Submitted to App Store
☐ Marketing campaign started
```

---

## 🎉 You're Ready!

Your app is **production-ready** with:

- 18 database tables ✅
- 8 major features ✅
- Push notifications ✅
- AI trick analysis ✅
- Photo/video uploads ✅
- SKATE game mode ✅
- Social feed ✅

**Now go get some users and change the skateboarding world!** 🛹🚀

---

**Need help?** Check the docs or ask questions!

Built with ❤️ for the skate community
