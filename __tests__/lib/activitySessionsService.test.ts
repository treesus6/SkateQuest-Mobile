/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { activitySessionsService, mapHistoryRow } from '../../lib/activitySessionsService';
import { Logger } from '../../lib/logger';

const mockRpc = jest.fn();
const mockLimit = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: (...args: unknown[]) => mockLimit(...args) }),
        }),
      }),
    }),
  },
}));

const mockLoggerError = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

function historyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    spot_name: 'Downtown Plaza',
    started_at: '2026-11-16T18:00:00.000Z',
    ended_at: '2026-11-16T18:45:00.000Z',
    duration_minutes: 45,
    trick_count: 7,
    xp_awarded: 90,
    ...overrides,
  };
}

describe('activitySessionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapHistoryRow', () => {
    it('maps a complete finished session row', () => {
      expect(mapHistoryRow(historyRow())).toEqual({
        id: 'session-1',
        spot_name: 'Downtown Plaza',
        started_at: '2026-11-16T18:00:00.000Z',
        ended_at: '2026-11-16T18:45:00.000Z',
        duration_minutes: 45,
        trick_count: 7,
        xp_awarded: 90,
      });
    });

    it('accepts a null spot and null duration', () => {
      expect(mapHistoryRow(historyRow({ spot_name: null, duration_minutes: null }))).toMatchObject({
        spot_name: null,
        duration_minutes: null,
      });
    });

    it('drops rows with a missing id or unparseable timestamps', () => {
      expect(mapHistoryRow(historyRow({ id: '' }))).toBeNull();
      expect(mapHistoryRow(historyRow({ started_at: 'not-a-date' }))).toBeNull();
      expect(mapHistoryRow(historyRow({ ended_at: 'not-a-date' }))).toBeNull();
      expect(mapHistoryRow(null)).toBeNull();
      expect(mapHistoryRow('nope')).toBeNull();
    });
  });

  describe('listFinished', () => {
    it('reads finished sessions newest-first and drops malformed rows', async () => {
      mockLimit.mockResolvedValue({
        data: [
          historyRow(),
          historyRow({ id: 'bad', started_at: 'junk' }),
          historyRow({ id: 'session-2' }),
        ],
        error: null,
      });
      const result = await activitySessionsService.listFinished();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-2');
    });

    it('throws a ServiceError when the history read fails', async () => {
      mockLimit.mockResolvedValue({ data: null, error: new Error('boom') });
      await expect(activitySessionsService.listFinished()).rejects.toThrow('past sessions');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('getActive', () => {
    it('returns null when no session is in progress', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      await expect(activitySessionsService.getActive()).resolves.toBeNull();
      expect(mockRpc).toHaveBeenCalledWith('get_active_skate_activity_session');
    });

    it('parses the resume state for an in-progress session', async () => {
      mockRpc.mockResolvedValue({
        data: {
          session_id: 'session-9',
          spot_id: 'spot-1',
          spot_name: 'Downtown Plaza',
          started_at: '2026-11-17T17:00:00.000Z',
          paused_total_seconds: 300,
          paused_at: null,
          trick_count: 4,
        },
        error: null,
      });
      await expect(activitySessionsService.getActive()).resolves.toEqual({
        session_id: 'session-9',
        spot_id: 'spot-1',
        spot_name: 'Downtown Plaza',
        started_at: '2026-11-17T17:00:00.000Z',
        paused_total_seconds: 300,
        paused_at: null,
        trick_count: 4,
      });
    });

    it('rejects a malformed active-session payload instead of resuming blindly', async () => {
      mockRpc.mockResolvedValue({ data: { session_id: 'session-9' }, error: null });
      await expect(activitySessionsService.getActive()).rejects.toThrow('in-progress session');
    });
  });

  describe('pause / resume / logTrick', () => {
    it('pauses through the server RPC and returns the accumulated pause', async () => {
      mockRpc.mockResolvedValue({
        data: { session_id: 's-1', paused: true, paused_total_seconds: 120 },
        error: null,
      });
      await expect(activitySessionsService.pause('s-1')).resolves.toEqual({
        paused_total_seconds: 120,
      });
      expect(mockRpc).toHaveBeenCalledWith('pause_skate_activity_session', { p_session_id: 's-1' });
    });

    it('resumes through the server RPC', async () => {
      mockRpc.mockResolvedValue({
        data: { session_id: 's-1', resumed: true, paused_total_seconds: 420 },
        error: null,
      });
      await expect(activitySessionsService.resume('s-1')).resolves.toEqual({
        paused_total_seconds: 420,
      });
      expect(mockRpc).toHaveBeenCalledWith('resume_skate_activity_session', {
        p_session_id: 's-1',
      });
    });

    it('persists a trick tap and returns the server count', async () => {
      mockRpc.mockResolvedValue({ data: { session_id: 's-1', trick_count: 5 }, error: null });
      await expect(activitySessionsService.logTrick('s-1')).resolves.toEqual({ trick_count: 5 });
      expect(mockRpc).toHaveBeenCalledWith('log_skate_session_trick', { p_session_id: 's-1' });
    });

    it('throws a ServiceError when a trick tap is not persisted', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('session is paused') });
      await expect(activitySessionsService.logTrick('s-1')).rejects.toThrow('trick');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });
});
