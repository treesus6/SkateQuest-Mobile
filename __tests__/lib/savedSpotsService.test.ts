/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { savedSpotsService } from '../../lib/savedSpotsService';
import { supabase } from '../../lib/supabase';
import { Logger } from '../../lib/logger';

const mockFrom = supabase.from as unknown as jest.Mock;

/**
 * Supabase list queries await the chain itself (thenable); single-row
 * read-backs resolve through maybeSingle/single.
 */
function installChain(listResult: unknown, singleResult: unknown) {
  mockFrom.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.select = jest.fn(() => chain);
    chain.insert = jest.fn(() => chain);
    chain.upsert = jest.fn(() => Promise.resolve(listResult));
    chain.delete = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.single = jest.fn(() => Promise.resolve(singleResult));
    chain.maybeSingle = jest.fn(() => Promise.resolve(singleResult));
    chain.then = (resolve: (value: unknown) => void) => resolve(listResult);
    return chain;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
});

describe('savedSpotsService', () => {
  it('reads saved spot ids from the server table', async () => {
    installChain(
      { data: [{ spot_id: 'spot-1' }, { spot_id: 'spot-2' }], error: null },
      { data: null, error: null }
    );

    await expect(savedSpotsService.getSavedSpotIds('user-1')).resolves.toEqual({
      data: ['spot-1', 'spot-2'],
      error: null,
    });
    expect(mockFrom).toHaveBeenCalledWith('user_saved_spots');
  });

  it('returns an empty list and the error when the server read fails', async () => {
    installChain({ data: null, error: { message: 'boom' } }, { data: null, error: null });

    await expect(savedSpotsService.getSavedSpotIds('user-1')).resolves.toEqual({
      data: [],
      error: { message: 'boom' },
    });
  });

  it('saves a bookmark only when the read-back confirms it', async () => {
    installChain(
      { data: null, error: null },
      { data: { spot_id: 'spot-1' }, error: null }
    );

    await expect(savedSpotsService.saveSpot('user-1', 'spot-1')).resolves.toBeUndefined();
    const upsertChain = mockFrom.mock.results[0].value as { upsert: jest.Mock };
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', spot_id: 'spot-1' },
      { onConflict: 'user_id,spot_id' }
    );
  });

  it('refuses to claim a save when the read-back finds nothing', async () => {
    installChain(
      { data: null, error: null },
      { data: null, error: null }
    );

    await expect(savedSpotsService.saveSpot('user-1', 'spot-1')).rejects.toThrow(
      'could not be verified'
    );
  });

  it('removes a bookmark only when the read-back confirms it is gone', async () => {
    installChain(
      { data: null, error: null },
      { data: null, error: null }
    );

    await expect(savedSpotsService.unsaveSpot('user-1', 'spot-1')).resolves.toBeUndefined();
    const deleteChain = mockFrom.mock.results[0].value as { delete: jest.Mock };
    expect(deleteChain.delete).toHaveBeenCalled();
  });

  it('refuses to claim a removal when the row still reads back', async () => {
    installChain(
      { data: null, error: null },
      { data: { spot_id: 'spot-1' }, error: null }
    );

    await expect(savedSpotsService.unsaveSpot('user-1', 'spot-1')).rejects.toThrow(
      'could not be verified'
    );
  });

  it('reconciles local-only ids onto the server and keeps failures local', async () => {
    // Server knows spot-1; local also has spot-2 (uploads fine) and spot-3
    // (whose read-back fails, so it stays pending instead of being lost).
    let upsertCalls = 0;
    mockFrom.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.upsert = jest.fn(() => {
        upsertCalls += 1;
        return Promise.resolve({ data: null, error: null });
      });
      chain.delete = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
      chain.maybeSingle = jest.fn(() =>
        Promise.resolve(
          upsertCalls === 1
            ? { data: { spot_id: 'spot-2' }, error: null }
            : { data: null, error: null }
        )
      );
      chain.then = (resolve: (value: unknown) => void) =>
        resolve({ data: [{ spot_id: 'spot-1' }], error: null });
      return chain;
    });

    const result = await savedSpotsService.reconcileSavedSpots('user-1', [
      'spot-1',
      'spot-2',
      'spot-3',
    ]);

    expect(result.data.sort()).toEqual(['spot-1', 'spot-2', 'spot-3']);
    expect(result.pendingLocalIds).toEqual(['spot-3']);
    expect(result.error).toBeNull();
  });

  it('keeps every local id when the server read fails', async () => {
    installChain({ data: null, error: { message: 'offline' } }, { data: null, error: null });

    const result = await savedSpotsService.reconcileSavedSpots('user-1', ['spot-9']);

    expect(result.data).toEqual(['spot-9']);
    expect(result.pendingLocalIds).toEqual(['spot-9']);
    expect(result.error).toEqual({ message: 'offline' });
  });
});
