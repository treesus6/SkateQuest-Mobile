import { Platform } from 'react-native';
import { getBrowserLocation } from './browserLocation';
import { parseMapCoordinates } from './geoCoordinates';

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export async function getCurrentLocation(): Promise<CurrentLocation> {
  if (Platform.OS === 'web') {
    const location = await getBrowserLocation();
    const coordinates = parseMapCoordinates(location.latitude, location.longitude);
    if (!coordinates) {
      throw new Error('Browser returned invalid location coordinates.');
    }
    return { ...location, latitude: coordinates[1], longitude: coordinates[0] };
  }

  const Location = await import('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const coordinates = parseMapCoordinates(position.coords.latitude, position.coords.longitude);
  if (!coordinates) {
    throw new Error('Device returned invalid location coordinates.');
  }

  return {
    latitude: coordinates[1],
    longitude: coordinates[0],
    accuracy: position.coords.accuracy,
  };
}
