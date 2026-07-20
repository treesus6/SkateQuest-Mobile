import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const shopsService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('skate_shop_locations')
        .select(
          'id, shop_name, address, latitude, longitude, phone, website, verified'
        )
        .order('shop_name', { ascending: true });

      if (error) throw error;

      return {
        data: (data || []).map(shop => ({
          id: shop.id,
          name: shop.shop_name,
          address: shop.address,
          latitude: shop.latitude,
          longitude: shop.longitude,
          phone: shop.phone,
          website: shop.website,
          verified: shop.verified,
        })),
        error: null,
      };
    } catch (error) {
      Logger.error('shopsService.getAll failed', error);
      throw new ServiceError('Failed to fetch shops', 'SHOPS_GET_ALL_FAILED', error);
    }
  },

  async redeemDeal(userId: string, dealId: string) {
    try {
      return await supabase.rpc('redeem_shop_deal', {
        p_user_id: userId,
        p_deal_id: dealId,
      });
    } catch (error) {
      Logger.error('shopsService.redeemDeal failed', error);
      throw new ServiceError('Failed to redeem deal', 'SHOPS_REDEEM_DEAL_FAILED', error);
    }
  },

  async getNearby(lat: number, lng: number, radiusKm: number = 10) {
    try {
      const { data, error } = await supabase.rpc('get_nearby_shops', {
        lat,
        lng,
        radius_km: radiusKm,
      });

      if (error) throw error;

      return {
        data: (data || []).map((shop: Record<string, unknown>) => ({
          id: shop.id,
          name: shop.shop_name,
          address: shop.address,
          latitude: shop.latitude,
          longitude: shop.longitude,
          phone: shop.phone,
          website: shop.website,
          verified: shop.verified,
        })),
        error: null,
      };
    } catch (error) {
      Logger.error('shopsService.getNearby failed', error);
      throw new ServiceError('Failed to fetch nearby shops', 'SHOPS_GET_NEARBY_FAILED', error);
    }
  },
};
