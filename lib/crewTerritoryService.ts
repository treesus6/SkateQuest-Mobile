import { supabase } from './supabase';
import { ServiceError } from './serviceError';

export type CrewTerritory = {
  id: string;
  spot_id: string;
  crew_id: string;
  total_points: number;
  last_activity: string;
  crews: { id: string; name: string; color_hex: string | null } | null;
};

export type TerritoryClaimResult = {
  claimed: boolean;
  crew_id: string;
  points_awarded: number;
  crew_spot_points: number;
  distance_meters: number;
};

export const crewTerritoryService = {
  async getUserCrew(userId: string) {
    const { data, error } = await supabase
      .from('crew_members')
      .select('crew_id, crews(id, name, color_hex)')
      .eq('user_id', userId)
      .order('joined_at')
      .limit(1)
      .maybeSingle();
    if (error) throw new ServiceError(error.message, 'TERRITORY_CREW_LOAD_FAILED', error);
    return data;
  },

  async getForSpots(spotIds: string[]): Promise<CrewTerritory[]> {
    if (!spotIds.length) return [];
    const { data, error } = await supabase
      .from('crew_territories')
      .select('id, spot_id, crew_id, total_points, last_activity, crews(id, name, color_hex)')
      .in('spot_id', spotIds)
      .order('total_points', { ascending: false });
    if (error) throw new ServiceError(error.message, 'TERRITORY_LOAD_FAILED', error);
    return (data ?? []) as unknown as CrewTerritory[];
  },

  async claim(
    spotId: string,
    latitude: number,
    longitude: number,
    trickName: string,
    proofUrl?: string
  ) {
    const { data, error } = await supabase.rpc('claim_crew_territory', {
      p_spot_id: spotId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_trick_name: trickName,
      p_proof_url: proofUrl ?? null,
    });
    if (error) throw new ServiceError(error.message, 'TERRITORY_CLAIM_FAILED', error);
    return data as TerritoryClaimResult;
  },
};
