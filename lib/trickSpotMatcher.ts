/**
 * trickSpotMatcher.ts
 * Maps tricks to ideal spot obstacle types and returns nearby spot recommendations.
 * Built by skaters, for skaters — no external API needed.
 */

import { TRICK_DATABASE } from './trickDatabase';
import { spotsService } from './spotsService';
import { Logger } from './logger';

// Maps trick categories / names to the obstacle keywords that appear in
// skate_spots.obstacles (a TEXT[] column) or spot_type values.
const TRICK_TO_OBSTACLES: Record<string, string[]> = {
  // Flatground tricks → open flat areas, parking lots, plazas
  flatground: ['flat', 'plaza', 'parking', 'smooth', 'concrete'],
  flip: ['flat', 'plaza', 'parking', 'smooth'],

  // Grind tricks → ledges, rails, curbs
  grind: ['ledge', 'rail', 'curb', 'bench', 'waxed'],

  // Manual tricks → flat smooth surfaces, manual pads
  manual: ['flat', 'manual pad', 'plaza', 'smooth'],

  // Grab tricks → transitions, banks, ramps
  grab: ['ramp', 'bank', 'transition', 'bowl', 'halfpipe', 'quarter'],

  // Transition tricks → bowls, ramps, halfpipes
  transition: ['bowl', 'ramp', 'halfpipe', 'quarter', 'bank', 'transition'],

  // Street tricks → stairs, gaps, rails, ledges
  street: ['stairs', 'gap', 'ledge', 'rail', 'hubba', 'curb'],
};

// Specific trick overrides — when a trick name maps to very specific obstacles
const TRICK_SPECIFIC_OVERRIDES: Record<string, string[]> = {
  boardslide: ['ledge', 'rail', 'curb', 'bench'],
  noseslide: ['ledge', 'curb', 'bench'],
  tailslide: ['ledge', 'curb', 'bench'],
  'feeble grind': ['rail', 'ledge'],
  'smith grind': ['rail', 'ledge'],
  '50-50 grind': ['ledge', 'rail', 'curb'],
  'nosegrind': ['ledge', 'rail'],
  kickflip: ['flat', 'smooth', 'plaza'],
  heelflip: ['flat', 'smooth', 'plaza'],
  treflip: ['flat', 'smooth', 'plaza'],
  'tre flip': ['flat', 'smooth', 'plaza'],
  ollie: ['flat', 'curb', 'crack', 'gap', 'stairs'],
  'ollie off a curb': ['curb', 'ledge'],
  'drop in': ['bowl', 'ramp', 'halfpipe', 'quarter'],
  'rock to fakie': ['bowl', 'ramp', 'halfpipe', 'quarter'],
  'axle stall': ['bowl', 'ramp', 'halfpipe', 'quarter'],
  manual: ['flat', 'manual pad', 'plaza'],
  'nose manual': ['flat', 'manual pad', 'plaza'],
  'kickflip noseslide': ['ledge', 'curb', 'bench'],
  'hardflip': ['flat', 'smooth', 'plaza'],
};

export interface SpotRecommendation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance?: number;
  difficulty?: string;
  obstacles?: string[];
  matchReason: string;
}

/**
 * Given a trick name, returns the ideal obstacle types for practicing it.
 */
export function getIdealObstaclesForTrick(trickName: string): string[] {
  const key = trickName.toLowerCase().trim();

  // Check specific overrides first
  if (TRICK_SPECIFIC_OVERRIDES[key]) {
    return TRICK_SPECIFIC_OVERRIDES[key];
  }

  // Look up in the trick database for category
  const trickData = TRICK_DATABASE[key];
  if (trickData) {
    return TRICK_TO_OBSTACLES[trickData.category] || TRICK_TO_OBSTACLES.flatground;
  }

  // Fuzzy match — check if trick name contains a known keyword
  for (const [overrideKey, obstacles] of Object.entries(TRICK_SPECIFIC_OVERRIDES)) {
    if (key.includes(overrideKey) || overrideKey.includes(key)) {
      return obstacles;
    }
  }

  // Default to flat/smooth for unknown tricks
  return TRICK_TO_OBSTACLES.flatground;
}

/**
 * Returns a human-readable reason why a spot is recommended for a trick.
 */
export function getMatchReason(trickName: string, spotObstacles: string[]): string {
  const idealObstacles = getIdealObstaclesForTrick(trickName);
  const matched = spotObstacles.filter(o =>
    idealObstacles.some(ideal => o.toLowerCase().includes(ideal.toLowerCase()))
  );

  if (matched.length > 0) {
    return `Has ${matched.slice(0, 2).join(' & ')} — perfect for ${trickName}`;
  }

  const trickData = TRICK_DATABASE[trickName.toLowerCase()];
  if (trickData) {
    const categoryMap: Record<string, string> = {
      flatground: 'flat smooth ground',
      flip: 'flat smooth ground',
      grind: 'ledges or rails',
      manual: 'flat manual-friendly surface',
      grab: 'ramps or transitions',
      transition: 'bowl or ramp',
      street: 'street obstacles',
    };
    return `Good spot for ${categoryMap[trickData.category] || 'skating'}`;
  }

  return 'Nearby spot worth checking out';
}

/**
 * Fetches nearby spots that are ideal for practicing a given trick.
 * Uses the existing spotsService.getNearby() and filters/ranks by obstacle match.
 */
export async function getRecommendedSpotsForTrick(
  trickName: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<SpotRecommendation[]> {
  try {
    const idealObstacles = getIdealObstaclesForTrick(trickName);

    // Fetch nearby spots using the existing PostGIS RPC
    const { data: spots, error } = await spotsService.getNearby(latitude, longitude, radiusKm);
    if (error || !spots) {
      Logger.warn('trickSpotMatcher: could not fetch nearby spots', error);
      return [];
    }

    // Score each spot by how many ideal obstacles it matches
    const scored = spots
      .map((spot: any) => {
        const spotObstacles: string[] = spot.obstacles || [];
        const matchCount = spotObstacles.filter(o =>
          idealObstacles.some(ideal => o.toLowerCase().includes(ideal.toLowerCase()))
        ).length;

        return {
          id: spot.id,
          name: spot.name,
          latitude: spot.latitude,
          longitude: spot.longitude,
          distance: spot.distance_km,
          difficulty: spot.difficulty,
          obstacles: spotObstacles,
          matchScore: matchCount,
          matchReason: getMatchReason(trickName, spotObstacles),
        };
      })
      // Sort: spots with matching obstacles first, then by distance
      .sort((a: { matchScore: number; distance?: number }, b: { matchScore: number; distance?: number }) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return (a.distance || 999) - (b.distance || 999);
      })
      .slice(0, 5) // Return top 5 recommendations
      .map(({ matchScore: _matchScore, ...rest }: { matchScore: number; distance?: number; [key: string]: unknown }) => rest);

    return scored;
  } catch (err) {
    Logger.error('trickSpotMatcher: unexpected error', err);
    return [];
  }
}

/**
 * Returns a difficulty-appropriate tip for a trick based on the user's status.
 */
export function getProgressionTip(
  trickName: string,
  status: 'trying' | 'landed' | 'consistent'
): string {
  const trickData = TRICK_DATABASE[trickName.toLowerCase()];

  if (!trickData) {
    const tips: Record<string, string> = {
      trying: 'Find a smooth flat spot and commit to the motion.',
      landed: 'Keep practicing — consistency comes with repetition.',
      consistent: 'Try this trick into or out of a grind to level up.',
    };
    return tips[status];
  }

  if (status === 'trying') {
    return trickData.tips[0] || 'Break it down step by step and film yourself.';
  }
  if (status === 'landed') {
    const next = trickData.progressionTricks[0];
    return next
      ? `Nice land! Work toward consistency, then try: ${next}`
      : 'Keep going! Consistency is the next milestone.';
  }
  // consistent
  const nextTricks = trickData.progressionTricks.slice(0, 2).join(', ');
  return nextTricks
    ? `You've got this locked! Next challenges: ${nextTricks}`
    : 'You\'re dialed in. Try it switch or in a line!';
}
