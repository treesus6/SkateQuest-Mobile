import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export interface Crew {
  id: string;
  name: string;
  description: string;
  member_count: number;
  total_xp: number;
  created_by: string;
  created_at: string;
}

export const crewsService = {
  async getAll() {
    try {
      return await supabase
        .from('crews')
        .select('*')
        .order('total_xp', { ascending: false });
    } catch (error) {
      Logger.error('crewsService.getAll failed', error);
      throw new ServiceError(
        'Failed to fetch crews',
        'CREWS_GET_ALL_FAILED',
        error
      );
    }
  },

  async create(crew: { name: string; description: string; created_by: string }) {
    try {
      return await supabase.from('crews').insert([
        {
          name: crew.name,
          description: crew.description,
          created_by: crew.created_by,
          member_count: 1,
          total_xp: 0,
        },
      ]);
    } catch (error) {
      Logger.error('crewsService.create failed', error);
      throw new ServiceError(
        'Failed to create crew',
        'CREWS_CREATE_FAILED',
        error
      );
    }
  },

  async join(crewId: string, userId: string) {
    try {
      return await supabase.from('crew_members').insert([
        {
          crew_id: crewId,
          user_id: userId,
        },
      ]);
    } catch (error) {
      Logger.error('crewsService.join failed', error);
      throw new ServiceError(
        'Failed to join crew',
        'CREWS_JOIN_FAILED',
        error
      );
    }
  },
};
