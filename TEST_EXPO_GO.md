# Expo Go Testing Instructions

## Root Cause of the Issue

The "failed to download remote update" error was caused by:

1. **Conflicting Entry Points**: An `index.js` file was created that tried to manually register the root component, conflicting with Expo's standard entry point (`node_modules/expo/AppEntry.js`)
2. **Update Configuration**: The `updates` configuration in `app.json` with various settings was triggering update checks in Expo Go
3. **Sentry Hooks**: The `postPublish` hooks for Sentry were configured, which could interfere with Expo Go

## Fixes Applied

1. **Removed `index.js`**: Deleted the conflicting index.js file
2. **Cleaned app.json**: Removed all `updates` configuration and `hooks` sections
3. **Cleared Cache**: Removed `.expo` and bundler cache directories
4. **Package.json**: Verified it uses the standard Expo entry point

## Testing Steps

1. **Clear everything**:
   ```bash
   cd /home/treevanderveer/SkateQuest-Mobile
   rm -rf .expo node_modules/.cache
   ```

2. **Start the development server**:
   ```bash
   npx expo start --clear
   ```

3. **Open in Expo Go**:
   - Scan the QR code with Expo Go app
   - The app should load directly without trying to download updates
   - You should see either:
     - The Auth screen (if not logged in)
     - A loading indicator briefly (while Supabase session is checked)
     - The Map screen (if already logged in)

## Expected Behavior

- No "failed to download remote update" error
- App loads within 10 seconds (with timeout configured in AuthContext)
- Metro bundler shows successful bundle creation
- Expo Go displays the app content, not a loading loop

## If Issues Persist

1. **Clear Expo Go cache on your phone**:
   - iOS: Shake device > Dev Menu > Reload
   - Android: Shake device > Reload

2. **Reinstall Expo Go app** if necessary

3. **Check Metro bundler output** for any JavaScript errors

4. **Verify environment variables**:
   - Make sure `.env` file exists with Supabase credentials
   - Check that variables start with `EXPO_PUBLIC_` prefix

## Configuration Summary

- **Entry Point**: `node_modules/expo/AppEntry.js` (standard Expo)
- **Main App**: `App.tsx`
- **Updates**: Not configured (disabled for Expo Go development)
- **Slug**: `skatequest-dev`
