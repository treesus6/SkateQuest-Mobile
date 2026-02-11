import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const userTricksService = {
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
      return await supabase.from('user_tricks').insert([{
        ...trick,
        attempts: 0,
      }]).select().single();
    } catch (error) {
      Logger.error('userTricksService.create failed', error);
      throw new ServiceError('Failed to create trick', 'USER_TRICKS_CREATE_FAILED', error);
    }
  },

  async updateStatus(trickId: string, status: 'trying' | 'landed' | 'consistent') {
    try {
      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
      if (status === 'landed') {
        updates.first_landed_at = new Date().toISOString();
      }
      return await supabase
        .from('user_tricks')
        .update(updates)
        .eq('id', trickId)
        .select()
        .single();
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
