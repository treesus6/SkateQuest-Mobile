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
          challenger:profiles!caller_id(id, username, level, xp),
          challenged_user:profiles!target_id(id, username, level, xp),
          spot:skate_spots(id, name, latitude, longitude)
        `)
        .eq('caller_id', userId)
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
          challenger:profiles!caller_id(id, username, level, xp),
          challenged_user:profiles!target_id(id, username, level, xp),
          spot:skate_spots(id, name, latitude, longitude)
        `)
        .eq('target_id', userId)
        .order('created_at', { ascending: false });
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
      const { data, error } = await supabase.from('call_outs').insert([callOut]).select().single();
      if (error) throw error;

      // Create notification for the target user
      await supabase.from('notifications').insert([{
        user_id: callOut.target_id,
        type: 'call_out',
        title: 'New Call Out! 🛹',
        body: `You've been called out to do a ${callOut.trick_name}!`,
        data: { callOutId: data.id }
      }]);

      return { data, error: null };
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
