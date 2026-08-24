import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export interface SpotRatingInput {
  potential: number;
  difficulty: number;
  quality: number;
}

export interface NearbyDuplicateSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
}

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
    ratings: SpotRatingInput;
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
      for (const rating of Object.values(spot.ratings)) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          throw new Error('Potential, difficulty, and quality ratings must each be from 1 to 5');
        }
      }
      return await supabase
        .rpc('create_spot_with_rating', {
          p_name: name,
          p_latitude: spot.latitude,
          p_longitude: spot.longitude,
          p_difficulty: spot.difficulty ?? null,
          p_obstacles: spot.obstacles ?? [],
          p_tricks: (spot.tricks ?? []).map(value => value.trim()).filter(Boolean).slice(0, 50),
          p_spot_type: spot.spot_type ?? null,
          p_bust_risk: spot.bust_risk ?? null,
          p_potential_rating: spot.ratings.potential,
          p_difficulty_rating: spot.ratings.difficulty,
          p_quality_rating: spot.ratings.quality,
        })
        .single();
    } catch (error) {
      Logger.error('spotsService.create failed', error);
      throw new ServiceError('Failed to create spot', 'SPOTS_CREATE_FAILED', error);
    }
  },

  async findNearbyDuplicate(
    lat: number,
    lng: number,
    radiusMeters: number = 25
  ): Promise<{ data: NearbyDuplicateSpot | null; error: unknown | null }> {
    const { data, error } = await spotsService.getNearby(lat, lng, radiusMeters);
    if (error) return { data: null, error };

    const duplicate = Array.isArray(data) && data.length > 0
      ? (data[0] as NearbyDuplicateSpot)
      : null;
    return { data: duplicate, error: null };
  },

  async rate(spotId: string, ratings: SpotRatingInput) {
    try {
      return await supabase
        .rpc('rate_spot', {
          p_spot_id: spotId,
          p_potential_rating: ratings.potential,
          p_difficulty_rating: ratings.difficulty,
          p_quality_rating: ratings.quality,
        })
        .single();
    } catch (error) {
      Logger.error('spotsService.rate failed', error);
      throw new ServiceError('Failed to rate spot', 'SPOTS_RATE_FAILED', error);
    }
  },

  async getUserRating(spotId: string, userId: string) {
    try {
      return await supabase
        .from('spot_ratings')
        .select('potential, difficulty, quality, updated_at')
        .eq('spot_id', spotId)
        .eq('user_id', userId)
        .maybeSingle();
    } catch (error) {
      Logger.error('spotsService.getUserRating failed', error);
      throw new ServiceError('Failed to fetch your spot rating', 'SPOTS_GET_USER_RATING_FAILED', error);
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
