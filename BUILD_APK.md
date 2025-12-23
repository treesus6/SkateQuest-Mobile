# 📦 Build SkateQuest APK

## Option 1: Quick APK Build (Recommended)

```bash
# Install EAS CLI
bun add -g eas-cli

# Login to Expo (create free account if needed)
eas login

# Build production APK (takes ~15 minutes)
eas build --platform android --profile production

# Or build preview APK for testing (faster)
eas build --platform android --profile preview
```

The build runs on Expo's servers (free!), you'll get a download link when done.

---

## What You Get

- **APK file** - Install directly on any Android phone
- **No Google Play needed** - Distribute however you want
- **Works on alternative app stores** - F-Droid, APKPure, Aptoide, etc.

---

## Build Profiles Available

### `production` (Use this for release)
```bash
eas build --platform android --profile production
```
- ✅ Builds APK
- ✅ Auto-increments version
- ✅ Production optimized
- ✅ Ready to distribute

### `preview` (Use for testing)
```bash
eas build --platform android --profile preview
```
- ✅ Builds APK
- ✅ Faster build
- ✅ Internal testing

### `production-store` (For Google Play later)
```bash
eas build --platform android --profile production-store
```
- ✅ Builds AAB (Google Play format)
- ✅ Use this when you're ready for Play Store

---

## After Build Completes

1. You'll get a download link (check your terminal or Expo dashboard)
2. Download the APK
3. Transfer to your phone or upload to app store
4. Install and test!

---

## Installing the APK

### On Your Phone:
1. Download the APK file
2. Go to Settings → Security → Enable "Install from unknown sources"
3. Open the APK file
4. Click Install

### For Alternative App Stores:
- **F-Droid** - Submit for open-source distribution
- **APKPure** - Popular APK marketplace
- **Aptoide** - Another APK store
- **Your own website** - Direct download link

---

## Build on Chromebook

EAS builds run in the cloud, so your Chromebook doesn't do the heavy lifting! ✅

Just run the command and wait for the build to complete.

---

## Troubleshooting

### "No Expo account"
```bash
# Create one (free):
eas login
# Follow prompts to create account
```

### "Project not configured"
```bash
# Configure EAS:
eas build:configure
```

### "Build failed"
Check the build logs:
```bash
eas build:list
# Click the failed build to see logs
```

---

## Quick Summary

```bash
# 1. Install EAS
bun add -g eas-cli

# 2. Login
eas login

# 3. Build APK
eas build --platform android --profile production

# 4. Wait ~15 minutes

# 5. Download APK from link

# 6. SHIP IT! 🚀
```

---

## Cost

- **EAS Build is FREE** for open-source projects
- **No credit card needed** for basic builds
- **Cloud builds** - doesn't use your Chromebook resources

---

Let's ship this! 🛹🔥
