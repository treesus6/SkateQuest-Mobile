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
    tricks?: string[];
    added_by: string;
    spot_type?: string;
    bust_risk?: string;
  }) {
    try {
      const name = spot.name.trim();
      if (!name) throw new Error('Spot name is required');
      if (!Number.isFinite(spot.latitude) || spot.latitude < -90 || spot.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (!Number.isFinite(spot.longitude) || spot.longitude < -180 || spot.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      const payload = {
        name,
        latitude: spot.latitude,
        longitude: spot.longitude,
        difficulty: spot.difficulty,
        obstacles: spot.obstacles ?? [],
        tricks: (spot.tricks ?? []).map(value => value.trim()).filter(Boolean).slice(0, 50),
        added_by: spot.added_by,
        spot_type: spot.spot_type,
        bust_risk: spot.bust_risk,
      };
      return await supabase.from('skate_spots').insert([payload]).select().single();
    } catch (error) {
      Logger.error('spotsService.create failed', error);
      throw new ServiceError('Failed to create spot', 'SPOTS_CREATE_FAILED', error);
    }
  },

  async uploadPhoto(spotId: string, mediaId: string, userId: string, isPrimary: boolean = false) {
    try {
      const { error } = await supabase.from('spot_photos').insert([{
        spot_id: spotId,
        media_id: mediaId,
        uploaded_by: userId,
        is_primary: isPrimary,
      }]);
      if (error) throw new ServiceError('Failed to upload spot photo', 'SPOTS_UPLOAD_PHOTO_FAILED', error);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      Logger.error('spotsService.uploadPhoto failed', error);
      throw new ServiceError('Failed to upload spot photo', 'SPOTS_UPLOAD_PHOTO_FAILED', error);
    }
  },

  async reportCondition(spotId: string, userId: string, condition: string, notes?: string) {
    try {
      const { data, error } = await supabase
        .from('spot_conditions')
        .insert([{
          spot_id: spotId,
          reported_by: userId,
          condition,
          notes,
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        }])
        .select('id, spot_id, reported_by, condition, notes, expires_at, created_at')
        .single();

      if (error) throw new ServiceError('Failed to report condition', 'SPOTS_REPORT_CONDITION_FAILED', error);
      if (!data || data.condition !== condition) {
        throw new ServiceError('Condition report was not persisted', 'SPOTS_REPORT_CONDITION_NOT_PERSISTED');
      }
      return data;
    } catch (error) {
      Logger.error('spotsService.reportCondition failed', error);
      throw new ServiceError('Failed to report condition', 'SPOTS_REPORT_CONDITION_FAILED', error);
    }
  },
};
