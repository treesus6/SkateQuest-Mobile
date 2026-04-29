import { supabase } from './supabase';
import { ServiceError } from './serviceError';

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

export interface SponsorStats {
  total_clicks: number;
  clicks_today: number;
  clicks_this_week: number;
  clicks_this_month: number;
  unique_users: number;
}

export const SPONSOR_CATEGORY_LABELS: Record<string, string> = {
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

export const SPONSOR_CATEGORY_EMOJI: Record<string, string> = {
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

export const sponsorsService = {
  async getNearby(lat: number, lng: number, radiusMeters = 50000) {
    const { data, error } = await supabase.rpc('get_nearby_sponsors', {
      user_lat: lat,
      user_lng: lng,
      radius_meters: radiusMeters,
    });
    if (error) throw new ServiceError(error.message, 'GET_NEARBY_SPONSORS');
    return data as MapSponsor[];
  },

  async getAll() {
    const { data, error } = await supabase
      .from('map_sponsors')
      .select('*')
      .eq('active', true)
      .order('featured', { ascending: false })
      .order('name');
    if (error) throw new ServiceError(error.message, 'GET_ALL_SPONSORS');
    return data as MapSponsor[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('map_sponsors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new ServiceError(error.message, 'GET_SPONSOR');
    return data as MapSponsor;
  },

  async trackClick(sponsorId: string, userId: string | null, action = 'marker_tap') {
    const { error } = await supabase.from('sponsor_clicks').insert({
      sponsor_id: sponsorId,
      user_id: userId,
      action,
    });
    if (error) console.warn('Failed to track sponsor click', error.message);
  },

  async getStats(sponsorId: string): Promise<SponsorStats> {
    const { data, error } = await supabase.rpc('get_sponsor_stats', {
      p_sponsor_id: sponsorId,
    });
    if (error) throw new ServiceError(error.message, 'GET_SPONSOR_STATS');
    return data?.[0] as SponsorStats;
  },
};
