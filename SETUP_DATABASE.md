# SkateQuest Mobile - Database Setup Guide

This guide will help you set up the Supabase database for the SkateQuest mobile app.

## Prerequisites
- Supabase account
- Project already created (you have the credentials in `.env`)

## Step 1: Create Tables

Go to your Supabase dashboard → SQL Editor and run these queries:

### Create Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  spots_added INTEGER DEFAULT 0,
  challenges_completed TEXT[] DEFAULT '{}',
  streak INTEGER DEFAULT 0,
  badges JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Create Skate Spots Table
```sql
CREATE TABLE skate_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  tricks TEXT[] DEFAULT '{}',
  rating FLOAT8,
  image_url TEXT,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for geospatial queries
CREATE INDEX idx_spots_location ON skate_spots(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE skate_spots ENABLE ROW LEVEL SECURITY;

-- Anyone can view spots
CREATE POLICY "Anyone can view spots"
  ON skate_spots FOR SELECT
  USING (true);

-- Authenticated users can create spots
CREATE POLICY "Authenticated users can create spots"
  ON skate_spots FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own spots
CREATE POLICY "Users can update own spots"
  ON skate_spots FOR UPDATE
  USING (auth.uid() = added_by);

-- Users can delete their own spots
CREATE POLICY "Users can delete own spots"
  ON skate_spots FOR DELETE
  USING (auth.uid() = added_by);
```

### Create Challenges Table
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  trick TEXT NOT NULL,
  challenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  title TEXT,
  description TEXT,
  xp_reward INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_created_at ON challenges(created_at DESC);

-- Enable Row Level Security
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view challenges
CREATE POLICY "Anyone can view challenges"
  ON challenges FOR SELECT
  USING (true);

-- Authenticated users can create challenges
CREATE POLICY "Authenticated users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can complete challenges
CREATE POLICY "Authenticated users can complete challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() IS NOT NULL);
```

### Create Shops Table
```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  phone TEXT,
  website TEXT,
  hours TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for geospatial queries
CREATE INDEX idx_shops_location ON shops(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Anyone can view shops
CREATE POLICY "Anyone can view shops"
  ON shops FOR SELECT
  USING (true);

-- Only authenticated users can add shops
CREATE POLICY "Authenticated users can add shops"
  ON shops FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

### Create Crews Table
```sql
CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;

-- Anyone can view crews
CREATE POLICY "Anyone can view crews"
  ON crews FOR SELECT
  USING (true);

-- Authenticated users can create crews
CREATE POLICY "Authenticated users can create crews"
  ON crews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only creator can update crew
CREATE POLICY "Creator can update crew"
  ON crews FOR UPDATE
  USING (auth.uid() = created_by);
```

### Create Crew Members Table
```sql
CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view crew members
CREATE POLICY "Anyone can view crew members"
  ON crew_members FOR SELECT
  USING (true);

-- Authenticated users can join crews
CREATE POLICY "Authenticated users can join crews"
  ON crew_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can leave crews
CREATE POLICY "Users can leave crews"
  ON crew_members FOR DELETE
  USING (auth.uid() = user_id);
```

### Create Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  attendee_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for date queries
CREATE INDEX idx_events_date ON events(date);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can view events
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only creator can update/delete events
CREATE POLICY "Creator can update events"
  ON events FOR UPDATE
  USING (auth.uid() = created_by);
```

### Create Event RSVPs Table
```sql
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone can view RSVPs
CREATE POLICY "Anyone can view RSVPs"
  ON event_rsvps FOR SELECT
  USING (true);

-- Authenticated users can RSVP
CREATE POLICY "Authenticated users can RSVP"
  ON event_rsvps FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can cancel their RSVP
CREATE POLICY "Users can cancel RSVP"
  ON event_rsvps FOR DELETE
  USING (auth.uid() = user_id);
```

## Step 2: Create Storage Bucket (Optional)

For image and video uploads:

1. Go to Storage in Supabase dashboard
2. Create a new bucket called `spot-media`
3. Set it to public
4. Add policy:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'spot-media' AND
    auth.uid() IS NOT NULL
  );

-- Anyone can view
CREATE POLICY "Anyone can view media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'spot-media');
```

## Step 3: Create Helper Functions (Optional)

### Function to get nearby skateparks
```sql
CREATE OR REPLACE FUNCTION nearby_skateparks(
  lat FLOAT8,
  lng FLOAT8,
  radius_km FLOAT8 DEFAULT 50
)
RETURNS SETOF skate_spots
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM skate_spots
  WHERE (
    -- Simple distance calculation (rough approximation)
    111.045 * (latitude - lat) * 111.045 * (latitude - lat) +
    111.045 * COS(latitude / 57.3) * (longitude - lng) * 111.045 * COS(latitude / 57.3) * (longitude - lng)
  ) < (radius_km * radius_km)
  ORDER BY created_at DESC;
$$;
```

## Step 4: Seed Sample Data (Optional)

```sql
-- Insert sample spots
INSERT INTO skate_spots (name, latitude, longitude, difficulty, tricks) VALUES
  ('Downtown Ledges', 37.7749, -122.4194, 'Intermediate', ARRAY['kickflip', '50-50']),
  ('Skatepark Main', 37.7849, -122.4094, 'Beginner', ARRAY['ollie', 'manual']),
  ('Street Rails', 37.7649, -122.4294, 'Advanced', ARRAY['boardslide', 'heelflip']);

-- Note: User profiles are created automatically when users sign up
```

## Step 5: Test the Setup

Run these queries to verify:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check row count
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL
SELECT 'skate_spots', COUNT(*) FROM skate_spots
UNION ALL
SELECT 'challenges', COUNT(*) FROM challenges
UNION ALL
SELECT 'shops', COUNT(*) FROM shops;
```

## Troubleshooting

### Error: "uuid_generate_v4 does not exist"
Run this to enable UUID extension:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "relation auth.users does not exist"
This means Supabase Auth isn't enabled. Go to Authentication → Settings and make sure Auth is enabled.

### Error: "permission denied for schema"
Make sure you're running queries as the postgres user or service role, not the anon key.

## Next Steps

After setting up the database:
1. Test the mobile app authentication
2. Try creating a spot
3. Create and complete a challenge
4. Check that XP is updating correctly

Your database is now ready for the SkateQuest mobile app! 🛹
