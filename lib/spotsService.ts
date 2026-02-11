import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const spotsService = {
  async getNearby(lat: number, lng: number, radiusMeters: number = 50000) {
    try {
      return await supabase.rpc('get_nearby_spots', {
        lat,
        lng,
        radius_meters: radiusMeters,
      });
    } catch (error) {
      Logger.error('spotsService.getNearby failed', error);
      throw new ServiceError('Failed to fetch nearby spots', 'SPOTS_GET_NEARBY_FAILED', error);
    }
  },

  async getById(spotId: string) {
    try {
      return await supabase
        .from('skate_spots')
        .select(`
          *,
          spot_photos(*, media(*)),
          spot_conditions(*, reporter:profiles(id, username)),
          challenges(*)
        `)
        .eq('id', spotId)
        .single();
    } catch (error) {
      Logger.error('spotsService.getById failed', error);
      throw new ServiceError('Failed to fetch spot', 'SPOTS_GET_BY_ID_FAILED', error);
    }
  },

  async getAll() {
    try {
      return await supabase
        .from('skate_spots')
        .select('*')
        .order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('spotsService.getAll failed', error);
      throw new ServiceError('Failed to fetch spots', 'SPOTS_GET_ALL_FAILED', error);
    }
  },

  async create(spot: {
    name: string;
    latitude: number;
    longitude: number;
    difficulty?: string;
    obstacles?: string[];
    added_by: string;
  }) {
    try {
      return await supabase.from('skate_spots').insert([spot]).select().single();
    } catch (error) {
      Logger.error('spotsService.create failed', error);
      throw new ServiceError('Failed to create spot', 'SPOTS_CREATE_FAILED', error);
    }
  },

  async uploadPhoto(spotId: string, mediaId: string, userId: string, isPrimary: boolean = false) {
    try {
      return await supabase.from('spot_photos').insert([{
        spot_id: spotId,
        media_id: mediaId,
        uploaded_by: userId,
        is_primary: isPrimary,
      }]);
    } catch (error) {
      Logger.error('spotsService.uploadPhoto failed', error);
      throw new ServiceError('Failed to upload spot photo', 'SPOTS_UPLOAD_PHOTO_FAILED', error);
    }
  },

  async reportCondition(spotId: string, userId: string, condition: string, notes?: string) {
    try {
      return await supabase.from('spot_conditions').insert([{
        spot_id: spotId,
        reported_by: userId,
        condition,
        notes,
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }]);
    } catch (error) {
      Logger.error('spotsService.reportCondition failed', error);
      throw new ServiceError('Failed to report condition', 'SPOTS_REPORT_CONDITION_FAILED', error);
    }
  },
};
