/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { eventsService } from '../../lib/eventsService';
import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as unknown as { mockReturnValue: (...args: any[]) => any };

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
          session_attendees: [{ user_id: 'user-3' }, { user_id: 'user-4' }],
        },
        {
          id: 'evt-2',
          title: 'Street Session',
          description: 'Street skating meetup',
          spot_id: null,
          scheduled_time: '2026-09-02T17:00:00.000Z',
          creator_id: 'user-2',
          session_attendees: [],
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockSessions, error: null });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await eventsService.getUpcoming();

      expect(mockFrom).toHaveBeenCalledWith('skate_sessions');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, title, description, spot_id, scheduled_time, creator_id, session_attendees(user_id)'
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
    it('should insert a session_attendees record with correct session_id and user_id', async () => {
      const eventId = 'evt-100';
      const userId = 'user-200';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { session_id: eventId, user_id: userId },
        error: null,
      });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await eventsService.rsvp(eventId, userId);

      expect(mockFrom).toHaveBeenCalledWith('session_attendees');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          session_id: eventId,
          user_id: userId,
        },
      ]);
      expect(result.error).toBeNull();
    });

    it('should return an error when a user RSVPs to the same event twice', async () => {
      const mockError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
      };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await eventsService.rsvp('evt-100', 'user-200');

      expect(result.error).toEqual(mockError);
      expect(result.data).toBeNull();
    });

    it('should return an error when the event does not exist', async () => {
      const mockError = { message: 'violates foreign key constraint', code: '23503' };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await eventsService.rsvp('non-existent-event', 'user-200');

      expect(result.error).toEqual(mockError);
    });
  });
});
