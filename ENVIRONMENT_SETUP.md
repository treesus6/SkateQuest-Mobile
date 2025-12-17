# Environment Variable Management Guide

This guide explains how to manage environment variables for the SkateQuest mobile app.

## Overview

The app uses environment-specific configuration files to manage different settings for development and production environments. All environment variables are prefixed with `EXPO_PUBLIC_` to make them accessible in the React Native app.

## Environment Files

### File Structure
```
.env.example         # Template file with placeholder values (COMMIT TO GIT)
.env.development     # Development environment config (DO NOT COMMIT)
.env.production      # Production environment config (DO NOT COMMIT)
.env                 # Legacy/default file (can be removed)
```

### Environment Variables

#### Required Variables

**EXPO_PUBLIC_SUPABASE_URL**
- Your Supabase project URL
- Format: `https://[project-id].supabase.co`
- Get from: [Supabase Dashboard](https://app.supabase.com) → Project Settings → API

**EXPO_PUBLIC_SUPABASE_KEY**
- Your Supabase anonymous/public API key
- This is safe to expose in client-side code (it's the `anon` key, not the `service_role` key)
- Get from: [Supabase Dashboard](https://app.supabase.com) → Project Settings → API

#### Optional Variables

**EXPO_PUBLIC_SENTRY_DSN**
- Sentry Data Source Name for error tracking
- Leave empty to disable error tracking in development
- Get from: [Sentry Dashboard](https://sentry.io) → Settings → Projects → [Your Project] → Client Keys (DSN)

**EXPO_PUBLIC_OPENAI_API_KEY**
- OpenAI API key for AI-powered trick analysis
- Leave empty to use heuristic (local) trick analysis instead
- Get from: [OpenAI Platform](https://platform.openai.com/api-keys)

## Setup Instructions

### Initial Setup

1. **Copy the example file to create your development environment:**
   ```bash
   cp .env.example .env.development
   ```

2. **Edit `.env.development` with your actual values:**
   ```bash
   # Use your preferred editor
   nano .env.development
   # or
   code .env.development
   ```

3. **Fill in the required values:**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=your_actual_anon_key_here
   ```

### Setting Up Production Environment

1. **Create production environment file:**
   ```bash
   cp .env.example .env.production
   ```

2. **Update with production credentials:**
   - Use your production Supabase project (separate from development if possible)
   - Use production-grade Sentry DSN
   - Use production OpenAI API key with appropriate rate limits

3. **Important:** Never commit this file to version control!

## Switching Between Environments

### Development Environment (Default)

The development environment is used automatically when you run:

```bash
npm start
# or
expo start
```

This uses `.env.development` by default.

### Production Environment

For production builds, Expo will automatically use `.env.production` when building for distribution:

```bash
# Android production build
npm run android

# iOS production build
npm run ios
```

### Manual Environment Switching

If you need to manually switch environments during development:

1. **Option 1: Rename files temporarily**
   ```bash
   # Switch to production
   mv .env.development .env.development.backup
   mv .env.production .env.development

   # Switch back to development
   mv .env.development .env.production
   mv .env.development.backup .env.development
   ```

2. **Option 2: Use shell script (recommended)**
   Create a `switch-env.sh` script:
   ```bash
   #!/bin/bash
   if [ "$1" = "production" ]; then
     cp .env.production .env
     echo "Switched to PRODUCTION environment"
   else
     cp .env.development .env
     echo "Switched to DEVELOPMENT environment"
   fi
   ```

   Usage:
   ```bash
   chmod +x switch-env.sh
   ./switch-env.sh development  # Switch to dev
   ./switch-env.sh production   # Switch to prod
   ```

## How It Works

### Expo Environment Variables

Expo has built-in support for environment variables with these rules:

1. **Prefix Requirement**: Only variables prefixed with `EXPO_PUBLIC_` are available in your app code
2. **Access Pattern**: Use `process.env.EXPO_PUBLIC_VARIABLE_NAME` in your code
3. **Build-time Injection**: Variables are injected at build time (not runtime)

### Example Usage in Code

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // ... configuration
});
```

### Environment Detection

The app automatically detects the environment:

```typescript
// App.tsx
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  debug: __DEV__,
});
```

- `__DEV__` is a global boolean that's `true` in development mode
- Use this to conditionally enable features based on environment

## Security Best Practices

### DO ✅
- Commit `.env.example` with placeholder values
- Use different Supabase projects for dev and prod
- Keep `.env.development` and `.env.production` in `.gitignore`
- Use the `anon` key (public key) for client-side Supabase access
- Rotate keys if accidentally committed

### DON'T ❌
- Never commit `.env.development` or `.env.production` to Git
- Never use `service_role` key in client-side code
- Never hardcode credentials in source files
- Never share production credentials in team chat

## Troubleshooting

### Variables Not Loading

1. **Restart the development server:**
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm start
   ```

2. **Clear cache and restart:**
   ```bash
   expo start -c
   ```

3. **Verify file naming:**
   - File must be exactly `.env.development` (with leading dot)
   - No extra extensions (not `.env.development.txt`)

### "Unable to connect to Supabase"

1. **Check your Supabase URL format:**
   ```env
   # Correct:
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co

   # Incorrect (no trailing slash):
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co/
   ```

2. **Verify your API key:**
   - Use the `anon` public key, not the `service_role` key
   - Copy the entire key (they're quite long)

3. **Test connection:**
   - Visit your Supabase URL in a browser
   - Should see a simple page confirming it's running

### Environment Not Switching

1. **Expo caches environment variables** - always restart with cache clear:
   ```bash
   expo start -c
   ```

2. **Kill and restart the server:**
   ```bash
   # Kill any existing processes
   kill $(lsof -t -i:19000)  # Kill Metro bundler
   npm start
   ```

## Additional Resources

- [Expo Environment Variables Docs](https://docs.expo.dev/guides/environment-variables/)
- [Supabase API Settings](https://app.supabase.com)
- [Sentry Setup Guide](https://docs.sentry.io/platforms/react-native/)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

## Summary

1. ✅ Created `.env.development` and `.env.production`
2. ✅ Added both files to `.gitignore`
3. ✅ Committed `.env.example` as a template
4. ✅ Code already uses `process.env.EXPO_PUBLIC_*` pattern
5. ✅ Ready to use environment-specific configurations

Your environment variable management is now properly configured!
