/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getSessionStatus, sessionsService } from '../../lib/sessionsService';
import { supabase } from '../../lib/supabase';

const mockRpc = supabase.rpc as unknown as jest.Mock;

describe('sessionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps future sessions upcoming until their actual start time', () => {
    const now = Date.parse('2026-08-24T18:00:00.000Z');

    expect(getSessionStatus('2026-08-24T18:30:00.000Z', now)).toBe('upcoming');
    expect(getSessionStatus('2026-08-24T17:30:00.000Z', now)).toBe('live');
    expect(getSessionStatus('2026-08-24T15:30:00.000Z', now)).toBe('ended');
  });

  it('creates sessions through the server-validated RPC', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'session-1' }, error: null });

    const result = await sessionsService.create({
      title: 'Saturday ledge session',
      scheduledTime: '2026-08-29T21:00:00.000Z',
      spotName: 'Downtown Plaza',
      maxParticipants: 12,
    });

    expect(mockRpc).toHaveBeenCalledWith('create_skate_session', {
      p_title: 'Saturday ledge session',
      p_scheduled_time: '2026-08-29T21:00:00.000Z',
      p_spot_id: null,
      p_spot_name: 'Downtown Plaza',
      p_description: null,
      p_max_participants: 12,
    });
    expect(result.error).toBeNull();
  });

  it('sets attendance explicitly instead of toggling it', async () => {
    mockRpc.mockResolvedValue({
      data: { is_attending: false, attendee_count: 3 },
      error: null,
    });

    await sessionsService.setRsvp('session-1', false);

    expect(mockRpc).toHaveBeenCalledWith('set_session_rsvp', {
      p_session_id: 'session-1',
      p_attending: false,
    });
  });
});
