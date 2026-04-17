import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

interface SpotClaimInfo {
  claim_id: string;
  holder_id: string;
  holder_name: string;
  holder_pro_tier?: string;
  claimed_at: string;
  claim_strength: number;
  days_held: number;
}

interface ClaimHistoryEntry {
  id: string;
  spot_id: string;
  previous_holder_id?: string;
  new_holder_id: string;
  action: 'claimed' | 'challenged' | 'reclaimed' | 'expired';
  challenge_xp_reward: number;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  claimed_spots: number;
  total_claim_strength: number;
  pro_athlete: boolean;
  pro_tier?: string;
}

export const spotClaimsService = {
  // =========================================================================
  // CLAIMING
  // =========================================================================

  async claimSpot(
    spotId: string,
    userId: string
  ): Promise<{ success: boolean; action: string; xp_reward: number; previous_holder?: string }> {
    try {
      const { data, error } = await supabase.rpc('claim_spot', {
        p_spot_id: spotId,
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to claim spot');
      return data;
    } catch (error) {
      Logger.error('spotClaimsService.claimSpot failed', error);
      throw new ServiceError('Failed to claim spot', 'CLAIM_SPOT_FAILED', error);
    }
  },

  async getSpotClaim(spotId: string): Promise<SpotClaimInfo | null> {
    try {
      const { data, error } = await supabase.rpc('get_spot_claim_info', {
        p_spot_id: spotId,
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      Logger.error('spotClaimsService.getSpotClaim failed', error);
      throw new ServiceError('Failed to get spot claim info', 'SPOT_CLAIM_INFO_FAILED', error);
    }
  },

  // =========================================================================
  // USER CLAIMS
  // =========================================================================

  async getUserClaimedSpots(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_claimed_spots', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('spotClaimsService.getUserClaimedSpots failed', error);
      throw new ServiceError('Failed to get user claimed spots', 'USER_CLAIMS_FETCH_FAILED', error);
    }
  },

  async getUserClaimCount(userId: string): Promise<number> {
    try {
      const spots = await this.getUserClaimedSpots(userId);
      return spots.length;
    } catch (error) {
      Logger.error('spotClaimsService.getUserClaimCount failed', error);
      throw new ServiceError('Failed to get claim count', 'CLAIM_COUNT_FAILED', error);
    }
  },

  // =========================================================================
  // LEADERBOARD
  // =========================================================================

  async getClaimsLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_spot_claims_leaderboard', {
        p_limit: limit,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('spotClaimsService.getClaimsLeaderboard failed', error);
      throw new ServiceError(
        'Failed to get claims leaderboard',
        'CLAIMS_LEADERBOARD_FAILED',
        error
      );
    }
  },

  // =========================================================================
  // HISTORY
  // =========================================================================

  async getSpotClaimHistory(spotId: string, limit: number = 20): Promise<ClaimHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('spot_claim_history')
        .select('*')
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('spotClaimsService.getSpotClaimHistory failed', error);
      throw new ServiceError('Failed to get claim history', 'CLAIM_HISTORY_FAILED', error);
    }
  },

  async getUserClaimHistory(userId: string, limit: number = 20): Promise<ClaimHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('spot_claim_history')
        .select('*')
        .eq('new_holder_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('spotClaimsService.getUserClaimHistory failed', error);
      throw new ServiceError(
        'Failed to get user claim history',
        'USER_CLAIM_HISTORY_FAILED',
        error
      );
    }
  },

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  subscribeToSpotClaim(
    spotId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`spot_claim:${spotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spot_claims',
          filter: `spot_id=eq.${spotId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },

  subscribeToUserClaims(
    userId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`user_claims:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spot_claims',
          filter: `user_id=eq.${userId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },

  subscribeToClaimHistory(
    spotId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`claim_history:${spotId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spot_claim_history',
          filter: `spot_id=eq.${spotId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },
};
