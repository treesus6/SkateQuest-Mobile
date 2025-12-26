# Mobile Development Guide - Fixing "localhost refused to connect"

## The Problem

When you see "localhost refused to connect" on your mobile device, it's because **localhost on your phone refers to the phone itself**, not your development computer where the Expo server is running.

## Solution: Use Expo Go App (Recommended)

### Step 1: Install Expo Go
- **Android**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step 2: Connect to the Same Network
- Ensure your mobile device and development computer are on the **same Wi-Fi network**
- Disable any VPNs on both devices
- Make sure your network allows device-to-device communication (some public/corporate networks block this)

### Step 3: Start the Development Server
```bash
npx expo start
```

### Step 4: Scan the QR Code
- Open Expo Go app on your device
- Tap "Scan QR Code"
- Scan the QR code displayed in your terminal or browser
- The app will load on your device!

## Alternative: Use Tunnel Connection

If the QR code method doesn't work (network restrictions, different networks, etc.):

```bash
npx expo start --tunnel
```

This uses ngrok to create a tunnel, allowing connection even across different networks. It's slower but more reliable.

## Alternative: Use Android Emulator

If you want to test on an emulator instead:

### Option 1: Android Studio Emulator
1. Install [Android Studio](https://developer.android.com/studio)
2. Create an AVD (Android Virtual Device) via AVD Manager
3. Start the emulator
4. Run: `npx expo start`
5. Press `a` to open on Android emulator

### Option 2: iOS Simulator (Mac only)
1. Install Xcode from Mac App Store
2. Run: `npx expo start`
3. Press `i` to open on iOS simulator

## Troubleshooting

### QR Code Not Working?
- Ensure devices are on same Wi-Fi network
- Try restarting the Expo dev server
- Try using tunnel mode: `npx expo start --tunnel`

### "No Android connected device found"
- This message is normal if you don't have an emulator running
- You don't need an emulator - use Expo Go app instead
- Or install and start an Android emulator first

### Environment Variables Not Loading?
- Make sure `.env` file exists in the root directory
- Restart the Expo dev server after creating/modifying `.env`
- Check that variables start with `EXPO_PUBLIC_` prefix

### App Crashes on Startup?
- Check that Supabase credentials are correct in `.env`
- View error logs in Expo Go app (shake device > "Show dev menu" > "Debug remote JS")
- Check Metro bundler terminal for errors

## Development Workflow

1. **Start Development**:
   ```bash
   npx expo start
   ```

2. **Open on Device**:
   - Scan QR code with Expo Go app
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator

3. **Live Reloading**:
   - Changes to code automatically reload
   - Shake device to open developer menu
   - Use "Reload" to manually refresh

4. **Debugging**:
   - View logs in terminal where you ran `expo start`
   - Shake device > "Debug remote JS" for browser debugging
   - Use React Native Debugger for advanced debugging

## Network Configuration

The app now includes:
- ✅ `.env` file with Supabase credentials
- ✅ `metro.config.js` for proper module bundling
- ✅ Environment variables loaded from `.env`

## Important Notes

- **Never access http://localhost:8081 from mobile browser** - this won't work
- **Always use Expo Go app** or an emulator for development
- **Keep devices on same network** for best performance
- **Use tunnel mode** only when necessary (it's slower)

## Quick Reference

| Action | Command |
|--------|---------|
| Start dev server | `npx expo start` |
| Start with tunnel | `npx expo start --tunnel` |
| Open on Android emulator | Press `a` after starting |
| Open on iOS simulator | Press `i` after starting |
| Clear cache | `npx expo start -c` |
| Reset Metro bundler | `npx expo start --reset-cache` |

## Need Help?

1. Check [Expo Documentation](https://docs.expo.dev/)
2. Check [React Native Documentation](https://reactnative.dev/docs/getting-started)
3. Visit [Expo Discord](https://discord.gg/expo)
