import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const shopsService = {
  async getAll() {
    try {
      return await supabase
        .from('shops')
        .select('*')
        .order('name', { ascending: true });
    } catch (error) {
      Logger.error('shopsService.getAll failed', error);
      throw new ServiceError('Failed to fetch shops', 'SHOPS_GET_ALL_FAILED', error);
    }
  },

  async getNearby(lat: number, lng: number, radiusKm: number = 10) {
    try {
      return await supabase.rpc('get_nearby_shops', {
        lat,
        lng,
        radius_km: radiusKm,
      });
    } catch (error) {
      Logger.error('shopsService.getNearby failed', error);
      throw new ServiceError('Failed to fetch nearby shops', 'SHOPS_GET_NEARBY_FAILED', error);
    }
  },
};
