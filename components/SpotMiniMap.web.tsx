import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Constants from 'expo-constants';

export default function SpotMiniMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const container = useRef<any>(null);
  useEffect(() => {
    const mapbox = window.mapboxgl;
    const token =
      (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
      process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!container.current || !mapbox || !token) return;
    mapbox.accessToken = token;
    const map = new mapbox.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [longitude, latitude],
      zoom: 14,
      attributionControl: true,
    });
    const marker = new mapbox.Marker({ color: '#d2673d' })
      .setLngLat([longitude, latitude])
      .addTo(map);
    return () => {
      marker.remove();
      map.remove();
    };
  }, [latitude, longitude]);
  if (
    !process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN &&
    !Constants.expoConfig?.extra?.mapboxAccessToken
  ) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111827',
        }}
      >
        <Text style={{ color: '#D1D5DB' }}>Map unavailable</Text>
      </View>
    );
  }
  return <View ref={container} style={{ flex: 1 }} />;
}
