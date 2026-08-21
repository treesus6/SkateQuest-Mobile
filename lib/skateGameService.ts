import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const skateGameService = {
  async getAll(userId: string) {
    try {
      return await supabase
        .from('skate_games')
        .select(
          '*, challenger:profiles!challenger_id(id, username, level), opponent:profiles!opponent_id(id, username, level)'
        )
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .order('created_at', { ascending: false });
    } catch (error) {
      Logger.error('skateGameService.getAll failed', error);
      throw new ServiceError('Failed to fetch games', 'SKATE_GAME_GET_ALL_FAILED', error);
    }
  },

  async getById(gameId: string) {
    try {
      return await supabase
        .from('skate_games')
        .select(
          '*, challenger:profiles!challenger_id(id, username, level), opponent:profiles!opponent_id(id, username, level)'
        )
        .eq('id', gameId)
        .single();
    } catch (error) {
      Logger.error('skateGameService.getById failed', error);
      throw new ServiceError('Failed to fetch game', 'SKATE_GAME_GET_BY_ID_FAILED', error);
    }
  },

  async getTurns(gameId: string) {
    try {
      return await supabase
        .from('skate_game_turns')
        .select('*, player:profiles(id, username), media(*)')
        .eq('game_id', gameId)
        .order('turn_number', { ascending: true });
    } catch (error) {
      Logger.error('skateGameService.getTurns failed', error);
      throw new ServiceError('Failed to fetch turns', 'SKATE_GAME_GET_TURNS_FAILED', error);
    }
  },

  async create(_challengerId: string, opponentId: string) {
    try {
      const { data, error } = await supabase.rpc('create_skate_game', {
        p_opponent_id: opponentId,
      });
      if (error) throw error;
      if (!data) throw new Error('Game was not created');
      return { data: { id: data as string }, error: null };
    } catch (error) {
      Logger.error('skateGameService.create failed', error);
      throw new ServiceError('Failed to create game', 'SKATE_GAME_CREATE_FAILED', error);
    }
  },

  async submitTurn(input: {
    gameId: string;
    trickName: string;
    landed: boolean;
    mediaId?: string | null;
  }) {
    try {
      const { data, error } = await supabase.rpc('submit_skate_game_turn', {
        p_game_id: input.gameId,
        p_trick_name: input.trickName,
        p_landed: input.landed,
        p_media_id: input.mediaId ?? null,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('skateGameService.submitTurn failed', error);
      throw new ServiceError('Failed to submit turn', 'SKATE_GAME_SUBMIT_TURN_FAILED', error);
    }
  },
};
