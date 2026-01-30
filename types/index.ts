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
  sponsor_name?: string;
  sponsor_url?: string;
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
  status: 'pending' | 'accepted' | 'completed' | 'declined' | 'failed';
  created_at: string;
  completed_at?: string;
  proof_media_id?: string;
  challenger?: UserProfile;
  challenged?: UserProfile;
  challenged_user?: UserProfile;
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
  activity_type:
    | 'spot_added'
    | 'challenge_completed'
    | 'trick_landed'
    | 'level_up'
    | 'media_uploaded'
    | 'skate_game_won';
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

// Global Activity Feed - the "hype" stream
export interface ActivityFeedItem {
  id: string;
  user_id: string;
  username?: string;
  user_level?: number;
  activity_type: 'achievement' | 'spot_claim' | 'shop_redeem' | 'level_up' | 'first_blood';
  message: string;
  metadata: {
    achievement_id?: string;
    achievement_name?: string;
    achievement_icon?: string;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    spot_id?: string;
    spot_name?: string;
    item_name?: string;
    item_type?: string;
    new_level?: number;
    previous_level?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

// ============================================================================
// SKATEQUEST ENGINE TYPES
// ============================================================================

// Spot Types for the master map
export type SkateSpotType = 'PARK' | 'STREET' | 'DIY' | 'QUEST' | 'SHOP';

export interface SpotTypeConfig {
  label: string;
  icon: string;
  color: string;
  type: 'official' | 'raw' | 'community' | 'geocache' | 'business';
}

// Obstacles available at spots
export type Obstacle =
  | 'Stairs'
  | 'Handrail'
  | 'Flatbar'
  | 'Ledge'
  | 'Hubba'
  | 'Manual Pad'
  | 'Quarterpipe'
  | 'Bowl'
  | 'Gap'
  | 'Wallride'
  | 'Bank'
  | 'Pyramid'
  | 'Fun Box'
  | 'Jersey Barrier';

// Bust risk levels for street spots
export type BustRiskLevel = 'LOW' | 'MED' | 'HIGH';

export interface BustRiskConfig {
  label: string;
  level: number;
  emoji: string;
}

// Spot status for real-time conditions
export type SpotStatusType = 'BONDO_NEEDED' | 'SECURITY_ACTIVE' | 'DRY' | 'WET';

export interface SpotStatusConfig {
  label: string;
  icon: string;
  color: string;
}

// QR Code data for geocaching
export interface QRScanData {
  spotId: string;
  code: string;
  timestamp: number;
}

// Crew stats for territory control
export interface CrewStats {
  crewId: string;
  crewName: string;
  points: number;
  color: string;
}

// Spot King (current owner of a spot)
export interface SpotKing {
  userId: string;
  username: string;
  avatarUrl?: string;
  trick: string;
  points: number;
  videoUrl: string;
  claimedAt: string;
}

// Challenge submission for Judge's Booth
export interface ChallengeSubmission {
  id?: string;
  challengeId: string;
  userId: string;
  videoUrl: string;
  spotId?: string;
  stompedVotes: number;
  bailVotes: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  approvedAt?: string;
}

// Daily challenge
export interface DailyChallenge {
  id: string;
  title: string;
  xp: number;
  difficulty: number;
  expires: Date;
  type: 'DAILY';
}

// Enhanced Challenge type for the new system
export interface EnhancedChallenge {
  id: string;
  title: string;
  description?: string;
  xpReward: number;
  difficulty: number;
  challengeType: 'DAILY' | 'SPOT_SPECIFIC' | 'USER_ISSUED' | 'WEEKLY' | 'BOUNTY';
  spotId?: string;
  issuedByUserId?: string;
  bountyMultiplier?: number;
  lastBountyIncrease?: string;
  active: boolean;
  startsAt: string;
  expiresAt?: string;
  createdAt: string;
}

// Spot claim for King of the Hill
export interface SpotClaim {
  id: string;
  spotId: string;
  userId: string;
  crewId?: string;
  trickName: string;
  videoUrl: string;
  points: number;
  verified: boolean;
  claimedAt: string;
}

// Skate shop for shop hub feature
export interface SkateShop {
  id: string;
  spotId: string;
  shopName: string;
  description?: string;
  websiteUrl?: string;
  phone?: string;
  discountCode?: string;
  discountPercentage?: number;
  createdAt: string;
}

// Shop event
export interface ShopEvent {
  id: string;
  shopId: string;
  eventName: string;
  description?: string;
  eventDate: string;
  createdAt: string;
}

// Ghost clip (unlockable video at spots)
export interface GhostClip {
  id: string;
  spotId: string;
  createdByUserId?: string;
  videoUrl: string;
  trickName?: string;
  description?: string;
  requiresQrScan: boolean;
  views: number;
  likes: number;
  createdAt: string;
}

// Crew territory
export interface CrewTerritory {
  id: string;
  spotId: string;
  crewId: string;
  totalPoints: number;
  claimCount: number;
  capturedAt: string;
  lastActivity: string;
}

// Proximity verification result
export interface ProximityResult {
  success: boolean;
  distance: number;
  message: string;
}

// QR verification result
export interface QRVerificationResult {
  success: boolean;
  message: string;
  unlocks?: string;
  xp?: number;
}

// Vote result
export interface VoteResult {
  success: boolean;
  message: string;
  approved?: boolean;
}
