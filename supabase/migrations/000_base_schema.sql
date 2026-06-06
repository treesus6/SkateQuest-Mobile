-- Migration 000: Base Schema for SkateQuest
-- Create core tables that other migrations depend on

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'pro')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Skate Spots
CREATE TABLE IF NOT EXISTS skate_spots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  city text,
  state text,
  country text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Crews
CREATE TABLE IF NOT EXISTS crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color_hex text DEFAULT '#d2673d',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  xp_reward integer DEFAULT 100,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Skate Shops
CREATE TABLE IF NOT EXISTS skate_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  website_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 6. Media (Generic storage for photos/videos)
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text CHECK (type IN ('image', 'video')),
  thumbnail_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on base tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skate_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE skate_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Base Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Spots are viewable by everyone" ON skate_spots FOR SELECT USING (true);
CREATE POLICY "Crews are viewable by everyone" ON crews FOR SELECT USING (true);
CREATE POLICY "Challenges are viewable by everyone" ON challenges FOR SELECT USING (true);
CREATE POLICY "Shops are viewable by everyone" ON skate_shops FOR SELECT USING (true);
CREATE POLICY "Media is viewable by everyone" ON media FOR SELECT USING (true);
CREATE POLICY "Users can upload own media" ON media FOR INSERT WITH CHECK (auth.uid() = user_id);
