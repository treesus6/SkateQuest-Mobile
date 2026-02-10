import { eventsService } from '../../lib/eventsService';
import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as jest.Mock;

describe('eventsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpcoming', () => {
    it('should query events with date >= today, ordered by date and time ascending', async () => {
      const mockEvents = [
        {
          id: 'evt-1',
          title: 'Park Jam',
          description: 'Skate jam at the park',
          location: 'Central Park',
          date: '2026-03-01',
          time: '14:00',
          created_by: 'user-1',
          attendee_count: 15,
        },
        {
          id: 'evt-2',
          title: 'Street Session',
          description: 'Street skating meetup',
          location: 'Downtown',
          date: '2026-03-02',
          time: '10:00',
          created_by: 'user-2',
          attendee_count: 8,
        },
      ];

      const mockOrderTime = jest.fn().mockResolvedValue({ data: mockEvents, error: null });
      const mockOrderDate = jest.fn().mockReturnValue({ order: mockOrderTime });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrderDate });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await eventsService.getUpcoming();

      expect(mockFrom).toHaveBeenCalledWith('events');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockGte).toHaveBeenCalledWith('date', expect.any(String));
      expect(mockOrderDate).toHaveBeenCalledWith('date', { ascending: true });
      expect(mockOrderTime).toHaveBeenCalledWith('time', { ascending: true });
      expect(result).toEqual({ data: mockEvents, error: null });
    });

    it('should filter events by current date using ISO format date string', async () => {
      const mockOrderTime = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockOrderDate = jest.fn().mockReturnValue({ order: mockOrderTime });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrderDate });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      await eventsService.getUpcoming();

      // The gte call should use the YYYY-MM-DD format
      const dateArg = mockGte.mock.calls[0][1];
      expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return an error when the query fails', async () => {
      const mockError = { message: 'Connection timeout', code: 'TIMEOUT' };
      const mockOrderTime = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockOrderDate = jest.fn().mockReturnValue({ order: mockOrderTime });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrderDate });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await eventsService.getUpcoming();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should return an empty array when there are no upcoming events', async () => {
      const mockOrderTime = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockOrderDate = jest.fn().mockReturnValue({ order: mockOrderTime });
      const mockGte = jest.fn().mockReturnValue({ order: mockOrderDate });
      const mockSelect = jest.fn().mockReturnValue({ gte: mockGte });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await eventsService.getUpcoming();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('rsvp', () => {
    it('should insert an event_rsvps record with correct event_id and user_id', async () => {
      const eventId = 'evt-100';
      const userId = 'user-200';

      const mockInsert = jest.fn().mockResolvedValue({
        data: { event_id: eventId, user_id: userId },
        error: null,
      });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await eventsService.rsvp(eventId, userId);

      expect(mockFrom).toHaveBeenCalledWith('event_rsvps');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          event_id: eventId,
          user_id: userId,
        },
      ]);
      expect(result.error).toBeNull();
    });

    it('should return an error when a user RSVPs to the same event twice', async () => {
      const mockError = { message: 'duplicate key value violates unique constraint', code: '23505' };
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
