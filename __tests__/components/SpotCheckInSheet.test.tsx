import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SpotCheckInSheet from '../../components/SpotCheckInSheet';
import { supabase } from '../../lib/supabase';
import { discoveryService } from '../../lib/discoveryService';
import { getVerifiedCoordinates } from '../../lib/verifiedLocation';
jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'skater' } }),
}));
jest.mock('../../lib/verifiedLocation', () => ({
  getVerifiedCoordinates: jest.fn().mockResolvedValue({ latitude: 45, longitude: -122 }),
}));
jest.mock('../../lib/discoveryService', () => ({
  discoveryService: { startSession: jest.fn(), endSession: jest.fn() },
  reportDiscoveryError: (_context: string, error: Error) => error.message,
}));
const maybeSingle = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  maybeSingle.mockResolvedValue({ data: null, error: null });
  const chain: any = {};
  for (const method of ['select', 'eq', 'gt', 'order', 'limit'])
    chain[method] = jest.fn(() => chain);
  chain.maybeSingle = maybeSingle;
  (supabase.from as jest.Mock).mockReturnValue(chain);
});
it('does not close or announce a saved check-in when persistence fails', async () => {
  (discoveryService.startSession as jest.Mock).mockRejectedValue(new Error('Read-back failed'));
  const onSaved = jest.fn(),
    onClose = jest.fn();
  const view = await render(
    <SpotCheckInSheet
      spot={{ id: 'real-spot', name: 'Real Park' }}
      onSaved={onSaved}
      onClose={onClose}
    />
  );
  await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
  await fireEvent.press(view.getByText('CHECK IN HERE'));
  await waitFor(() => expect(view.getByText('Read-back failed')).toBeTruthy());
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
it('verifies fresh device coordinates before saving the selected real spot', async () => {
  (discoveryService.startSession as jest.Mock).mockResolvedValue({ checkin_id: 'saved' });
  const onSaved = jest.fn();
  const view = await render(
    <SpotCheckInSheet
      spot={{ id: 'real-spot', name: 'Real Park' }}
      onSaved={onSaved}
      onClose={jest.fn()}
    />
  );
  await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
  await fireEvent.press(view.getByText('120m'));
  await fireEvent.press(view.getByText('GOOFY'));
  await fireEvent.press(view.getByText('CHECK IN HERE'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(getVerifiedCoordinates).toHaveBeenCalled();
  expect(discoveryService.startSession).toHaveBeenCalledWith(
    'real-spot',
    { latitude: 45, longitude: -122 },
    120,
    'goofy',
    ''
  );
});
it('checks out only the saved check-in belonging to this account and spot', async () => {
  maybeSingle.mockResolvedValue({
    data: { id: 'own-checkin', stance: 'regular', message: '' },
    error: null,
  });
  (discoveryService.endSession as jest.Mock).mockResolvedValue(undefined);
  const onSaved = jest.fn();
  const view = await render(
    <SpotCheckInSheet
      spot={{ id: 'real-spot', name: 'Real Park' }}
      onSaved={onSaved}
      onClose={jest.fn()}
    />
  );
  await waitFor(() => expect(view.getByText('CHECK OUT')).toBeTruthy());
  await fireEvent.press(view.getByText('CHECK OUT'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(discoveryService.endSession).toHaveBeenCalledWith('own-checkin');
  expect(discoveryService.startSession).not.toHaveBeenCalled();
});
