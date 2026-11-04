/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { executeOfflineMutation } from '../../lib/offlineMutationExecutor';
import { supabase } from '../../lib/supabase';
import type { OfflineMutation } from '../../stores/useMutationQueueStore';

const mockRpc = supabase.rpc as unknown as jest.Mock;

function mutation(overrides: Partial<OfflineMutation> = {}): OfflineMutation {
  return {
    id: 'mutation-1',
    type: 'create',
    table: 'session_attendees',
    payload: { session_id: 'session-1' },
    createdAt: 0,
    retryCount: 0,
    ...overrides,
  };
}

describe('offline mutation executor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists create and delete through the server RSVP RPC', async () => {
    mockRpc.mockResolvedValue({ data: { is_attending: true, attendee_count: 2 }, error: null });
    await executeOfflineMutation(mutation());
    expect(mockRpc).toHaveBeenCalledWith('set_session_rsvp', {
      p_session_id: 'session-1',
      p_attending: true,
    });

    mockRpc.mockResolvedValue({ data: { is_attending: false, attendee_count: 1 }, error: null });
    await executeOfflineMutation(mutation({ type: 'delete' }));
    expect(mockRpc).toHaveBeenLastCalledWith('set_session_rsvp', {
      p_session_id: 'session-1',
      p_attending: false,
    });
  });

  it('rejects unsupported tables, mutation types, and missing IDs without calling Supabase', async () => {
    await expect(executeOfflineMutation(mutation({ table: 'spots' }))).rejects.toThrow(
      'Unsupported offline mutation table'
    );
    await expect(executeOfflineMutation(mutation({ type: 'update' }))).rejects.toThrow(
      'Unsupported session RSVP mutation'
    );
    await expect(executeOfflineMutation(mutation({ payload: {} }))).rejects.toThrow(
      'missing a session_id'
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects database and RPC application errors so the queue retains the write', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('offline') });
    await expect(executeOfflineMutation(mutation())).rejects.toThrow('offline');

    mockRpc.mockResolvedValue({ data: { error: 'session_full' }, error: null });
    await expect(executeOfflineMutation(mutation())).rejects.toThrow('session_full');
  });

  it('keeps offline RSVPs queued when the RPC response cannot prove persistence', async () => {
    for (const data of [
      null,
      {},
      { is_attending: true },
      { is_attending: false, attendee_count: 1 },
      { is_attending: true, attendee_count: -1 },
      { is_attending: true, attendee_count: 1.5 },
    ]) {
      mockRpc.mockResolvedValue({ data, error: null });
      await expect(executeOfflineMutation(mutation())).rejects.toThrow(
        'Session RSVP was not confirmed by the server'
      );
    }
  });
});
