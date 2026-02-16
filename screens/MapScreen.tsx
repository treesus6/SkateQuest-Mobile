import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, SkateSpot } from '../types';
import {
  Crosshair,
  Navigation,
  Plus,
  Star,
  Trophy,
  QrCode,
  Gamepad2,
  Music,
  ShoppingBag,
  Users,
  Calendar,
  Zap,
  BarChart3,
  MapPin,
} from 'lucide-react-native';
import { spotsService } from '../lib/spotsService';
import MapStyleSelector from '../components/MapStyleSelector';
import MapDirections from '../components/MapDirections';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INITIAL_COORDINATES = [-122.4324, 37.78825];
const SEARCH_RADIUS_KM = 50;

const FEATURES = [
  { key: 'Feed', icon: Star, color: '#d2673d', screen: 'Feed' },
  { key: 'Challenges', icon: Trophy, color: '#4CAF50', screen: 'Challenges' },
  { key: 'Scan QR', icon: QrCode, color: '#e8b44d', screen: 'QRScanner' },
  { key: 'Tricks', icon: Zap, color: '#FF6B35', screen: 'TrickTracker' },
  { key: 'SKATE', icon: Gamepad2, color: '#6B4CE6', screen: 'SkateGame' },
  { key: 'Leaderboard', icon: BarChart3, color: '#2196F3', screen: 'Leaderboard' },
  { key: 'Playlists', icon: Music, color: '#E91E63', screen: 'Playlists' },
  { key: 'Shops', icon: ShoppingBag, color: '#795548', screen: 'Shops' },
  { key: 'Crews', icon: Users, color: '#009688', screen: 'Crews' },
  { key: 'Events', icon: Calendar, color: '#FF9800', screen: 'Events' },
  { key: 'Add Spot', icon: Plus, color: '#fff', screen: 'AddSpot', highlight: true },
];

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>(
    INITIAL_COORDINATES as [number, number]
  );
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
          { text: 'OK', onPress: () => loadSpots(INITIAL_COORDINATES[1], INITIAL_COORDINATES[0]) },
        ]);
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      setCenterCoordinates([location.coords.longitude, location.coords.latitude]);
      loadSpots(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      loadSpots(INITIAL_COORDINATES[1], INITIAL_COORDINATES[0]);
      setLoading(false);
    }
  };

  const loadSpots = async (lat: number, lng: number) => {
    try {
      const { data, error } = await spotsService.getNearby(lat, lng, SEARCH_RADIUS_KM * 1000);
      if (error) {
        const { data: allData } = await spotsService.getAll();
        setSpots(allData || []);
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
      if (center) loadSpots(center[1], center[0]);
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
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 justify-center items-center">
        <LoadingSkeleton height={200} className="mx-4 mb-4" />
        <Text className="text-base text-gray-500 mt-2.5">Loading map...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <Mapbox.MapView
        ref={mapRef}
        style={{ flex: 1 }}
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
        {userLocation && <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />}
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
              geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
              properties: {
                name: spot.name,
                difficulty: spot.difficulty || 'Unknown',
                spotId: spot.id,
              },
            })),
          }}
          onPress={event => {
            const f = event.features[0];
            if (f?.properties && !f.properties.cluster) {
              const s = spots.find(sp => sp.id === f.properties!.spotId);
              if (s) setSelectedSpot(s);
            }
          }}
        >
          <Mapbox.CircleLayer
            id="clusters"
            filter={['has', 'point_count']}
            style={{
              circleColor: '#d2673d',
              circleRadius: ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
              circleOpacity: 0.8,
            }}
          />
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

      <MapStyleSelector currentStyle={mapStyle} onStyleChange={setMapStyle} />

      {userLocation && (
        <TouchableOpacity
          className="absolute top-[50px] right-5 bg-white dark:bg-gray-800 rounded-full w-[50px] h-[50px] justify-center items-center shadow-lg"
          onPress={goToUserLocation}
        >
          <Crosshair color="#d2673d" size={24} />
        </TouchableOpacity>
      )}

      <View className="absolute top-[50px] left-5 bg-brand-terracotta px-4 py-2 rounded-full shadow-lg">
        <Text className="text-white font-bold text-sm">{spots.length} spots nearby</Text>
      </View>

      {selectedSpot && !showDirections && (
        <View className="absolute bottom-[100px] left-5 right-5 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
          <View className="flex-row justify-between items-start mb-2.5">
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                {selectedSpot.name}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Difficulty: {selectedSpot.difficulty || 'Unknown'}
              </Text>
            </View>
            <TouchableOpacity className="p-1" onPress={() => setSelectedSpot(null)}>
              <Text className="text-xl text-gray-500">✕</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              className="flex-1 bg-brand-terracotta p-3 rounded-lg items-center flex-row justify-center gap-1.5"
              onPress={() => setShowDirections(true)}
            >
              <Navigation color="#fff" size={14} />
              <Text className="text-white font-semibold text-sm">Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-brand-beige dark:bg-gray-700 p-3 rounded-lg items-center"
              onPress={() => {
                navigation.navigate('SpotDetail', { spotId: selectedSpot.id });
                setSelectedSpot(null);
              }}
            >
              <Text className="text-gray-800 dark:text-gray-100 font-semibold text-sm">
                View Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="flex-row flex-wrap p-2.5 bg-brand-beige dark:bg-gray-900">
        {FEATURES.map(feat => {
          const Icon = feat.icon;
          return (
            <TouchableOpacity
              key={feat.key}
              className={`w-[30%] m-[1.5%] rounded-xl p-3.5 items-center shadow-sm ${feat.highlight ? 'bg-brand-terracotta' : 'bg-white dark:bg-gray-800'}`}
              onPress={() =>
                navigation.navigate(feat.screen as any, feat.screen === 'AddSpot' ? {} : undefined)
              }
            >
              <Icon color={feat.highlight ? '#fff' : feat.color} size={28} />
              <Text
                className={`text-xs font-semibold mt-1 text-center ${feat.highlight ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {feat.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 px-1.5">
        <TouchableOpacity
          className="flex-1 p-2.5 items-center"
          onPress={() => navigation.navigate('Map')}
        >
          <MapPin color="#d2673d" size={20} />
          <Text className="text-sm text-brand-terracotta font-semibold mt-0.5">Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 p-2.5 items-center"
          onPress={() => navigation.navigate('Profile')}
        >
          <Users color="#d2673d" size={20} />
          <Text className="text-sm text-brand-terracotta font-semibold mt-0.5">Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
