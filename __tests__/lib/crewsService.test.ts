import { crewsService } from '../../lib/crewsService';
import { supabase } from '../../lib/supabase';

// The supabase mock is set up globally in jest.setup.js
// We cast it here for type-safe mock manipulation
const mockFrom = supabase.from as jest.Mock;

describe('crewsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should query the crews table ordered by total_xp descending', async () => {
      const mockCrews = [
        {
          id: '1',
          name: 'Street Kings',
          description: 'Best street crew',
          member_count: 5,
          total_xp: 5000,
          created_by: 'user-1',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Park Riders',
          description: 'Park skating crew',
          member_count: 3,
          total_xp: 3000,
          created_by: 'user-2',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({ data: mockCrews, error: null });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await crewsService.getAll();

      expect(mockFrom).toHaveBeenCalledWith('crews');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('total_xp', { ascending: false });
      expect(result).toEqual({ data: mockCrews, error: null });
    });

    it('should return an error when the query fails', async () => {
      const mockError = { message: 'Database error', code: '500' };
      const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await crewsService.getAll();

      expect(result).toEqual({ data: null, error: mockError });
    });

    it('should return an empty array when no crews exist', async () => {
      const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await crewsService.getAll();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert a new crew with correct default values', async () => {
      const newCrew = {
        name: 'New Crew',
        description: 'A brand new crew',
        created_by: 'user-123',
      };

      const mockInsert = jest.fn().mockResolvedValue({ data: { id: 'new-id', ...newCrew, member_count: 1, total_xp: 0 }, error: null });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await crewsService.create(newCrew);

      expect(mockFrom).toHaveBeenCalledWith('crews');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          name: 'New Crew',
          description: 'A brand new crew',
          created_by: 'user-123',
          member_count: 1,
          total_xp: 0,
        },
      ]);
      expect(result.error).toBeNull();
    });

    it('should return an error when creation fails due to duplicate name', async () => {
      const duplicateCrew = {
        name: 'Existing Crew',
        description: 'Duplicate',
        created_by: 'user-123',
      };

      const mockError = { message: 'duplicate key value violates unique constraint', code: '23505' };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await crewsService.create(duplicateCrew);

      expect(result.error).toEqual(mockError);
      expect(result.data).toBeNull();
    });

    it('should always set member_count to 1 and total_xp to 0 for new crews', async () => {
      const newCrew = {
        name: 'Test Crew',
        description: 'Testing defaults',
        created_by: 'user-456',
      };

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await crewsService.create(newCrew);

      const insertedData = mockInsert.mock.calls[0][0][0];
      expect(insertedData.member_count).toBe(1);
      expect(insertedData.total_xp).toBe(0);
    });
  });

  describe('join', () => {
    it('should insert a crew_members record with correct crew_id and user_id', async () => {
      const crewId = 'crew-abc';
      const userId = 'user-xyz';

      const mockInsert = jest.fn().mockResolvedValue({ data: { crew_id: crewId, user_id: userId }, error: null });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await crewsService.join(crewId, userId);

      expect(mockFrom).toHaveBeenCalledWith('crew_members');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          crew_id: crewId,
          user_id: userId,
        },
      ]);
      expect(result.error).toBeNull();
    });

    it('should return an error when a user tries to join a crew they are already in', async () => {
      const mockError = { message: 'duplicate key value violates unique constraint', code: '23505' };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await crewsService.join('crew-abc', 'user-xyz');

      expect(result.error).toEqual(mockError);
    });

    it('should return an error when joining a non-existent crew', async () => {
      const mockError = { message: 'violates foreign key constraint', code: '23503' };
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await crewsService.join('non-existent-crew', 'user-xyz');

      expect(result.error).toEqual(mockError);
    });
  });
});
