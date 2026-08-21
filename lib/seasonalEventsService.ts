import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  rewards: Record<string, unknown> | null;
  created_at: string | null;
}

export interface SeasonalRewardClaim {
  id: string;
  user_id: string;
  event_id: string;
  claim_date: string;
  day_number: number;
  xp_awarded: number;
  created_at: string;
}

export interface SeasonalClaimResult {
  claimed?: boolean;
  day_number?: number;
  xp_awarded?: number;
  error?: string;
}

const DAY_MS = 86_400_000;

function rewardsObject(event: SeasonalEvent | null | undefined) {
  return event?.rewards && typeof event.rewards === 'object' ? event.rewards : {};
}

export const seasonalEventsService = {
  async getActiveSeasonalEvent(): Promise<SeasonalEvent | null> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('seasonal_events')
        .select('id,name,description,start_date,end_date,rewards,created_at')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as SeasonalEvent | null) ?? null;
    } catch (error) {
      Logger.error('seasonalEventsService.getActiveSeasonalEvent failed', error);
      throw new ServiceError(
        'Failed to fetch active seasonal event',
        'SEASONAL_GET_ACTIVE_FAILED',
        error
      );
    }
  },

  async getAllSeasonalEvents(): Promise<SeasonalEvent[]> {
    try {
      const { data, error } = await supabase
        .from('seasonal_events')
        .select('id,name,description,start_date,end_date,rewards,created_at')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SeasonalEvent[];
    } catch (error) {
      Logger.error('seasonalEventsService.getAllSeasonalEvents failed', error);
      throw new ServiceError(
        'Failed to fetch seasonal events',
        'SEASONAL_GET_ALL_FAILED',
        error
      );
    }
  },

  async getClaimsForEvent(
    userId: string,
    eventId: string
  ): Promise<SeasonalRewardClaim[]> {
    try {
      const { data, error } = await supabase
        .from('seasonal_reward_claims')
        .select('id,user_id,event_id,claim_date,day_number,xp_awarded,created_at')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .order('day_number', { ascending: true });

      if (error) throw error;
      return (data ?? []) as SeasonalRewardClaim[];
    } catch (error) {
      Logger.error('seasonalEventsService.getClaimsForEvent failed', error);
      throw new ServiceError(
        'Failed to fetch seasonal reward claims',
        'SEASONAL_GET_CLAIMS_FAILED',
        error
      );
    }
  },

  async claimReward(eventId: string): Promise<SeasonalClaimResult> {
    try {
      const { data, error } = await supabase.rpc('claim_seasonal_reward', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return (data ?? {}) as SeasonalClaimResult;
    } catch (error) {
      Logger.error('seasonalEventsService.claimReward failed', error);
      throw new ServiceError(
        'Failed to claim seasonal reward',
        'SEASONAL_CLAIM_FAILED',
        error
      );
    }
  },

  subscribe(userId: string, onChange: () => void) {
    const channel = supabase
      .channel(`seasonal-live:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seasonal_events' },
        onChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seasonal_reward_claims',
          filter: `user_id=eq.${userId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  getTotalDays(event: SeasonalEvent): number {
    if (!event.start_date || !event.end_date) return 0;
    const start = new Date(event.start_date).getTime();
    const end = new Date(event.end_date).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
    return Math.max(1, Math.ceil((end - start) / DAY_MS));
  },

  getCurrentDay(event: SeasonalEvent, now = Date.now()): number {
    if (!event.start_date) return 0;
    const start = new Date(event.start_date).getTime();
    if (!Number.isFinite(start) || now < start) return 0;
    const total = this.getTotalDays(event);
    const day = Math.floor((now - start) / DAY_MS) + 1;
    return total > 0 ? Math.min(day, total) : day;
  },

  getDaysRemaining(event: SeasonalEvent, now = Date.now()): number {
    if (!event.end_date) return 0;
    const end = new Date(event.end_date).getTime();
    if (!Number.isFinite(end)) return 0;
    return Math.max(0, Math.ceil((end - now) / DAY_MS));
  },

  getXpMultiplier(event: SeasonalEvent): number {
    const raw = rewardsObject(event).xp_multiplier;
    const value = typeof raw === 'number' ? raw : Number(raw ?? 1);
    return Number.isFinite(value) && value > 0 ? value : 1;
  },

  getExpectedXp(event: SeasonalEvent, day: number): number {
    if (day < 1) return 0;
    return Math.max(0, Math.round(day * 25 * this.getXpMultiplier(event)));
  },
};
