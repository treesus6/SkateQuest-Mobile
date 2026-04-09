import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const seasonalEventsService = {
  async getActiveSeasonalEvent() {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('seasonal_events')
        .select('*')
        .lte('start_date', now)
        .gt('end_date', now)
        .single();

      if (error && error.code !== 'PGRST116') throw error;  // PGRST116 = no rows
      return data;
    } catch (error) {
      Logger.error('seasonalEventsService.getActiveSeasonalEvent failed', error);
      throw new ServiceError('Failed to fetch active seasonal event', 'SEASONAL_GET_ACTIVE_FAILED', error);
    }
  },

  async getAllSeasonalEvents() {
    try {
      const { data, error } = await supabase
        .from('seasonal_events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('seasonalEventsService.getAllSeasonalEvents failed', error);
      throw new ServiceError('Failed to fetch seasonal events', 'SEASONAL_GET_ALL_FAILED', error);
    }
  },

  async getSeasonalEventBySeason(season: string) {
    try {
      const { data, error } = await supabase
        .from('seasonal_events')
        .select('*')
        .eq('season', season)
        .order('year', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      Logger.error('seasonalEventsService.getSeasonalEventBySeason failed', error);
      throw new ServiceError(`Failed to fetch ${season} event`, 'SEASONAL_GET_SEASON_FAILED', error);
    }
  },

  async getUserProgress(userId: string, seasonalEventId: string) {
    try {
      const { data, error } = await supabase
        .from('seasonal_user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('seasonal_event_id', seasonalEventId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      Logger.error('seasonalEventsService.getUserProgress failed', error);
      throw new ServiceError('Failed to fetch user progress', 'SEASONAL_GET_USER_PROGRESS_FAILED', error);
    }
  },

  async getAllUserProgress(userId: string) {
    try {
      const { data, error } = await supabase
        .from('seasonal_user_progress')
        .select(`
          *,
          seasonal_event:seasonal_events(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('seasonalEventsService.getAllUserProgress failed', error);
      throw new ServiceError('Failed to fetch all user progress', 'SEASONAL_GET_ALL_USER_PROGRESS_FAILED', error);
    }
  },

  async updateUserProgress(userId: string, seasonalEventId: string, progressIncrement: number) {
    try {
      const { data, error } = await supabase.rpc('update_seasonal_progress', {
        p_user_id: userId,
        p_seasonal_event_id: seasonalEventId,
        p_progress_increment: progressIncrement,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('seasonalEventsService.updateUserProgress failed', error);
      throw new ServiceError('Failed to update seasonal progress', 'SEASONAL_UPDATE_PROGRESS_FAILED', error);
    }
  },

  async getLeaderboardForEvent(seasonalEventId: string, limit: number = 25) {
    try {
      const { data, error } = await supabase
        .from('seasonal_user_progress')
        .select(`
          user_id,
          current_tier,
          progress_value,
          profile:profiles(username, level)
        `)
        .eq('seasonal_event_id', seasonalEventId)
        .order('current_tier', { ascending: false })
        .order('progress_value', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('seasonalEventsService.getLeaderboardForEvent failed', error);
      throw new ServiceError('Failed to fetch leaderboard', 'SEASONAL_GET_LEADERBOARD_FAILED', error);
    }
  },

  async subscribeToUserProgress(userId: string, seasonalEventId: string, callback: (data: any) => void) {
    try {
      const subscription = supabase
        .channel(`seasonal_progress:${userId}:${seasonalEventId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'seasonal_user_progress',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            Logger.info('Seasonal progress updated', { userId });
            callback(payload.new);
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      Logger.error('seasonalEventsService.subscribeToUserProgress failed', error);
      throw new ServiceError('Failed to subscribe to progress', 'SEASONAL_SUBSCRIBE_PROGRESS_FAILED', error);
    }
  },

  // Helper: Get current season
  getCurrentSeasonName(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  },

  // Helper: Get progress percentage
  getProgressPercentage(currentTier: number, maxTier: number = 5): number {
    return (currentTier / maxTier) * 100;
  },

  // Helper: Get tier name
  getTierName(tier: number): string {
    const tierNames = ['Not Started', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
    return tierNames[Math.min(tier, 5)] || 'Unknown';
  },
};
