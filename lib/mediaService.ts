import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const mediaService = {
  async upload(media: {
    user_id: string;
    type: 'photo' | 'video';
    url: string;
    thumbnail_url?: string;
    file_size: number;
    duration?: number;
    caption?: string;
    trick_name?: string;
    spot_id?: string;
  }) {
    try {
      return await supabase.from('media').insert([media]).select().single();
    } catch (error) {
      Logger.error('mediaService.upload failed', error);
      throw new ServiceError('Failed to upload media', 'MEDIA_UPLOAD_FAILED', error);
    }
  },

  async getForUser(userId: string) {
    try {
      return await supabase
        .from('media')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('mediaService.getForUser failed', error);
      throw new ServiceError('Failed to fetch user media', 'MEDIA_GET_USER_FAILED', error);
    }
  },

  async like(mediaId: string, userId: string) {
    try {
      return await supabase.from('media_likes').insert([{
        media_id: mediaId,
        user_id: userId,
      }]);
    } catch (error) {
      Logger.error('mediaService.like failed', error);
      throw new ServiceError('Failed to like media', 'MEDIA_LIKE_FAILED', error);
    }
  },

  async unlike(mediaId: string, userId: string) {
    try {
      return await supabase
        .from('media_likes')
        .delete()
        .eq('media_id', mediaId)
        .eq('user_id', userId);
    } catch (error) {
      Logger.error('mediaService.unlike failed', error);
      throw new ServiceError('Failed to unlike media', 'MEDIA_UNLIKE_FAILED', error);
    }
  },
};
