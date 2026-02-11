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

  async getTerritoryForSpot(spotId: string) {
    try {
      return await supabase
        .from('crew_territories')
        .select('crew_id, total_points, crews!crew_territories_crew_id_fkey(name, color_hex)')
        .eq('spot_id', spotId)
        .order('total_points', { ascending: false })
        .limit(1)
        .single();
    } catch (error) {
      Logger.error('crewsService.getTerritoryForSpot failed', error);
      throw new ServiceError('Failed to fetch territory', 'CREWS_TERRITORY_GET_FAILED', error);
    }
  },

  async getCrewTerritory(spotId: string, crewId: string) {
    try {
      return await supabase
        .from('crew_territories')
        .select('*')
        .eq('spot_id', spotId)
        .eq('crew_id', crewId)
        .single();
    } catch (error) {
      Logger.error('crewsService.getCrewTerritory failed', error);
      throw new ServiceError('Failed to fetch crew territory', 'CREWS_TERRITORY_CREW_GET_FAILED', error);
    }
  },

  async updateTerritory(territoryId: string, updates: { total_points: number; last_activity: string }) {
    try {
      return await supabase
        .from('crew_territories')
        .update(updates)
        .eq('id', territoryId);
    } catch (error) {
      Logger.error('crewsService.updateTerritory failed', error);
      throw new ServiceError('Failed to update territory', 'CREWS_TERRITORY_UPDATE_FAILED', error);
    }
  },

  async createTerritory(territory: { spot_id: string; crew_id: string; total_points: number }) {
    try {
      return await supabase.from('crew_territories').insert(territory);
    } catch (error) {
      Logger.error('crewsService.createTerritory failed', error);
      throw new ServiceError('Failed to create territory', 'CREWS_TERRITORY_CREATE_FAILED', error);
    }
  },

  async getUserCrew(userId: string) {
    try {
      return await supabase
        .from('crew_members')
        .select('crew_id, crews!crew_members_crew_id_fkey(name, color_hex)')
        .eq('user_id', userId)
        .single();
    } catch (error) {
      Logger.error('crewsService.getUserCrew failed', error);
      throw new ServiceError('Failed to fetch user crew', 'CREWS_USER_CREW_GET_FAILED', error);
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
