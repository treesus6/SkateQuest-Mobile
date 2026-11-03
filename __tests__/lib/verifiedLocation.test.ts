import * as Location from 'expo-location';
import { getVerifiedCoordinates } from '../../lib/verifiedLocation';

const requestPermission = Location.requestForegroundPermissionsAsync as jest.Mock;
const getPosition = Location.getCurrentPositionAsync as jest.Mock;

describe('native verified GPS coordinates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestPermission.mockResolvedValue({ status: 'granted' });
    getPosition.mockResolvedValue({
      coords: { latitude: 45.64, longitude: -122.67, accuracy: 8 },
    });
  });

  it('returns a valid high-accuracy device location', async () => {
    await expect(getVerifiedCoordinates()).resolves.toEqual({
      latitude: 45.64,
      longitude: -122.67,
      accuracy: 8,
    });
    expect(getPosition).toHaveBeenCalledWith({ accuracy: Location.Accuracy.High });
  });

  it.each([
    [NaN, -122.67],
    [Infinity, -122.67],
    [91, -122.67],
    [45.64, -181],
  ])('rejects invalid GPS values (%s, %s) before downstream writes', async (latitude, longitude) => {
    getPosition.mockResolvedValueOnce({
      coords: { latitude, longitude, accuracy: 8 },
    });
    await expect(getVerifiedCoordinates()).rejects.toThrow(
      'Device returned invalid location coordinates.'
    );
  });

  it('does not request a location after permission is denied', async () => {
    requestPermission.mockResolvedValueOnce({ status: 'denied' });
    await expect(getVerifiedCoordinates()).rejects.toThrow('Location permission is required');
    expect(getPosition).not.toHaveBeenCalled();
  });
});
