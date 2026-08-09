import { supabase } from './supabase';
import { ServiceError } from './serviceError';

export type MissionSpot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string | null;
};

export type MissionStop = {
  id: string;
  route_id: string;
  spot_id: string;
  position: number;
  verification_radius_meters: number;
  verified_at: string | null;
  verified_distance_meters: number | null;
  skate_spots: MissionSpot;
};

export type SpotMissionRoute = {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'abandoned';
  xp_reward: number;
  started_at: string;
  completed_at: string | null;
  spot_mission_stops: MissionStop[];
};

export type StopVerification = {
  verified: boolean;
  distance_meters: number;
  route_completed: boolean;
  xp_awarded: number;
};

const routeSelection = `
  id, title, status, xp_reward, started_at, completed_at,
  spot_mission_stops(
    id, route_id, spot_id, position, verification_radius_meters,
    verified_at, verified_distance_meters,
    skate_spots(id, name, latitude, longitude, city)
  )
`;

export const spotMissionService = {
  async getActiveRoute(userId: string): Promise<SpotMissionRoute | null> {
    const { data, error } = await supabase
      .from('spot_mission_routes')
      .select(routeSelection)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw new ServiceError(error.message, 'MISSION_ROUTE_LOAD_FAILED', error);
    if (!data) return null;
    const route = data as unknown as SpotMissionRoute;
    route.spot_mission_stops.sort((a, b) => a.position - b.position);
    return route;
  },

  async createRoute(spotIds: string[], title: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_spot_mission_route', {
      p_spot_ids: spotIds,
      p_title: title,
    });
    if (error) throw new ServiceError(error.message, 'MISSION_ROUTE_CREATE_FAILED', error);
    return data as string;
  },

  async verifyStop(stopId: string, latitude: number, longitude: number) {
    const { data, error } = await supabase.rpc('verify_spot_mission_stop', {
      p_stop_id: stopId,
      p_latitude: latitude,
      p_longitude: longitude,
    });
    if (error) throw new ServiceError(error.message, 'MISSION_STOP_VERIFY_FAILED', error);
    return data as StopVerification;
  },

  async abandonRoute(routeId: string) {
    const { error } = await supabase.rpc('abandon_spot_mission_route', {
      p_route_id: routeId,
    });
    if (error) throw new ServiceError(error.message, 'MISSION_ROUTE_ABANDON_FAILED', error);
  },
};
