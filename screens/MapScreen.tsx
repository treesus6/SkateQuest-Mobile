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
  Tv,
  Grid3x3,
  Flag,
  Ticket,
  Flame,
  CloudSun,
  Gem,
  Sunrise,
  Video,
  BookOpen,
  Heart,
  Award,
  Swords,
  UserCheck,
} from 'lucide-react-native';
import { spotsService } from '../lib/spotsService';
import { PersistentCache } from '../lib/persistentCache';
import { useNetworkStore } from '../stores/useNetworkStore';
import MapStyleSelector from '../components/MapStyleSelector';
import MapDirections from '../components/MapDirections';
import MapFilters from '../components/MapFilters';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INITIAL_COORDINATES = [-122.4324, 37.78825];
const SEARCH_RADIUS_KM = 50;

const FEATURES = [
  // Core
  { key: 'Feed', icon: Star, color: '#d2673d', screen: 'Feed' },
  { key: 'Challenges', icon: Trophy, color: '#4CAF50', screen: 'ChallengesTab' },
  { key: 'Tricks', icon: Zap, color: '#FF6B35', screen: 'TrickTracker' },
  { key: 'SKATE', icon: Gamepad2, color: '#6B4CE6', screen: 'SkateGame' },
  { key: 'Leaderboard', icon: BarChart3, color: '#2196F3', screen: 'Leaderboard' },
  { key: 'Playlists', icon: Music, color: '#E91E63', screen: 'Playlists' },
  { key: 'Shops', icon: ShoppingBag, color: '#795548', screen: 'Shops' },
  { key: 'Crews', icon: Users, color: '#009688', screen: 'Crews' },
  { key: 'Events', icon: Calendar, color: '#FF9800', screen: 'Events' },
  { key: 'Sessions', icon: Users, color: '#6B4CE6', screen: 'Sessions' },
  { key: 'Scan QR', icon: QrCode, color: '#e8b44d', screen: 'QRScanner' },
  // Community & Social
  { key: 'Battles', icon: Swords, color: '#e74c3c', screen: 'CrewBattles' },
  { key: 'Mentorship', icon: UserCheck, color: '#8e44ad', screen: 'Mentorship' },
  // Gamification
  { key: 'Bingo', icon: Grid3x3, color: '#27ae60', screen: 'TrickBingo' },
  { key: 'Conquer', icon: Flag, color: '#c0392b', screen: 'SpotConquer' },
  { key: 'Skate Pass', icon: Ticket, color: '#2980b9', screen: 'SeasonalPass' },
  { key: 'Streaks', icon: Flame, color: '#e67e22', screen: 'Streaks' },
  // Discovery
  { key: 'Weather', icon: CloudSun, color: '#3498db', screen: 'WeatherSpots' },
  { key: 'Hidden Gems', icon: Gem, color: '#1abc9c', screen: 'HiddenGems' },
  { key: 'Spot of Day', icon: Sunrise, color: '#f39c12', screen: 'SpotOfTheDay' },
  // Content
  { key: 'Clip of Week', icon: Video, color: '#9b59b6', screen: 'ClipOfWeek' },
  { key: 'Tutorials', icon: BookOpen, color: '#16a085', screen: 'TrickTutorials' },
  { key: 'Skate TV', icon: Tv, color: '#FF6B35', screen: 'SkateTV' },
  // Charity
  { key: 'Donate XP', icon: Heart, color: '#e74c3c', screen: 'DonateXP' },
  { key: 'Sponsors', icon: Award, color: '#FFD700', screen: 'SponsorLeaderboard' },
  // Add
  { key: 'Add Spot', icon: Plus, color: '#fff', screen: 'AddSpot', highlight: true },
];

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>(
    INITIAL_COORDINATES as [number, number]
  );
  const [mapStyle, setMapStyle] = useState<string>(Mapbox.StyleURL.Street);
  const [selectedSpot, setSelectedSpot] = useState<SkateSpot | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ park: true, street: true, diy: true, quest: true, shop: true });

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
    const cacheKey = `spots_nearby_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour fresh
    const STALE_WINDOW = 23 * 60 * 60 * 1000; // serve stale for 23 more hours offline

    const { isConnected } = useNetworkStore.getState();

    try {
      if (!isConnected) {
        const cached = await PersistentCache.get<SkateSpot[]>(cacheKey, STALE_WINDOW);
        if (cached) setSpots(cached.data);
        return;
      }

      const { data, error } = await spotsService.getNearby(lat, lng, SEARCH_RADIUS_KM * 1000);
      if (error) {
        // Network error — fall back to cache
        const cached = await PersistentCache.get<SkateSpot[]>(cacheKey, STALE_WINDOW);
        if (cached) {
          setSpots(cached.data);
        }
        // Don't call getAll() — 27k parks would OOM the device
      } else {
        const spotsData = (data || []) as SkateSpot[];
        setSpots(spotsData);
        await PersistentCache.set(cacheKey, spotsData, CACHE_TTL);
      }
    } catch (error) {
      const cached = await PersistentCache.get<SkateSpot[]>(cacheKey, STALE_WINDOW);
      if (cached) {
        setSpots(cached.data);
      } else {
        console.error('Error loading spots:', error);
        Alert.alert('Error', 'Could not load skate spots. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRegionDidChange = () => {
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(async () => {
      if (mapRef.current) {
        const center = await mapRef.current.getCenter();
        if (center) loadSpots(center[1], center[0]);
      }
    }, 800);
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

      <TouchableOpacity
        className="absolute top-[110px] right-5 bg-white dark:bg-gray-800 rounded-full w-[50px] h-[50px] justify-center items-center shadow-lg"
        onPress={() => setShowFilters(true)}
      >
        <Grid3x3 color="#d2673d" size={22} />
      </TouchableOpacity>

      <MapFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={activeFilters}
        onFilterChange={setActiveFilters}
      />

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
