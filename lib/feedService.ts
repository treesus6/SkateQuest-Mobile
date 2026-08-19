import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const feedService = {
  async getRecent(limit: number = 50) {
    try {
      return await supabase
        .from('activity_feed')
        .select('*, user:profiles(id, username, level, xp), media(*)')
        .order('created_at', { ascending: false })
        .limit(limit);
    } catch (error) {
      Logger.error('feedService.getRecent failed', error);
      throw new ServiceError('Failed to fetch feed', 'FEED_GET_RECENT_FAILED', error);
    }
  },

  async create(activity: {
    user_id: string;
    activity_type: string;
    title: string;
    description?: string;
    xp_earned?: number;
    media_id?: string;
  }) {
    try {
      // Client-created activity is social content only. Actual reward events are
      // inserted by verified server RPCs with the real XP that was ledgered.
      return await supabase
        .from('activity_feed')
        .insert([{ ...activity, xp_earned: 0 }])
        .select()
        .single();
    } catch (error) {
      Logger.error('feedService.create failed', error);
      throw new ServiceError('Failed to create activity', 'FEED_CREATE_FAILED', error);
    }
  },

  subscribeToFeed(callback: (payload: any) => void) {
    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, callback)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          Logger.error('Feed realtime subscription failed');
        }
      });

    return {
      unsubscribe: () => {
        void channel.unsubscribe();
      },
    };
  },
};
