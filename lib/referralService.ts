import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  description?: string;
  activation_bonus_xp: number;
  recruiter_bonus_xp: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ReferralUse {
  id: string;
  referral_code_id: string;
  recruiter_user_id: string;
  new_user_id: string;
  bonus_xp_awarded: number;
  recruiter_bonus_xp_awarded: number;
  used_at: string;
  created_at: string;
}

interface ReferralStats {
  total_referrals: number;
  total_xp_earned: number;
  active_codes: number;
}

export const referralService = {
  // =========================================================================
  // REFERRAL CODES
  // =========================================================================

  async createReferralCode(
    userId: string,
    code: string,
    description?: string
  ): Promise<ReferralCode> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({
          user_id: userId,
          code: code.toUpperCase(),
          description,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create referral code');
      return data;
    } catch (error) {
      Logger.error('referralService.createReferralCode failed', error);
      throw new ServiceError('Failed to create referral code', 'CREATE_CODE_FAILED', error);
    }
  },

  async getUserReferralCodes(userId: string): Promise<ReferralCode[]> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('referralService.getUserReferralCodes failed', error);
      throw new ServiceError('Failed to get referral codes', 'GET_CODES_FAILED', error);
    }
  },

  async getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;  // 116 = no rows
      return data || null;
    } catch (error) {
      Logger.error('referralService.getReferralCodeByCode failed', error);
      throw new ServiceError('Failed to get referral code', 'GET_CODE_FAILED', error);
    }
  },

  async deactivateReferralCode(codeId: string): Promise<ReferralCode> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .update({ active: false })
        .eq('id', codeId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to deactivate code');
      return data;
    } catch (error) {
      Logger.error('referralService.deactivateReferralCode failed', error);
      throw new ServiceError('Failed to deactivate referral code', 'DEACTIVATE_CODE_FAILED', error);
    }
  },

  // =========================================================================
  // REFERRAL STATS
  // =========================================================================

  async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      const { data, error } = await supabase.rpc('get_referral_stats', {
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        return { total_referrals: 0, total_xp_earned: 0, active_codes: 0 };
      }
      return data[0];
    } catch (error) {
      Logger.error('referralService.getReferralStats failed', error);
      throw new ServiceError('Failed to get referral stats', 'STATS_FAILED', error);
    }
  },

  async getReferralUses(codeId: string): Promise<ReferralUse[]> {
    try {
      const { data, error } = await supabase
        .from('referral_uses')
        .select('*')
        .eq('referral_code_id', codeId)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('referralService.getReferralUses failed', error);
      throw new ServiceError('Failed to get referral uses', 'GET_USES_FAILED', error);
    }
  },

  async applyReferralCodeOnSignup(code: string, newUserId: string): Promise<{ success: boolean; recruiter_name?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('apply_referral_code', {
        p_referral_code: code.toUpperCase(),
        p_new_user_id: newUserId,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to apply referral code');
      return data;
    } catch (error) {
      Logger.error('referralService.applyReferralCodeOnSignup failed', error);
      throw new ServiceError('Failed to apply referral code', 'APPLY_CODE_FAILED', error);
    }
  },

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  subscribeToReferralCodes(
    userId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`user_referral_codes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_codes',
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
};
