/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { streaksService } from '../../lib/streaksService';
import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as unknown as jest.MockedFunction<typeof supabase.from>;

function mockFromImpl(tableResponses: Record<string, any>) {
  mockFrom.mockImplementation((table: string) => {
    return tableResponses[table] ?? {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
  });
}

describe('streaksService.updateOnActivity', () => {
  const USER_ID = 'user-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts a new streak row when user has no streak yet', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockSelect = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) });

    mockFromImpl({
      streaks: { select: mockSelect, insert: mockInsert },
    });

    await streaksService.updateOnActivity(USER_ID);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        current_streak: 1,
        longest_streak: 1,
        xp_at_risk: 5,
      })
    );
  });

  it('is a no-op when last_active_date is today', async () => {
    const today = new Date().toISOString();
    const existingStreak = {
      id: 'streak-1',
      user_id: USER_ID,
      current_streak: 5,
      longest_streak: 10,
      last_active_date: today,
      xp_at_risk: 25,
    };

    const mockUpdate = jest.fn();
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: existingStreak, error: null });
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

    mockFromImpl({
      streaks: { select: mockSelect, update: mockUpdate },
    });

    await streaksService.updateOnActivity(USER_ID);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('increments streak when last_active_date was yesterday', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const existingStreak = {
      id: 'streak-1',
      user_id: USER_ID,
      current_streak: 3,
      longest_streak: 7,
      last_active_date: yesterday.toISOString(),
      xp_at_risk: 15,
    };

    const mockEqUpdate = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUpdate });
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: existingStreak, error: null });
    const mockEqSelect = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEqSelect });

    mockFromImpl({
      streaks: { select: mockSelect, update: mockUpdate },
    });

    await streaksService.updateOnActivity(USER_ID);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        current_streak: 4,
        xp_at_risk: 20,
      })
    );
  });

  it('resets streak to 1 and records history when streak is broken', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const existingStreak = {
      id: 'streak-1',
      user_id: USER_ID,
      current_streak: 6,
      longest_streak: 10,
      last_active_date: twoDaysAgo.toISOString(),
      xp_at_risk: 30,
    };

    const mockHistoryInsert = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEqUpdate = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUpdate });
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: existingStreak, error: null });
    const mockEqSelect = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEqSelect });

    mockFromImpl({
      streaks: { select: mockSelect, update: mockUpdate },
      streak_history: { insert: mockHistoryInsert },
    });

    await streaksService.updateOnActivity(USER_ID);

    expect(mockHistoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        streak_length: 6,
        xp_lost: 30,
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ current_streak: 1, xp_at_risk: 5 })
    );
  });
});
