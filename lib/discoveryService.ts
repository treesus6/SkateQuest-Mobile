import { supabase } from './supabase';
import { Logger } from './logger';
import type { MapSponsor } from './sceneService';

export type DiscoveryFilter =
  'all' | 'partners' | 'live' | 'dry' | 'park' | 'street' | 'diy' | 'saved';
export type SpotPulse = {
  spot_id: string;
  active_skaters: number;
  condition: string | null;
  reported_at: string | null;
};
export type DiscoveryPartner = MapSponsor & {
  spot_id: string | null;
  referral_clicks?: number | null;
};
export type Spotlight = {
  id: string;
  title: string;
  description: string | null;
  spot_id: string;
  starts_at: string;
  ends_at: string;
  skate_spots: { name: string } | null;
};

export function matchesDiscoveryFilter(
  spot: { id: string; spot_type?: string | null },
  filter: DiscoveryFilter,
  pulse: SpotPulse | undefined,
  partners: DiscoveryPartner[],
  savedIds: ReadonlySet<string>
): boolean {
  switch (filter) {
    case 'live':
      return Number(pulse?.active_skaters ?? 0) > 0;
    case 'dry':
      return pulse?.condition === 'dry';
    case 'partners':
      return partners.some(partner => partner.spot_id === spot.id);
    case 'saved':
      return savedIds.has(spot.id);
    case 'all':
      return true;
    default:
      return spot.spot_type === filter;
  }
}

export const discoveryService = {
  async getPulse(spotIds: string[]): Promise<SpotPulse[]> {
    if (!spotIds.length) return [];
    const pages: SpotPulse[] = [];
    // RPC bounds every request; don't silently omit map pins beyond the first page.
    for (let i = 0; i < spotIds.length; i += 200) {
      const { data, error } = await supabase.rpc('get_spot_discovery', {
        p_spot_ids: spotIds.slice(i, i + 200),
      });
      if (error) throw error;
      pages.push(...(data ?? []));
    }
    return pages;
  },
  async getPartners(): Promise<DiscoveryPartner[]> {
    const { data, error } = await supabase
      .from('map_sponsors')
      .select('*')
      .eq('active', true)
      .order('featured', { ascending: false });
    if (error) throw error;
    return Promise.all(
      (data ?? []).map(async partner => {
        const stats = await supabase.rpc('get_partner_referral_stats', {
          p_sponsor_id: partner.id,
        });
        if (stats.error) Logger.warn('Partner stats unavailable', stats.error);
        return {
          ...partner,
          referral_clicks: stats.error ? null : Number(stats.data?.[0]?.total_clicks ?? 0),
          logo_url:
            partner.website_url === 'https://portaldimension.com' &&
            !partner.logo_url?.startsWith('https://')
              ? 'https://raw.githubusercontent.com/treesus6/SkateQuest-Mobile/main/assets/supporters/portal-dimension.png'
              : partner.logo_url,
        };
      })
    );
  },
  async getPartnerStats(id: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_partner_referral_stats', { p_sponsor_id: id });
    if (error) throw error;
    return Number(data?.[0]?.total_clicks ?? 0);
  },
  async recordReferral(id: string, surface: 'home' | 'map' | 'spot' | 'profile') {
    const { data, error } = await supabase.rpc('record_partner_referral', {
      p_sponsor_id: id,
      p_source_surface: surface,
    });
    if (error) throw error;
    if (!data?.referral_id) throw new Error('Referral was not saved.');
    const readBack = await supabase
      .from('partner_referrals')
      .select('id,sponsor_id,source_surface,clicked_at')
      .eq('id', data.referral_id)
      .single();
    if (readBack.error || readBack.data?.sponsor_id !== id)
      throw readBack.error ?? new Error('Could not verify the saved referral.');
    return data as { referral_id: string; xp_awarded: number };
  },
  async getSpotlights(): Promise<Spotlight[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('spotlight_challenges')
      .select('id,title,description,spot_id,starts_at,ends_at,skate_spots(name)')
      .eq('active', true)
      .lte('starts_at', now)
      .gt('ends_at', now)
      .order('ends_at')
      .limit(10);
    if (error) throw error;
    return (data ?? []) as unknown as Spotlight[];
  },
  async startSession(
    spotId: string,
    position: { latitude: number; longitude: number },
    minutes: number,
    stance: string,
    message: string
  ) {
    const { data, error } = await supabase.rpc('start_live_spot_session', {
      p_spot_id: spotId,
      p_latitude: position.latitude,
      p_longitude: position.longitude,
      p_duration_minutes: minutes,
      p_stance: stance,
      p_message: message.trim() || null,
    });
    if (error) throw error;
    if (!data?.checkin_id) throw new Error('Check-in was not saved.');
    const result = await supabase
      .from('live_checkins')
      .select('id,park_id,expires_at')
      .eq('id', data.checkin_id)
      .single();
    if (
      result.error ||
      result.data?.park_id !== spotId ||
      !Number.isFinite(Date.parse(result.data.expires_at)) ||
      Date.parse(result.data.expires_at) <= Date.now()
    )
      throw result.error ?? new Error('Could not verify the live check-in.');
    return data;
  },
  async endSession(id: string) {
    const { error } = await supabase.rpc('end_live_spot_session', { p_checkin_id: id });
    if (error) throw error;
    const result = await supabase
      .from('live_checkins')
      .select('id,expires_at')
      .eq('id', id)
      .single();
    if (
      result.error ||
      !Number.isFinite(Date.parse(result.data?.expires_at ?? '')) ||
      Date.parse(result.data?.expires_at ?? '') > Date.now()
    )
      throw result.error ?? new Error('Checkout could not be verified.');
  },
};

export function reportDiscoveryError(context: string, error: unknown) {
  Logger.error(context, error);
  return error instanceof Error
    ? error.message
    : (error as { message?: string })?.message || 'Could not load the scene. Try again.';
}
