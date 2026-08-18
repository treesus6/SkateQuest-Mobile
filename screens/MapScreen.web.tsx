import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Crosshair, MapPin, Plus, RotateCcw, TriangleAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getBrowserLocation } from '../lib/browserLocation';
import { spotsService } from '../lib/spotsService';
import { Logger } from '../lib/logger';
import { SkateSpot } from '../types';

const FALLBACK: [number, number] = [-122.4324, 37.78825];

export default function MapScreen() {
  const router = useRouter();
  const containerRef = useRef<any>(null);
  const mapRef = useRef<MapboxGLMap | null>(null);
  const markersRef = useRef<MapboxGLMarker[]>([]);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SkateSpot | null>(null);
  const [center, setCenter] = useState<[number, number]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token =
    (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const loadSpots = useCallback(async (coordinates: [number, number]) => {
    const { data, error: queryError } = await spotsService.getNearby(
      coordinates[1],
      coordinates[0],
      50000
    );
    if (queryError) throw queryError;
    setSpots((data ?? []) as SkateSpot[]);
  }, []);

  const locateUser = useCallback(async () => {
    setLocationLoading(true);
    setError(null);
    try {
      const location = await getBrowserLocation();
      const next: [number, number] = [location.longitude, location.latitude];
      setCenter(next);
      mapRef.current?.flyTo({ center: next, zoom: 14 });
      await loadSpots(next);
    } catch (locationError) {
      const message =
        locationError instanceof Error
          ? locationError.message
          : 'Could not determine your location.';
      setError(message);
      Logger.warn('Browser location failed', { message });
    } finally {
      setLocationLoading(false);
    }
  }, [loadSpots]);

  useEffect(() => {
    loadSpots(FALLBACK)
      .catch(queryError => {
        Logger.error('Web map spots query failed', queryError);
        setError('Skate spots could not be loaded. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
    void locateUser();
  }, [loadSpots, locateUser]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;
    if (!window.mapboxgl) {
      setError('The map library could not be loaded. Check your connection and try again.');
      return;
    }
    window.mapboxgl.accessToken = token;
    const map = new window.mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 12,
      attributionControl: true,
    });
    map.on('load', () => setError(current => (current?.includes('map library') ? null : current)));
    map.on('error', () =>
      setError('Map tiles could not be loaded. Check the Mapbox token and network.')
    );
    mapRef.current = map;
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const mapbox = window.mapboxgl;
    const map = mapRef.current;
    if (!mapbox || !map) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = spots.map(spot => {
      const marker = new mapbox.Marker({ color: '#d2673d' })
        .setLngLat([spot.longitude, spot.latitude])
        .setPopup(new mapbox.Popup({ offset: 18 }).setText(spot.name))
        .addTo(map);
      return marker;
    });
  }, [spots]);

  if (!token) {
    return <MapError message="Mapbox is not configured. Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#07090D' }}>
      <View ref={containerRef} nativeID="skatequest-web-map" style={{ flex: 1, minHeight: 420 }} />
      <View style={{ position: 'absolute', top: 16, left: 16, right: 16, gap: 10 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#D2673D',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '800' }}>
            {spots.length} real spots nearby
          </Text>
        </View>
        {error ? (
          <View
            style={{
              backgroundColor: '#15100F',
              borderColor: '#6B3325',
              borderWidth: 1,
              borderRadius: 14,
              padding: 12,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <TriangleAlert color="#D2673D" size={20} />
            <Text selectable style={{ color: '#F3F4F6', flex: 1 }}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ position: 'absolute', right: 16, bottom: 104, gap: 10 }}>
        <MapButton
          label="Use my location"
          onPress={locateUser}
          icon={
            locationLoading ? <ActivityIndicator color="#D2673D" /> : <Crosshair color="#D2673D" />
          }
        />
        <MapButton
          label="Add a spot"
          onPress={() => router.push('/(screens)/add-spot')}
          icon={<Plus color="#D2673D" />}
        />
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#D2673D"
          style={{ position: 'absolute', top: '45%', alignSelf: 'center' }}
        />
      ) : null}
      <ScrollView
        horizontal
        style={{ position: 'absolute', left: 0, right: 0, bottom: 14 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        showsHorizontalScrollIndicator={false}
      >
        {spots.slice(0, 15).map(spot => (
          <Pressable
            key={spot.id}
            onPress={() => {
              setSelectedSpot(spot);
              mapRef.current?.flyTo({ center: [spot.longitude, spot.latitude], zoom: 15 });
            }}
            style={{
              width: 190,
              padding: 14,
              borderRadius: 16,
              backgroundColor: selectedSpot?.id === spot.id ? '#2A1812' : '#10151D',
              borderWidth: 1,
              borderColor: '#343A45',
            }}
          >
            <Text numberOfLines={1} style={{ color: 'white', fontWeight: '800' }}>
              {spot.name}
            </Text>
            <Text style={{ color: '#AAB1BC', marginTop: 4 }}>{spot.spot_type ?? 'Skate spot'}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function MapButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </Pressable>
  );
}

function MapError({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#07090D',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}
    >
      <MapPin color="#D2673D" size={36} />
      <Text selectable style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>
        {message}
      </Text>
      <RotateCcw color="#9CA3AF" />
    </View>
  );
}
