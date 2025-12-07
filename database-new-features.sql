-- SkateQuest New Features - Database Schema
-- Run this in Supabase SQL Editor to add new feature tables

-- 1. MEDIA UPLOADS TABLE (videos & photos)
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('photo', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  duration INTEGER, -- for videos (seconds)
  caption TEXT,
  trick_name TEXT,
  spot_id UUID REFERENCES skate_spots(id) ON DELETE SET NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_user ON media(user_id);
CREATE INDEX idx_media_spot ON media(spot_id);
CREATE INDEX idx_media_created ON media(created_at DESC);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media"
  ON media FOR SELECT
  USING (true);

CREATE POLICY "Users can upload media"
  ON media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON media FOR DELETE
  USING (auth.uid() = user_id);

-- 2. SPOT PHOTOS (multiple photos per spot)
CREATE TABLE IF NOT EXISTS spot_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spot_photos_spot ON spot_photos(spot_id);

ALTER TABLE spot_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spot photos"
  ON spot_photos FOR SELECT
  USING (true);

CREATE POLICY "Users can add spot photos"
  ON spot_photos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. SOCIAL ACTIVITY FEED
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT CHECK (activity_type IN ('spot_added', 'challenge_completed', 'trick_landed', 'level_up', 'media_uploaded', 'skate_game_won')),
  title TEXT NOT NULL,
  description TEXT,
  xp_earned INTEGER DEFAULT 0,
  media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  spot_id UUID REFERENCES skate_spots(id) ON DELETE SET NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_created ON activities(created_at DESC);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activities"
  ON activities FOR SELECT
  USING (true);

CREATE POLICY "Users can create activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. TRICK PROGRESS TRACKER
CREATE TABLE IF NOT EXISTS user_tricks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trick_name TEXT NOT NULL,
  status TEXT DEFAULT 'trying' CHECK (status IN ('trying', 'landed', 'consistent')),
  attempts INTEGER DEFAULT 0,
  first_landed_at TIMESTAMPTZ,
  notes TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trick_name)
);

CREATE INDEX idx_user_tricks_user ON user_tricks(user_id);
CREATE INDEX idx_user_tricks_status ON user_tricks(status);

ALTER TABLE user_tricks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tricks"
  ON user_tricks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add tricks"
  ON user_tricks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tricks"
  ON user_tricks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tricks"
  ON user_tricks FOR DELETE
  USING (auth.uid() = user_id);

-- 5. SKATE GAME MODE
CREATE TABLE IF NOT EXISTS skate_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed')),
  current_turn UUID REFERENCES users(id),
  challenger_letters TEXT DEFAULT '',
  opponent_letters TEXT DEFAULT '',
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_skate_games_challenger ON skate_games(challenger_id);
CREATE INDEX idx_skate_games_opponent ON skate_games(opponent_id);
CREATE INDEX idx_skate_games_status ON skate_games(status);

ALTER TABLE skate_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their games"
  ON skate_games FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create games"
  ON skate_games FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Players can update their games"
  ON skate_games FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 6. SKATE GAME TURNS
CREATE TABLE IF NOT EXISTS skate_game_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES skate_games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  trick_name TEXT NOT NULL,
  matched BOOLEAN,
  turn_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_turns_game ON skate_game_turns(game_id);
CREATE INDEX idx_game_turns_player ON skate_game_turns(player_id);

ALTER TABLE skate_game_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game turns"
  ON skate_game_turns FOR SELECT
  USING (true);

CREATE POLICY "Players can add turns"
  ON skate_game_turns FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- 7. SPOT CONDITIONS (live updates)
CREATE TABLE IF NOT EXISTS spot_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID REFERENCES skate_spots(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  condition TEXT CHECK (condition IN ('dry', 'wet', 'crowded', 'empty', 'cops', 'clear', 'under_construction')),
  notes TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spot_conditions_spot ON spot_conditions(spot_id);
CREATE INDEX idx_spot_conditions_expires ON spot_conditions(expires_at);

ALTER TABLE spot_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view conditions"
  ON spot_conditions FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Users can report conditions"
  ON spot_conditions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. SESSION PLAYLISTS
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_url TEXT,
  tracks JSONB DEFAULT '[]',
  likes_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_public ON playlists(is_public);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public playlists"
  ON playlists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create playlists"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE
  USING (auth.uid() = user_id);

-- 9. MEDIA LIKES
CREATE TABLE IF NOT EXISTS media_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID REFERENCES media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, user_id)
);

CREATE INDEX idx_media_likes_media ON media_likes(media_id);
CREATE INDEX idx_media_likes_user ON media_likes(user_id);

ALTER TABLE media_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON media_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like media"
  ON media_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike media"
  ON media_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 10. PLAYLIST LIKES
CREATE TABLE IF NOT EXISTS playlist_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, user_id)
);

CREATE INDEX idx_playlist_likes_playlist ON playlist_likes(playlist_id);

ALTER TABLE playlist_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view playlist likes"
  ON playlist_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like playlists"
  ON playlist_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike playlists"
  ON playlist_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Add video_url to challenges table for proof
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Success message
SELECT 'New features database setup complete! All tables and policies created.' AS status;
