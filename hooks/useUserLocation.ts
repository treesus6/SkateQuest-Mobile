import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface UserLocationState {
  location: Location.LocationObject | null;
  coordinates: [number, number] | null; // [lng, lat] for Mapbox
  loading: boolean;
  error: string | null;
  granted: boolean;
}

/**
 * Hook for requesting location permission and getting current position.
 * Used by MapScreen, AddSpotScreen, and QRGeocacheScanner.
 */
export function useUserLocation(): UserLocationState {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setError('Location permission denied');
          setGranted(false);
          return;
        }

        setGranted(true);
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        setCoordinates([loc.coords.longitude, loc.coords.latitude]);
      } catch (err) {
        console.error('Location error:', err);
        setError('Failed to get location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, coordinates, loading, error, granted };
}
