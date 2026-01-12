# Database Migrations

This folder contains SQL migrations for SkateQuest-Mobile's Supabase database.

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy the contents of each migration file (in order) and run them:
   - First run `001_add_sponsor_fields.sql`
   - Then run `002_create_nearby_spots_function.sql`
5. Click **Run** to execute each migration

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
bun add -g supabase

# Link to your project (do this once)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## Migrations

### 001_add_sponsor_fields.sql

- Adds sponsor fields to `skate_spots` table (sponsor_name, sponsor_url, sponsor_logo_url)
- Sets Portal Dimension as sponsor for Newport Skate Park
- Creates index for faster sponsor queries

### 002_create_nearby_spots_function.sql

- Creates `get_nearby_spots()` PostgreSQL function
- Uses PostGIS to find spots within a radius
- Returns spots sorted by distance
- Required for the MapScreen to work

## Verifying Migrations

After running migrations, verify they worked:

```sql
-- Check if sponsor columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'skate_spots'
AND column_name LIKE 'sponsor%';

-- Check if Newport has Portal Dimension link
SELECT name, sponsor_name, sponsor_url
FROM skate_spots
WHERE sponsor_name = 'Portal Dimension';

-- Test the nearby spots function
SELECT * FROM get_nearby_spots(44.6369, -124.0533, 50000)
LIMIT 5;
```

## Portal Dimension Setup

The migration automatically adds Portal Dimension to Newport Skate Park. If you need to update it or the park name doesn't match:

```sql
-- Find Newport parks
SELECT id, name, city, state
FROM skate_spots
WHERE (name ILIKE '%newport%' OR city ILIKE '%newport%')
AND state ILIKE '%OR%';

-- Manually set sponsor (replace ID with correct one)
UPDATE skate_spots
SET
  sponsor_name = 'Portal Dimension',
  sponsor_url = 'https://portaldimension.com'
WHERE id = 'YOUR_SPOT_ID';
```

## Troubleshooting

### PostGIS Extension Not Found

If you get "PostGIS extension not found" errors:

```sql
-- Enable PostGIS extension (requires admin)
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Function Permission Errors

If users can't execute the function:

```sql
GRANT EXECUTE ON FUNCTION get_nearby_spots TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_spots TO anon;
```

## Need Help?

Check the Supabase docs: https://supabase.com/docs/guides/database/migrations
