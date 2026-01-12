# Supabase Authentication Setup Guide

## Issue: Can't Log In

If you're unable to log in to the app, follow these steps to configure Supabase correctly.

## Step 1: Disable Email Confirmation (for testing)

**IMPORTANT:** For testing/development, you need to disable email confirmation.

1. Go to your Supabase Dashboard: https://hreeuqdgrwvnxquxohod.supabase.co
2. Navigate to **Authentication** → **Providers**
3. Click on **Email**
4. Scroll down to **Email Confirmations**
5. **UNCHECK** "Confirm email"
6. Click **Save**

## Step 2: Run Database Migrations

You need to run the SQL files in your Supabase SQL Editor to set up the database:

### Required SQL Files (in order):

1. **supabase-schema.sql** - Creates all tables and RLS policies
2. **supabase-fix-signup.sql** - Auto-creates user profiles on signup
3. **supabase-level-system.sql** - Adds XP and leveling system
4. **supabase-map-function.sql** - Adds nearby spots query function

### How to Run:

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy the contents of each SQL file (in order)
4. Paste into the editor
5. Click **Run**
6. Repeat for all 4 files

## Step 3: Verify RLS Policies

Make sure Row Level Security policies are configured correctly:

1. Go to **Table Editor**
2. Select the `profiles` table
3. Click on **RLS Policies**
4. Verify these policies exist:
   - ✅ "Public profiles are viewable by everyone" (SELECT)
   - ✅ "Users can update own profile" (UPDATE)
   - ✅ "Users can insert own profile" (INSERT)

## Step 4: Test Sign Up

1. Restart your Expo app: `npx expo start --tunnel`
2. Open the app on your device
3. Try to create a new account with:
   - Email: test@example.com
   - Password: password123 (min 6 characters)
4. You should be logged in immediately (no email confirmation needed)

## Step 5: Verify Profile Creation

After signing up, check if a profile was created:

1. Go to **Table Editor** → **profiles**
2. You should see a new row with:
   - id: (your user ID)
   - username: (auto-generated or from email)
   - xp: 0
   - level: 1

## Common Issues & Solutions

### "Invalid login credentials"

- **Cause:** Email confirmation is still enabled OR user doesn't exist
- **Fix:**
  1. Disable email confirmation (Step 1)
  2. Delete the user from Authentication → Users
  3. Sign up again

### "User already registered"

- **Cause:** User exists but can't log in
- **Fix:**
  1. Go to Authentication → Users
  2. Find the user
  3. Click on the user
  4. Check if "Email Confirmed" is true
  5. If false, click "Send email confirmation" OR manually set it to true

### "Profile not found" after login

- **Cause:** The auto-create trigger isn't working
- **Fix:**
  1. Re-run `supabase-fix-signup.sql`
  2. Delete the user
  3. Sign up again

### Still can't log in after signup

- **Cause:** Email confirmation is enabled
- **Fix:**
  1. Go to your email inbox
  2. Find the confirmation email from Supabase
  3. Click the confirmation link
  4. Try logging in again

OR disable email confirmation (Step 1) for easier testing

## Production Setup (Later)

For production, you'll want to:

1. ✅ **Enable** email confirmation
2. ✅ Configure SMTP settings for email delivery
3. ✅ Customize email templates
4. ✅ Set up proper redirect URLs

But for development/testing, keep email confirmation **disabled**.

## Need Help?

If you still can't log in:

1. Check the Expo console for error messages
2. Check Supabase Dashboard → Logs → Auth
3. Verify your .env file has the correct credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://hreeuqdgrwvnxquxohod.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
