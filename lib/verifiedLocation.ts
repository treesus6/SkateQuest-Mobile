import * as Location from 'expo-location';
import { parseMapCoordinates } from './geoCoordinates';

export interface VerifiedCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export async function getVerifiedCoordinates(): Promise<VerifiedCoordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission is required to prove you are at this skate spot.');
  }

  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const coordinates = parseMapCoordinates(location.coords.latitude, location.coords.longitude);
  if (!coordinates) {
    throw new Error('Device returned invalid location coordinates.');
  }

  return {
    latitude: coordinates[1],
    longitude: coordinates[0],
    accuracy: location.coords.accuracy ?? undefined,
  };
}
