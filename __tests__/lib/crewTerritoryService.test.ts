/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { crewTerritoryService } from '../../lib/crewTerritoryService';
import { supabase } from '../../lib/supabase';

const mockRpc = supabase.rpc as unknown as {
  mockResolvedValue: (value: any) => void;
};

describe('crewTerritoryService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('claims territory through the GPS-verified server RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        claimed: true,
        crew_id: 'crew-1',
        points_awarded: 10,
        crew_spot_points: 40,
        distance_meters: 22,
      },
      error: null,
    });

    await expect(
      crewTerritoryService.claim('spot-1', 45.6, -122.5, 'kickflip')
    ).resolves.toMatchObject({ claimed: true, points_awarded: 10 });
    expect(supabase.rpc).toHaveBeenCalledWith('claim_crew_territory', {
      p_spot_id: 'spot-1',
      p_latitude: 45.6,
      p_longitude: -122.5,
      p_trick_name: 'kickflip',
      p_proof_url: null,
    });
  });

  it('surfaces cooldown enforcement from the database', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'You already scored this spot in the last 6 hours' },
    });
    await expect(crewTerritoryService.claim('spot-1', 0, 0, 'ollie')).rejects.toThrow(
      'last 6 hours'
    );
  });
});
