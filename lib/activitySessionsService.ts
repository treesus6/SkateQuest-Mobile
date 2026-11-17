import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

/**
 * Live skate activity sessions (public.skate_activity_sessions): the
 * server-backed session the ActiveSession screen starts, pauses, resumes
 * and finishes, plus its persisted per-trick records.
 *
 * This module is the only reader of finished activity sessions (history).
 * It deliberately does NOT touch lib/sessionsService.ts, which owns the
 * scheduled skate_sessions meetups.
 */

export interface ActivitySession {
  id: string;
  spot_id: string | null;
  spot_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  trick_count: number;
  xp_awarded: number;
  status: 'active' | 'completed';
  paused_total_seconds: number;
  paused_at: string | null;
}

export interface ActiveSessionSummary {
  session_id: string;
  spot_id: string | null;
  spot_name: string | null;
  started_at: string;
  paused_total_seconds: number;
  paused_at: string | null;
  trick_count: number;
}

export type ActivitySessionHistoryItem = Pick<
  ActivitySession,
  'id' | 'spot_name' | 'started_at' | 'ended_at' | 'duration_minutes' | 'trick_count' | 'xp_awarded'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toNonNegativeInt(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** A history row is only shown when its id and timestamps parse. */
export function mapHistoryRow(row: unknown): ActivitySessionHistoryItem | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.started_at !== 'string' || Number.isNaN(Date.parse(row.started_at))) return null;
  if (row.ended_at !== null && row.ended_at !== undefined) {
    if (typeof row.ended_at !== 'string' || Number.isNaN(Date.parse(row.ended_at))) return null;
  }
  return {
    id: row.id,
    spot_name: toNullableString(row.spot_name),
    started_at: row.started_at,
    ended_at: toNullableString(row.ended_at),
    duration_minutes:
      typeof row.duration_minutes === 'number' && Number.isFinite(row.duration_minutes)
        ? row.duration_minutes
        : null,
    trick_count: toNonNegativeInt(row.trick_count),
    xp_awarded: toNonNegativeInt(row.xp_awarded),
  };
}

function parseActiveSession(result: unknown): ActiveSessionSummary | null {
  if (!isRecord(result)) return null;
  if (typeof result.session_id !== 'string' || !result.session_id) return null;
  if (typeof result.started_at !== 'string' || Number.isNaN(Date.parse(result.started_at))) {
    return null;
  }
  return {
    session_id: result.session_id,
    spot_id: toNullableString(result.spot_id),
    spot_name: toNullableString(result.spot_name),
    started_at: result.started_at,
    paused_total_seconds: toNonNegativeInt(result.paused_total_seconds),
    paused_at: toNullableString(result.paused_at),
    trick_count: toNonNegativeInt(result.trick_count),
  };
}

function requireRpcResult<T>(data: unknown, parse: (value: unknown) => T | null, label: string): T {
  const parsed = parse(data);
  if (!parsed) throw new Error(`The server did not return a valid ${label}.`);
  return parsed;
}

export const activitySessionsService = {
  /**
   * Finished sessions for the signed-in user, newest first. Reads the
   * owner's rows directly (RLS: users_view_own_skate_activity_sessions);
   * malformed rows are dropped, never shown as fake history.
   */
  async listFinished(limit = 20): Promise<ActivitySessionHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('skate_activity_sessions')
        .select('id, spot_name, started_at, ended_at, duration_minutes, trick_count, xp_awarded')
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(Math.max(1, Math.min(100, Math.floor(limit) || 20)));
      if (error) throw error;
      return ((data ?? []) as unknown[]).flatMap(row => {
        const mapped = mapHistoryRow(row);
        return mapped ? [mapped] : [];
      });
    } catch (error) {
      Logger.error('activitySessionsService.listFinished failed', error);
      throw new ServiceError(
        'Failed to load past sessions',
        'ACTIVITY_SESSIONS_HISTORY_FAILED',
        error
      );
    }
  },

  /** The caller's in-progress session, if any — the resume/recovery lookup. */
  async getActive(): Promise<ActiveSessionSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_active_skate_activity_session');
      if (error) throw error;
      if (data === null || data === undefined) return null;
      return requireRpcResult(data, parseActiveSession, 'active session');
    } catch (error) {
      Logger.error('activitySessionsService.getActive failed', error);
      throw new ServiceError(
        'Failed to check for an in-progress session',
        'ACTIVITY_SESSION_GET_ACTIVE_FAILED',
        error
      );
    }
  },

  /** Freeze the server clock for a session; returns the accumulated pause. */
  async pause(sessionId: string): Promise<{ paused_total_seconds: number }> {
    try {
      const { data, error } = await supabase.rpc('pause_skate_activity_session', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      return requireRpcResult(
        data,
        value =>
          isRecord(value) && value.paused === true
            ? { paused_total_seconds: toNonNegativeInt(value.paused_total_seconds) }
            : null,
        'pause confirmation'
      );
    } catch (error) {
      Logger.error('activitySessionsService.pause failed', error);
      throw new ServiceError('Failed to pause the session', 'ACTIVITY_SESSION_PAUSE_FAILED', error);
    }
  },

  /** Resume the server clock; returns the accumulated paused seconds. */
  async resume(sessionId: string): Promise<{ paused_total_seconds: number }> {
    try {
      const { data, error } = await supabase.rpc('resume_skate_activity_session', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      return requireRpcResult(
        data,
        value =>
          isRecord(value) && value.resumed === true
            ? { paused_total_seconds: toNonNegativeInt(value.paused_total_seconds) }
            : null,
        'resume confirmation'
      );
    } catch (error) {
      Logger.error('activitySessionsService.resume failed', error);
      throw new ServiceError(
        'Failed to resume the session',
        'ACTIVITY_SESSION_RESUME_FAILED',
        error
      );
    }
  },

  /**
   * Persist one landed trick: the server inserts a skate_session_tricks row
   * and increments the session trick_count in one transaction, returning the
   * new server count. The caller must reconcile its counter to this value.
   */
  async logTrick(sessionId: string): Promise<{ trick_count: number }> {
    try {
      const { data, error } = await supabase.rpc('log_skate_session_trick', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      return requireRpcResult(
        data,
        value =>
          isRecord(value) && typeof value.trick_count === 'number'
            ? { trick_count: toNonNegativeInt(value.trick_count) }
            : null,
        'trick log confirmation'
      );
    } catch (error) {
      Logger.error('activitySessionsService.logTrick failed', error);
      throw new ServiceError(
        'Failed to save the trick',
        'ACTIVITY_SESSION_LOG_TRICK_FAILED',
        error
      );
    }
  },
};
