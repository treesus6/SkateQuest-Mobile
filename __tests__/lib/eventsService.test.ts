/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { eventsService } from '../../lib/eventsService';
import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as unknown as { mockReturnValue: (...args: any[]) => any };
const mockRpc = supabase.rpc as unknown as jest.Mock;

describe('eventsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpcoming', () => {
    it('should query upcoming sessions by scheduled_time and map them to events', async () => {
      const mockSessions = [
        {
          id: 'evt-1',
          title: 'Park Jam',
          description: 'Skate jam at the park',
          spot_id: 'spot-1',
          scheduled_time: '2026-09-01T21:00:00.000Z',
          creator_id: 'user-1',
          participants: ['user-3', 'user-4'],
        },
        {
          id: 'evt-2',
          title: 'Street Session',
          description: 'Street skating meetup',
          spot_id: null,
          scheduled_time: '2026-09-02T17:00:00.000Z',
          creator_id: 'user-2',
          participants: [],
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockSessions, error: null });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await eventsService.getUpcoming();

      expect(mockFrom).toHaveBeenCalledWith('skate_sessions');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, title, description, spot_id, scheduled_time, creator_id, participants'
      );
      expect(mockGte).toHaveBeenCalledWith('scheduled_time', expect.any(String));
      expect(mockOrder).toHaveBeenCalledWith('scheduled_time', { ascending: true });
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toEqual(
        expect.objectContaining({
          id: 'evt-1',
          created_by: 'user-1',
          attendee_count: 2,
        })
      );
    });

    it('should filter events from the current timestamp', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      await eventsService.getUpcoming();

      const dateArg = mockGte.mock.calls[0][1];
      expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return an error when the query fails', async () => {
      const mockError = { message: 'Connection timeout', code: 'TIMEOUT' };
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await eventsService.getUpcoming();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should return an empty array when there are no upcoming events', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await eventsService.getUpcoming();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('rsvp', () => {
    it('should call toggle_session_rsvp RPC with correct session_id and user_id', async () => {
      const eventId = 'evt-100';
      const userId = 'user-200';

      mockRpc.mockResolvedValue({
        data: { is_attending: true, attendee_count: 1 },
        error: null,
      });

      const result = await eventsService.rsvp(eventId, userId);

      expect(mockRpc).toHaveBeenCalledWith('toggle_session_rsvp', {
        p_session_id: eventId,
        p_user_id: userId,
      });
      expect(result.error).toBeNull();
    });

    it('should return an error when the RPC fails', async () => {
      const mockError = { message: 'unauthorized', code: '42501' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await eventsService.rsvp('evt-100', 'user-200');

      expect(result.error).toEqual(mockError);
    });

    it('should return session-full error from RPC', async () => {
      mockRpc.mockResolvedValue({ data: { error: 'full' }, error: null });

      const result = await eventsService.rsvp('evt-100', 'user-200');

      expect((result.data as any)?.error).toBe('full');
    });
  });
});
