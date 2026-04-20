import { create } from 'zustand';
import { Logger } from '../lib/logger';
import { seasonalEventsService } from '../lib/seasonalEventsService';

interface SeasonalEvent {
  id: string;
  name: string;
  season: string;
  year: number;
  start_date: string;
  end_date: string;
  description?: string;
  tier_count: number;
  tier_rewards: any;
  created_at: string;
}

interface UserSeasonalProgress {
  id: string;
  user_id: string;
  seasonal_event_id: string;
  progress_value: number;
  current_tier: number;
  max_tier_reached: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  seasonal_event?: SeasonalEvent;
}

interface SeasonalEventStoreState {
  activeEvent: SeasonalEvent | null;
  allEvents: SeasonalEvent[];
  userProgress: UserSeasonalProgress | null;
  allUserProgress: UserSeasonalProgress[];
  loading: boolean;
  initialize: (userId: string) => () => void;
  loadActiveEvent: () => Promise<void>;
  loadAllEvents: () => Promise<void>;
  loadUserProgress: (userId: string, eventId: string) => Promise<void>;
  loadAllUserProgress: (userId: string) => Promise<void>;
  updateProgress: (userId: string, eventId: string, increment: number) => Promise<void>;
  refreshUserProgress: (userId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useSeasonalEventStore = create<SeasonalEventStoreState>((set, get) => ({
  activeEvent: null,
  allEvents: [],
  userProgress: null,
  allUserProgress: [],
  loading: false,

  initialize: (userId: string) => {
    set({ loading: true });

    // Load active event
    get()
      .loadActiveEvent()
      .catch(error => {
        Logger.error('Failed to load active event', error);
      });

    // Load all events
    get()
      .loadAllEvents()
      .catch(error => {
        Logger.error('Failed to load all events', error);
      });

    // Load active event progress
    const activeEvent = get().activeEvent;
    if (activeEvent) {
      get()
        .loadUserProgress(userId, activeEvent.id)
        .catch(error => {
          Logger.error('Failed to load user progress', error);
        });
    }

    // Load all user progress
    get()
      .loadAllUserProgress(userId)
      .catch(error => {
        Logger.error('Failed to load all user progress', error);
      });

    // Subscribe to progress updates
    let channel: { unsubscribe: () => void } | null = null;
    seasonalEventsService
      .subscribeToUserProgress(
        userId,
        activeEvent?.id || '',
        (newProgress: UserSeasonalProgress) => {
          Logger.info('Seasonal progress updated in real-time', { userId });
          set({ userProgress: newProgress });
        }
      )
      .then(sub => {
        channel = sub;
      })
      .catch(error => {
        Logger.error('Failed to subscribe to progress', error);
      });

    set({ loading: false });

    // Return cleanup
    return () => {
      channel?.unsubscribe();
    };
  },

  loadActiveEvent: async () => {
    try {
      const data = await seasonalEventsService.getActiveSeasonalEvent();
      set({ activeEvent: data || null });
      Logger.info('Active seasonal event loaded', { event: data?.name });
    } catch (error) {
      Logger.error('Failed to load active event', error);
      throw error;
    }
  },

  loadAllEvents: async () => {
    try {
      const data = await seasonalEventsService.getAllSeasonalEvents();
      set({ allEvents: data || [] });
      Logger.info('All seasonal events loaded', { count: data?.length || 0 });
    } catch (error) {
      Logger.error('Failed to load all events', error);
      throw error;
    }
  },

  loadUserProgress: async (userId: string, eventId: string) => {
    try {
      const data = await seasonalEventsService.getUserProgress(userId, eventId);
      set({ userProgress: data || null });
      Logger.info('User seasonal progress loaded', { userId, eventId });
    } catch (error) {
      Logger.error('Failed to load user progress', error);
      throw error;
    }
  },

  loadAllUserProgress: async (userId: string) => {
    try {
      const data = await seasonalEventsService.getAllUserProgress(userId);
      set({ allUserProgress: data || [] });
      Logger.info('All user seasonal progress loaded', { userId, count: data?.length || 0 });
    } catch (error) {
      Logger.error('Failed to load all user progress', error);
      throw error;
    }
  },

  updateProgress: async (userId: string, eventId: string, increment: number) => {
    try {
      await seasonalEventsService.updateUserProgress(userId, eventId, increment);
      // Reload progress after update
      await get().loadUserProgress(userId, eventId);
      Logger.info('User progress updated', { userId, increment });
    } catch (error) {
      Logger.error('Failed to update progress', error);
      throw error;
    }
  },

  refreshUserProgress: async (userId: string) => {
    try {
      set({ loading: true });
      const activeEvent = get().activeEvent;
      if (activeEvent) {
        await get().loadUserProgress(userId, activeEvent.id);
      }
      await get().loadAllUserProgress(userId);
      set({ loading: false });
      Logger.info('User progress refreshed', { userId });
    } catch (error) {
      Logger.error('Failed to refresh user progress', error);
      set({ loading: false });
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },
}));
