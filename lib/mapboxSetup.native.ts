import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';

const accessToken = (
  (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
  ''
).trim();

export const mapboxConfigurationError = !accessToken
  ? 'The Mapbox access token is missing from this Android build.'
  : !accessToken.startsWith('pk.')
    ? 'The Mapbox access token in this Android build is invalid.'
    : null;

let initialized = false;

export function initializeMapbox(): boolean {
  if (mapboxConfigurationError) return false;

  if (!initialized) {
    // This must run synchronously before any native MapView is constructed.
    Mapbox.setAccessToken(accessToken);
    initialized = true;
  }

  return true;
}

export const isMapboxConfigured = initializeMapbox();
