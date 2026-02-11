import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Navigation, X } from 'lucide-react-native';

interface MapDirectionsProps {
  from: [number, number];
  to: [number, number];
  onClose: () => void;
}

interface RouteData {
  coordinates: number[][];
  distance: number;
  duration: number;
}

export default function MapDirections({ from, to, onClose }: MapDirectionsProps) {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchRoute(); }, [from, to]);

  const fetchRoute = async () => {
    try {
      setLoading(true);
      setError(null);
      const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&access_token=${accessToken}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        setRoute({
          coordinates: routeData.geometry.coordinates,
          distance: routeData.distance,
          duration: routeData.duration,
        });
      } else {
        setError('No route found');
      }
    } catch (err) {
      console.error('Error fetching route:', err);
      setError('Failed to fetch route');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <View className="absolute bottom-5 left-5 right-5 bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center shadow-lg">
        <ActivityIndicator size="small" color="#d2673d" />
        <Text className="text-sm text-gray-500 dark:text-gray-400 ml-2.5">Loading route...</Text>
      </View>
    );
  }

  if (error || !route) {
    return (
      <View className="absolute bottom-5 left-5 right-5 bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center shadow-lg">
        <Text className="text-sm text-red-500 flex-1">{error || 'No route available'}</Text>
        <TouchableOpacity onPress={onClose} className="p-1">
          <X color="#666" size={20} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View className="absolute bottom-5 left-5 right-5 bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center shadow-lg">
        <View className="flex-1 flex-row items-center">
          <Navigation color="#d2673d" size={20} />
          <Text className="text-lg font-bold text-brand-terracotta mx-2.5">{formatDistance(route.distance)}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">{formatDuration(route.duration)}</Text>
        </View>
        <TouchableOpacity onPress={onClose} className="p-1">
          <X color="#666" size={20} />
        </TouchableOpacity>
      </View>

      <Mapbox.ShapeSource
        id="routeSource"
        shape={{
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: route.coordinates },
        }}
      >
        <Mapbox.LineLayer
          id="routeLine"
          style={{ lineColor: '#d2673d', lineWidth: 4, lineCap: 'round', lineJoin: 'round' }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}
