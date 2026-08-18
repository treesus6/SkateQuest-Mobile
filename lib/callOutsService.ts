import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

const CALL_OUT_SELECT = `
  *,
  challenger:profiles!callouts_challenger_id_fkey(id, username, level, xp),
  challenged_user:profiles!callouts_challenged_id_fkey(id, username, level, xp),
  spot:skate_spots!callouts_park_id_fkey(id, name, latitude, longitude)
`;

function normalize(row: any) {
  if (!row) return row;
  return {
    ...row,
    target_id: row.challenged_id,
    spot_id: row.park_id,
    xp_reward: row.xp_stake,
    proof_video_url: row.challenged_video_url,
  };
}

export const callOutsService = {
  async getSent(userId: string) {
    try {
      const { data, error } = await supabase
        .from('callouts')
        .select(CALL_OUT_SELECT)
        .eq('challenger_id', userId)
        .order('created_at', { ascending: false });
      return { data: (data ?? []).map(normalize), error };
    } catch (error) {
      Logger.error('callOutsService.getSent failed', error);
      throw new ServiceError('Failed to fetch sent callouts', 'CALLOUTS_GET_SENT_FAILED', error);
    }
  },

  async getReceived(userId: string) {
    try {
      const { data, error } = await supabase
        .from('callouts')
        .select(CALL_OUT_SELECT)
        .eq('challenged_id', userId)
        .order('created_at', { ascending: false });
      return { data: (data ?? []).map(normalize), error };
    } catch (error) {
      Logger.error('callOutsService.getReceived failed', error);
      throw new ServiceError('Failed to fetch received callouts', 'CALLOUTS_GET_RECEIVED_FAILED', error);
    }
  },

  async create(callOut: {
    caller_id: string;
    target_id: string;
    trick_name: string;
    spot_id?: string;
    message?: string;
    xp_reward: number;
  }) {
    try {
      const { data, error } = await supabase.rpc('create_callout', {
        p_target_id: callOut.target_id,
        p_trick_name: callOut.trick_name,
        p_park_id: callOut.spot_id || null,
        p_message: callOut.message || null,
        p_xp_stake: callOut.xp_reward,
      });
      return { data, error };
    } catch (error) {
      Logger.error('callOutsService.create failed', error);
      throw new ServiceError('Failed to create callout', 'CALLOUTS_CREATE_FAILED', error);
    }
  },

  async respond(callOutId: string, accept: boolean) {
    try {
      return await supabase.rpc('respond_callout', {
        p_callout_id: callOutId,
        p_accept: accept,
      });
    } catch (error) {
      Logger.error('callOutsService.respond failed', error);
      throw new ServiceError('Failed to respond to callout', 'CALLOUTS_RESPOND_FAILED', error);
    }
  },

  async submitProof(callOutId: string, mediaId: string) {
    try {
      return await supabase.rpc('submit_callout_proof', {
        p_callout_id: callOutId,
        p_media_id: mediaId,
      });
    } catch (error) {
      Logger.error('callOutsService.submitProof failed', error);
      throw new ServiceError('Failed to submit callout proof', 'CALLOUTS_PROOF_FAILED', error);
    }
  },

  async verify(callOutId: string, approve: boolean) {
    try {
      return await supabase.rpc('verify_callout', {
        p_callout_id: callOutId,
        p_approve: approve,
      });
    } catch (error) {
      Logger.error('callOutsService.verify failed', error);
      throw new ServiceError('Failed to verify callout', 'CALLOUTS_VERIFY_FAILED', error);
    }
  },
};
