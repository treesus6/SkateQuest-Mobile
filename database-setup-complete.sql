-- SkateQuest Mobile Database Setup - Run this entire file in Supabase SQL Editor
-- This will create all tables, indexes, RLS policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users Table
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

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create Skate Spots Table
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

CREATE INDEX idx_spots_location ON skate_spots(latitude, longitude);

ALTER TABLE skate_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spots"
  ON skate_spots FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create spots"
  ON skate_spots FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own spots"
  ON skate_spots FOR UPDATE
  USING (auth.uid() = added_by);

CREATE POLICY "Users can delete own spots"
  ON skate_spots FOR DELETE
  USING (auth.uid() = added_by);

-- Create Challenges Table
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

CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_created_at ON challenges(created_at DESC);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenges"
  ON challenges FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can complete challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create Shops Table
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

CREATE INDEX idx_shops_location ON shops(latitude, longitude);

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shops"
  ON shops FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add shops"
  ON shops FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create Crews Table
CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crews"
  ON crews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create crews"
  ON crews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator can update crew"
  ON crews FOR UPDATE
  USING (auth.uid() = created_by);

-- Create Crew Members Table
CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crew members"
  ON crew_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join crews"
  ON crew_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can leave crews"
  ON crew_members FOR DELETE
  USING (auth.uid() = user_id);

-- Create Events Table
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

CREATE INDEX idx_events_date ON events(date);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator can update events"
  ON events FOR UPDATE
  USING (auth.uid() = created_by);

-- Create Event RSVPs Table
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view RSVPs"
  ON event_rsvps FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can RSVP"
  ON event_rsvps FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can cancel RSVP"
  ON event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- Create helper function for nearby skateparks
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
    111.045 * (latitude - lat) * 111.045 * (latitude - lat) +
    111.045 * COS(latitude / 57.3) * (longitude - lng) * 111.045 * COS(latitude / 57.3) * (longitude - lng)
  ) < (radius_km * radius_km)
  ORDER BY created_at DESC;
$$;

-- Insert sample data
INSERT INTO skate_spots (name, latitude, longitude, difficulty, tricks) VALUES
  ('Downtown Ledges', 37.7749, -122.4194, 'Intermediate', ARRAY['kickflip', '50-50']),
  ('Skatepark Main', 37.7849, -122.4094, 'Beginner', ARRAY['ollie', 'manual']),
  ('Street Rails', 37.7649, -122.4294, 'Advanced', ARRAY['boardslide', 'heelflip']);

-- Insert sample shops
INSERT INTO shops (name, address, latitude, longitude, phone, verified) VALUES
  ('Local Skate Shop', '123 Main St', 37.7749, -122.4194, '555-1234', true),
  ('Skate Supply Co', '456 Market St', 37.7849, -122.4094, '555-5678', true);

-- Success message
SELECT 'Database setup complete! All tables, policies, and sample data created.' AS status;
