/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { spotsService } from '../../lib/spotsService';
import { supabase } from '../../lib/supabase';

const mockRpc = supabase.rpc as unknown as {
  mockResolvedValue: (value: unknown) => void;
};

describe('spotsService Add Spot contracts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('checks for a nearby same-location spot before creation', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'spot-1', name: 'Already Here', distance_meters: 2.4 }],
      error: null,
    });

    await expect(spotsService.findDuplicate(45.6387, -122.6615, 'street')).resolves.toEqual({
      data: { id: 'spot-1', name: 'Already Here', distance_meters: 2.4 },
      error: null,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('find_duplicate_spot', {
      p_latitude: 45.6387,
      p_longitude: -122.6615,
      p_spot_type: 'street',
    });
  });

  it('sends the spot, creator ratings, and optional photo through one RPC', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'spot-2' }, error: null });

    await spotsService.createWithDetails({
      name: '  Library Ledges  ',
      latitude: 45.6387,
      longitude: -122.6615,
      difficultyLabel: 'Intermediate',
      obstacles: ['ledge'],
      tricks: [' boardslide ', '', 'kickflip'],
      spotType: 'street',
      bustRisk: 'medium',
      potential: 5,
      difficulty: 4,
      quality: 5,
      photoUrl:
        'https://project.supabase.co/storage/v1/object/public/spot-photos/spot_photos/user/photo.jpg',
      photoFileSize: 42,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('create_spot_with_full_details', {
      p_name: 'Library Ledges',
      p_latitude: 45.6387,
      p_longitude: -122.6615,
      p_difficulty: 'Intermediate',
      p_obstacles: ['ledge'],
      p_tricks: ['boardslide', 'kickflip'],
      p_spot_type: 'street',
      p_bust_risk: 'medium',
      p_potential_rating: 5,
      p_difficulty_rating: 4,
      p_quality_rating: 5,
      p_photo_url:
        'https://project.supabase.co/storage/v1/object/public/spot-photos/spot_photos/user/photo.jpg',
      p_photo_file_size: 42,
    });
  });

  it('upserts one persisted rating per skater', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'rating-1' }, error: null });

    await spotsService.rate('spot-2', { potential: 4, difficulty: 3, quality: 5 });

    expect(supabase.rpc).toHaveBeenCalledWith('upsert_spot_rating', {
      p_spot_id: 'spot-2',
      p_potential: 4,
      p_difficulty: 3,
      p_quality: 5,
    });
  });
});
