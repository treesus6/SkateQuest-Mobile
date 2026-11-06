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
const mockRpc = supabase.rpc as unknown as jest.Mock;

function mockUpdateChain(data: any = { id: 'trick-1', user_id: 'user-1' }) {
  const mockSingle = jest.fn().mockResolvedValue({ data, error: null });
  const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
  const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
  return { mockUpdate, mockSingle };
}

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

describe('userTricksService XP award on landed tricks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it('claims 25 XP once when a trick is created as landed', async () => {
    mockInsertChain();

    await userTricksService.create({
      user_id: 'user-1',
      trick_name: 'Kickflip',
      status: 'landed',
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('increment_xp', {
      p_user_id: 'user-1',
      p_xp_amount: 25,
    });
  });

  it('claims 25 XP when a trick is created as consistent', async () => {
    mockInsertChain();

    await userTricksService.create({
      user_id: 'user-1',
      trick_name: 'Treflip',
      status: 'consistent',
    });

    expect(mockRpc).toHaveBeenCalledWith('increment_xp', {
      p_user_id: 'user-1',
      p_xp_amount: 25,
    });
  });

  it('does not claim XP when a trick is created as trying', async () => {
    mockInsertChain();

    await userTricksService.create({
      user_id: 'user-1',
      trick_name: 'Kickflip',
      status: 'trying',
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('still saves the trick when the XP claim fails', async () => {
    mockInsertChain();
    mockRpc.mockRejectedValueOnce(new Error('No verified unclaimed 25 XP activity found'));

    const result = await userTricksService.create({
      user_id: 'user-1',
      trick_name: 'Kickflip',
      status: 'landed',
    });

    expect(result.data).toEqual({ id: 'trick-1' });
    expect(result.error).toBeNull();
  });

  it('stamps first_landed_at and claims XP when a trick is marked landed', async () => {
    const { mockUpdate } = mockUpdateChain();

    await userTricksService.updateStatus('trick-1', 'landed');

    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.status).toBe('landed');
    expect(typeof updates.first_landed_at).toBe('string');
    expect(mockRpc).toHaveBeenCalledWith('increment_xp', {
      p_user_id: 'user-1',
      p_xp_amount: 25,
    });
  });

  it('stamps first_landed_at and claims XP when a trick is marked consistent', async () => {
    mockUpdateChain();

    await userTricksService.updateStatus('trick-1', 'consistent');

    expect(mockRpc).toHaveBeenCalledWith('increment_xp', {
      p_user_id: 'user-1',
      p_xp_amount: 25,
    });
  });

  it('does not claim XP when a trick is marked trying', async () => {
    const { mockUpdate } = mockUpdateChain();

    await userTricksService.updateStatus('trick-1', 'trying');

    expect(mockUpdate.mock.calls[0][0].first_landed_at).toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
