import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export interface CrewBattleCrew {
  id: string;
  name: string;
  total_xp?: number | null;
}

export interface CrewBattle {
  id: string;
  crew_a_id: string;
  crew_b_id: string;
  spot_id?: string | null;
  trick_name: string;
  votes_a: number;
  votes_b: number;
  ends_at: string;
  winner_crew_id?: string | null;
  status: 'active' | 'completed';
  reward_xp: number;
  created_by?: string | null;
  completed_at?: string | null;
  xp_awarded_at?: string | null;
  created_at: string;
  crew_a?: CrewBattleCrew | null;
  crew_b?: CrewBattleCrew | null;
  winner_crew?: CrewBattleCrew | null;
}

export interface CrewBattleVote {
  battle_id: string;
  crew_voted: 'a' | 'b';
}

export const crewBattlesService = {
  async getAll(): Promise<CrewBattle[]> {
    try {
      const { data, error } = await supabase
        .from('crew_battles')
        .select(`
          *,
          crew_a:crews!crew_battles_crew_a_id_fkey(id, name, total_xp),
          crew_b:crews!crew_battles_crew_b_id_fkey(id, name, total_xp),
          winner_crew:crews!crew_battles_winner_crew_id_fkey(id, name, total_xp)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrewBattle[];
    } catch (error) {
      Logger.error('crewBattlesService.getAll failed', error);
      throw new ServiceError('Failed to load crew battles', 'CREW_BATTLES_FETCH_FAILED', error);
    }
  },

  async getVotesForUser(userId: string): Promise<CrewBattleVote[]> {
    try {
      const { data, error } = await supabase
        .from('crew_battle_votes')
        .select('battle_id, crew_voted')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as CrewBattleVote[];
    } catch (error) {
      Logger.error('crewBattlesService.getVotesForUser failed', error);
      throw new ServiceError('Failed to load your battle votes', 'CREW_BATTLE_VOTES_FETCH_FAILED', error);
    }
  },

  async create(input: {
    crewAId: string;
    crewBId: string;
    trickName: string;
    durationHours: 24 | 48 | 72;
    spotId?: string | null;
  }): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_crew_battle', {
        p_crew_a_id: input.crewAId,
        p_crew_b_id: input.crewBId,
        p_trick_name: input.trickName,
        p_duration_hours: input.durationHours,
        p_spot_id: input.spotId ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error('Battle was not created');
      return data as string;
    } catch (error) {
      Logger.error('crewBattlesService.create failed', error);
      throw new ServiceError('Failed to create crew battle', 'CREW_BATTLE_CREATE_FAILED', error);
    }
  },

  async vote(battleId: string, side: 'a' | 'b') {
    try {
      const { data, error } = await supabase.rpc('vote_crew_battle', {
        p_battle_id: battleId,
        p_side: side,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('crewBattlesService.vote failed', error);
      throw new ServiceError('Failed to vote on crew battle', 'CREW_BATTLE_VOTE_FAILED', error);
    }
  },

  subscribe(onChange: () => void) {
    const channel = supabase
      .channel('crew-battles-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_battles' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_battle_votes' }, onChange)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
