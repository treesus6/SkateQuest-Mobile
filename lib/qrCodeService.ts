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

  async getScan(spotId: string, qrCode: string) {
    try {
      return await supabase
        .from('qr_scans')
        .select('*, skate_spots(*), ghost_clips(*)')
        .eq('qr_code', qrCode)
        .eq('spot_id', spotId)
        .single();
    } catch (error) {
      Logger.error('qrCodeService.getScan failed', error);
      throw new ServiceError('Failed to fetch QR scan', 'QR_GET_SCAN_FAILED', error);
    }
  },

  async getUserScan(spotId: string, userId: string) {
    try {
      return await supabase
        .from('qr_scans')
        .select('*')
        .eq('spot_id', spotId)
        .eq('user_id', userId)
        .single();
    } catch (error) {
      Logger.error('qrCodeService.getUserScan failed', error);
      throw new ServiceError('Failed to fetch user scan', 'QR_USER_SCAN_FAILED', error);
    }
  },

  async recordScan(scan: { spot_id: string; user_id: string; qr_code: string; latitude: number; longitude: number; distance_from_spot: number }) {
    try {
      return await supabase.from('qr_scans').insert(scan);
    } catch (error) {
      Logger.error('qrCodeService.recordScan failed', error);
      throw new ServiceError('Failed to record QR scan', 'QR_RECORD_SCAN_FAILED', error);
    }
  },

  async getGhostClip(spotId: string) {
    try {
      return await supabase
        .from('ghost_clips')
        .select('*')
        .eq('spot_id', spotId)
        .single();
    } catch (error) {
      Logger.error('qrCodeService.getGhostClip failed', error);
      throw new ServiceError('Failed to fetch ghost clip', 'QR_GHOST_CLIP_FAILED', error);
    }
  },

  async unlockGhostClip(userId: string, ghostClipId: string) {
    try {
      return await supabase.from('user_unlocks').insert({ user_id: userId, ghost_clip_id: ghostClipId });
    } catch (error) {
      Logger.error('qrCodeService.unlockGhostClip failed', error);
      throw new ServiceError('Failed to unlock ghost clip', 'QR_UNLOCK_GHOST_CLIP_FAILED', error);
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
