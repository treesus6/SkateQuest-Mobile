import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SpotsScreen from '../../screens/SpotsScreen';
import { spotsService } from '../../lib/spotsService';

jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../lib/spotsService', () => ({
  spotsService: { getAll: jest.fn() },
}));

const getAll = spotsService.getAll as jest.Mock;
const spot = { id: 'spot-1', name: 'Library Ledges', latitude: 45.6, longitude: -122.6 };

beforeEach(() => {
  jest.clearAllMocks();
});

it('shows a retryable load error instead of "No spots yet" when the fetch fails', async () => {
  getAll.mockResolvedValue({ data: null, error: { message: 'network down' } });

  const view = await render(<SpotsScreen />);
  await waitFor(() => expect(view.getByText('Spots could not load')).toBeTruthy());
  expect(view.queryByText('No spots yet')).toBeNull();

  getAll.mockResolvedValue({ data: [spot], error: null });
  await fireEvent.press(view.getByLabelText('Retry loading spots'));
  await waitFor(() => expect(view.getByText('Library Ledges')).toBeTruthy());
  expect(getAll).toHaveBeenCalledTimes(2);
});

it('shows a retryable load error when the fetch throws', async () => {
  getAll.mockRejectedValue(new Error('offline'));

  const view = await render(<SpotsScreen />);
  await waitFor(() => expect(view.getByText('Spots could not load')).toBeTruthy());
  expect(view.getByText(/Check your connection/)).toBeTruthy();
});

it('still shows the genuine empty state when the server returns no spots', async () => {
  getAll.mockResolvedValue({ data: [], error: null });

  const view = await render(<SpotsScreen />);
  await waitFor(() => expect(view.getByText('No spots yet')).toBeTruthy());
  expect(view.queryByText('Spots could not load')).toBeNull();
});
