import { create } from 'zustand';
import { Logger } from '../lib/logger';
import {
  SeasonalClaimResult,
  SeasonalEvent,
  SeasonalRewardClaim,
  seasonalEventsService,
} from '../lib/seasonalEventsService';

interface SeasonalEventStoreState {
  activeEvent: SeasonalEvent | null;
  allEvents: SeasonalEvent[];
  claims: SeasonalRewardClaim[];
  loading: boolean;
  error: string | null;
  initialize: (userId: string) => () => void;
  refresh: (userId: string) => Promise<void>;
  claimReward: (userId: string, eventId: string) => Promise<SeasonalClaimResult>;
}

export const useSeasonalEventStore = create<SeasonalEventStoreState>((set, get) => ({
  activeEvent: null,
  allEvents: [],
  claims: [],
  loading: false,
  error: null,

  initialize: (userId: string) => {
    void get().refresh(userId);
    return seasonalEventsService.subscribe(userId, () => {
      void get().refresh(userId);
    });
  },

  refresh: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const [activeEvent, allEvents] = await Promise.all([
        seasonalEventsService.getActiveSeasonalEvent(),
        seasonalEventsService.getAllSeasonalEvents(),
      ]);
      const claims = activeEvent
        ? await seasonalEventsService.getClaimsForEvent(userId, activeEvent.id)
        : [];
      set({ activeEvent, allEvents, claims });
    } catch (error) {
      Logger.error('Seasonal live data refresh failed', error);
      set({
        error: error instanceof Error ? error.message : 'Seasonal data could not be loaded.',
      });
    } finally {
      set({ loading: false });
    }
  },

  claimReward: async (userId: string, eventId: string) => {
    const result = await seasonalEventsService.claimReward(eventId);
    await get().refresh(userId);
    return result;
  },
}));
