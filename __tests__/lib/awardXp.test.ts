/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../lib/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { awardXp } from '../../lib/awardXp';
import { supabase } from '../../lib/supabase';

const mockRpc = supabase.rpc as unknown as jest.MockedFunction<typeof supabase.rpc>;

describe('awardXp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns awarded:true when increment_xp succeeds', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null } as never);

    const result = await awardXp({
      userId: 'user-1',
      amount: 50,
      context: 'test_success',
    });

    expect(mockRpc).toHaveBeenCalledWith('increment_xp', {
      user_id: 'user-1',
      amount: 50,
    });
    expect(result).toEqual({ awarded: true, error: null });
  });

  it('returns awarded:false without throwing when RPC returns an error', async () => {
    const rpcError = { message: 'permission denied', code: '42501' };
    mockRpc.mockResolvedValue({ data: null, error: rpcError } as never);

    const result = await awardXp({
      userId: 'user-1',
      amount: 25,
      context: 'test_rpc_error',
    });

    expect(result.awarded).toBe(false);
    expect(result.error).toEqual(rpcError);
  });

  it('returns awarded:false without throwing when RPC throws', async () => {
    mockRpc.mockRejectedValue(new Error('network down') as never);

    const result = await awardXp({
      userId: 'user-1',
      amount: 10,
      context: 'test_throw',
    });

    expect(result.awarded).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('skips the RPC for invalid amount or empty userId', async () => {
    const invalidAmount = await awardXp({
      userId: 'user-1',
      amount: 0,
      context: 'test_invalid_amount',
    });
    const invalidUser = await awardXp({
      userId: '',
      amount: 10,
      context: 'test_invalid_user',
    });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(invalidAmount.awarded).toBe(false);
    expect(invalidUser.awarded).toBe(false);
  });

  it('floors fractional XP amounts before calling the RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null } as never);

    await awardXp({
      userId: 'user-1',
      amount: 12.9,
      context: 'test_floor',
    });

    expect(mockRpc).toHaveBeenCalledWith('increment_xp', {
      user_id: 'user-1',
      amount: 12,
    });
  });
});
