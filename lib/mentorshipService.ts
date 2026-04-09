import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

interface MentorRelationship {
  id: string;
  mentor_user_id: string;
  mentee_user_id: string;
  status: 'active' | 'paused' | 'completed' | 'declined';
  started_at: string;
  ended_at?: string;
  goals?: string;
  progress_notes?: string;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

interface MentorshipStats {
  mentees_count: number;
  mentors_count: number;
  active_relationships: number;
}

export const mentorshipService = {
  // =========================================================================
  // RELATIONSHIPS
  // =========================================================================

  async requestMentorship(mentorId: string, menteeId: string, goals?: string): Promise<MentorRelationship> {
    try {
      const { data, error } = await supabase
        .from('mentor_relationships')
        .insert({
          mentor_user_id: mentorId,
          mentee_user_id: menteeId,
          goals,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create mentorship relationship');
      return data;
    } catch (error) {
      Logger.error('mentorshipService.requestMentorship failed', error);
      throw new ServiceError('Failed to request mentorship', 'REQUEST_MENTORSHIP_FAILED', error);
    }
  },

  async getUserMentees(userId: string): Promise<MentorRelationship[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('*')
        .eq('mentor_user_id', userId)
        .order('last_interaction', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('mentorshipService.getUserMentees failed', error);
      throw new ServiceError('Failed to get mentees', 'GET_MENTEES_FAILED', error);
    }
  },

  async getUserMentors(userId: string): Promise<MentorRelationship[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('*')
        .eq('mentee_user_id', userId)
        .order('last_interaction', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('mentorshipService.getUserMentors failed', error);
      throw new ServiceError('Failed to get mentors', 'GET_MENTORS_FAILED', error);
    }
  },

  async getMentorshipRelationship(relationshipId: string): Promise<MentorRelationship> {
    try {
      const { data, error } = await supabase
        .from('mentor_relationships')
        .select('*')
        .eq('id', relationshipId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Relationship not found');
      return data;
    } catch (error) {
      Logger.error('mentorshipService.getMentorshipRelationship failed', error);
      throw new ServiceError('Failed to get relationship', 'GET_RELATIONSHIP_FAILED', error);
    }
  },

  async updateMentorshipStatus(
    relationshipId: string,
    status: 'active' | 'paused' | 'completed' | 'declined'
  ): Promise<MentorRelationship> {
    try {
      const endedAt = status !== 'active' && status !== 'paused' ? new Date().toISOString() : null;

      const { data, error } = await supabase
        .from('mentor_relationships')
        .update({
          status,
          ended_at: endedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', relationshipId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update relationship');
      return data;
    } catch (error) {
      Logger.error('mentorshipService.updateMentorshipStatus failed', error);
      throw new ServiceError('Failed to update mentorship status', 'UPDATE_STATUS_FAILED', error);
    }
  },

  async updateProgressNotes(relationshipId: string, notes: string): Promise<MentorRelationship> {
    try {
      const { data, error } = await supabase
        .from('mentor_relationships')
        .update({
          progress_notes: notes,
          last_interaction: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', relationshipId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update progress notes');
      return data;
    } catch (error) {
      Logger.error('mentorshipService.updateProgressNotes failed', error);
      throw new ServiceError('Failed to update progress notes', 'UPDATE_NOTES_FAILED', error);
    }
  },

  // =========================================================================
  // STATS
  // =========================================================================

  async getMentorshipStats(userId: string): Promise<MentorshipStats> {
    try {
      const { data, error } = await supabase.rpc('get_mentorship_stats', {
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        return { mentees_count: 0, mentors_count: 0, active_relationships: 0 };
      }
      return data[0];
    } catch (error) {
      Logger.error('mentorshipService.getMentorshipStats failed', error);
      throw new ServiceError('Failed to get mentorship stats', 'STATS_FAILED', error);
    }
  },

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  subscribeToUserMentorships(
    userId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`user_mentorships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentor_relationships',
          filter: `mentor_user_id=eq.${userId},mentee_user_id=eq.${userId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },
};
