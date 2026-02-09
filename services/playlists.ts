import { supabase } from '../lib/supabase';
import { Playlist } from '../types';

export async function getPublicPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select(`*, user:users(id, username, level)`)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Playlist[]) || [];
}

export async function createPlaylist(params: {
  userId: string;
  name: string;
  description?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeUrl?: string;
}) {
  const { error } = await supabase.from('playlists').insert([{
    user_id: params.userId,
    name: params.name,
    description: params.description || null,
    spotify_url: params.spotifyUrl || null,
    apple_music_url: params.appleMusicUrl || null,
    youtube_url: params.youtubeUrl || null,
    is_public: true,
  }]);

  if (error) throw error;
}

export async function togglePlaylistLike(playlistId: string, userId: string) {
  const { error } = await supabase.from('playlist_likes').insert([{
    playlist_id: playlistId,
    user_id: userId,
  }]);

  if (error) {
    if (error.code === '23505') {
      // Already liked — unlike
      await supabase
        .from('playlist_likes')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('user_id', userId);
    } else {
      throw error;
    }
  }
}
