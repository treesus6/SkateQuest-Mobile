import { supabase } from './supabase';
import { Logger } from './logger';

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

/**
 * The RSVP RPC returns a JSON object only after the database transaction
 * completes. Null or malformed success responses must never acknowledge an
 * offline mutation or make the UI claim the RSVP was saved.
 */
export function requireConfirmedSessionRsvp(
  result: SessionRsvpResult | null,
  attending: boolean
): { is_attending: boolean; attendee_count: number } {
  if (result?.error) throw new Error(result.error);
  if (
    !result ||
    result.is_attending !== attending ||
    typeof result.attendee_count !== 'number' ||
    !Number.isInteger(result.attendee_count) ||
    result.attendee_count < 0
  ) {
    throw new Error('Session RSVP was not confirmed by the server');
  }
  return { is_attending: result.is_attending, attendee_count: result.attendee_count };
}

export interface PersistedSessionExpectation {
  id: string;
  title: string;
  creatorId: string;
  scheduledTime: string;
}

/** A returned RPC ID is not proof that the session is visible and persisted. */
export function getSessionPersistenceError(
  saved: unknown,
  expected: PersistedSessionExpectation
): string | null {
  if (!saved || typeof saved !== 'object') {
    return 'The new session could not be read back.';
  }
  const row = saved as Record<string, unknown>;
  if (row.id !== expected.id) return 'The saved session ID did not match.';
  if (row.creator_id !== expected.creatorId) return 'The saved session creator did not match.';
  if (row.title !== expected.title) return 'The saved session title did not match.';

  const actualTime =
    typeof row.scheduled_time === 'string' ? Date.parse(row.scheduled_time) : Number.NaN;
  const expectedTime = Date.parse(expected.scheduledTime);
  if (
    !Number.isFinite(actualTime) ||
    !Number.isFinite(expectedTime) ||
    Math.abs(actualTime - expectedTime) > 1000
  ) {
    return 'The saved session time did not match.';
  }
  if (!Array.isArray(row.participants) || !row.participants.includes(expected.creatorId)) {
    return 'The session creator attendance could not be verified.';
  }
  return null;
}

export const sessionsService = {
  getById(sessionId: string) {
    return supabase
      .from('skate_sessions')
      .select('id, title, creator_id, scheduled_time, participants')
      .eq('id', sessionId)
      .maybeSingle();
  },

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

  async setRsvp(sessionId: string, attending: boolean) {
    const result = await supabase.rpc('set_session_rsvp', {
      p_session_id: sessionId,
      p_attending: attending,
    });
    const data = result.data as SessionRsvpResult | null;

    if (result.error || data?.error) {
      Logger.error(
        'Session RSVP persistence failed',
        result.error ?? new Error(data?.error ?? 'Unknown RSVP persistence error'),
        { session_id: sessionId, attending }
      );
    }

    return result;
  },
};
