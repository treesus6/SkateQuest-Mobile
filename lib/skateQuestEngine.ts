import * as Location from 'expo-location';
import { supabase } from './supabase';
import type {
  SkateSpotType,
  SpotTypeConfig,
  Obstacle,
  BustRiskLevel,
  BustRiskConfig,
  SpotStatusType,
  SpotStatusConfig,
  QRScanData,
  CrewStats,
  SpotKing,
  DailyChallenge,
  ProximityResult,
  QRVerificationResult,
  VoteResult,
} from '../types';

// ============================================================================
// SKATEQUEST MASTER ENGINE v1.0
// Handles: Territory, Challenges, QR Verification, Spots, and Social Hubs
// ============================================================================

// 1. SPOT TYPE DEFINITIONS
export const SPOT_TYPES: Record<SkateSpotType, SpotTypeConfig> = {
  PARK: {
    label: 'Skatepark',
    icon: '🏟️',
    color: '#4CAF50',
    type: 'official',
  },
  STREET: {
    label: 'Street Spot',
    icon: '🛣️',
    color: '#FF9800',
    type: 'raw',
  },
  DIY: {
    label: 'DIY Spot',
    icon: '🔨',
    color: '#9C27B0',
    type: 'community',
  },
  QUEST: {
    label: 'Hidden Quest',
    icon: '🎁',
    color: '#E91E63',
    type: 'geocache',
  },
  SHOP: {
    label: 'Skate Shop',
    icon: '🛹',
    color: '#2196F3',
    type: 'business',
  },
};

// 2. OBSTACLES
export const OBSTACLES: readonly Obstacle[] = [
  'Stairs',
  'Handrail',
  'Flatbar',
  'Ledge',
  'Hubba',
  'Manual Pad',
  'Quarterpipe',
  'Bowl',
  'Gap',
  'Wallride',
  'Bank',
  'Pyramid',
  'Fun Box',
  'Jersey Barrier',
] as const;

// 3. BUST RISK LEVELS
export const BUST_RISK: Record<BustRiskLevel, BustRiskConfig> = {
  LOW: { label: 'Chill / No Security', level: 1, emoji: '🟢' },
  MED: { label: 'Watch Out', level: 2, emoji: '🟡' },
  HIGH: { label: 'Immediate Bust', level: 3, emoji: '🔴' },
};

// 4. SPOT STATUS TYPES
export const SPOT_STATUS: Record<SpotStatusType, SpotStatusConfig> = {
  BONDO_NEEDED: { label: 'Needs Bondo', icon: '🔧', color: '#ff4757' },
  SECURITY_ACTIVE: { label: 'Security Active', icon: '🚨', color: '#ffa502' },
  DRY: { label: 'Dry', icon: '☀️', color: '#ffd93d' },
  WET: { label: 'Wet', icon: '💧', color: '#5f27cd' },
};

// 5. TRICK DICTIONARY FOR CHALLENGES
const TRICK_LIST = [
  { name: 'Ollie', difficulty: 1 },
  { name: 'Kickflip', difficulty: 3 },
  { name: 'Heelflip', difficulty: 3 },
  { name: 'Pop Shuv-it', difficulty: 2 },
  { name: 'FS 180', difficulty: 2 },
  { name: 'BS 180', difficulty: 2 },
  { name: 'FS 50-50', difficulty: 3 },
  { name: 'BS 50-50', difficulty: 3 },
  { name: 'Boardslide', difficulty: 2 },
  { name: 'Noseslide', difficulty: 3 },
  { name: 'Tailslide', difficulty: 3 },
  { name: 'Ollie North', difficulty: 2 },
  { name: 'No Comply', difficulty: 1 },
  { name: 'Manual', difficulty: 1 },
  { name: 'Nose Manual', difficulty: 2 },
];

const MODIFIERS = [
  'over a gap',
  'off a curb',
  'into a manual',
  'to fakie',
  'down a set',
  'up a bank',
  'over something',
];

// ============================================================================
// DAILY CHALLENGE SYSTEM
// ============================================================================

/**
 * Get end of current day timestamp
 */
function getEndOfDay(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Generates a daily challenge that's the same for everyone
 * Uses date as seed for deterministic randomness
 */
export const getDailyChallenge = (): DailyChallenge => {
  const today = new Date();
  const dateString = today.toISOString().slice(0, 10);
  const seed = dateString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const trickIndex = seed % TRICK_LIST.length;
  const modIndex = Math.floor(Math.sin(seed) * MODIFIERS.length);

  const trick = TRICK_LIST[trickIndex];
  const modifier = MODIFIERS[Math.abs(modIndex)];

  return {
    id: `daily-${dateString}`,
    title: `${trick.name} ${modifier}`,
    xp: trick.difficulty * 250,
    difficulty: trick.difficulty,
    expires: getEndOfDay(),
    type: 'DAILY',
  };
};

// ============================================================================
// PROXIMITY VERIFICATION (FOR QR SCANNING)
// ============================================================================

/**
 * Calculates distance between two coordinates in meters
 * Uses Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Verifies user is within required distance of spot
 */
export const verifyProximity = async (
  targetLat: number,
  targetLng: number,
  requiredDistance: number = 25
): Promise<ProximityResult> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return {
        success: false,
        distance: -1,
        message: 'Location permission denied',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      targetLat,
      targetLng
    );

    if (distance <= requiredDistance) {
      return {
        success: true,
        distance,
        message: `You're ${Math.round(distance)}m away. Close enough!`,
      };
    } else {
      return {
        success: false,
        distance,
        message: `Too far! You're ${Math.round(distance)}m away. Get within ${requiredDistance}m.`,
      };
    }
  } catch (error) {
    console.error('Proximity check error:', error);
    return {
      success: false,
      distance: -1,
      message: 'Error checking location',
    };
  }
};

// ============================================================================
// QR CODE VERIFICATION & GEOCACHING
// ============================================================================

/**
 * Verifies QR code scan and proximity for geocaching feature
 */
export const verifySkateCache = async (
  qrData: QRScanData,
  spotId: string,
  spotLat: number,
  spotLng: number
): Promise<QRVerificationResult> => {
  // 1. Verify QR code matches this spot
  if (qrData.spotId !== spotId) {
    return {
      success: false,
      message: 'Wrong QR code! This code is for a different spot.',
    };
  }

  // 2. Check proximity (must be within 15 meters)
  const proximityCheck = await verifyProximity(spotLat, spotLng, 15);

  if (!proximityCheck.success) {
    return {
      success: false,
      message: proximityCheck.message,
    };
  }

  // 3. Success - unlock ghost clip
  return {
    success: true,
    unlocks: 'Ghost Clip',
    message: 'Spot Verified! Record your clip to claim the throne.',
    xp: 100,
  };
};

// ============================================================================
// TERRITORY CONTROL (CREW OWNERSHIP)
// ============================================================================

/**
 * Determines which crew "owns" a spot based on points
 * Returns the crew's color for map marker display
 */
export const updateSpotOwnership = (crewStats: CrewStats[]): string => {
  if (crewStats.length === 0) return '#FFFFFF';

  const sortedCrews = [...crewStats].sort((a, b) => b.points - a.points);
  return sortedCrews[0].color;
};

/**
 * Get the current "King of the Hill" for a spot
 */
export const getSpotKing = async (spotId: string): Promise<SpotKing | null> => {
  const { data, error } = await supabase
    .from('spot_claims')
    .select(
      `
      *,
      user:user_id (
        id,
        username,
        avatar_url
      ),
      trick:trick_name
    `
    )
    .eq('spot_id', spotId)
    .order('points', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user.id,
    username: data.user.username,
    avatarUrl: data.user.avatar_url,
    trick: data.trick,
    points: data.points,
    videoUrl: data.video_url,
    claimedAt: data.created_at,
  };
};

// ============================================================================
// SHOP HUB LOGIC
// ============================================================================

/**
 * Handle check-in at skate shops
 * Unlocks discounts and shows local events
 */
export const checkInAtShop = async (
  shopId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  discountCode?: string;
  events?: string[];
}> => {
  try {
    // Record check-in
    await supabase.from('shop_checkins').insert({
      shop_id: shopId,
      user_id: userId,
      checked_in_at: new Date().toISOString(),
    });

    // Get shop events
    const { data: events } = await supabase
      .from('shop_events')
      .select('*')
      .eq('shop_id', shopId)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    return {
      success: true,
      message: 'Welcome to the shop!',
      discountCode: 'SKATEQUEST5',
      events: events?.map(e => e.description) || [],
    };
  } catch (error) {
    console.error('Shop check-in error:', error);
    return {
      success: false,
      message: 'Check-in failed',
    };
  }
};

// ============================================================================
// SPOT STATUS UPDATES
// ============================================================================

/**
 * Report spot status (Bondo needed, security, weather, etc.)
 */
export const updateSpotStatus = async (
  spotId: string,
  userId: string,
  status: SpotStatusType
): Promise<{ success: boolean; message: string }> => {
  try {
    await supabase.from('spot_status_updates').insert({
      spot_id: spotId,
      user_id: userId,
      status,
      reported_at: new Date().toISOString(),
    });

    // If it's a Bondo alert, notify nearby users
    if (status === 'BONDO_NEEDED') {
      // TODO: Implement push notifications to users within 5 miles
      console.log('Bondo alert sent to nearby skaters');
    }

    return {
      success: true,
      message: 'Status updated! Community notified.',
    };
  } catch (error) {
    console.error('Status update error:', error);
    return {
      success: false,
      message: 'Failed to update status',
    };
  }
};

// ============================================================================
// CHALLENGE SUBMISSION & VOTING
// ============================================================================

/**
 * Submit a video for a challenge
 * Goes into "Judge's Booth" for community voting
 */
export const submitChallenge = async (
  challengeId: string,
  userId: string,
  videoUrl: string,
  spotId?: string
): Promise<{ success: boolean; message: string; submissionId?: string }> => {
  try {
    const { data, error } = await supabase
      .from('challenge_submissions')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        video_url: videoUrl,
        spot_id: spotId,
        stomped_votes: 0,
        bail_votes: 0,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Video submitted! The community is voting...',
      submissionId: data.id,
    };
  } catch (error) {
    console.error('Challenge submission error:', error);
    return {
      success: false,
      message: 'Failed to submit challenge',
    };
  }
};

/**
 * Vote on a challenge submission
 */
export const voteOnSubmission = async (
  submissionId: string,
  userId: string,
  vote: 'STOMPED' | 'BAIL'
): Promise<VoteResult> => {
  try {
    // Record the vote
    await supabase.from('submission_votes').insert({
      submission_id: submissionId,
      user_id: userId,
      vote,
      voted_at: new Date().toISOString(),
    });

    // Update vote counts
    const column = vote === 'STOMPED' ? 'stomped_votes' : 'bail_votes';
    const { data: submission } = await supabase
      .from('challenge_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (!submission) throw new Error('Submission not found');

    const newCount = (submission[column] || 0) + 1;

    await supabase
      .from('challenge_submissions')
      .update({ [column]: newCount })
      .eq('id', submissionId);

    // Check if video should be approved (10+ stomped votes)
    if (vote === 'STOMPED' && newCount >= 10) {
      await supabase
        .from('challenge_submissions')
        .update({ status: 'APPROVED' })
        .eq('id', submissionId);

      // TODO: Award XP to submitter

      return {
        success: true,
        message: 'STOMPED!',
        approved: true,
      };
    }

    // Check if video should be rejected (3+ bail votes)
    if (vote === 'BAIL' && newCount >= 3) {
      await supabase
        .from('challenge_submissions')
        .update({ status: 'REJECTED' })
        .eq('id', submissionId);

      return {
        success: true,
        message: 'BAIL! Better luck next time.',
        approved: false,
      };
    }

    return {
      success: true,
      message: vote === 'STOMPED' ? 'STOMPED!' : 'BAIL!',
    };
  } catch (error) {
    console.error('Voting error:', error);
    return {
      success: false,
      message: 'Vote failed',
    };
  }
};

// ============================================================================
// STREAK TRACKING
// ============================================================================

/**
 * Check and update user's daily challenge streak
 */
export const updateStreak = async (userId: string): Promise<number> => {
  const { data: user } = await supabase
    .from('profiles')
    .select('last_challenge_date, current_streak')
    .eq('id', userId)
    .single();

  if (!user) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let newStreak = 1;

  if (user.last_challenge_date === yesterday) {
    // Continue streak
    newStreak = (user.current_streak || 0) + 1;
  } else if (user.last_challenge_date !== today) {
    // Streak broken, start over
    newStreak = 1;
  } else {
    // Already completed today
    newStreak = user.current_streak || 1;
  }

  await supabase
    .from('profiles')
    .update({
      last_challenge_date: today,
      current_streak: newStreak,
    })
    .eq('id', userId);

  return newStreak;
};

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export const getSpotTypeConfig = (type: SkateSpotType): SpotTypeConfig => {
  return SPOT_TYPES[type] || SPOT_TYPES.PARK;
};

export const getBustRiskConfig = (level: BustRiskLevel): BustRiskConfig => {
  return BUST_RISK[level] || BUST_RISK.LOW;
};

export const getSpotStatusConfig = (status: SpotStatusType): SpotStatusConfig => {
  return SPOT_STATUS[status] || SPOT_STATUS.DRY;
};

export default {
  SPOT_TYPES,
  OBSTACLES,
  BUST_RISK,
  SPOT_STATUS,
  getDailyChallenge,
  verifyProximity,
  verifySkateCache,
  updateSpotOwnership,
  getSpotKing,
  checkInAtShop,
  updateSpotStatus,
  submitChallenge,
  voteOnSubmission,
  updateStreak,
  getSpotTypeConfig,
  getBustRiskConfig,
  getSpotStatusConfig,
};
