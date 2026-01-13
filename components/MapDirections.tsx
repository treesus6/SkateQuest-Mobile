import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';

interface MapDirectionsProps {
  from: [number, number]; // [longitude, latitude]
  to: [number, number]; // [longitude, latitude]
  onClose: () => void;
}

interface RouteData {
  coordinates: number[][];
  distance: number; // in meters
  duration: number; // in seconds
}

export default function MapDirections({ from, to, onClose }: MapDirectionsProps) {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoute();
  }, [from, to]);

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
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.infoContainer}>
        <ActivityIndicator size="small" color="#d2673d" />
        <Text style={styles.infoText}>Loading route...</Text>
      </View>
    );
  }

  if (error || !route) {
    return (
      <View style={styles.infoContainer}>
        <Text style={styles.errorText}>{error || 'No route available'}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {/* Route info banner */}
      <View style={styles.infoContainer}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeLabel}>🚶 Walk</Text>
          <Text style={styles.routeDistance}>{formatDistance(route.distance)}</Text>
          <Text style={styles.routeDuration}>{formatDuration(route.duration)}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Route line on map */}
      <Mapbox.ShapeSource
        id="routeSource"
        shape={{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        }}
      >
        <Mapbox.LineLayer
          id="routeLine"
          style={{
            lineColor: '#d2673d',
            lineWidth: 4,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  routeDistance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d2673d',
    marginRight: 10,
  },
  routeDuration: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#d9534f',
    flex: 1,
  },
});
