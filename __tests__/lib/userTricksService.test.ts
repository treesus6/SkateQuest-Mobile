/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { userTricksService } from '../../lib/userTricksService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/logger', () => ({
  Logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockFrom = supabase.from as unknown as { mockReturnValue: (...args: any[]) => any };

function mockInsertChain() {
  const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'trick-1' }, error: null });
  const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });
  return { mockInsert, mockSingle };
}

describe('userTricksService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a trick as trying with no landed timestamp', async () => {
    const { mockInsert } = mockInsertChain();

    await userTricksService.create({
      user_id: 'user-1',
      trick_name: 'Kickflip',
      status: 'trying',
    });

    expect(mockFrom).toHaveBeenCalledWith('user_tricks');
    const inserted = mockInsert.mock.calls[0][0][0];
    expect(inserted).toEqual({
      user_id: 'user-1',
      trick_name: 'Kickflip',
      status: 'trying',
      attempts: 0,
    });
    expect(inserted.first_landed_at).toBeUndefined();
  });

  it('stamps first_landed_at when a trick is logged directly as landed', async () => {
    const { mockInsert } = mockInsertChain();

    await userTricksService.create({
      user_id: 'user-1',
      trick_name: 'Kickflip',
      status: 'landed',
    });

    const inserted = mockInsert.mock.calls[0][0][0];
    expect(inserted.status).toBe('landed');
    expect(inserted.attempts).toBe(0);
    expect(typeof inserted.first_landed_at).toBe('string');
    expect(Date.parse(inserted.first_landed_at)).not.toBeNaN();
  });

  it('stamps first_landed_at when a trick is logged directly as consistent', async () => {
    const { mockInsert } = mockInsertChain();

    await userTricksService.create({
      user_id: 'user-1',
      trick_name: 'Treflip',
      status: 'consistent',
    });

    const inserted = mockInsert.mock.calls[0][0][0];
    expect(inserted.status).toBe('consistent');
    expect(typeof inserted.first_landed_at).toBe('string');
  });
});
