import { create } from 'zustand';
import { Logger } from '../lib/logger';
import { achievementsService } from '../lib/achievementsService';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  tier: number;
  condition_type: string;
  condition_value: number;
  xp_reward: number;
  created_at: string;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at?: string;
  created_at: string;
  achievement?: Achievement;
}

interface AchievementStoreState {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  unlockedCount: number;
  loading: boolean;
  showUnlockModal: boolean;
  recentUnlock?: Achievement;
  initialize: (userId: string) => () => void;
  loadAchievements: () => Promise<void>;
  loadUserAchievements: (userId: string) => Promise<void>;
  checkAndUnlock: (userId: string) => Promise<Achievement[]>;
  unlockAchievement: (userId: string, achievementId: string) => Promise<void>;
  hideUnlockModal: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAchievementStore = create<AchievementStoreState>((set, get) => ({
  achievements: [],
  userAchievements: [],
  unlockedCount: 0,
  loading: false,
  showUnlockModal: false,
  recentUnlock: undefined,

  initialize: (userId: string) => {
    set({ loading: true });

    // Load master achievements list
    get()
      .loadAchievements()
      .catch((error) => {
        Logger.error('Failed to load achievements in initialize', error);
      });

    // Load user's achievements
    get()
      .loadUserAchievements(userId)
      .catch((error) => {
        Logger.error('Failed to load user achievements in initialize', error);
      });

    // Subscribe to new unlocks via real-time
    const subscription = achievementsService
      .subscribeToUserAchievements(userId, async (newUnlock: any) => {
        Logger.info('Real-time achievement unlock detected', { userId });
        // Refresh user achievements to get the full achievement details
        await get().loadUserAchievements(userId);

        // Find the achievement and show modal
        const allAchievements = get().achievements;
        const unlockedAchievement = allAchievements.find((a) => a.id === newUnlock.achievement_id);
        if (unlockedAchievement) {
          set({
            showUnlockModal: true,
            recentUnlock: unlockedAchievement,
          });
        }
      })
      .catch((error) => {
        Logger.error('Failed to subscribe to achievements', error);
      });

    set({ loading: false });

    // Return cleanup
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  },

  loadAchievements: async () => {
    try {
      const data = await achievementsService.getAchievements();
      set({ achievements: data || [] });
      Logger.info('Achievements loaded', { count: data?.length || 0 });
    } catch (error) {
      Logger.error('Failed to load achievements', error);
      throw error;
    }
  },

  loadUserAchievements: async (userId: string) => {
    try {
      const data = await achievementsService.getUserAchievements(userId);
      const unlockedCount = data?.filter((ua) => ua.unlocked_at).length || 0;
      set({
        userAchievements: data || [],
        unlockedCount,
      });
      Logger.info('User achievements loaded', { userId, unlockedCount });
    } catch (error) {
      Logger.error('Failed to load user achievements', error);
      throw error;
    }
  },

  checkAndUnlock: async (userId: string) => {
    try {
      const newUnlocks = await achievementsService.checkAndUnlockAchievements(userId);
      Logger.info('Achievement check completed', { newUnlocksCount: newUnlocks?.length || 0 });

      // If new achievements unlocked, refresh and show first one
      if (newUnlocks && newUnlocks.length > 0) {
        await get().loadUserAchievements(userId);

        // Find first new achievement and show modal
        const allAchievements = get().achievements;
        const firstNewAchievement = allAchievements.find((a) => a.id === newUnlocks[0].achievement_id);
        if (firstNewAchievement) {
          set({
            showUnlockModal: true,
            recentUnlock: firstNewAchievement,
          });
        }
      }

      return newUnlocks || [];
    } catch (error) {
      Logger.error('Failed to check and unlock achievements', error);
      throw error;
    }
  },

  unlockAchievement: async (userId: string, achievementId: string) => {
    try {
      const result = await achievementsService.unlockAchievement(userId, achievementId);
      await get().loadUserAchievements(userId);

      // Find achievement and show modal
      const achievement = get().achievements.find((a) => a.id === achievementId);
      if (achievement) {
        set({
          showUnlockModal: true,
          recentUnlock: achievement,
        });
      }

      Logger.info('Achievement unlocked manually', { achievementId });
    } catch (error) {
      Logger.error('Failed to unlock achievement', error);
      throw error;
    }
  },

  hideUnlockModal: () => {
    set({
      showUnlockModal: false,
      recentUnlock: undefined,
    });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },
}));
