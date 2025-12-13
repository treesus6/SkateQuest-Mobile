-- SkateQuest Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    spots_added INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    crew_id UUID,
    crew_tag TEXT,
    trick_progress JSONB DEFAULT '{}',
    active_session JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. SKATE SPOTS TABLE
-- =====================================================
CREATE TABLE public.skate_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326), -- PostGIS geography type
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    type TEXT, -- 'Ledge', 'Rail', 'Gap', etc.
    tricks TEXT[], -- Array of tricks possible at this spot
    photo_url TEXT,
    video_url TEXT,
    description TEXT,
    added_by UUID REFERENCES public.profiles(id),
    rating NUMERIC(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.skate_spots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skate_spots
CREATE POLICY "Spots are viewable by everyone"
ON public.skate_spots FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert spots"
ON public.skate_spots FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update their own spots"
ON public.skate_spots FOR UPDATE
TO authenticated
USING (auth.uid() = added_by);

-- Spatial index for performance
CREATE INDEX idx_skate_spots_location ON public.skate_spots USING GIST(location);
CREATE INDEX idx_skate_spots_added_by ON public.skate_spots(added_by);

-- =====================================================
-- 3. CHALLENGES TABLE
-- =====================================================
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE CASCADE,
    trick TEXT NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 100,
    created_by UUID REFERENCES public.profiles(id),
    completed_by UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Challenges are viewable by everyone"
ON public.challenges FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create challenges"
ON public.challenges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Challenge creators can update their challenges"
ON public.challenges FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE INDEX idx_challenges_spot_id ON public.challenges(spot_id);
CREATE INDEX idx_challenges_created_by ON public.challenges(created_by);

-- =====================================================
-- 4. TRICK CALLOUTS TABLE (P2P Challenges)
-- =====================================================
CREATE TABLE public.trick_callouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID REFERENCES public.profiles(id) NOT NULL,
    challenger_username TEXT NOT NULL,
    target_id UUID REFERENCES public.profiles(id) NOT NULL,
    target_username TEXT NOT NULL,
    trick TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined')),
    proof_video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.trick_callouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view callouts they're involved in"
ON public.trick_callouts FOR SELECT
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = target_id);

CREATE POLICY "Users can create callouts"
ON public.trick_callouts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Target users can update callout status"
ON public.trick_callouts FOR UPDATE
TO authenticated
USING (auth.uid() = target_id);

CREATE INDEX idx_callouts_challenger ON public.trick_callouts(challenger_id);
CREATE INDEX idx_callouts_target ON public.trick_callouts(target_id);

-- =====================================================
-- 5. CREWS TABLE
-- =====================================================
CREATE TABLE public.crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tag TEXT UNIQUE NOT NULL CHECK (length(tag) >= 2 AND length(tag) <= 5),
    bio TEXT,
    founder_id UUID REFERENCES public.profiles(id) NOT NULL,
    founder_name TEXT NOT NULL,
    members UUID[] DEFAULT '{}',
    member_names TEXT[] DEFAULT '{}',
    total_xp INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    spots_added INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Crews are viewable by everyone"
ON public.crews FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create crews"
ON public.crews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Crew members can update crew"
ON public.crews FOR UPDATE
TO authenticated
USING (auth.uid() = ANY(members));

CREATE POLICY "Crew founders can delete crew"
ON public.crews FOR DELETE
TO authenticated
USING (auth.uid() = founder_id);

CREATE INDEX idx_crews_tag ON public.crews(tag);
CREATE INDEX idx_crews_founder ON public.crews(founder_id);

-- =====================================================
-- 6. SESSIONS TABLE
-- =====================================================
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- in seconds
    spots_visited UUID[] DEFAULT '{}',
    tricks_attempted INTEGER DEFAULT 0,
    tricks_landed INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sessions"
ON public.sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_end_time ON public.sessions(end_time DESC);

-- =====================================================
-- 7. EVENTS TABLE
-- =====================================================
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('jam', 'contest', 'meetup', 'lesson', 'demo')),
    organizer_id UUID REFERENCES public.profiles(id) NOT NULL,
    organizer_name TEXT NOT NULL,
    attendees UUID[] DEFAULT '{}',
    attendee_names TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Events are viewable by everyone"
ON public.events FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers and attendees can update events"
ON public.events FOR UPDATE
TO authenticated
USING (auth.uid() = organizer_id OR auth.uid() = ANY(attendees));

CREATE INDEX idx_events_datetime ON public.events(datetime);
CREATE INDEX idx_events_organizer ON public.events(organizer_id);

-- =====================================================
-- 8. SHOPS TABLE
-- =====================================================
CREATE TABLE public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    phone TEXT,
    website TEXT,
    instagram TEXT,
    hours TEXT,
    verified BOOLEAN DEFAULT false,
    added_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Shops are viewable by everyone"
ON public.shops FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can add shops"
ON public.shops FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Shop submitters can update their shops"
ON public.shops FOR UPDATE
TO authenticated
USING (auth.uid() = added_by);

CREATE INDEX idx_shops_location ON public.shops USING GIST(location);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update the location geography column
CREATE OR REPLACE FUNCTION update_location_geography()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for skate_spots
CREATE TRIGGER set_skate_spot_location
BEFORE INSERT OR UPDATE ON public.skate_spots
FOR EACH ROW
EXECUTE FUNCTION update_location_geography();

-- Trigger for shops
CREATE TRIGGER set_shop_location
BEFORE INSERT OR UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION update_location_geography();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, xp, level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        0,
        1
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE BUCKETS (for images and videos)
-- =====================================================
-- Run these in Supabase Dashboard > Storage or via SQL

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('spot-photos', 'spot-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('spot-videos', 'spot-videos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('challenge-proofs', 'challenge-proofs', true);

-- Storage RLS Policies
CREATE POLICY "Public can view spot photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'spot-photos');

CREATE POLICY "Authenticated users can upload spot photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'spot-photos');

CREATE POLICY "Public can view spot videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'spot-videos');

CREATE POLICY "Authenticated users can upload spot videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'spot-videos');

CREATE POLICY "Users can view challenge proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'challenge-proofs');

CREATE POLICY "Authenticated users can upload challenge proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'challenge-proofs');

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- View for crew leaderboard
CREATE OR REPLACE VIEW crew_leaderboard AS
SELECT
    id,
    name,
    tag,
    total_xp,
    array_length(members, 1) as member_count,
    spots_added,
    challenges_completed,
    ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
FROM public.crews
ORDER BY total_xp DESC;

-- View for user stats
CREATE OR REPLACE VIEW user_stats AS
SELECT
    p.id,
    p.username,
    p.xp,
    p.level,
    p.spots_added,
    p.crew_tag,
    COUNT(DISTINCT s.id) as total_sessions,
    COALESCE(SUM(s.duration), 0) as total_skate_time_seconds,
    ROW_NUMBER() OVER (ORDER BY p.xp DESC) as leaderboard_rank
FROM public.profiles p
LEFT JOIN public.sessions s ON p.id = s.user_id
GROUP BY p.id, p.username, p.xp, p.level, p.spots_added, p.crew_tag
ORDER BY p.xp DESC;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment to insert sample data

/*
-- Sample user profile (you'll need a real auth.users ID)
INSERT INTO public.profiles (id, username, xp, level)
VALUES ('00000000-0000-0000-0000-000000000000', 'TestSkater', 500, 3);

-- Sample skate spot
INSERT INTO public.skate_spots (name, latitude, longitude, difficulty, type, tricks, added_by)
VALUES ('Venice Skatepark', 33.9850, -118.4695, 'Intermediate', 'Park', ARRAY['Kickflip', 'Grind'], '00000000-0000-0000-0000-000000000000');
*/
