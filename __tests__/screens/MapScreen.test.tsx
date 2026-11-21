import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapScreen from '../../screens/MapScreen.native';
import { spotsService } from '../../lib/spotsService';
import { shopsService } from '../../lib/shopsService';
import { savedSpotsService } from '../../lib/savedSpotsService';
import { PersistentCache } from '../../lib/persistentCache';

let mockIsConnected = true;

jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  const Camera = React.forwardRef((_props: Record<string, unknown>, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({ setCamera: jest.fn() }));
    return null;
  });
  return {
    __esModule: true,
    default: {
      setAccessToken: jest.fn(),
      MapView: 'MapView',
      Camera,
      PointAnnotation: 'PointAnnotation',
      ShapeSource: 'ShapeSource',
      CircleLayer: 'CircleLayer',
      SymbolLayer: 'SymbolLayer',
      UserLocation: 'UserLocation',
      Callout: 'Callout',
      StyleURL: { Street: 'mapbox://styles/mapbox/streets-v11' },
    },
  };
});
jest.mock('../../hooks/useSpotDiscovery', () => ({
  useSpotDiscovery: () => ({ pulse: {}, partners: [], error: null, refresh: jest.fn() }),
}));
jest.mock('../../lib/mapboxSetup', () => ({
  isMapboxConfigured: true,
  mapboxConfigurationError: null,
}));
jest.mock('../../lib/analytics', () => ({ SkateEvents: { mapOpened: jest.fn() } }));
jest.mock('../../lib/useNavigation', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'skater-a' } }),
}));
jest.mock('../../stores/useNetworkStore', () => ({
  useNetworkStore: (selector: (state: { isConnected: boolean }) => unknown) =>
    selector({ isConnected: mockIsConnected }),
}));
jest.mock('../../lib/spotsService', () => ({
  spotsService: { getNearby: jest.fn(), getById: jest.fn() },
}));
jest.mock('../../lib/shopsService', () => ({
  shopsService: { getNearby: jest.fn() },
}));
jest.mock('../../lib/savedSpotsService', () => ({
  savedSpotsService: {
    reconcileSavedSpots: jest.fn(),
    saveSpot: jest.fn(),
    unsaveSpot: jest.fn(),
  },
}));
jest.mock('../../components/MapStyleSelector', () => () => null);
jest.mock('../../components/MapFilters', () => () => null);
jest.mock('../../components/MapDirections', () => () => null);

const getNearby = spotsService.getNearby as jest.Mock;
const getById = spotsService.getById as jest.Mock;
const shopsGetNearby = shopsService.getNearby as jest.Mock;
const reconcileSavedSpots = savedSpotsService.reconcileSavedSpots as jest.Mock;
const saveSpot = savedSpotsService.saveSpot as jest.Mock;
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);

const spot = {
  id: 'spot-1',
  name: 'Library Ledges',
  latitude: 34.0522,
  longitude: -118.2437,
  spot_type: 'street',
  difficulty: 'Intermediate',
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockIsConnected = true;
  await AsyncStorage.clear();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: 'granted',
  });
  (Location as unknown as { getLastKnownPositionAsync: jest.Mock }).getLastKnownPositionAsync = jest
    .fn()
    .mockResolvedValue(null);
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 34.0522, longitude: -118.2437 },
    timestamp: Date.now(),
  });
  getNearby.mockResolvedValue({ data: [], error: null });
  getById.mockResolvedValue({ data: null, error: null });
  shopsGetNearby.mockResolvedValue({ data: [], error: null });
  reconcileSavedSpots.mockResolvedValue({ data: [], pendingLocalIds: [], error: null });
});

it('explains a denied location instead of silently sitting at the default view', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: 'denied',
  });

  const view = await render(<MapScreen />);
  await waitFor(() => expect(view.getByText('Location is off')).toBeTruthy());
  expect(view.getByText(/without location access/)).toBeTruthy();
  expect(view.getByText('Location off')).toBeTruthy();
  expect(getNearby).not.toHaveBeenCalled();

  await fireEvent.press(view.getByLabelText('Open location settings'));
  expect(openSettingsSpy).toHaveBeenCalled();
});

it('shows an honest error with retry when the load fails with no cache', async () => {
  getNearby.mockResolvedValue({ data: null, error: { message: 'boom' } });

  const view = await render(<MapScreen />);
  await waitFor(() => expect(view.getByText('Spots could not load')).toBeTruthy());
  expect(view.getByText('Spots unavailable')).toBeTruthy();
  expect(view.queryByText(/0 spots nearby/)).toBeNull();
  expect(view.queryByText(/Showing saved spots/)).toBeNull();

  await fireEvent.press(view.getByLabelText('Retry loading nearby spots'));
  await waitFor(() => expect(getNearby).toHaveBeenCalledTimes(2));
});

it('labels cached data as saved offline data when offline', async () => {
  mockIsConnected = false;
  await PersistentCache.set('spots_nearby_34.05_-118.24', [spot], 60 * 60 * 1000);

  const view = await render(<MapScreen />);
  await waitFor(() =>
    expect(view.getByText('Showing saved spots — offline data, up to 23h old')).toBeTruthy()
  );
  expect(view.getByText('1 spots · 0 shops nearby')).toBeTruthy();
  expect(getNearby).not.toHaveBeenCalled();
  expect(view.queryByText('Spots could not load')).toBeNull();
});

it('saves a bookmark to the server and rolls back when the server rejects it', async () => {
  getNearby.mockResolvedValue({ data: [spot], error: null });
  saveSpot.mockRejectedValueOnce(new Error('offline'));

  const view = await render(<MapScreen />);
  await waitFor(() => expect(view.getByLabelText('Open Library Ledges')).toBeTruthy());
  await fireEvent.press(view.getByLabelText('Open Library Ledges'));
  await waitFor(() => expect(view.getByLabelText('Save spot')).toBeTruthy());

  await fireEvent.press(view.getByLabelText('Save spot'));

  await waitFor(() => expect(saveSpot).toHaveBeenCalledWith('skater-a', 'spot-1'));
  await waitFor(() =>
    expect(alertSpy).toHaveBeenCalledWith('Bookmark not saved', expect.any(String))
  );
  expect(view.getByLabelText('Save spot')).toBeTruthy();
});
