import { discoveryService, matchesDiscoveryFilter } from '../../lib/discoveryService';
import { supabase } from '../../lib/supabase';
const rpc = supabase.rpc as jest.Mock;
const from = supabase.from as jest.Mock;
beforeEach(() => jest.clearAllMocks());
it('does not turn missing conditions/activity into dry or live spots', () => {
  const spot = { id: 'spot', spot_type: 'street' };
  expect(matchesDiscoveryFilter(spot, 'dry', undefined, [], new Set())).toBe(false);
  expect(matchesDiscoveryFilter(spot, 'live', undefined, [], new Set())).toBe(false);
  expect(matchesDiscoveryFilter(spot, 'saved', undefined, [], new Set(['spot']))).toBe(true);
  expect(matchesDiscoveryFilter(spot, 'partners', undefined, [], new Set())).toBe(false);
});
it('paginates radar queries instead of dropping pins after 200 spots', async () => {
  rpc.mockResolvedValue({ data: [], error: null });
  await discoveryService.getPulse(Array.from({ length: 205 }, (_, i) => String(i)));
  expect(rpc.mock.calls.map(c => c[1].p_spot_ids.length)).toEqual([200, 5]);
});
it('fails a session when the write response has no persisted check-in id', async () => {
  rpc.mockResolvedValue({ data: {}, error: null });
  await expect(
    discoveryService.startSession('spot', { latitude: 45, longitude: -122 }, 60, 'regular', '')
  ).rejects.toThrow('not saved');
  expect(from).not.toHaveBeenCalled();
});
it('does not confirm a check-in whose independent read-back is expired', async () => {
  rpc.mockResolvedValue({ data: { checkin_id: 'visit' }, error: null });
  const single = jest
    .fn()
    .mockResolvedValue({
      data: { id: 'visit', park_id: 'spot', expires_at: '2020-01-01' },
      error: null,
    });
  from.mockReturnValue({ select: () => ({ eq: () => ({ single }) }) });
  await expect(
    discoveryService.startSession('spot', { latitude: 45, longitude: -122 }, 60, 'regular', '')
  ).rejects.toThrow('verify');
});
it('requires independent referral read-back before returning success', async () => {
  rpc.mockResolvedValue({ data: { referral_id: 'referral', xp_awarded: 10 }, error: null });
  from.mockReturnValue({
    select: () => ({
      eq: () => ({ single: async () => ({ data: null, error: { message: 'not readable' } }) }),
    }),
  });
  await expect(discoveryService.recordReferral('partner', 'map')).rejects.toEqual({
    message: 'not readable',
  });
});
