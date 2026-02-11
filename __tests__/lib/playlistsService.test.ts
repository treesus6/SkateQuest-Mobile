import { playlistsService } from '../../lib/playlistsService';
import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as jest.Mock;

describe('playlistsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublic', () => {
    it('should query public playlists with user join, ordered by created_at descending', async () => {
      const mockPlaylists = [
        {
          id: 'pl-1',
          user_id: 'user-1',
          name: 'Skate Vibes',
          description: 'Chill skating playlist',
          spotify_url: 'https://spotify.com/playlist/abc',
          apple_music_url: null,
          youtube_url: null,
          tracks: [],
          likes_count: 10,
          is_public: true,
          created_at: '2025-06-01T00:00:00Z',
          user: { id: 'user-1', username: 'SkaterX', level: 5 },
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockPlaylists, error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await playlistsService.getPublic();

      expect(mockFrom).toHaveBeenCalledWith('playlists');
      expect(mockSelect).toHaveBeenCalledWith('*, user:users(id, username, level)');
      expect(mockEq).toHaveBeenCalledWith('is_public', true);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.data).toEqual(mockPlaylists);
      expect(result.error).toBeNull();
    });

    it('should return an error when the query fails', async () => {
      const mockError = { message: 'Permission denied', code: '42501' };
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await playlistsService.getPublic();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should return an empty array when no public playlists exist', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await playlistsService.getPublic();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert a new playlist with is_public set to true', async () => {
      const newPlaylist = {
        user_id: 'user-1',
        name: 'Punk Rock Skate',
        description: 'Punk rock for skating',
        spotify_url: 'https://spotify.com/playlist/xyz',
        apple_music_url: null,
        youtube_url: null,
      };

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'pl-new', ...newPlaylist, is_public: true },
        error: null,
      });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await playlistsService.create(newPlaylist);

      expect(mockFrom).toHaveBeenCalledWith('playlists');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          ...newPlaylist,
          is_public: true,
        },
      ]);
      expect(result.error).toBeNull();
    });

    it('should always set is_public to true regardless of input', async () => {
      const newPlaylist = {
        user_id: 'user-1',
        name: 'My Playlist',
        description: null,
        spotify_url: null,
        apple_music_url: null,
        youtube_url: null,
      };

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await playlistsService.create(newPlaylist);

      const insertedData = mockInsert.mock.calls[0][0][0];
      expect(insertedData.is_public).toBe(true);
    });

    it('should return an error on insertion failure', async () => {
      const newPlaylist = {
        user_id: 'user-1',
        name: 'Bad Playlist',
        description: null,
        spotify_url: null,
        apple_music_url: null,
        youtube_url: null,
      };

      const mockError = { message: 'Row level security policy violation', code: '42501' };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await playlistsService.create(newPlaylist);

      expect(result.error).toEqual(mockError);
    });

    it('should handle playlists with all music platform URLs set', async () => {
      const newPlaylist = {
        user_id: 'user-1',
        name: 'Cross-Platform Playlist',
        description: 'Available everywhere',
        spotify_url: 'https://spotify.com/playlist/123',
        apple_music_url: 'https://music.apple.com/playlist/456',
        youtube_url: 'https://youtube.com/playlist?list=789',
      };

      const mockInsert = jest.fn().mockResolvedValue({ data: { id: 'pl-cross', ...newPlaylist, is_public: true }, error: null });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await playlistsService.create(newPlaylist);

      const insertedData = mockInsert.mock.calls[0][0][0];
      expect(insertedData.spotify_url).toBe(newPlaylist.spotify_url);
      expect(insertedData.apple_music_url).toBe(newPlaylist.apple_music_url);
      expect(insertedData.youtube_url).toBe(newPlaylist.youtube_url);
      expect(result.error).toBeNull();
    });
  });

  describe('like', () => {
    it('should insert a playlist_likes record with correct playlist_id and user_id', async () => {
      const playlistId = 'pl-100';
      const userId = 'user-200';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { playlist_id: playlistId, user_id: userId },
        error: null,
      });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await playlistsService.like(playlistId, userId);

      expect(mockFrom).toHaveBeenCalledWith('playlist_likes');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          playlist_id: playlistId,
          user_id: userId,
        },
      ]);
      expect(result.error).toBeNull();
    });

    it('should return an error when liking the same playlist twice', async () => {
      const mockError = { message: 'duplicate key value violates unique constraint', code: '23505' };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await playlistsService.like('pl-100', 'user-200');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('unlike', () => {
    it('should delete the playlist_likes record matching playlist_id and user_id', async () => {
      const playlistId = 'pl-100';
      const userId = 'user-200';

      const mockEqUser = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEqPlaylist = jest.fn().mockReturnValue({ eq: mockEqUser });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqPlaylist });
      mockFrom.mockReturnValue({ delete: mockDelete });

      const result = await playlistsService.unlike(playlistId, userId);

      expect(mockFrom).toHaveBeenCalledWith('playlist_likes');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEqPlaylist).toHaveBeenCalledWith('playlist_id', playlistId);
      expect(mockEqUser).toHaveBeenCalledWith('user_id', userId);
      expect(result.error).toBeNull();
    });

    it('should not error when trying to unlike a playlist that was not liked', async () => {
      const mockEqUser = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEqPlaylist = jest.fn().mockReturnValue({ eq: mockEqUser });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqPlaylist });
      mockFrom.mockReturnValue({ delete: mockDelete });

      const result = await playlistsService.unlike('pl-999', 'user-999');

      expect(result.error).toBeNull();
    });

    it('should return an error when the delete operation fails', async () => {
      const mockError = { message: 'Internal server error', code: '500' };
      const mockEqUser = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEqPlaylist = jest.fn().mockReturnValue({ eq: mockEqUser });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqPlaylist });
      mockFrom.mockReturnValue({ delete: mockDelete });

      const result = await playlistsService.unlike('pl-100', 'user-200');

      expect(result.error).toEqual(mockError);
    });
  });
});
