import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const qrCodeService = {
  async getByCode(code: string) {
    try {
      return await supabase
        .from('qr_codes')
        .select('*')
        .eq('code', code)
        .single();
    } catch (error) {
      Logger.error('qrCodeService.getByCode failed', error);
      throw new ServiceError('Failed to fetch QR code', 'QR_GET_BY_CODE_FAILED', error);
    }
  },

  async markFound(qrId: string, userId: string, userName: string) {
    try {
      return await supabase
        .from('qr_codes')
        .update({
          status: 'found',
          found_by: userId,
          found_by_name: userName,
          found_at: new Date().toISOString(),
        })
        .eq('id', qrId)
        .select()
        .single();
    } catch (error) {
      Logger.error('qrCodeService.markFound failed', error);
      throw new ServiceError('Failed to mark QR found', 'QR_MARK_FOUND_FAILED', error);
    }
  },

  async getCharityStats() {
    try {
      return await supabase
        .from('charity_stats')
        .select('*')
        .single();
    } catch (error) {
      Logger.error('qrCodeService.getCharityStats failed', error);
      throw new ServiceError('Failed to fetch charity stats', 'QR_CHARITY_STATS_FAILED', error);
    }
  },
};
