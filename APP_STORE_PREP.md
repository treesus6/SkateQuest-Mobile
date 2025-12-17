# App Store Submission Checklist

Complete guide for submitting SkateQuest to Apple App Store and Google Play Store.

## Pre-Submission Checklist

- [ ] All features tested and working
- [ ] No crashes or critical bugs
- [ ] Privacy Policy and Terms of Service finalized
- [ ] All placeholder content removed
- [ ] API keys and secrets in environment variables
- [ ] Analytics and error tracking configured
- [ ] Performance optimized (fast load times)
- [ ] Offline mode working properly

## App Store Connect (iOS)

### 1. App Information

**App Name**: SkateQuest

**Subtitle**: Discover Skateparks & Share Tricks

**Primary Category**: Sports

**Secondary Category**: Social Networking

**Description**:
```
Discover skateparks, share your best tricks, and connect with skaters worldwide!

🗺️ FIND SKATEPARKS
• Discover skateparks near you or explore spots around the world
• Get directions, see photos, and read reviews
• Add new skateparks to help the community

🛹 SHARE YOUR TRICKS
• Upload videos and photos of your tricks
• Get AI-powered trick analysis and feedback
• Build your portfolio and track your progress

🏆 COMPLETE CHALLENGES
• Take on daily and weekly challenges
• Compete on leaderboards
• Earn achievements and level up

👥 CONNECT WITH SKATERS
• Follow your favorite skaters
• Join crews and skate sessions
• Discover local events

Whether you're learning your first ollie or perfecting your tre flips, SkateQuest is your ultimate skateboarding companion.

SKATE SAFE! Always wear protective equipment.
```

**Keywords**: skateboarding, skatepark, skateboard tricks, skate spots, action sports, extreme sports, skate community

**Support URL**: https://github.com/treesus6/SkateQuest-App

**Marketing URL**: https://skatequest.app (if you have a website)

**Privacy Policy URL**: https://github.com/treesus6/SkateQuest-App/blob/main/PRIVACY_POLICY.md

### 2. App Screenshots

Required sizes (use Figma or screenshot tool):

#### iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)
- Size: 1290 x 2796 pixels
- Screenshots needed: 3-10

#### iPhone 6.5" (iPhone 11 Pro Max, XS Max)
- Size: 1242 x 2688 pixels
- Screenshots needed: 3-10

#### iPad Pro 12.9" (optional but recommended)
- Size: 2048 x 2732 pixels
- Screenshots needed: 3-10

**Screenshot Ideas**:
1. Map view showing nearby skateparks
2. Trick video with AI analysis results
3. Challenge leaderboard
4. User profile with tricks and achievements
5. Skatepark details page

### 3. App Preview Video (Optional but Recommended)

- Length: 15-30 seconds
- Format: MP4 or MOV
- Show: map, trick upload, challenges, social features
- No audio narration needed (use captions)

### 4. App Icon

- Size: 1024 x 1024 pixels
- Format: PNG (no transparency)
- No rounded corners (iOS adds them)
- Make it recognizable at small sizes

### 5. Version Information

**Version**: 1.0.0

**Copyright**: © 2024 SkateQuest

**Age Rating**:
- Unrestricted Web Access: Yes (for skatepark maps)
- Made for Kids: No
- Rating: 12+ (mild violence/injuries inherent to skateboarding)

### 6. App Review Information

**Contact Information**:
- First Name: [Your Name]
- Last Name: [Your Last Name]
- Email: [Your Email]
- Phone: [Your Phone]

**Demo Account** (if login required):
- Username: demo@skatequest.app
- Password: DemoSkate2024!

**Notes**:
```
SkateQuest is a skateboarding app for discovering skateparks and sharing tricks.

Test account credentials:
Email: demo@skatequest.app
Password: DemoSkate2024!

To test key features:
1. Map - Shows nearby skateparks (allow location access)
2. Upload - Tap camera icon to upload trick videos
3. Challenges - View and complete skateboarding challenges
4. Profile - See user stats and achievements

Location permission is used to find nearby skateparks.
Camera/photo library permissions are for uploading trick videos.

Thank you for reviewing!
```

## Google Play Store (Android)

### 1. Store Listing

**App Name**: SkateQuest

**Short Description** (80 chars max):
```
Discover skateparks, share tricks, and connect with skaters!
```

**Full Description** (4000 chars max):
```
[Same as iOS description above]
```

**App Category**: Sports

**Tags**: skateboarding, skateparks, extreme sports, action sports, sports community

**Contact Details**:
- Website: https://github.com/treesus6/SkateQuest-App
- Email: contact@skatequest.app
- Privacy Policy: [Link to Privacy Policy]

### 2. Graphics

**Icon**: 512 x 512 pixels (PNG, 32-bit)

**Feature Graphic**: 1024 x 500 pixels (JPG or PNG)
- Showcase app name and key feature

**Phone Screenshots**: At least 2, up to 8
- Min: 320px
- Max: 3840px

**7-inch Tablet Screenshots**: Optional

**10-inch Tablet Screenshots**: Optional

**Promo Video**: Optional
- YouTube URL

### 3. Content Rating

Use Google Play Console's rating questionnaire:

- Violence: Yes (skateboarding falls/injuries)
- User-generated content: Yes
- Social features: Yes
- Location sharing: Yes

Expected Rating: ESRB Everyone 10+ or PEGI 12

### 4. Pricing & Distribution

- Price: Free
- Countries: Worldwide (or select specific countries)
- Content guidelines: Ads (if applicable), In-app purchases (if applicable)

## App Build Configuration

### Update app.json

```json
{
  "expo": {
    "name": "SkateQuest",
    "slug": "skatequest",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a1a"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.skatequest",
      "buildNumber": "1",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "SkateQuest needs your location to find nearby skateparks.",
        "NSCameraUsageDescription": "SkateQuest needs camera access to record your skateboarding tricks.",
        "NSPhotoLibraryUsageDescription": "SkateQuest needs photo library access to upload trick videos and photos.",
        "NSPhotoLibraryAddUsageDescription": "SkateQuest needs permission to save trick videos to your photo library."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a1a"
      },
      "package": "com.yourname.skatequest",
      "versionCode": 1,
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

## Building for Production

### iOS

```bash
# Create production build
eas build --platform ios --profile production

# Or if using classic expo
expo build:ios -t archive
```

### Android

```bash
# Create production build
eas build --platform android --profile production

# Or create AAB (recommended by Google)
eas build --platform android --profile production --type app-bundle
```

## Pre-Launch Testing

### TestFlight (iOS)

1. Upload build to App Store Connect
2. Add external testers
3. Test all features
4. Fix any issues found
5. Submit for review

### Internal Testing (Android)

1. Upload AAB to Google Play Console
2. Create internal testing track
3. Add testers
4. Test all features
5. Promote to production when ready

## Common Rejection Reasons

### iOS

- Crashes on launch
- Missing privacy policy
- Incomplete app information
- Poor user interface
- Broken features
- Misleading description

### Android

- Missing privacy policy
- Requesting unnecessary permissions
- Crashes
- Content rating issues
- Trademark violations

## Launch Day

- [ ] Submit final build to both stores
- [ ] Monitor for approval status
- [ ] Respond quickly to any reviewer questions
- [ ] Prepare social media announcements
- [ ] Set up app analytics tracking
- [ ] Monitor crash reports and user feedback

## Post-Launch

- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback
- [ ] Fix critical bugs quickly via OTA updates
- [ ] Plan next version features
- [ ] Regular updates to keep users engaged

## Resources

- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policy**: https://play.google.com/about/developer-content-policy/
- **Expo App Submission**: https://docs.expo.dev/submit/introduction/
- **Screenshot Tool**: https://www.appscreenshots.io/

Good luck with your launch! 🚀🛹
