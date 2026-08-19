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
      throw new ServiceError('Failed to fetch crews', 'CREWS_GET_ALL_FAILED', error);
    }
  },

  async create(crew: { name: string; description: string; created_by: string }) {
    try {
      if (!crew.created_by) throw new Error('Authentication required');
      return await supabase.rpc('create_crew', {
        p_name: crew.name,
        p_description: crew.description,
      });
    } catch (error) {
      Logger.error('crewsService.create failed', error);
      throw new ServiceError('Failed to create crew', 'CREWS_CREATE_FAILED', error);
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
        .maybeSingle();
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
        .maybeSingle();
    } catch (error) {
      Logger.error('crewsService.getCrewTerritory failed', error);
      throw new ServiceError('Failed to fetch crew territory', 'CREWS_TERRITORY_CREW_GET_FAILED', error);
    }
  },

  async claimTerritory(input: {
    spotId: string;
    latitude: number;
    longitude: number;
    trickName: string;
    proofUrl?: string | null;
  }) {
    try {
      return await supabase.rpc('claim_crew_territory', {
        p_spot_id: input.spotId,
        p_latitude: input.latitude,
        p_longitude: input.longitude,
        p_trick_name: input.trickName,
        p_proof_url: input.proofUrl ?? null,
      });
    } catch (error) {
      Logger.error('crewsService.claimTerritory failed', error);
      throw new ServiceError('Failed to claim crew territory', 'CREWS_TERRITORY_CLAIM_FAILED', error);
    }
  },

  async getUserCrew(userId: string) {
    try {
      return await supabase
        .from('crew_members')
        .select('crew_id, crews!crew_members_crew_id_fkey(name, color_hex)')
        .eq('user_id', userId)
        .maybeSingle();
    } catch (error) {
      Logger.error('crewsService.getUserCrew failed', error);
      throw new ServiceError('Failed to fetch user crew', 'CREWS_USER_CREW_GET_FAILED', error);
    }
  },

  async join(crewId: string, userId: string) {
    try {
      return await supabase.from('crew_members').insert([{ crew_id: crewId, user_id: userId }]);
    } catch (error) {
      Logger.error('crewsService.join failed', error);
      throw new ServiceError('Failed to join crew', 'CREWS_JOIN_FAILED', error);
    }
  },
};
