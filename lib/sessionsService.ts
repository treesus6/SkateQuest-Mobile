import { supabase } from './supabase';

export type SessionStatus = 'upcoming' | 'live' | 'ended';

export interface SessionRsvpResult {
  error?: string;
  is_attending?: boolean;
  attendee_count?: number;
}

export interface CreateSessionInput {
  title: string;
  scheduledTime: string;
  spotId?: string | null;
  spotName?: string | null;
  description?: string | null;
  maxParticipants?: number | null;
}

export function getSessionStatus(scheduledTime: string, now = Date.now()): SessionStatus {
  const start = new Date(scheduledTime).getTime();
  if (now < start) return 'upcoming';
  if (now <= start + 2 * 60 * 60 * 1000) return 'live';
  return 'ended';
}

export const sessionsService = {
  create(input: CreateSessionInput) {
    return supabase.rpc('create_skate_session', {
      p_title: input.title,
      p_scheduled_time: input.scheduledTime,
      p_spot_id: input.spotId ?? null,
      p_spot_name: input.spotName ?? null,
      p_description: input.description ?? null,
      p_max_participants: input.maxParticipants ?? null,
    });
  },

  setRsvp(sessionId: string, attending: boolean) {
    return supabase.rpc('set_session_rsvp', {
      p_session_id: sessionId,
      p_attending: attending,
    });
  },
};
