import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const achievementsService = {
  async getAchievements() {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('tier', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('achievementsService.getAchievements failed', error);
      throw new ServiceError('Failed to fetch achievements', 'ACHIEVEMENTS_GET_ALL_FAILED', error);
    }
  },

  async getUserAchievements(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(
          `
          *,
          achievement:achievements(*)
        `
        )
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('achievementsService.getUserAchievements failed', error);
      throw new ServiceError('Failed to fetch user achievements', 'ACHIEVEMENTS_GET_USER_FAILED', error);
    }
  },

  async getUnlockedAchievementsCount(userId: string) {
    try {
      const { count, error } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('unlocked_at', 'is', null);

      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      Logger.error('achievementsService.getUnlockedAchievementsCount failed', error);
      throw new ServiceError('Failed to count unlocked achievements', 'ACHIEVEMENTS_COUNT_FAILED', error);
    }
  },

  async unlockAchievement(userId: string, achievementId: string) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .upsert([
          {
            user_id: userId,
            achievement_id: achievementId,
            unlocked_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      Logger.error('achievementsService.unlockAchievement failed', error);
      throw new ServiceError('Failed to unlock achievement', 'ACHIEVEMENTS_UNLOCK_FAILED', error);
    }
  },

  async checkAndUnlockAchievements(userId: string) {
    try {
      const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('achievementsService.checkAndUnlockAchievements failed', error);
      throw new ServiceError('Failed to check and unlock achievements', 'ACHIEVEMENTS_CHECK_FAILED', error);
    }
  },

  async getAchievementsByTier(tier: number) {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('tier', tier)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('achievementsService.getAchievementsByTier failed', error);
      throw new ServiceError('Failed to fetch tier achievements', 'ACHIEVEMENTS_GET_TIER_FAILED', error);
    }
  },

  async subscribeToUserAchievements(userId: string, callback: (data: any) => void) {
    try {
      const subscription = supabase
        .channel(`user_achievements:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_achievements',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            Logger.info('Achievement unlocked', { userId });
            callback(payload.new);
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      Logger.error('achievementsService.subscribeToUserAchievements failed', error);
      throw new ServiceError('Failed to subscribe to achievements', 'ACHIEVEMENTS_SUBSCRIBE_FAILED', error);
    }
  },
};
