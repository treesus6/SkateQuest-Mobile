import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const profilesService = {
  async getById(userId: string) {
    try {
      return await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    } catch (error) {
      Logger.error('profilesService.getById failed', error);
      throw new ServiceError('Failed to fetch profile', 'PROFILES_GET_BY_ID_FAILED', error);
    }
  },

  async create(profile: {
    id: string;
    username: string;
    level: number;
    xp: number;
    spots_added: number;
    challenges_completed: string[];
    streak?: number;
    badges?: Record<string, boolean>;
  }) {
    try {
      return await supabase.from('profiles').insert([profile]).select().single();
    } catch (error) {
      Logger.error('profilesService.create failed', error);
      throw new ServiceError('Failed to create profile', 'PROFILES_CREATE_FAILED', error);
    }
  },

  async update(userId: string, updates: Record<string, any>) {
    try {
      return await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    } catch (error) {
      Logger.error('profilesService.update failed', error);
      throw new ServiceError('Failed to update profile', 'PROFILES_UPDATE_FAILED', error);
    }
  },

  async getLevelProgress(userXp: number) {
    try {
      return await supabase.rpc('get_level_progress', { user_xp: userXp });
    } catch (error) {
      Logger.error('profilesService.getLevelProgress failed', error);
      throw new ServiceError('Failed to get level progress', 'PROFILES_LEVEL_PROGRESS_FAILED', error);
    }
  },

  async incrementXp(userId: string, amount: number) {
    try {
      return await supabase.rpc('increment_xp', { user_id: userId, amount });
    } catch (error) {
      Logger.error('profilesService.incrementXp failed', error);
      throw new ServiceError('Failed to increment XP', 'PROFILES_INCREMENT_XP_FAILED', error);
    }
  },

  async getLeaderboard(limit: number = 50) {
    try {
      return await supabase
        .from('profiles')
        .select('*')
        .order('xp', { ascending: false })
        .limit(limit);
    } catch (error) {
      Logger.error('profilesService.getLeaderboard failed', error);
      throw new ServiceError('Failed to fetch leaderboard', 'PROFILES_LEADERBOARD_FAILED', error);
    }
  },
};
