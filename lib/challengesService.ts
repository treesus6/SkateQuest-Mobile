import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const challengesService = {
  async getActive(userId?: string) {
    try {
      const now = new Date().toISOString();
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .eq('status', 'pending')
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      if (userId) {
        query = query.or(`challenger_id.is.null,challenger_id.eq.${userId}`);
      } else {
        query = query.is('challenger_id', null);
      }

      return await query.order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('challengesService.getActive failed', error);
      throw new ServiceError('Failed to fetch active challenges', 'CHALLENGES_GET_ACTIVE_FAILED', error);
    }
  },

  async getForUser(userId: string) {
    try {
      return await supabase
        .from('challenges')
        .select('*')
        .or(`challenger_id.eq.${userId},completed_by.eq.${userId}`)
        .order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('challengesService.getForUser failed', error);
      throw new ServiceError('Failed to fetch challenges', 'CHALLENGES_GET_FAILED', error);
    }
  },

  async vote(submissionId: string, _voterId: string, voteType: string) {
    try {
      return await supabase.rpc('judge_challenge_submission', {
        p_submission_id: submissionId,
        p_vote: voteType,
      });
    } catch (error) {
      Logger.error('challengesService.vote failed', error);
      throw new ServiceError('Failed to submit vote', 'CHALLENGES_VOTE_FAILED', error);
    }
  },

  async getForSpot(spotId: string) {
    try {
      return await supabase
        .from('challenges')
        .select('*')
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('challengesService.getForSpot failed', error);
      throw new ServiceError('Failed to fetch spot challenges', 'CHALLENGES_GET_SPOT_FAILED', error);
    }
  },
};
