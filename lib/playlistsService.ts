import { supabase } from './supabase';
import { Playlist } from '../types';

export const playlistsService = {
  async getPublic() {
    return supabase
      .from('playlists')
      .select(`*, user:users(id, username, level)`)
      .eq('is_public', true)
      .order('created_at', { ascending: false }) as unknown as {
      data: Playlist[] | null;
      error: any;
    };
  },

  async create(playlist: {
    user_id: string;
    name: string;
    description: string | null;
    spotify_url: string | null;
    apple_music_url: string | null;
    youtube_url: string | null;
  }) {
    return supabase.from('playlists').insert([
      {
        ...playlist,
        is_public: true,
      },
    ]);
  },

  async like(playlistId: string, userId: string) {
    return supabase.from('playlist_likes').insert([
      {
        playlist_id: playlistId,
        user_id: userId,
      },
    ]);
  },

  async unlike(playlistId: string, userId: string) {
    return supabase
      .from('playlist_likes')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('user_id', userId);
  },
};
