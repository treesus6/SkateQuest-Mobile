# How to Switch Between Development and Production Environments

## Overview

Your SkateQuest app now has proper environment management! This guide shows you exactly how to switch between development and production configurations.

## What Was Set Up

✅ **Environment Files Created:**

- `.env.development` - Development configuration (with your current credentials)
- `.env.production` - Production configuration (with your current credentials)
- `.env.example` - Template file for team members (safe to commit to Git)
- `switch-env.sh` - Automated environment switcher script

✅ **Git Configuration:**

- `.env`, `.env.development`, and `.env.production` are now gitignored (won't be committed)
- `.env.example` is tracked in Git (safe for sharing)

✅ **Documentation:**

- `ENVIRONMENT_SETUP.md` - Complete environment management guide
- `ENV_QUICK_REFERENCE.md` - Quick reference card
- `README.md` - Updated with setup instructions

## How to Switch Environments

### Method 1: Using the Script (Recommended) ⭐

The easiest way is to use the provided `switch-env.sh` script:

#### Switch to Development:

```bash
./switch-env.sh development
```

Output:

```
✅ Switched to development environment
Environment variables loaded from: .env.development

🔧 DEVELOPMENT MODE
   - Using development Supabase credentials
   - Debug mode enabled
   - Safe for testing

⚠️  Remember to restart your Expo development server:
   expo start -c
```

#### Switch to Production:

```bash
./switch-env.sh production
```

Output:

```
✅ Switched to production environment
Environment variables loaded from: .env.production

🚀 PRODUCTION MODE
   - Using production Supabase credentials
   - Sentry error tracking enabled
   - Ready for production builds

⚠️  Remember to restart your Expo development server:
   expo start -c
```

#### Important: Always Restart After Switching!

```bash
# Stop your current server (Ctrl+C), then:
expo start -c
```

The `-c` flag clears the cache, ensuring the new environment variables are loaded.

### Method 2: Manual Switching

If you prefer to do it manually:

```bash
# Switch to development
cp .env.development .env
expo start -c

# Switch to production
cp .env.production .env
expo start -c
```

### Method 3: Expo's Built-in Environment Handling

Expo can automatically detect environment files based on the command:

```bash
# Development (uses .env.development automatically)
expo start

# Production build (uses .env.production automatically)
expo build:android
expo build:ios
```

**Note:** This method works best when building, but for local development, using the script is more reliable.

## Complete Workflow Examples

### Example 1: Daily Development Work

```bash
# Start your day
./switch-env.sh development
expo start -c

# Develop and test your features
# ...

# When you're done
# Ctrl+C to stop the server
```

### Example 2: Preparing a Production Build

```bash
# 1. Switch to production environment
./switch-env.sh production

# 2. Test the app with production config
expo start -c
# Test thoroughly!

# 3. Build for production
# For Android:
eas build --platform android --profile production

# For iOS:
eas build --platform ios --profile production

# 4. Switch back to development
./switch-env.sh development
```

### Example 3: Testing Production Config Locally

```bash
# Switch to production
./switch-env.sh production
expo start -c

# Test the app
# ...

# Switch back to development
./switch-env.sh development
expo start -c
```

## Verifying Which Environment Is Active

### Check the Active Environment File:

```bash
head -n 5 .env
```

### Check Loaded Variables:

```bash
grep EXPO_PUBLIC .env
```

### In the App:

Add this to any screen to see which environment is active:

```typescript
console.log('Environment:', __DEV__ ? 'development' : 'production');
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
```

## Setting Up Different Credentials for Each Environment

### Best Practice: Separate Supabase Projects

For production apps, you should use different Supabase projects for dev and prod:

1. **Development Project** (current):
   - URL: `https://hreeuqdgrwvnxquxohod.supabase.co`
   - Use this for testing and development
   - It's okay if data gets messy or deleted

2. **Production Project** (to create):

   ```bash
   # Create a new Supabase project for production
   # Then update .env.production:
   nano .env.production
   ```

   Update with new production values:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=your_prod_anon_key
   ```

### Why Separate Projects?

- **Safety**: Can't accidentally delete production data while testing
- **Performance**: Dev database won't slow down production
- **Analytics**: Separate metrics for dev vs prod
- **Cost Control**: Can monitor production usage separately

## Environment Variables Reference

### Current Variables in Your App

| Variable                     | Development | Production  | Purpose             |
| ---------------------------- | ----------- | ----------- | ------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`   | ✅ Set      | ✅ Set      | Database connection |
| `EXPO_PUBLIC_SUPABASE_KEY`   | ✅ Set      | ✅ Set      | Database auth       |
| `EXPO_PUBLIC_SENTRY_DSN`     | ✅ Set      | ✅ Set      | Error tracking      |
| `EXPO_PUBLIC_OPENAI_API_KEY` | ❌ Optional | ❌ Optional | AI features         |

### Adding New Environment Variables

1. **Add to both environment files:**

   ```bash
   # Add to development
   echo "EXPO_PUBLIC_NEW_VAR=dev_value" >> .env.development

   # Add to production
   echo "EXPO_PUBLIC_NEW_VAR=prod_value" >> .env.production

   # Add to example (with placeholder)
   echo "EXPO_PUBLIC_NEW_VAR=your_value_here" >> .env.example
   ```

2. **Use in your code:**

   ```typescript
   const newVar = process.env.EXPO_PUBLIC_NEW_VAR;
   ```

3. **Restart the server:**
   ```bash
   expo start -c
   ```

## Troubleshooting

### Problem: Environment variables not loading

**Solution:**

```bash
# Always clear cache when changing environment
expo start -c

# If that doesn't work, completely restart:
# 1. Kill the Metro bundler
kill $(lsof -t -i:19000)

# 2. Clear Expo cache
rm -rf .expo

# 3. Restart
expo start -c
```

### Problem: Wrong environment is active

**Solution:**

```bash
# Check which environment is active
cat .env | head -n 3

# If wrong, switch to correct one
./switch-env.sh development  # or production
expo start -c
```

### Problem: Script won't run

**Solution:**

```bash
# Make sure script is executable
chmod +x switch-env.sh

# Run it
./switch-env.sh development
```

### Problem: Can't connect to Supabase

**Solution:**

```bash
# 1. Verify your Supabase URL is correct
grep SUPABASE_URL .env

# 2. Test connection
curl $(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)

# 3. Check Supabase dashboard
# Make sure your project is running at https://app.supabase.com
```

## Git Workflow

### What Gets Committed:

✅ `.env.example` - Template with placeholders
✅ `switch-env.sh` - Environment switcher script
✅ Documentation files

### What Stays Local:

🔒 `.env` - Active environment
🔒 `.env.development` - Development secrets
🔒 `.env.production` - Production secrets

### Before Committing:

```bash
# Verify sensitive files aren't staged
git status

# Should NOT see:
# - .env
# - .env.development
# - .env.production
```

## Team Onboarding

When a new developer joins:

1. **They clone the repo:**

   ```bash
   git clone <repo-url>
   cd SkateQuest-Mobile
   ```

2. **They create their environment file:**

   ```bash
   cp .env.example .env.development
   ```

3. **You share credentials securely:**
   - Send Supabase credentials via secure channel (not email!)
   - They paste values into `.env.development`

4. **They activate and start:**
   ```bash
   ./switch-env.sh development
   npm install
   expo start -c
   ```

## Quick Reference

### Daily Commands

```bash
# Start development
./switch-env.sh development && expo start -c

# Test production config
./switch-env.sh production && expo start -c

# Check active environment
head -n 3 .env

# View all environment variables
cat .env
```

### Emergency Commands

```bash
# Reset to development
cp .env.development .env
expo start -c

# Completely clear cache
rm -rf .expo node_modules
npm install
expo start -c
```

## Summary

✅ You can now easily switch between development and production environments
✅ Your sensitive credentials are protected from Git
✅ Team members can quickly get set up using `.env.example`
✅ The app automatically uses the right configuration

**Most Important Commands:**

```bash
./switch-env.sh development  # Switch to dev
./switch-env.sh production   # Switch to prod
expo start -c                # Always restart with cache clear!
```

For more details, see:

- `ENVIRONMENT_SETUP.md` - Complete guide
- `ENV_QUICK_REFERENCE.md` - Quick reference card
- `README.md` - Project setup instructions
