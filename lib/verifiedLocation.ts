import * as Location from 'expo-location';

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
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? undefined,
  };
}
