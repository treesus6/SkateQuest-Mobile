-- ============================================================
-- SKATEQUEST COMPLETE DATABASE SETUP
-- ============================================================
-- Run this ENTIRE file in Supabase SQL Editor
-- Order of execution is important!
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- 2.1 USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

-- 2.2 SKATE SPOTS TABLE
CREATE TABLE IF NOT EXISTS public.skate_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    type TEXT,
    tricks TEXT[],
    photo_url TEXT,
    video_url TEXT,
    image_url TEXT,
    description TEXT,
    added_by UUID REFERENCES public.profiles(id),
    rating NUMERIC(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    -- Sponsor fields
    sponsor_name TEXT,
    sponsor_url TEXT,
    sponsor_logo_url TEXT,
    -- Location info
    city TEXT,
    state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.skate_spots ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can delete their own spots"
ON public.skate_spots FOR DELETE
TO authenticated
USING (auth.uid() = added_by);

CREATE INDEX IF NOT EXISTS idx_skate_spots_location ON public.skate_spots USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_skate_spots_added_by ON public.skate_spots(added_by);
CREATE INDEX IF NOT EXISTS idx_skate_spots_sponsor ON public.skate_spots(sponsor_name) WHERE sponsor_name IS NOT NULL;

-- 2.3 CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE CASCADE,
    trick TEXT NOT NULL,
    title TEXT,
    description TEXT,
    xp_reward INTEGER DEFAULT 100,
    created_by UUID REFERENCES public.profiles(id),
    challenger_id UUID REFERENCES public.profiles(id),
    completed_by UUID[] DEFAULT '{}',
    completed_by_user UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'pending')),
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by everyone"
ON public.challenges FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create challenges"
ON public.challenges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by OR auth.uid() = challenger_id);

CREATE POLICY "Authenticated users can update challenges"
ON public.challenges FOR UPDATE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_challenges_spot_id ON public.challenges(spot_id);
CREATE INDEX IF NOT EXISTS idx_challenges_created_by ON public.challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);

-- 2.4 TRICK CALLOUTS TABLE (P2P Challenges)
CREATE TABLE IF NOT EXISTS public.trick_callouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID REFERENCES public.profiles(id) NOT NULL,
    challenger_username TEXT NOT NULL,
    target_id UUID REFERENCES public.profiles(id) NOT NULL,
    target_username TEXT NOT NULL,
    challenged_user_id UUID REFERENCES public.profiles(id),
    trick TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined')),
    proof_video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.trick_callouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view callouts they're involved in"
ON public.trick_callouts FOR SELECT
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = target_id OR auth.uid() = challenged_user_id);

CREATE POLICY "Users can create callouts"
ON public.trick_callouts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Target users can update callout status"
ON public.trick_callouts FOR UPDATE
TO authenticated
USING (auth.uid() = target_id OR auth.uid() = challenged_user_id);

CREATE INDEX IF NOT EXISTS idx_callouts_challenger ON public.trick_callouts(challenger_id);
CREATE INDEX IF NOT EXISTS idx_callouts_target ON public.trick_callouts(target_id);

-- 2.5 CREWS TABLE
CREATE TABLE IF NOT EXISTS public.crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tag TEXT UNIQUE NOT NULL CHECK (length(tag) >= 2 AND length(tag) <= 5),
    bio TEXT,
    description TEXT,
    founder_id UUID REFERENCES public.profiles(id) NOT NULL,
    founder_name TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    members UUID[] DEFAULT '{}',
    member_names TEXT[] DEFAULT '{}',
    member_count INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    spots_added INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crews are viewable by everyone"
ON public.crews FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create crews"
ON public.crews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = founder_id OR auth.uid() = created_by);

CREATE POLICY "Crew members can update crew"
ON public.crews FOR UPDATE
TO authenticated
USING (auth.uid() = ANY(members) OR auth.uid() = founder_id OR auth.uid() = created_by);

CREATE POLICY "Crew founders can delete crew"
ON public.crews FOR DELETE
TO authenticated
USING (auth.uid() = founder_id OR auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_crews_tag ON public.crews(tag);
CREATE INDEX IF NOT EXISTS idx_crews_founder ON public.crews(founder_id);

-- 2.6 CREW MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(crew_id, user_id)
);

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crew members"
ON public.crew_members FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can join crews"
ON public.crew_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can leave crews"
ON public.crew_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2.7 SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL,
    spots_visited UUID[] DEFAULT '{}',
    tricks_attempted INTEGER DEFAULT 0,
    tricks_landed INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
ON public.sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON public.sessions(end_time DESC);

-- 2.8 EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    title TEXT,
    datetime TIMESTAMP WITH TIME ZONE,
    date DATE,
    time TEXT,
    location TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('jam', 'contest', 'meetup', 'lesson', 'demo')),
    organizer_id UUID REFERENCES public.profiles(id),
    organizer_name TEXT,
    created_by UUID REFERENCES public.profiles(id),
    attendees UUID[] DEFAULT '{}',
    attendee_names TEXT[] DEFAULT '{}',
    attendee_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
ON public.events FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id OR auth.uid() = created_by);

CREATE POLICY "Organizers and attendees can update events"
ON public.events FOR UPDATE
TO authenticated
USING (auth.uid() = organizer_id OR auth.uid() = created_by OR auth.uid() = ANY(attendees));

CREATE INDEX IF NOT EXISTS idx_events_datetime ON public.events(datetime);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);

-- 2.9 EVENT RSVPs TABLE
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view RSVPs"
ON public.event_rsvps FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can RSVP"
ON public.event_rsvps FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can cancel RSVP"
ON public.event_rsvps FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2.10 SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.shops (
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

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shops are viewable by everyone"
ON public.shops FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can add shops"
ON public.shops FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Shop submitters can update their shops"
ON public.shops FOR UPDATE
TO authenticated
USING (auth.uid() = added_by);

CREATE INDEX IF NOT EXISTS idx_shops_location ON public.shops USING GIST(location);

-- ============================================================
-- SECTION 3: ADDITIONAL FEATURE TABLES
-- ============================================================

-- 3.1 MEDIA UPLOADS TABLE
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('photo', 'video')),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size INTEGER,
    duration INTEGER,
    caption TEXT,
    trick_name TEXT,
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE SET NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media"
ON public.media FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can upload media"
ON public.media FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
ON public.media FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_media_user ON public.media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_spot ON public.media(spot_id);
CREATE INDEX IF NOT EXISTS idx_media_created ON public.media(created_at DESC);

-- 3.2 SPOT PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.spot_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.spot_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spot photos"
ON public.spot_photos FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can add spot photos"
ON public.spot_photos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_spot_photos_spot ON public.spot_photos(spot_id);

-- 3.3 ACTIVITIES TABLE (Social Feed)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT CHECK (activity_type IN ('spot_added', 'challenge_completed', 'trick_landed', 'level_up', 'media_uploaded', 'skate_game_won', 'qr_code_found', 'qr_code_hidden')),
    title TEXT NOT NULL,
    description TEXT,
    xp_earned INTEGER DEFAULT 0,
    media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE SET NULL,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activities"
ON public.activities FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can create activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activities_user ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at DESC);

-- 3.4 USER TRICKS TABLE
CREATE TABLE IF NOT EXISTS public.user_tricks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    trick_name TEXT NOT NULL,
    status TEXT DEFAULT 'trying' CHECK (status IN ('trying', 'landed', 'consistent')),
    attempts INTEGER DEFAULT 0,
    first_landed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, trick_name)
);

ALTER TABLE public.user_tricks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tricks"
ON public.user_tricks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add tricks"
ON public.user_tricks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tricks"
ON public.user_tricks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tricks"
ON public.user_tricks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_tricks_user ON public.user_tricks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tricks_status ON public.user_tricks(status);

-- 3.5 SKATE GAMES TABLE
CREATE TABLE IF NOT EXISTS public.skate_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed')),
    current_turn UUID REFERENCES public.profiles(id),
    challenger_letters TEXT DEFAULT '',
    opponent_letters TEXT DEFAULT '',
    winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.skate_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their games"
ON public.skate_games FOR SELECT
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create games"
ON public.skate_games FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Players can update their games"
ON public.skate_games FOR UPDATE
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE INDEX IF NOT EXISTS idx_skate_games_challenger ON public.skate_games(challenger_id);
CREATE INDEX IF NOT EXISTS idx_skate_games_opponent ON public.skate_games(opponent_id);
CREATE INDEX IF NOT EXISTS idx_skate_games_status ON public.skate_games(status);

-- 3.6 SKATE GAME TURNS TABLE
CREATE TABLE IF NOT EXISTS public.skate_game_turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES public.skate_games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
    trick_name TEXT NOT NULL,
    matched BOOLEAN,
    turn_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.skate_game_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game turns"
ON public.skate_game_turns FOR SELECT
TO public
USING (true);

CREATE POLICY "Players can add turns"
ON public.skate_game_turns FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = player_id);

CREATE INDEX IF NOT EXISTS idx_game_turns_game ON public.skate_game_turns(game_id);
CREATE INDEX IF NOT EXISTS idx_game_turns_player ON public.skate_game_turns(player_id);

-- 3.7 SPOT CONDITIONS TABLE
CREATE TABLE IF NOT EXISTS public.spot_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_id UUID REFERENCES public.skate_spots(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    condition TEXT CHECK (condition IN ('dry', 'wet', 'crowded', 'empty', 'cops', 'clear', 'under_construction')),
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '6 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.spot_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view conditions"
ON public.spot_conditions FOR SELECT
TO public
USING (expires_at > NOW());

CREATE POLICY "Users can report conditions"
ON public.spot_conditions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_spot_conditions_spot ON public.spot_conditions(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_conditions_expires ON public.spot_conditions(expires_at);

-- 3.8 PLAYLISTS TABLE
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    youtube_url TEXT,
    tracks JSONB DEFAULT '[]',
    likes_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public playlists"
ON public.playlists FOR SELECT
TO public
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create playlists"
ON public.playlists FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
ON public.playlists FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
ON public.playlists FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_playlists_user ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON public.playlists(is_public);

-- 3.9 MEDIA LIKES TABLE
CREATE TABLE IF NOT EXISTS public.media_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID REFERENCES public.media(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(media_id, user_id)
);

ALTER TABLE public.media_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON public.media_likes FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can like media"
ON public.media_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike media"
ON public.media_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_media_likes_media ON public.media_likes(media_id);
CREATE INDEX IF NOT EXISTS idx_media_likes_user ON public.media_likes(user_id);

-- 3.10 PLAYLIST LIKES TABLE
CREATE TABLE IF NOT EXISTS public.playlist_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, user_id)
);

ALTER TABLE public.playlist_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view playlist likes"
ON public.playlist_likes FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can like playlists"
ON public.playlist_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike playlists"
ON public.playlist_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_playlist_likes_playlist ON public.playlist_likes(playlist_id);

-- ============================================================
-- SECTION 4: QR CODE CHARITY SYSTEM
-- ============================================================

-- 4.1 QR CODES TABLE
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    purchased_by UUID REFERENCES public.profiles(id) NOT NULL,
    purchaser_name TEXT NOT NULL,
    purchase_price DECIMAL(10,2) DEFAULT 2.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'found', 'expired', 'hidden')),
    hidden_at TIMESTAMP WITH TIME ZONE,
    hidden_location_lat DOUBLE PRECISION,
    hidden_location_lng DOUBLE PRECISION,
    hidden_location_description TEXT,
    hidden_location GEOGRAPHY(POINT, 4326),
    found_by UUID REFERENCES public.profiles(id),
    found_by_name TEXT,
    found_at TIMESTAMP WITH TIME ZONE,
    xp_reward INTEGER DEFAULT 100,
    bonus_reward TEXT,
    trick_challenge TEXT,
    challenge_message TEXT,
    proof_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view QR codes they purchased or found"
ON public.qr_codes FOR SELECT
TO authenticated
USING (auth.uid() = purchased_by OR auth.uid() = found_by OR status = 'hidden');

CREATE POLICY "Users can insert QR codes they purchase"
ON public.qr_codes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = purchased_by);

CREATE POLICY "Purchasers can update their QR codes"
ON public.qr_codes FOR UPDATE
TO authenticated
USING (auth.uid() = purchased_by OR auth.uid() = found_by);

CREATE INDEX IF NOT EXISTS idx_qr_codes_purchaser ON public.qr_codes(purchased_by);
CREATE INDEX IF NOT EXISTS idx_qr_codes_finder ON public.qr_codes(found_by);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_location ON public.qr_codes USING GIST(hidden_location);

-- 4.2 DONATIONS TABLE
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID REFERENCES public.profiles(id) NOT NULL,
    donor_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT CHECK (type IN ('qr_purchase', 'direct_donation', 'sponsorship')),
    payment_method TEXT,
    payment_id TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    allocated_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own donations"
ON public.donations FOR SELECT
TO authenticated
USING (auth.uid() = donor_id);

CREATE POLICY "Users can insert their own donations"
ON public.donations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "Public can view donation totals"
ON public.donations FOR SELECT
TO public
USING (true);

CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_created ON public.donations(created_at DESC);

-- 4.3 SKATEBOARD RECIPIENTS TABLE
CREATE TABLE IF NOT EXISTS public.skateboard_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_name TEXT NOT NULL,
    age INTEGER,
    location_city TEXT,
    location_state TEXT,
    story TEXT,
    skateboard_type TEXT,
    cost DECIMAL(10,2) NOT NULL,
    funded_by UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'delivered', 'cancelled')),
    delivered_at TIMESTAMP WITH TIME ZONE,
    public_display BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.skateboard_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved public recipients"
ON public.skateboard_recipients FOR SELECT
TO public
USING (status = 'delivered' AND public_display = true);

CREATE POLICY "Authenticated users can view all recipients"
ON public.skateboard_recipients FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_recipients_status ON public.skateboard_recipients(status);
CREATE INDEX IF NOT EXISTS idx_recipients_created ON public.skateboard_recipients(created_at DESC);

-- 4.4 CHARITY STATS TABLE
CREATE TABLE IF NOT EXISTS public.charity_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_raised DECIMAL(12,2) DEFAULT 0,
    total_qr_codes_sold INTEGER DEFAULT 0,
    total_qr_codes_found INTEGER DEFAULT 0,
    total_skateboards_donated INTEGER DEFAULT 0,
    total_kids_helped INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.charity_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view charity stats"
ON public.charity_stats FOR SELECT
TO public
USING (true);

INSERT INTO public.charity_stats (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 4.5 QR HUNTS TABLE
CREATE TABLE IF NOT EXISTS public.qr_hunts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organizer_id UUID REFERENCES public.profiles(id) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_codes INTEGER DEFAULT 0,
    codes_found INTEGER DEFAULT 0,
    fundraising_goal DECIMAL(10,2),
    skateboards_goal INTEGER,
    area_name TEXT,
    area_lat DOUBLE PRECISION,
    area_lng DOUBLE PRECISION,
    area_radius INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.qr_hunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active hunts"
ON public.qr_hunts FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create hunts"
ON public.qr_hunts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

-- ============================================================
-- SECTION 5: FUNCTIONS AND TRIGGERS
-- ============================================================

-- 5.1 Update location geography trigger
CREATE OR REPLACE FUNCTION update_location_geography()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_skate_spot_location ON public.skate_spots;
CREATE TRIGGER set_skate_spot_location
BEFORE INSERT OR UPDATE ON public.skate_spots
FOR EACH ROW
EXECUTE FUNCTION update_location_geography();

DROP TRIGGER IF EXISTS set_shop_location ON public.shops;
CREATE TRIGGER set_shop_location
BEFORE INSERT OR UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION update_location_geography();

-- 5.2 Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5.3 Handle new user signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 5.4 Level calculation functions
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
    level_num INTEGER := 1;
    xp_required INTEGER := 0;
BEGIN
    WHILE xp_amount >= xp_required LOOP
        level_num := level_num + 1;
        xp_required := FLOOR(100 * POWER(level_num, 1.5));
    END LOOP;
    RETURN level_num - 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_xp_for_level(target_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF target_level <= 1 THEN
        RETURN 0;
    END IF;
    RETURN FLOOR(100 * POWER(target_level, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_level_progress(user_xp INTEGER)
RETURNS JSON AS $$
DECLARE
    current_level INTEGER;
    xp_current_level INTEGER;
    xp_next_level INTEGER;
    xp_progress INTEGER;
    xp_needed INTEGER;
BEGIN
    current_level := calculate_level_from_xp(user_xp);
    xp_current_level := get_xp_for_level(current_level);
    xp_next_level := get_xp_for_level(current_level + 1);
    xp_progress := user_xp - xp_current_level;
    xp_needed := xp_next_level - user_xp;

    RETURN json_build_object(
        'current_level', current_level,
        'current_xp', user_xp,
        'xp_for_current_level', xp_current_level,
        'xp_for_next_level', xp_next_level,
        'xp_progress', xp_progress,
        'xp_needed', xp_needed,
        'progress_percentage', ROUND((xp_progress::NUMERIC / NULLIF((xp_next_level - xp_current_level)::NUMERIC, 0)) * 100, 1)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5.5 Auto-update level when XP changes
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    NEW.level := calculate_level_from_xp(NEW.xp);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_level ON public.profiles;
CREATE TRIGGER auto_update_level
BEFORE INSERT OR UPDATE OF xp ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_level();

-- 5.6 Increment XP function (used by app)
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET xp = xp + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.7 Increment crew XP function
CREATE OR REPLACE FUNCTION increment_crew_xp(crew_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET total_xp = total_xp + amount
    WHERE id = crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.8 Increment spots added function
CREATE OR REPLACE FUNCTION increment_spots_added(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET spots_added = spots_added + 1
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.9 Add crew member function
CREATE OR REPLACE FUNCTION add_crew_member(p_crew_id UUID, p_user_id UUID, p_username TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET
        members = array_append(members, p_user_id),
        member_names = array_append(member_names, p_username),
        member_count = member_count + 1
    WHERE id = p_crew_id;

    UPDATE public.profiles
    SET
        crew_id = p_crew_id,
        crew_tag = (SELECT tag FROM public.crews WHERE id = p_crew_id)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.10 Remove crew member function
CREATE OR REPLACE FUNCTION remove_crew_member(p_crew_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET
        members = array_remove(members, p_user_id),
        member_count = GREATEST(member_count - 1, 0)
    WHERE id = p_crew_id;

    UPDATE public.profiles
    SET
        crew_id = NULL,
        crew_tag = NULL
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.11 Get nearby spots PostGIS function
CREATE OR REPLACE FUNCTION get_nearby_spots(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    difficulty TEXT,
    tricks TEXT[],
    rating NUMERIC,
    image_url TEXT,
    photo_url TEXT,
    added_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    sponsor_name TEXT,
    sponsor_url TEXT,
    sponsor_logo_url TEXT,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.latitude,
        s.longitude,
        s.difficulty,
        s.tricks,
        s.rating,
        s.image_url,
        s.photo_url,
        s.added_by,
        s.created_at,
        s.sponsor_name,
        s.sponsor_url,
        s.sponsor_logo_url,
        ST_Distance(
            ST_MakePoint(lng, lat)::geography,
            ST_MakePoint(s.longitude, s.latitude)::geography
        ) as distance_meters
    FROM public.skate_spots s
    WHERE ST_DWithin(
        ST_MakePoint(lng, lat)::geography,
        ST_MakePoint(s.longitude, s.latitude)::geography,
        radius_meters
    )
    ORDER BY distance_meters ASC
    LIMIT 500;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.12 Generate QR code function
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        code := 'SK8-' || upper(substring(md5(random()::text) from 1 for 8));
        SELECT EXISTS(SELECT 1 FROM public.qr_codes WHERE qr_codes.code = code) INTO exists_check;
        EXIT WHEN NOT exists_check;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 5.13 Purchase QR code function
CREATE OR REPLACE FUNCTION purchase_qr_code(
    user_id UUID,
    username TEXT,
    amount DECIMAL,
    payment_method TEXT,
    payment_id TEXT,
    quantity INTEGER DEFAULT 1
)
RETURNS SETOF UUID AS $$
DECLARE
    new_code_id UUID;
    i INTEGER;
BEGIN
    INSERT INTO public.donations (donor_id, donor_name, amount, type, payment_method, payment_id, status)
    VALUES (user_id, username, amount, 'qr_purchase', payment_method, payment_id, 'completed');

    FOR i IN 1..quantity LOOP
        INSERT INTO public.qr_codes (code, purchased_by, purchaser_name, purchase_price)
        VALUES (generate_qr_code(), user_id, username, amount / quantity)
        RETURNING id INTO new_code_id;

        RETURN NEXT new_code_id;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.14 Charity stats update triggers
CREATE OR REPLACE FUNCTION update_charity_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE public.charity_stats
        SET
            total_raised = total_raised + NEW.amount,
            total_qr_codes_sold = CASE
                WHEN NEW.type = 'qr_purchase' THEN total_qr_codes_sold + 1
                ELSE total_qr_codes_sold
            END,
            last_updated = NOW()
        WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_stats_on_donation ON public.donations;
CREATE TRIGGER update_stats_on_donation
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION update_charity_stats();

CREATE OR REPLACE FUNCTION update_qr_found_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'found' AND OLD.status != 'found' THEN
        UPDATE public.charity_stats
        SET
            total_qr_codes_found = total_qr_codes_found + 1,
            last_updated = NOW()
        WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_stats_on_qr_found ON public.qr_codes;
CREATE TRIGGER update_stats_on_qr_found
AFTER UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION update_qr_found_stats();

CREATE OR REPLACE FUNCTION update_skateboard_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        UPDATE public.charity_stats
        SET
            total_skateboards_donated = total_skateboards_donated + 1,
            total_kids_helped = total_kids_helped + 1,
            last_updated = NOW()
        WHERE id = 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_stats_on_delivery ON public.skateboard_recipients;
CREATE TRIGGER update_stats_on_delivery
AFTER UPDATE ON public.skateboard_recipients
FOR EACH ROW
EXECUTE FUNCTION update_skateboard_stats();

-- ============================================================
-- SECTION 6: GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION calculate_level_from_xp(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_xp_for_level(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_level_progress(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_xp(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_crew_xp(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_spots_added(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_crew_member(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_crew_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_spots(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_qr_code() TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_qr_code(UUID, TEXT, DECIMAL, TEXT, TEXT, INTEGER) TO authenticated;

-- ============================================================
-- SECTION 7: VIEWS
-- ============================================================

-- 7.1 Crew leaderboard
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

-- 7.2 User stats
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

-- 7.3 QR finder leaderboard
CREATE OR REPLACE VIEW qr_finder_leaderboard AS
SELECT
    p.id,
    p.username,
    COUNT(qr.id) as qr_codes_found,
    SUM(qr.xp_reward) as total_xp_earned,
    ROW_NUMBER() OVER (ORDER BY COUNT(qr.id) DESC) as rank
FROM public.profiles p
LEFT JOIN public.qr_codes qr ON p.id = qr.found_by
WHERE qr.found_by IS NOT NULL
GROUP BY p.id, p.username
ORDER BY qr_codes_found DESC
LIMIT 100;

-- 7.4 Top donors
CREATE OR REPLACE VIEW top_donors AS
SELECT
    p.id,
    p.username,
    COUNT(d.id) as donation_count,
    SUM(d.amount) as total_donated,
    ROW_NUMBER() OVER (ORDER BY SUM(d.amount) DESC) as rank
FROM public.profiles p
JOIN public.donations d ON p.id = d.donor_id
WHERE d.status = 'completed'
GROUP BY p.id, p.username
ORDER BY total_donated DESC
LIMIT 100;

-- 7.5 Charity impact
CREATE OR REPLACE VIEW charity_impact AS
SELECT
    cs.total_raised,
    cs.total_qr_codes_sold,
    cs.total_qr_codes_found,
    cs.total_skateboards_donated,
    cs.total_kids_helped,
    (SELECT COUNT(DISTINCT donor_id) FROM public.donations WHERE status = 'completed') as unique_donors,
    cs.total_qr_codes_sold - cs.total_qr_codes_found as qr_codes_still_hidden
FROM public.charity_stats cs
WHERE cs.id = 1;

GRANT SELECT ON crew_leaderboard TO PUBLIC;
GRANT SELECT ON user_stats TO PUBLIC;
GRANT SELECT ON qr_finder_leaderboard TO PUBLIC;
GRANT SELECT ON top_donors TO PUBLIC;
GRANT SELECT ON charity_impact TO PUBLIC;

-- ============================================================
-- SECTION 8: STORAGE BUCKETS
-- ============================================================
-- Note: Run these separately in Supabase Dashboard > Storage if they fail here

INSERT INTO storage.buckets (id, name, public) VALUES ('spot-photos', 'spot-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('spot-videos', 'spot-videos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('challenge-proofs', 'challenge-proofs', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage policies
DO $$
BEGIN
    -- Spot photos policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view spot photos' AND tablename = 'objects') THEN
        CREATE POLICY "Public can view spot photos"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'spot-photos');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload spot photos' AND tablename = 'objects') THEN
        CREATE POLICY "Authenticated users can upload spot photos"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'spot-photos');
    END IF;

    -- Spot videos policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view spot videos' AND tablename = 'objects') THEN
        CREATE POLICY "Public can view spot videos"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'spot-videos');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload spot videos' AND tablename = 'objects') THEN
        CREATE POLICY "Authenticated users can upload spot videos"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'spot-videos');
    END IF;

    -- Challenge proofs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view challenge proofs' AND tablename = 'objects') THEN
        CREATE POLICY "Users can view challenge proofs"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'challenge-proofs');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload challenge proofs' AND tablename = 'objects') THEN
        CREATE POLICY "Authenticated users can upload challenge proofs"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'challenge-proofs');
    END IF;

    -- Media bucket policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view media' AND tablename = 'objects') THEN
        CREATE POLICY "Public can view media"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'media');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload media' AND tablename = 'objects') THEN
        CREATE POLICY "Authenticated users can upload media"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'media');
    END IF;
END $$;

-- ============================================================
-- COMPLETE!
-- ============================================================
SELECT 'SkateQuest database setup complete!' AS status;
