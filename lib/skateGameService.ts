import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const skateGameService = {
  async getAll(userId: string) {
    try {
      return await supabase
        .from('skate_games')
        .select('*, challenger:profiles!challenger_id(id, username, level), opponent:profiles!opponent_id(id, username, level)')
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
        .select('*, challenger:profiles!challenger_id(id, username, level), opponent:profiles!opponent_id(id, username, level)')
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

  async create(challengerId: string, opponentId: string) {
    try {
      return await supabase.from('skate_games').insert([{
        challenger_id: challengerId,
        opponent_id: opponentId,
        status: 'pending',
        challenger_letters: '',
        opponent_letters: '',
      }]).select().single();
    } catch (error) {
      Logger.error('skateGameService.create failed', error);
      throw new ServiceError('Failed to create game', 'SKATE_GAME_CREATE_FAILED', error);
    }
  },

  async submitTurn(turn: {
    game_id: string;
    player_id: string;
    trick_name: string;
    media_id?: string;
    turn_number: number;
  }) {
    try {
      return await supabase.from('skate_game_turns').insert([turn]).select().single();
    } catch (error) {
      Logger.error('skateGameService.submitTurn failed', error);
      throw new ServiceError('Failed to submit turn', 'SKATE_GAME_SUBMIT_TURN_FAILED', error);
    }
  },

  async updateGame(gameId: string, updates: Record<string, any>) {
    try {
      return await supabase
        .from('skate_games')
        .update(updates)
        .eq('id', gameId)
        .select()
        .single();
    } catch (error) {
      Logger.error('skateGameService.updateGame failed', error);
      throw new ServiceError('Failed to update game', 'SKATE_GAME_UPDATE_FAILED', error);
    }
  },
};
