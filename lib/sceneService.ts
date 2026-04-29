import { supabase } from './supabase';
import { ServiceError } from './serviceError';

// Represents any skate-scene entity on the map:
// local shops, clothing brands, board companies, wheel cos, DIY supporters, media crews etc.
export interface MapSponsor {
  id: string;
  name: string;
  category: string;
  tagline?: string;
  description?: string;
  website_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  logo_url?: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  featured: boolean;
  distance_meters?: number;
}

export interface SceneStats {
  total_taps: number;
  taps_today: number;
  taps_this_week: number;
  taps_this_month: number;
  unique_users: number;
}

export const CATEGORY_LABELS: Record<string, string> = {
  skate_shop: 'Skate Shop',
  clothing_brand: 'Clothing Brand',
  board_company: 'Board Company',
  wheel_company: 'Wheel Company',
  truck_company: 'Truck Company',
  hardware_company: 'Hardware',
  diy_supporter: 'DIY Supporter',
  media_crew: 'Media Crew',
  event_organizer: 'Events',
  other: 'Community',
};

export const CATEGORY_EMOJI: Record<string, string> = {
  skate_shop: '🏪',
  clothing_brand: '👕',
  board_company: '🛹',
  wheel_company: '🎡',
  truck_company: '⚙️',
  hardware_company: '🔩',
  diy_supporter: '🏗️',
  media_crew: '🎥',
  event_organizer: '🎪',
  other: '🤙',
};

export const sceneService = {
  // Get all entries near a location
  async getNearby(lat: number, lng: number, radiusMeters = 50000) {
    const { data, error } = await supabase.rpc('get_nearby_sponsors', {
      user_lat: lat,
      user_lng: lng,
      radius_meters: radiusMeters,
    });
    if (error) throw new ServiceError(error.message, 'GET_NEARBY_SCENE');
    return data as MapSponsor[];
  },

  // Get all active entries
  async getAll() {
    const { data, error } = await supabase
      .from('map_sponsors')
      .select('*')
      .eq('active', true)
      .order('featured', { ascending: false })
      .order('name');
    if (error) throw new ServiceError(error.message, 'GET_ALL_SCENE');
    return data as MapSponsor[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('map_sponsors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new ServiceError(error.message, 'GET_SCENE_ENTRY');
    return data as MapSponsor;
  },

  // Track a tap (website, instagram, marker — whatever they tapped)
  async trackTap(entryId: string, userId: string | null, action = 'marker_tap') {
    const { error } = await supabase.from('sponsor_clicks').insert({
      sponsor_id: entryId,
      user_id: userId,
      action,
    });
    if (error) console.warn('Failed to track tap', error.message);
  },

  // Get tap stats for an entry (so Kevin can see his numbers)
  async getStats(entryId: string): Promise<SceneStats> {
    const { data, error } = await supabase.rpc('get_sponsor_stats', {
      p_sponsor_id: entryId,
    });
    if (error) throw new ServiceError(error.message, 'GET_SCENE_STATS');
    const row = data?.[0] ?? {};
    return {
      total_taps: row.total_clicks ?? 0,
      taps_today: row.clicks_today ?? 0,
      taps_this_week: row.clicks_this_week ?? 0,
      taps_this_month: row.clicks_this_month ?? 0,
      unique_users: row.unique_users ?? 0,
    };
  },
};
