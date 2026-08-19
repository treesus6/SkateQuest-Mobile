import { getBrowserLocation } from './browserLocation';
import type { VerifiedCoordinates } from './verifiedLocation';

export async function getVerifiedCoordinates(): Promise<VerifiedCoordinates> {
  const location = await getBrowserLocation();
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
  };
}
