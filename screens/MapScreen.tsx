import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { SkateSpot } from '../types';
import MapStyleSelector from '../components/MapStyleSelector';
import MapDirections from '../components/MapDirections';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INITIAL_COORDINATES = [-122.4324, 37.78825]; // [longitude, latitude] - San Francisco
const SEARCH_RADIUS_KM = 50; // Load spots within 50km radius

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>(INITIAL_COORDINATES as [number, number]);
  const [mapStyle, setMapStyle] = useState<string>(Mapbox.StyleURL.Street);
  const [selectedSpot, setSelectedSpot] = useState<SkateSpot | null>(null);
  const [showDirections, setShowDirections] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please enable location to find nearby skate spots', [
          {
            text: 'OK',
            onPress: () => loadSpots(INITIAL_COORDINATES[1], INITIAL_COORDINATES[0]),
          },
        ]);
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);

      const coordinates: [number, number] = [
        location.coords.longitude,
        location.coords.latitude,
      ];
      setCenterCoordinates(coordinates);

      loadSpots(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
      loadSpots(INITIAL_COORDINATES[1], INITIAL_COORDINATES[0]);
      setLoading(false);
    }
  };

  const loadSpots = async (lat: number, lng: number) => {
    try {
      // Use PostGIS to query spots within radius
      const radiusMeters = SEARCH_RADIUS_KM * 1000;

      const { data, error } = await supabase.rpc('get_nearby_spots', {
        lat,
        lng,
        radius_meters: radiusMeters,
      });

      if (error) {
        console.error('Error loading nearby spots:', error);
        // Fallback: load all spots if the RPC function doesn't exist
        const { data: allData, error: allError } = await supabase
          .from('skate_spots')
          .select('*')
          .limit(500);

        if (allError) {
          console.error('Error loading spots:', allError);
        } else {
          setSpots(allData || []);
        }
      } else {
        setSpots(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRegionDidChange = async () => {
    if (mapRef.current) {
      const center = await mapRef.current.getCenter();
      if (center) {
        // Reload spots for new region center
        loadSpots(center[1], center[0]);
      }
    }
  };

  const goToUserLocation = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.coords.longitude, userLocation.coords.latitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d2673d" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={mapStyle}
        onRegionDidChange={onRegionDidChange}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={12}
          centerCoordinate={centerCoordinates}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* User location */}
        {userLocation && (
          <Mapbox.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
          />
        )}

        {/* Skate spot markers with clustering */}
        <Mapbox.ShapeSource
          id="skate-spots"
          cluster
          clusterRadius={50}
          clusterMaxZoomLevel={14}
          shape={{
            type: 'FeatureCollection',
            features: spots.map(spot => ({
              type: 'Feature',
              id: spot.id,
              geometry: {
                type: 'Point',
                coordinates: [spot.longitude, spot.latitude],
              },
              properties: {
                name: spot.name,
                difficulty: spot.difficulty || 'Unknown',
                spotId: spot.id,
              },
            })),
          }}
          onPress={(event) => {
            const feature = event.features[0];
            if (feature && feature.properties && !feature.properties.cluster) {
              const spot = spots.find(s => s.id === feature.properties.spotId);
              if (spot) {
                setSelectedSpot(spot);
              }
            }
          }}
        >
          {/* Clustered points */}
          <Mapbox.CircleLayer
            id="clusters"
            filter={['has', 'point_count']}
            style={{
              circleColor: '#d2673d',
              circleRadius: [
                'step',
                ['get', 'point_count'],
                20,
                10,
                30,
                50,
                40,
              ],
              circleOpacity: 0.8,
            }}
          />

          {/* Cluster count text */}
          <Mapbox.SymbolLayer
            id="cluster-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count'],
              textSize: 14,
              textColor: '#ffffff',
              textFont: ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            }}
          />

          {/* Individual spot markers */}
          <Mapbox.CircleLayer
            id="unclustered-point"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: '#d2673d',
              circleRadius: 8,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff',
            }}
          />
        </Mapbox.ShapeSource>

        {/* Show directions if enabled */}
        {showDirections && selectedSpot && userLocation && (
          <MapDirections
            from={[userLocation.coords.longitude, userLocation.coords.latitude]}
            to={[selectedSpot.longitude, selectedSpot.latitude]}
            onClose={() => {
              setShowDirections(false);
              setSelectedSpot(null);
            }}
          />
        )}
      </Mapbox.MapView>

      {/* Map Style Selector */}
      <MapStyleSelector
        currentStyle={mapStyle}
        onStyleChange={setMapStyle}
      />

      {/* User location button */}
      {userLocation && (
        <TouchableOpacity style={styles.locationButton} onPress={goToUserLocation}>
          <Text style={styles.locationButtonText}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Spots counter */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>{spots.length} spots nearby</Text>
      </View>

      {/* Selected spot info */}
      {selectedSpot && !showDirections && (
        <View style={styles.spotInfoCard}>
          <View style={styles.spotInfoHeader}>
            <View style={styles.spotInfoContent}>
              <Text style={styles.spotInfoName}>{selectedSpot.name}</Text>
              <Text style={styles.spotInfoDifficulty}>
                Difficulty: {selectedSpot.difficulty || 'Unknown'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeSpotButton}
              onPress={() => setSelectedSpot(null)}
            >
              <Text style={styles.closeSpotButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.spotInfoActions}>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => setShowDirections(true)}
            >
              <Text style={styles.directionsButtonText}>🧭 Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => {
                navigation.navigate('SpotDetail', { spotId: selectedSpot.id });
                setSelectedSpot(null);
              }}
            >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.featuresGrid}>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Feed')}>
          <Text style={styles.featureIcon}>🌟</Text>
          <Text style={styles.featureText}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Challenges')}
        >
          <Text style={styles.featureIcon}>🏆</Text>
          <Text style={styles.featureText}>Challenges</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureCard, styles.qrScannerCard]}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <Text style={styles.featureIcon}>📱</Text>
          <Text style={styles.featureText}>Scan QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('TrickTracker')}
        >
          <Text style={styles.featureIcon}>🛹</Text>
          <Text style={styles.featureText}>Tricks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('SkateGame')}
        >
          <Text style={styles.featureIcon}>🎮</Text>
          <Text style={styles.featureText}>SKATE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Playlists')}
        >
          <Text style={styles.featureIcon}>🎧</Text>
          <Text style={styles.featureText}>Playlists</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Shops')}>
          <Text style={styles.featureIcon}>🛒</Text>
          <Text style={styles.featureText}>Shops</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Crews')}>
          <Text style={styles.featureIcon}>👥</Text>
          <Text style={styles.featureText}>Crews</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Events')}>
          <Text style={styles.featureIcon}>📅</Text>
          <Text style={styles.featureText}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureCard, styles.addSpotCard]}
          onPress={() => navigation.navigate('AddSpot', {})}
        >
          <Text style={styles.featureIcon}>➕</Text>
          <Text style={styles.featureText}>Add Spot</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Map')}>
          <Text style={styles.navButtonText}>🗺️ Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.navButtonText}>👤 Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationButtonText: {
    fontSize: 24,
  },
  counterBadge: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#d2673d',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  counterText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#f5f0ea',
  },
  featureCard: {
    width: '30%',
    margin: '1.5%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addSpotCard: {
    backgroundColor: '#d2673d',
  },
  qrScannerCard: {
    backgroundColor: '#e8b44d',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  navButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 14,
    color: '#d2673d',
    fontWeight: '600',
  },
  spotInfoCard: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  spotInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  spotInfoContent: {
    flex: 1,
  },
  spotInfoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  spotInfoDifficulty: {
    fontSize: 14,
    color: '#666',
  },
  closeSpotButton: {
    padding: 5,
  },
  closeSpotButtonText: {
    fontSize: 20,
    color: '#666',
  },
  spotInfoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  directionsButton: {
    flex: 1,
    backgroundColor: '#d2673d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#f5f0ea',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
});
