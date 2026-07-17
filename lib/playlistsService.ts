import { supabase } from './supabase';
import { Playlist } from '../types';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const playlistsService = {
  async getPublic() {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`*, user:users(id, username, level)`)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      return { data: data as Playlist[] | null, error };
    } catch (error) {
      Logger.error('playlistsService.getPublic failed', error);
      throw new ServiceError(
        'Failed to fetch public playlists',
        'PLAYLISTS_GET_PUBLIC_FAILED',
        error
      );
    }
  },

  async create(playlist: {
    user_id: string;
    name: string;
    description: string | null;
    spotify_url: string | null;
    apple_music_url: string | null;
    youtube_url: string | null;
  }) {
    try {
      return await supabase.from('playlists').insert([
        {
          ...playlist,
          is_public: true,
        },
      ]);
    } catch (error) {
      Logger.error('playlistsService.create failed', error);
      throw new ServiceError('Failed to create playlist', 'PLAYLISTS_CREATE_FAILED', error);
    }
  },

  async like(playlistId: string, userId: string) {
    try {
      return await supabase.from('playlist_likes').insert([
        {
          playlist_id: playlistId,
          user_id: userId,
        },
      ]);
    } catch (error) {
      Logger.error('playlistsService.like failed', error);
      throw new ServiceError('Failed to like playlist', 'PLAYLISTS_LIKE_FAILED', error);
    }
  },

  async unlike(playlistId: string, userId: string) {
    try {
      return await supabase
        .from('playlist_likes')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('user_id', userId);
    } catch (error) {
      Logger.error('playlistsService.unlike failed', error);
      throw new ServiceError('Failed to unlike playlist', 'PLAYLISTS_UNLIKE_FAILED', error);
    }
  },
};
