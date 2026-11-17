import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

// XP awarded once per landed trick by the server. The server function
// award_landed_trick_xp (migration 20261109100500) only pays out when
// the trick belongs to the caller, is landed/consistent with a
// first_landed_at within the last 15 minutes, and no ledger entry exists
// for it yet, so a re-award attempt is a no-op server-side.
export const LANDED_TRICK_XP = 25;

// Result of a server claim for the one-time +25 XP award on a landed
// trick. `ok` means the server answered the claim; `awarded` means the
// 25 XP was actually paid; `alreadyClaimed` means the server ledger
// already holds this trick, so no XP is owed and nothing should be
// promised. Anything else is a failure the screen must surface.
export type LandedXpClaim =
  | { ok: true; awarded: true; alreadyClaimed: false }
  | { ok: true; awarded: false; alreadyClaimed: true }
  | { ok: false; awarded: false; alreadyClaimed: false; error: Error };

export const userTricksService = {
  // Claim the one-time +25 XP award for a landed trick from the server
  // function award_landed_trick_xp. The server verifies ownership via
  // auth.uid(), that the trick is landed/consistent with first_landed_at
  // inside the last 15 minutes, and dedupes per trick through
  // xp_reward_ledger, so a claim is paid at most once and a retry can
  // never pay twice. Returns the claim result instead of throwing:
  // callers decide what to show. A failed claim is logged through the
  // project logger and never fails the trick save that already succeeded.
  async awardLandedXp(trickId: string): Promise<LandedXpClaim> {
    try {
      const { data, error } = await supabase.rpc('award_landed_trick_xp', {
        p_trick_id: trickId,
      });
      if (error) throw error;
      if (data && typeof data === 'object' && (data as any).awarded === false) {
        if ((data as any).reason === 'already_claimed') {
          return { ok: true, awarded: false, alreadyClaimed: true };
        }
        const claimError = new Error(`XP award not granted: ${(data as any).reason ?? 'unknown reason'}`);
        Logger.error('userTricksService.awardLandedXp not granted', claimError);
        return { ok: false, awarded: false, alreadyClaimed: false, error: claimError };
      }
      return { ok: true, awarded: true, alreadyClaimed: false };
    } catch (error: any) {
      const claimError = error instanceof Error ? error : new Error(String(error));
      Logger.error('userTricksService.awardLandedXp failed', claimError);
      return { ok: false, awarded: false, alreadyClaimed: false, error: claimError };
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
      // The claim result rides along on the return value so the screen can
      // confirm the award, report an already-claimed award, or offer a
      // retry; a failed claim never fails the save that already succeeded.
      if (!result.error && (trick.status === 'landed' || trick.status === 'consistent') && result.data?.id) {
        const xpClaim = await userTricksService.awardLandedXp(result.data.id);
        return { ...result, xpClaim };
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
      // per trick, so re-marking a trick cannot pay twice, and the claim
      // result rides along on the return value so the screen can confirm
      // the award, report an already-claimed award, or offer a retry. A
      // failed claim never fails the save that already succeeded.
      if (!result.error && (status === 'landed' || status === 'consistent') && result.data?.user_id) {
        const xpClaim = await userTricksService.awardLandedXp(trickId);
        return { ...result, xpClaim };
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
