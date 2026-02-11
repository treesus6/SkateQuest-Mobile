import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const challengesService = {
  async getActive() {
    try {
      return await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
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

  async complete(challengeId: string, userId: string) {
    try {
      return await supabase
        .from('challenges')
        .update({
          status: 'completed',
          completed_by: userId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', challengeId)
        .select()
        .single();
    } catch (error) {
      Logger.error('challengesService.complete failed', error);
      throw new ServiceError('Failed to complete challenge', 'CHALLENGES_COMPLETE_FAILED', error);
    }
  },

  async vote(submissionId: string, voterId: string, voteType: string) {
    try {
      return await supabase.from('submission_votes').insert({
        submission_id: submissionId,
        voter_id: voterId,
        vote_type: voteType,
      });
    } catch (error) {
      Logger.error('challengesService.vote failed', error);
      throw new ServiceError('Failed to submit vote', 'CHALLENGES_VOTE_FAILED', error);
    }
  },

  async updateSubmission(submissionId: string, updates: Record<string, any>) {
    try {
      return await supabase
        .from('challenge_submissions')
        .update(updates)
        .eq('id', submissionId);
    } catch (error) {
      Logger.error('challengesService.updateSubmission failed', error);
      throw new ServiceError('Failed to update submission', 'CHALLENGES_UPDATE_SUBMISSION_FAILED', error);
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
