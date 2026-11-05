import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

const RECRUITER_BONUS_XP = 500;
const NEW_SKATER_BONUS_XP = 250;

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  code: string;
  claimed: boolean;
  created_at: string;
}

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  description?: string;
  activation_bonus_xp: number;
  recruiter_bonus_xp: number;
  active: boolean;
  claimed: boolean;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  total_xp_earned: number;
  active_codes: number;
}

function toReferralCode(row: ReferralRow): ReferralCode {
  return {
    id: row.id,
    user_id: row.referrer_id,
    code: row.code,
    activation_bonus_xp: NEW_SKATER_BONUS_XP,
    recruiter_bonus_xp: RECRUITER_BONUS_XP,
    active: !row.claimed,
    claimed: row.claimed,
    created_at: row.created_at,
  };
}

export const referralService = {
  async createReferralCode(userId: string, code: string): Promise<ReferralCode> {
    try {
      const normalized = code.trim().toUpperCase();
      if (!normalized) throw new Error('Referral code is required');

      const { data, error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: userId,
          referred_id: null,
          code: normalized,
          claimed: false,
        })
        .select('id,referrer_id,referred_id,code,claimed,created_at')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Referral code was not saved');
      return toReferralCode(data as ReferralRow);
    } catch (error) {
      Logger.error('referralService.createReferralCode failed', error);
      throw new ServiceError('Failed to create referral code', 'CREATE_CODE_FAILED', error);
    }
  },

  async getUserReferralCodes(userId: string): Promise<ReferralCode[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('id,referrer_id,referred_id,code,claimed,created_at')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ((data as ReferralRow[] | null) ?? []).map(toReferralCode);
    } catch (error) {
      Logger.error('referralService.getUserReferralCodes failed', error);
      throw new ServiceError('Failed to get referral codes', 'GET_CODES_FAILED', error);
    }
  },

  async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      const { data, error } = await supabase.rpc('get_referral_stats', {
        p_user_id: userId,
      });

      if (error) throw error;

      const stats = (data ?? {}) as { total?: number; claimed?: number };
      const total = Math.max(0, Number(stats.total ?? 0));
      const claimed = Math.max(0, Number(stats.claimed ?? 0));

      return {
        total_referrals: claimed,
        total_xp_earned: claimed * RECRUITER_BONUS_XP,
        active_codes: Math.max(0, total - claimed),
      };
    } catch (error) {
      Logger.error('referralService.getReferralStats failed', error);
      throw new ServiceError('Failed to get referral stats', 'STATS_FAILED', error);
    }
  },

  async applyReferralCodeOnSignup(
    code: string,
    newUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('apply_referral_code', {
        p_code: code.trim().toUpperCase(),
        p_user_id: newUserId,
      });

      if (error) throw error;
      if (!data) throw new Error('Referral code did not return a result');
      return data as { success: boolean; error?: string };
    } catch (error) {
      Logger.error('referralService.applyReferralCodeOnSignup failed', error);
      throw new ServiceError('Failed to apply referral code', 'APPLY_CODE_FAILED', error);
    }
  },

  subscribeToReferralCodes(
    userId: string,
    onUpdate: (payload: unknown) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`user_referrals:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${userId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        void subscription.unsubscribe();
      },
    };
  },
};
