import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LiveCheckInScreen from '../../screens/LiveCheckInScreen';
import { discoveryService } from '../../lib/discoveryService';
import { spotsService } from '../../lib/spotsService';
import { supabase } from '../../lib/supabase';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ spotId: 'real-spot' }) }));
jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'skater' } }),
}));
jest.mock('../../lib/verifiedLocation', () => ({
  getVerifiedCoordinates: jest.fn().mockResolvedValue({ latitude: 45, longitude: -122 }),
}));
jest.mock('../../lib/spotsService', () => ({ spotsService: { getNearby: jest.fn() } }));
jest.mock('../../lib/discoveryService', () => ({
  discoveryService: { startSession: jest.fn() },
  reportDiscoveryError: () => 'Network unavailable',
}));
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
beforeEach(() => {
  jest.clearAllMocks();
  (spotsService.getNearby as jest.Mock).mockResolvedValue({
    data: [{ id: 'real-spot', name: 'Real Park', latitude: 45, longitude: -122 }],
    error: null,
  });
  (supabase.from as jest.Mock).mockReturnValue({
    select: () => ({
      gt: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
    }),
  });
});
it('surfaces a failed persisted check-in instead of claiming success', async () => {
  (discoveryService.startSession as jest.Mock).mockRejectedValue(
    new Error('Check-in read-back failed')
  );
  const view = await render(<LiveCheckInScreen />);
  await fireEvent.press(view.getByText('Use my location'));
  await waitFor(() => expect(view.getByText('Real Park')).toBeTruthy());
  await fireEvent.press(view.getByText('120m'));
  await fireEvent.press(view.getByText('GOOFY'));
  await fireEvent.press(view.getByText("I'm skating here"));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('Could not check in', 'Check-in read-back failed')
  );
  expect(discoveryService.startSession).toHaveBeenCalledWith(
    'real-spot',
    { latitude: 45, longitude: -122 },
    120,
    'goofy',
    ''
  );
  expect(alert.mock.calls.some(call => call[0] === 'Checked in')).toBe(false);
});
