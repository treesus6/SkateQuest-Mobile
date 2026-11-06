import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

// XP awarded once per landed trick by the server. The server function
// (migration 20260818150000) only pays out when the trick has a
// first_landed_at within the last 15 minutes and no ledger entry exists
// for it yet, so a re-award attempt is a no-op server-side.
export const LANDED_TRICK_XP = 25;

export const userTricksService = {
  // Best-effort XP claim for a landed trick. Never throws: a failed or
  // already-claimed XP award must never fail the trick save that
  // already succeeded. Failures are logged through the project logger.
  async awardLandedXp(userId: string) {
    try {
      const { error } = await supabase.rpc('increment_xp', {
        p_user_id: userId,
        p_xp_amount: LANDED_TRICK_XP,
      });
      if (error) throw error;
    } catch (error) {
      Logger.error('userTricksService.awardLandedXp failed', error);
    }
  },

  async getAll(userId: string) {
    try {
      return await supabase
        .from('user_tricks')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    } catch (error) {
      Logger.error('userTricksService.getAll failed', error);
      throw new ServiceError('Failed to fetch tricks', 'USER_TRICKS_GET_ALL_FAILED', error);
    }
  },

  async create(trick: {
    user_id: string;
    trick_name: string;
    status: 'trying' | 'landed' | 'consistent';
    notes?: string;
  }) {
    try {
      // A trick logged directly as landed/consistent must carry
      // first_landed_at, the same timestamp updateStatus sets when a
      // trick moves to landed. Server-side XP checks require it.
      const firstLandedAt =
        trick.status === 'landed' || trick.status === 'consistent'
          ? new Date().toISOString()
          : undefined;
      const result = await supabase.from('user_tricks').insert([{
        ...trick,
        attempts: 0,
        ...(firstLandedAt ? { first_landed_at: firstLandedAt } : {}),
      }]).select().single();
      // Claim the one-time server XP award for a trick logged as landed.
      // awardLandedXp never throws, so the save stands even if the
      // claim fails or was already claimed.
      if (!result.error && (trick.status === 'landed' || trick.status === 'consistent')) {
        await userTricksService.awardLandedXp(trick.user_id);
      }
      return result;
    } catch (error) {
      Logger.error('userTricksService.create failed', error);
      throw new ServiceError('Failed to create trick', 'USER_TRICKS_CREATE_FAILED', error);
    }
  },

  async updateStatus(trickId: string, status: 'trying' | 'landed' | 'consistent') {
    try {
      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
      // Consistent is a landed state too: without first_landed_at the
      // server XP check cannot see it, so stamp it here as create does.
      if (status === 'landed' || status === 'consistent') {
        updates.first_landed_at = new Date().toISOString();
      }
      const result = await supabase
        .from('user_tricks')
        .update(updates)
        .eq('id', trickId)
        .select()
        .single();
      // Claim the one-time server XP award. The server ledger dedupes
      // per trick, so re-marking a trick cannot pay twice, and
      // awardLandedXp never throws, so the save stands either way.
      if (!result.error && (status === 'landed' || status === 'consistent') && result.data?.user_id) {
        await userTricksService.awardLandedXp(result.data.user_id);
      }
      return result;
    } catch (error) {
      Logger.error('userTricksService.updateStatus failed', error);
      throw new ServiceError('Failed to update trick', 'USER_TRICKS_UPDATE_FAILED', error);
    }
  },

  async update(trickId: string, updates: Record<string, any>) {
    try {
      return await supabase
        .from('user_tricks')
        .update(updates)
        .eq('id', trickId);
    } catch (error) {
      Logger.error('userTricksService.update failed', error);
      throw new ServiceError('Failed to update trick', 'USER_TRICKS_UPDATE_FAILED', error);
    }
  },

  async delete(trickId: string) {
    try {
      return await supabase
        .from('user_tricks')
        .delete()
        .eq('id', trickId);
    } catch (error) {
      Logger.error('userTricksService.delete failed', error);
      throw new ServiceError('Failed to delete trick', 'USER_TRICKS_DELETE_FAILED', error);
    }
  },

  async incrementAttempts(trickId: string) {
    try {
      return await supabase.rpc('increment_trick_attempts', { trick_id: trickId });
    } catch (error) {
      Logger.error('userTricksService.incrementAttempts failed', error);
      throw new ServiceError('Failed to increment attempts', 'USER_TRICKS_INCREMENT_FAILED', error);
    }
  },
};
