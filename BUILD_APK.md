# How to Build APK for SkateQuest

## Option 1: EAS Build (Recommended - Cloud Build)

1. Install EAS CLI globally (if not already done):
```bash
npm install -g eas-cli
```

2. Log in to your Expo account:
```bash
eas login
```

3. Configure the project (first time only):
```bash
eas build:configure
```

4. Build the APK:
```bash
eas build --platform android --profile production
```

This will:
- Build on Expo's servers (no local Android SDK needed)
- Give you a download link when done (~10-15 minutes)
- APK will be ready to install on any Android device

## Option 2: Local Build (Requires Android Studio)

1. Install Android Studio and set up Android SDK

2. Prebuild the native Android project:
```bash
npx expo prebuild --platform android
```

3. Build locally:
```bash
npx expo run:android --variant release
```

## Quick Test (Expo Go)

Just run the app in Expo Go:
```bash
npm start
```

Then scan the QR code with the Expo Go app on your phone.

---

**Note:** All environment variables are already configured in `eas.json` for production builds.
