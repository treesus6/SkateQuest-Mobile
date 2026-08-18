import { Platform } from 'react-native';
import { getBrowserLocation } from './browserLocation';

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export async function getCurrentLocation(): Promise<CurrentLocation> {
  if (Platform.OS === 'web') {
    return getBrowserLocation();
  }

  const Location = await import('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}
