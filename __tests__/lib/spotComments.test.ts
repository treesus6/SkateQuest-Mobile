/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getUnverifiedCommentMessage, postSpotComment, verifySpotComment } from '../../lib/spotComments';
import { supabase } from '../../lib/supabase';
import { Logger } from '../../lib/logger';

const mockFrom = supabase.from as unknown as jest.Mock;

function installChain(singleResult: unknown) {
  mockFrom.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.select = jest.fn(() => chain);
    chain.insert = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.single = jest.fn(() => Promise.resolve(singleResult));
    chain.maybeSingle = jest.fn(() => Promise.resolve(singleResult));
    return chain;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
});

describe('spotComments', () => {
  it('posts a comment and returns the verified row', async () => {
    installChain({
      data: {
        id: 'comment-1',
        spot_id: 'spot-1',
        user_id: 'user-1',
        content: 'Dry and fast',
        created_at: '2026-11-17T00:00:00.000Z',
      },
      error: null,
    });

    await expect(postSpotComment('spot-1', 'user-1', '  Dry and fast  ')).resolves.toEqual({
      id: 'comment-1',
      spot_id: 'spot-1',
      user_id: 'user-1',
      content: 'Dry and fast',
      created_at: '2026-11-17T00:00:00.000Z',
    });
  });

  it('rejects when the insert returns a row for a different spot', async () => {
    installChain({
      data: {
        id: 'comment-1',
        spot_id: 'spot-2',
        user_id: 'user-1',
        content: 'Dry and fast',
        created_at: '2026-11-17T00:00:00.000Z',
      },
      error: null,
    });

    await expect(postSpotComment('spot-1', 'user-1', 'Dry and fast')).rejects.toThrow(
      'could not be verified'
    );
  });

  it('rejects when the insert errors', async () => {
    installChain({ data: null, error: { message: 'rls denied' } });

    await expect(postSpotComment('spot-1', 'user-1', 'Dry and fast')).rejects.toThrow(
      'Failed to post the comment'
    );
  });

  it('verifies a comment only when the read-back finds the row', async () => {
    installChain({ data: { id: 'comment-1' }, error: null });
    await expect(verifySpotComment('comment-1')).resolves.toBe(true);

    installChain({ data: null, error: null });
    await expect(verifySpotComment('comment-1')).resolves.toBe(false);

    installChain({ data: null, error: { message: 'boom' } });
    await expect(verifySpotComment('comment-1')).resolves.toBe(false);
  });

  it('tells the user to check the spot instead of claiming the comment failed', () => {
    expect(getUnverifiedCommentMessage()).toMatch(/may have posted/);
    expect(getUnverifiedCommentMessage()).toMatch(/Check the spot before posting it again/);
  });
});
