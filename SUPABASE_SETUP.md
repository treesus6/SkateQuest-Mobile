# Supabase Setup Guide for SkateQuest Mobile

This guide explains how to set up the required Supabase RPC functions for SkateQuest Mobile to work properly.

## Prerequisites

- A Supabase project created at [supabase.com](https://supabase.com)
- Access to your project's SQL Editor

## Setup Instructions

### 1. Configure Your Supabase Credentials

Update `supabase-client.js` with your project credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key-here'
```

You can find these at: `https://supabase.com/dashboard/project/_/settings/api`

### 2. Run the RPC Functions Setup

The app requires several PostgreSQL functions for atomic operations (like incrementing XP).

**Option A: Run the setup file (Recommended)**
1. Open your Supabase project dashboard
2. Go to **Database** > **SQL Editor**
3. Copy the contents of `supabase-setup.sql`
4. Paste into the SQL Editor and click **Run**

**Option B: Manual setup**
Run each function individually from `supabase-setup.sql` in the SQL Editor.

### 3. Verify Installation

Run this query in the SQL Editor to verify the functions were created:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('increment_fields', 'increment_xp', 'increment_crew_xp');
```

You should see all three functions listed.

## What These Functions Do

### `increment_fields(table_name, record_id, increments)`
**Purpose**: Generic atomic increment for any numeric fields
**Used by**: The `increment()` helper in `updateDoc()` calls

This is the main function that powers the `increment()` helper. When you write:

```javascript
await updateDoc('profiles', userId, {
  xp: increment(50),
  spotsAdded: increment(1)
})
```

Behind the scenes, `updateDoc()` detects the increment objects and calls this RPC function to perform atomic increments on the database side.

**Why it's needed**: Direct SQL increments are atomic and safe for concurrent operations, unlike read-modify-write patterns.

### `increment_xp(user_id, amount)`
**Purpose**: Specialized function for user XP increments
**Can be used directly for**: Simple XP-only updates

```javascript
await incrementXP(userId, 100)
```

### `increment_crew_xp(crew_id, amount)`
**Purpose**: Specialized function for crew XP increments
**Can be used directly for**: Crew total XP updates

```javascript
await incrementCrewXP(crewId, 100)
```

## How the Increment System Works

### Before (Firebase)
```javascript
// Firebase had built-in increment
await updateDoc(docRef, {
  xp: increment(50)  // Works automatically
})
```

### After (Supabase)
```javascript
// Same code works with Supabase!
await updateDoc('profiles', userId, {
  xp: increment(50)  // Now uses RPC for atomic increment
})
```

The `updateDoc()` function has been enhanced to:
1. Detect when values are increment objects (`{ _increment: number }`)
2. Separate increments from regular updates
3. Use the `increment_fields` RPC function for atomic increments
4. Apply regular updates normally

This ensures:
- ✅ **Atomic operations** - No race conditions
- ✅ **Safe concurrency** - Multiple users can increment simultaneously
- ✅ **Firebase compatibility** - Same API as before
- ✅ **Multiple fields** - Can increment multiple fields in one call

## Troubleshooting

### Error: "function increment_fields does not exist"
**Solution**: Run the `supabase-setup.sql` file in your SQL Editor

### Error: "permission denied for function increment_fields"
**Solution**: The function should be created with `SECURITY DEFINER`. Check the SQL includes this.

### Increments not working
**Solution**:
1. Verify the RPC functions exist (see verification step above)
2. Check your Supabase URL and anon key are correct
3. Ensure the table and field names match your database schema
4. Check that numeric fields exist and are nullable or have default values

## Database Schema Requirements

For increment operations to work, ensure your tables have numeric fields defined:

```sql
-- Example profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  spots_added INTEGER DEFAULT 0,
  -- other fields...
);

-- Example crews table
CREATE TABLE crews (
  id UUID PRIMARY KEY,
  total_xp INTEGER DEFAULT 0,
  -- other fields...
);
```

## Next Steps

After setting up these functions:
1. Test increment operations in your app
2. Monitor the Supabase logs for any errors
3. Consider adding indexes on frequently incremented fields for better performance

## Support

If you encounter issues:
- Check the Supabase logs: Dashboard > Logs
- Verify your RPC functions: Dashboard > Database > Functions
- Review the SQL in `supabase-setup.sql` for any modifications needed for your schema
