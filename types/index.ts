export interface SkateSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  tricks?: string[];
  rating?: number;
  image_url?: string;
  added_by?: string;
  created_at?: string;
}

export interface Challenge {
  id: string;
  spot_id?: string;
  trick: string;
  challenger_id: string;
  status: 'pending' | 'completed';
  title?: string;
  description?: string;
  xp_reward: number;
  created_at: string;
  completed_by?: string;
  completed_at?: string;
}

export interface CallOut {
  id: string;
  challenger_id: string;
  challenged_id: string;
  spot_id?: string;
  trick_name: string;
  message?: string;
  xp_reward: number;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  created_at: string;
  completed_at?: string;
  proof_media_id?: string;
  challenger?: UserProfile;
  challenged?: UserProfile;
  spot?: SkateSpot;
}

export interface UserProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  spots_added: number;
  challenges_completed: string[];
  streak?: number;
  badges?: { [key: string]: boolean };
  created_at: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  hours?: string;
  verified: boolean;
}

export interface Media {
  id: string;
  user_id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail_url?: string;
  file_size: number;
  duration?: number;
  caption?: string;
  trick_name?: string;
  spot_id?: string;
  likes_count: number;
  created_at: string;
}

export interface SpotPhoto {
  id: string;
  spot_id: string;
  media_id: string;
  uploaded_by?: string;
  is_primary: boolean;
  created_at: string;
  media?: Media;
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type: 'spot_added' | 'challenge_completed' | 'trick_landed' | 'level_up' | 'media_uploaded' | 'skate_game_won';
  title: string;
  description?: string;
  xp_earned: number;
  media_id?: string;
  spot_id?: string;
  challenge_id?: string;
  created_at: string;
  media?: Media;
  user?: UserProfile;
}

export interface UserTrick {
  id: string;
  user_id: string;
  trick_name: string;
  status: 'trying' | 'landed' | 'consistent';
  attempts: number;
  first_landed_at?: string;
  notes?: string;
  video_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SkateGame {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: 'pending' | 'active' | 'completed';
  current_turn?: string;
  challenger_letters: string;
  opponent_letters: string;
  winner_id?: string;
  created_at: string;
  completed_at?: string;
  challenger?: UserProfile;
  opponent?: UserProfile;
}

export interface SkateGameTurn {
  id: string;
  game_id: string;
  player_id: string;
  media_id?: string;
  trick_name: string;
  matched?: boolean;
  turn_number: number;
  created_at: string;
  media?: Media;
  player?: UserProfile;
}

export interface SpotCondition {
  id: string;
  spot_id: string;
  reported_by?: string;
  condition: 'dry' | 'wet' | 'crowded' | 'empty' | 'cops' | 'clear' | 'under_construction';
  notes?: string;
  expires_at: string;
  created_at: string;
  reporter?: UserProfile;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  spotify_url?: string;
  apple_music_url?: string;
  youtube_url?: string;
  tracks: any[];
  likes_count: number;
  is_public: boolean;
  created_at: string;
  user?: UserProfile;
}

export interface MediaLike {
  id: string;
  media_id: string;
  user_id: string;
  created_at: string;
}

export interface PlaylistLike {
  id: string;
  playlist_id: string;
  user_id: string;
  created_at: string;
}

export interface QRCode {
  id: string;
  code: string;
  purchased_by: string;
  purchaser_name: string;
  purchase_price: number;
  status: 'active' | 'found' | 'expired' | 'hidden';
  hidden_at?: string;
  hidden_location_lat?: number;
  hidden_location_lng?: number;
  hidden_location_description?: string;
  found_by?: string;
  found_by_name?: string;
  found_at?: string;
  xp_reward: number;
  bonus_reward?: string;
  trick_challenge?: string;
  challenge_message?: string;
  proof_required: boolean;
  created_at: string;
  expires_at: string;
}

export interface CharityStats {
  id: number;
  total_raised: number;
  total_qr_codes_sold: number;
  total_qr_codes_found: number;
  total_skateboards_donated: number;
  total_kids_helped: number;
  last_updated: string;
}
