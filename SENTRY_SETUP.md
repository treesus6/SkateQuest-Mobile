# Sentry Error Tracking Setup Guide

This guide explains how to configure Sentry error tracking for your SkateQuest mobile app.

## Overview

Sentry has been integrated into your Expo app with:

- ✅ Automatic error capture and reporting
- ✅ Error boundaries around critical components
- ✅ Performance monitoring and tracing
- ✅ Source map uploads for production debugging
- ✅ Development mode testing tools

## Step 1: Create a Sentry Account & Project

1. **Sign up for Sentry**
   - Go to [https://sentry.io](https://sentry.io)
   - Create a free account (supports up to 5,000 errors/month)

2. **Create a new project**
   - Click "Projects" in the sidebar
   - Click "Create Project"
   - Select **React Native** as the platform
   - Choose an alert frequency
   - Name your project (e.g., "skatequest-mobile")
   - Click "Create Project"

3. **Note your organization name**
   - You can find this in the URL: `https://sentry.io/organizations/YOUR_ORG_NAME/`
   - Or in Settings → General Settings

## Step 2: Get Your DSN Key

The DSN (Data Source Name) is a unique identifier that tells Sentry where to send errors.

### Where to find your DSN:

1. **From the project setup screen:**
   - After creating your project, you'll see it immediately
   - It looks like: `https://abc123def456@o123456.ingest.sentry.io/7890123`

2. **From project settings:**
   - Navigate to: Settings → Projects → [your-project] → Client Keys (DSN)
   - Or go directly to: `https://sentry.io/settings/projects/YOUR_PROJECT/keys/`
   - Copy the DSN value

## Step 3: Configure Your App

### 3.1 Update App.tsx with your DSN

Open `App.tsx` and replace `'YOUR_DSN_HERE'` with your actual DSN:

```typescript
Sentry.init({
  dsn: 'https://abc123def456@o123456.ingest.sentry.io/7890123', // ← Your actual DSN here
  // ... rest of config
});
```

**Location:** `App.tsx`, line 11

### 3.2 Update app.json with organization and project

Open `app.json` and update the Sentry configuration:

```json
{
  "expo": {
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "your-org-slug", // ← Your org name
            "project": "skatequest-mobile" // ← Your project name
          }
        }
      ]
    }
  }
}
```

**Location:** `app.json`, lines 24-25

### 3.3 Create Sentry Auth Token (for source maps)

To upload source maps automatically, you need an auth token:

1. Go to: `https://sentry.io/settings/account/api/auth-tokens/`
2. Click "Create New Token"
3. Name it: "SkateQuest Source Maps"
4. Permissions needed:
   - `project:read`
   - `project:releases`
   - `org:read`
5. Click "Create Token"
6. **Copy the token immediately** (you won't see it again)

### 3.4 Set up environment variable

Add the auth token to your environment:

**Option A: Using .env file (recommended)**

```bash
# Create .env file in project root
echo "SENTRY_AUTH_TOKEN=your_auth_token_here" >> .env
echo ".env" >> .gitignore  # Don't commit this!
```

**Option B: Export in shell**

```bash
export SENTRY_AUTH_TOKEN=your_auth_token_here
```

## Step 4: Test the Integration

### 4.1 Start your development server

```bash
npm start
# or
expo start
```

### 4.2 Test in development mode

1. Open your app and sign in
2. Navigate to the **Profile** screen
3. Scroll down to see the **"🔧 Sentry Debug Tools"** section (only visible in dev mode)
4. Try each test button:
   - **Test JS Crash**: Triggers a JavaScript error
     - Should show error boundary screen
     - Error should appear in Sentry dashboard

   - **Test Native Crash**: Triggers a native crash
     - App will restart
     - Error appears in Sentry after restart

   - **Send Test Message**: Sends a test message
     - Shows confirmation alert
     - Message appears in Sentry dashboard

### 4.3 Verify in Sentry Dashboard

1. Go to your Sentry project dashboard
2. Navigate to: **Issues** tab
3. You should see the test errors appear within a few seconds
4. Click on an error to see:
   - Stack trace
   - Device info
   - User context
   - Breadcrumbs (navigation history, console logs, etc.)

## Step 5: Production Deployment

### 5.1 Build and publish with source maps

When you're ready to deploy to production:

```bash
# Build for production
expo build:android  # or build:ios

# Publish update with source maps
expo publish
```

The `postPublish` hook in `app.json` will automatically upload source maps to Sentry.

### 5.2 Verify source maps uploaded

1. In Sentry dashboard, go to: Settings → Projects → [your-project] → Source Maps
2. You should see your uploaded artifacts listed
3. Errors will now show readable stack traces instead of minified code

## Configuration Reference

### Sentry.init() Options

Located in `App.tsx`, you can customize these settings:

```typescript
Sentry.init({
  dsn: 'YOUR_DSN_HERE',

  // Adjust sample rate (0.0 to 1.0)
  // 1.0 = capture 100% of transactions
  // 0.1 = capture 10% (recommended for high-traffic apps)
  tracesSampleRate: 1.0,

  // Enable/disable features
  enableAutoSessionTracking: true,
  enableAutoPerformanceTracing: true,

  // Environment detection
  environment: __DEV__ ? 'development' : 'production',

  // Debug logging in console
  debug: __DEV__,
});
```

### Best Practices

1. **Lower sample rate in production:**

   ```typescript
   tracesSampleRate: __DEV__ ? 1.0 : 0.1,
   ```

2. **Add user context:**

   ```typescript
   Sentry.setUser({
     id: user.id,
     email: user.email,
     username: user.username,
   });
   ```

3. **Add custom tags:**

   ```typescript
   Sentry.setTag('platform', Platform.OS);
   Sentry.setTag('app_version', '1.0.0');
   ```

4. **Capture custom errors:**
   ```typescript
   try {
     // risky operation
   } catch (error) {
     Sentry.captureException(error, {
       tags: { section: 'map-loading' },
       extra: { spotId: spot.id },
     });
   }
   ```

## Troubleshooting

### Errors not appearing in Sentry?

1. **Check DSN is correct** in `App.tsx`
2. **Check internet connection** (Sentry needs network access)
3. **Check debug mode:** Set `debug: true` in `Sentry.init()` to see console logs
4. **Wait a few seconds:** Errors are sent asynchronously

### Source maps not working?

1. **Verify auth token** is set: `echo $SENTRY_AUTH_TOKEN`
2. **Check organization/project names** in `app.json`
3. **Ensure sentry-expo is installed:** `npm list sentry-expo`
4. **Check Sentry dashboard:** Settings → Source Maps

### Build errors after adding Sentry?

1. **Clear cache and reinstall:**

   ```bash
   rm -rf node_modules
   npm install
   expo start -c
   ```

2. **Check peer dependencies:**
   ```bash
   npm ls @sentry/react-native
   ```

## File Overview

### Modified Files:

- **App.tsx** - Sentry initialization and app wrapper
- **components/ErrorBoundary.tsx** - Error boundary component (new file)
- **navigation/AppNavigator.tsx** - Error boundary wrapper around navigation
- **screens/ProfileScreen.tsx** - Test crash buttons (dev mode only)
- **app.json** - Source map upload configuration

### Configuration Files:

- **.env** - Sentry auth token (create this, don't commit!)

## Support & Resources

- **Sentry React Native Docs:** https://docs.sentry.io/platforms/react-native/
- **Expo + Sentry Guide:** https://docs.expo.dev/guides/using-sentry/
- **Sentry Dashboard:** https://sentry.io
- **Community Support:** https://discord.gg/sentry

## Security Notes

⚠️ **Never commit your DSN or auth token to version control!**

- Consider using environment variables or Expo secrets
- Add `.env` to `.gitignore`
- For team projects, share credentials securely (not in code)

---

**Setup complete!** Your app is now monitoring errors with Sentry. Check the Sentry dashboard regularly to catch and fix issues before users report them.
