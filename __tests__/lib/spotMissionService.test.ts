/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { spotMissionService } from '../../lib/spotMissionService';
import { supabase } from '../../lib/supabase';

const mockRpc = supabase.rpc as unknown as {
  mockResolvedValue: (value: any) => void;
};

describe('spotMissionService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a persisted route through the transactional RPC', async () => {
    mockRpc.mockResolvedValue({ data: 'route-1', error: null });

    await expect(
      spotMissionService.createRoute(['spot-1', 'spot-2', 'spot-3'], 'Downtown Run')
    ).resolves.toBe('route-1');
    expect(supabase.rpc).toHaveBeenCalledWith('create_spot_mission_route', {
      p_spot_ids: ['spot-1', 'spot-2', 'spot-3'],
      p_title: 'Downtown Run',
    });
  });

  it('passes live coordinates to server-side stop verification', async () => {
    mockRpc.mockResolvedValue({
      data: { verified: true, distance_meters: 14, route_completed: false, xp_awarded: 0 },
      error: null,
    });

    await expect(spotMissionService.verifyStop('stop-1', 45.6, -122.5)).resolves.toMatchObject({
      verified: true,
      distance_meters: 14,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('verify_spot_mission_stop', {
      p_stop_id: 'stop-1',
      p_latitude: 45.6,
      p_longitude: -122.5,
    });
  });

  it('surfaces a rejected GPS verification', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Move within 150 meters' } });
    await expect(spotMissionService.verifyStop('stop-1', 0, 0)).rejects.toThrow(
      'Move within 150 meters'
    );
  });
});
