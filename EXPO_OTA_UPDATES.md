# Expo OTA (Over-The-Air) Updates Setup

Push JavaScript updates to users without going through the app store!

## What are OTA Updates?

OTA updates let you fix bugs and ship features instantly by updating the JavaScript bundle without requiring users to download a new version from the App Store or Google Play.

## Setup

### 1. Install expo-updates (already included in Expo SDK)

The `expo-updates` package is included by default in Expo projects.

### 2. Configure app.json

Your `app.json` already has basic update configuration:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

### 3. Update Channels

You can use different update channels for development, staging, and production:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "url": "https://u.expo.dev/[your-project-id]"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

## Publishing Updates

### Publish to Production

```bash
# Publish update to production channel
eas update --branch production --message "Fix: resolve skatepark search bug"
```

### Publish to Staging

```bash
# Test updates in staging first
eas update --branch staging --message "Test: new challenge feature"
```

### Publish to Development

```bash
# For development testing
eas update --branch development --message "Dev: testing analytics"
```

## Update Checking

### Automatic (Default)

App checks for updates on launch:

```typescript
// This happens automatically with default config
// Updates are downloaded in the background and applied on next restart
```

### Manual Check

Add manual update checking in your app:

```typescript
import * as Updates from 'expo-updates';

// Check for updates manually
async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Alert user to restart
      Alert.alert(
        'Update Available',
        'A new version is available. Restart to update?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Restart Now',
            onPress: async () => {
              await Updates.reloadAsync();
            },
          },
        ]
      );
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}
```

### On-Demand Updates

```typescript
// Force update on button press
async function forceUpdate() {
  try {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.error('Error fetching update:', error);
  }
}
```

## Update Strategies

### Strategy 1: Silent Updates (Recommended for bug fixes)

```json
{
  "updates": {
    "checkAutomatically": "ON_LOAD",
    "fallbackToCacheTimeout": 0
  }
}
```

- Updates download in background
- Applied on next app restart
- Non-intrusive to users

### Strategy 2: Prompt User (For major updates)

```typescript
// In App.tsx
useEffect(() => {
  async function checkUpdates() {
    if (__DEV__) return;

    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      showUpdatePrompt();
    }
  }

  checkUpdates();
}, []);
```

### Strategy 3: Force Update (Critical fixes only)

```typescript
// Only for critical security fixes
async function criticalUpdate() {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync(); // Force reload immediately
  }
}
```

## Rollback

If an update breaks something, you can rollback:

```bash
# Republish previous version
eas update --branch production --message "Rollback to stable version"
```

## Monitoring Updates

### Check Update Status

```typescript
import * as Updates from 'expo-updates';

// Get current update info
const updateInfo = {
  updateId: Updates.updateId,
  createdAt: Updates.createdAt,
  isEmergencyLaunch: Updates.isEmergencyLaunch,
  isEmbeddedLaunch: Updates.isEmbeddedLaunch,
};

console.log('Current update:', updateInfo);
```

### Track Update Events

```typescript
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';

// Listen for update events
Updates.addListener(event => {
  if (event.type === Updates.UpdateEventType.ERROR) {
    Sentry.captureMessage(`Update failed: ${event.message}`, 'error');
  } else if (event.type === Updates.UpdateEventType.NO_UPDATE_AVAILABLE) {
    console.log('App is up to date');
  } else if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {
    console.log('Update available, downloading...');
  }
});
```

## Testing Updates

### 1. Build a development client

```bash
eas build --profile development --platform android
# Install on your device
```

### 2. Publish an update

```bash
eas update --branch development --message "Testing OTA"
```

### 3. Restart the app

The update should be downloaded and applied!

## Production Workflow

### Step 1: Development

```bash
# Develop features locally
npm start
```

### Step 2: Staging

```bash
# Push to staging for testing
eas update --branch staging --message "New feature: trick leaderboard"

# Test on staging build
```

### Step 3: Production

```bash
# After QA approval, push to production
eas update --branch production --message "Release: trick leaderboard feature"

# Users get update on next app launch
```

## Limitations

### What can be updated via OTA:

✅ JavaScript code
✅ Assets (images, fonts)
✅ Configuration
✅ Bug fixes
✅ New features (if they don't require native changes)

### What requires a new app store build:

❌ Native code changes (new packages with native modules)
❌ Expo SDK version upgrades
❌ Changes to app.json that affect native projects
❌ New permissions
❌ Changes to app icon or splash screen

## Best Practices

### 1. Test Before Publishing

Always test updates in staging before production:

```bash
# Staging first
eas update --branch staging --message "Test new feature"

# After testing
eas update --branch production --message "Release new feature"
```

### 2. Meaningful Commit Messages

```bash
# Good
eas update --message "Fix: crash on skatepark search"

# Bad
eas update --message "update"
```

### 3. Monitor Errors

Use Sentry to track errors after updates:

```typescript
Sentry.setTag('update_id', Updates.updateId);
Sentry.setTag('update_time', Updates.createdAt);
```

### 4. Gradual Rollout

Start with small percentage of users, then increase:

```bash
# Deploy to 10% of users first
eas update --branch production-10 --message "Gradual rollout"

# After monitoring, deploy to all
eas update --branch production --message "Full rollout"
```

## Emergency Procedures

### If an update breaks the app:

1. **Immediately rollback:**

```bash
eas update --branch production --message "Rollback: revert broken update"
```

2. **Investigate locally:**

```bash
# Test the issue
npm start
```

3. **Fix and test:**

```bash
# Test fix in staging
eas update --branch staging --message "Fix: resolve crash"
```

4. **Deploy fix:**

```bash
eas update --branch production --message "Hotfix: resolve crash from previous update"
```

## Cost

EAS Updates pricing (as of 2024):

- **Free tier**: 1GB bandwidth/month, 100 updates/month
- **Production**: $29/month (50GB bandwidth, unlimited updates)

For most apps, the free tier is sufficient!

## Alternative: Classic Updates

If you don't want to use EAS:

```bash
# Classic Expo publish
expo publish --release-channel production

# Classic OTA updates work but are deprecated
```

## Scripts to Add to package.json

```json
{
  "scripts": {
    "update:dev": "eas update --branch development",
    "update:staging": "eas update --branch staging",
    "update:prod": "eas update --branch production"
  }
}
```

## Verification

After publishing an update, verify it was received:

```bash
# Check update history
eas update:list --branch production
```

## Next Steps

1. Set up EAS if you haven't: `eas init`
2. Configure update channels in app.json
3. Test OTA updates in development
4. Set up staging and production branches
5. Create update monitoring in Sentry
6. Document your update workflow for the team

You can now push updates instantly without waiting for app store approval! 🚀
