import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const callOutsService = {
  async getSent(userId: string) {
    try {
      return await supabase
        .from('call_outs')
        .select(`
          *,
          challenger:profiles!call_outs_challenger_id_fkey(id, username, level, xp),
          challenged_user:profiles!call_outs_challenged_user_id_fkey(id, username, level, xp),
          spot:skate_spots(id, name, latitude, longitude)
        `)
        .eq('challenger_id', userId)
        .order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('callOutsService.getSent failed', error);
      throw new ServiceError('Failed to fetch sent callouts', 'CALLOUTS_GET_SENT_FAILED', error);
    }
  },

  async getReceived(userId: string) {
    try {
      return await supabase
        .from('call_outs')
        .select(`
          *,
          challenger:profiles!call_outs_challenger_id_fkey(id, username, level, xp),
          challenged_user:profiles!call_outs_challenged_user_id_fkey(id, username, level, xp),
          spot:skate_spots(id, name, latitude, longitude)
        `)
        .eq('challenged_user_id', userId)
        .order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('callOutsService.getReceived failed', error);
      throw new ServiceError('Failed to fetch received callouts', 'CALLOUTS_GET_RECEIVED_FAILED', error);
    }
  },

  async create(callOut: {
    challenger_id: string;
    challenged_user_id: string;
    trick_name: string;
    spot_id?: string;
    message?: string;
    xp_reward: number;
  }) {
    try {
      return await supabase.from('call_outs').insert([callOut]).select().single();
    } catch (error) {
      Logger.error('callOutsService.create failed', error);
      throw new ServiceError('Failed to create callout', 'CALLOUTS_CREATE_FAILED', error);
    }
  },

  async updateStatus(callOutId: string, status: string) {
    try {
      return await supabase
        .from('call_outs')
        .update({ status })
        .eq('id', callOutId)
        .select()
        .single();
    } catch (error) {
      Logger.error('callOutsService.updateStatus failed', error);
      throw new ServiceError('Failed to update callout', 'CALLOUTS_UPDATE_FAILED', error);
    }
  },
};
