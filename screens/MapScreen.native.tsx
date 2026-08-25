import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Linking, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useNavigation } from '../lib/useNavigation';
import { NativeStackNavigationProp } from '../lib/useNavigation';
import { RootStackParamList, SkateSpot, Shop } from '../types';
import {
  Crosshair,
  Navigation,
  Grid3x3,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react-native';
import { spotsService } from '../lib/spotsService';
import { shopsService } from '../lib/shopsService';
import { PersistentCache } from '../lib/persistentCache';
import { useNetworkStore } from '../stores/useNetworkStore';
import { useAuthStore } from '../stores/useAuthStore';
import { SkateEvents } from '../lib/analytics';
import MapStyleSelector from '../components/MapStyleSelector';
import MapDirections from '../components/MapDirections';
import MapFilters from '../components/MapFilters';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const INITIAL_COORDINATES: [number, number] = [0, 20];
const SEARCH_RADIUS_KM = 50;
const SAVED_SPOTS_KEY = 'saved_spot_ids';
const LOCATION_TIMEOUT_MS = 6000;
const PORTAL_DIMENSION_COORDINATES: [number, number] = [-124.05915, 44.64155];
const PORTAL_DIMENSION_URL = 'https://portaldimension.com';

const CONDITION_OPTIONS: Array<{ key: string; emoji: string; label: string }> = [
  { key: 'dry', emoji: '🌞', label: 'Dry' },
  { key: 'wet', emoji: '🌧', label: 'Wet' },
  { key: 'crowded', emoji: '👥', label: 'Busy' },
  { key: 'empty', emoji: '🏄', label: 'Empty' },
  { key: 'cops', emoji: '🚨', label: 'Cops' },
  { key: 'under_construction', emoji: '🚧', label: 'WIP' },
];

const CONDITION_LABELS: Record<string, string> = {
  dry: '🌞 Dry',
  wet: '🌧 Wet',
  crowded: '👥 Busy',
  empty: '🏄 Empty',
  cops: '🚨 Cops',
  clear: '✅ Clear',
  under_construction: '🚧 WIP',
};

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const portalMarkerRef = useRef<any>(null);
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState(0);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>(INITIAL_COORDINATES);
  const [mapStyle, setMapStyle] = useState<string>(Mapbox.StyleURL.Street);
  const mapboxAccessToken =
    (Constants.expoConfig?.extra?.mapboxAccessToken as string) ??
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
    '';
  const [selectedSpot, setSelectedSpot] = useState<SkateSpot | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    park: true,
    street: true,
    diy: true,
    quest: true,
    shop: true,
  });
  const [savedSpotIds, setSavedSpotIds] = useState<Set<string>>(new Set());
  const [spotCondition, setSpotCondition] = useState<string | null>(null);
  const [reportingCondition, setReportingCondition] = useState(false);

  useEffect(() => {
    if (mapboxAccessToken) {
      Mapbox.setAccessToken(mapboxAccessToken);
    } else {
      setMapError('The Mapbox access token is missing from this Android build.');
    }

    SkateEvents.mapOpened();
    void requestLocationPermission();
    AsyncStorage.getItem(SAVED_SPOTS_KEY).then((raw: string | null) => {
      if (raw) {
        try {
          setSavedSpotIds(new Set(JSON.parse(raw)));
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedSpot) {
      setSpotCondition(null);
      return;
    }
    let cancelled = false;
    spotsService
      .getById(selectedSpot.id)
      .then(({ data }) => {
        if (cancelled) return;
        const conditions = (data as any)?.spot_conditions;
        if (conditions?.length > 0) {
          const cond = conditions[0];
          const notExpired = !cond.expires_at || new Date(cond.expires_at) > new Date();
          setSpotCondition(notExpired ? cond.condition : null);
        } else {
          setSpotCondition(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedSpot?.id]);

  const applyLocation = (location: Location.LocationObject) => {
    setUserLocation(location);
    setCenterCoordinates([location.coords.longitude, location.coords.latitude]);
    cameraRef.current?.setCamera({
      centerCoordinate: [location.coords.longitude, location.coords.latitude],
      zoomLevel: 12,
      animationDuration: 700,
    });
  };

  const requestLocationPermission = async () => {
    let usedLastKnown = false;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastKnown) {
        usedLastKnown = true;
        applyLocation(lastKnown);
        void loadSpots(lastKnown.coords.latitude, lastKnown.coords.longitude);
      }

      const currentPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Location request timed out')), LOCATION_TIMEOUT_MS);
      });
      const location = await Promise.race([currentPromise, timeoutPromise]);
      applyLocation(location);
      await loadSpots(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.warn('Location unavailable; keeping the map usable:', error);
      if (!usedLastKnown) {
        setLoading(false);
      }
    }
  };

  const loadSpots = async (lat: number, lng: number) => {
    const cacheKey = `spots_nearby_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const shopCacheKey = `shops_nearby_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const CACHE_TTL = 60 * 60 * 1000;
    const STALE_WINDOW = 23 * 60 * 60 * 1000;
    const { isConnected } = useNetworkStore.getState();

    try {
      if (!isConnected) {
        const [cachedSpots, cachedShops] = await Promise.all([
          PersistentCache.get<SkateSpot[]>(cacheKey, STALE_WINDOW),
          PersistentCache.get<Shop[]>(shopCacheKey, STALE_WINDOW),
        ]);
        if (cachedSpots) setSpots(cachedSpots.data);
        if (cachedShops) setShops(cachedShops.data);
        return;
      }

      const [{ data, error }, shopsResult] = await Promise.all([
        spotsService.getNearby(lat, lng, SEARCH_RADIUS_KM * 1000),
        shopsService.getNearby(lat, lng, SEARCH_RADIUS_KM).catch(() => ({ data: [], error: null })),
      ]);
      if (error) {
        const cached = await PersistentCache.get<SkateSpot[]>(cacheKey, STALE_WINDOW);
        if (cached) setSpots(cached.data);
      } else {
        const spotsData = (data || []) as SkateSpot[];
        setSpots(spotsData);
        await PersistentCache.set(cacheKey, spotsData, CACHE_TTL);
      }

      const shopsData = (shopsResult.data || []) as Shop[];
      setShops(shopsData);
      await PersistentCache.set(shopCacheKey, shopsData, CACHE_TTL);
    } catch (error) {
      const [cachedSpots, cachedShops] = await Promise.all([
        PersistentCache.get<SkateSpot[]>(cacheKey, STALE_WINDOW),
        PersistentCache.get<Shop[]>(shopCacheKey, STALE_WINDOW),
      ]);
      if (cachedSpots) {
        setSpots(cachedSpots.data);
        if (cachedShops) setShops(cachedShops.data);
      } else {
        console.error('Error loading spots:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRegionDidChange = () => {
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(async () => {
      if (!userLocation && loading) return;
      if (mapRef.current) {
        const center = await mapRef.current.getCenter();
        if (center) void loadSpots(center[1], center[0]);
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

  const openAddSpot = async () => {
    let mapCenter: [number, number] | null = null;
    try {
      const currentCenter = await mapRef.current?.getCenter();
      if (currentCenter && currentCenter.length >= 2) {
        mapCenter = [currentCenter[0], currentCenter[1]];
      }
    } catch {
      mapCenter = null;
    }
    navigation.navigate(
      'AddSpot',
      mapCenter ? { latitude: mapCenter[1], longitude: mapCenter[0] } : {}
    );
  };
  const toggleSave = async (spot: SkateSpot) => {
    const next = new Set(savedSpotIds);
    if (next.has(spot.id)) next.delete(spot.id);
    else next.add(spot.id);
    setSavedSpotIds(next);
    await AsyncStorage.setItem(SAVED_SPOTS_KEY, JSON.stringify(Array.from(next)));
  };

  const reportCondition = async (condition: string) => {
    if (!user || !selectedSpot || reportingCondition) return;
    setReportingCondition(true);
    try {
      const savedCondition = await spotsService.reportCondition(
        selectedSpot.id,
        user.id,
        condition
      );
      setSpotCondition(savedCondition.condition);
    } catch (error) {
      Alert.alert(
        'Condition not reported',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setReportingCondition(false);
    }
  };

  const openPortalDimension = async () => {
    try {
      await Linking.openURL(PORTAL_DIMENSION_URL);
    } catch {
      Alert.alert('Could not open Portal Dimension', 'The website could not be opened right now.');
    }
  };

  const filteredSpots = useMemo(
    () =>
      spots.filter(spot => {
        const type = (spot.spot_type?.toLowerCase() ?? 'park') as keyof typeof activeFilters;
        return activeFilters[type] ?? false;
      }),
    [spots, activeFilters]
  );

  const filteredShops = useMemo(
    () => (activeFilters.shop ? shops : []),
    [shops, activeFilters.shop]
  );
  const spotsWithoutPhotos = useMemo(
    () => filteredSpots.filter(spot => !spot.image_url?.trim()),
    [filteredSpots]
  );
  const spotsWithPhotos = useMemo(
    () => filteredSpots.filter(spot => !!spot.image_url?.trim()),
    [filteredSpots]
  );
  const savedIdsArray = Array.from(savedSpotIds);

  return (
    <View className="flex-1 bg-[#07090D]">
      <Mapbox.MapView
        key={mapInstance}
        ref={mapRef}
        style={{ flex: 1 }}
        styleURL={mapStyle}
        onRegionDidChange={() => onRegionDidChange()}
        onDidFinishLoadingMap={() => setMapError(null)}
        onDidFailLoadingMap={() => setMapError('Map tiles could not be loaded.')}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={userLocation ? 12 : 2}
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
            features: spotsWithoutPhotos.map(spot => ({
              type: 'Feature',
              id: spot.id,
              geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
              properties: {
                name: spot.name,
                difficulty: spot.difficulty || 'Unknown',
                spotId: spot.id,
                spotType: spot.spot_type?.toLowerCase() ?? 'park',
              },
            })),
          }}
          onPress={(event: any) => {
            const f = event.features[0];
            if (f?.properties && !f.properties.cluster) {
              const spot = filteredSpots.find(
                (item: SkateSpot) => item.id === f.properties!.spotId
              );
              if (spot) {
                setSelectedShop(null);
                setSelectedSpot(spot);
              }
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
              circleColor: [
                'match',
                ['get', 'spotType'],
                'street',
                '#F59E0B',
                'diy',
                '#A855F7',
                'quest',
                '#22C55E',
                '#D2673D',
              ],
              circleRadius: 8,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff',
            }}
          />
          <Mapbox.CircleLayer
            id="saved-points"
            filter={[
              'in',
              ['get', 'spotId'],
              ['literal', savedIdsArray.length > 0 ? savedIdsArray : ['']] as any,
            ]}
            style={{
              circleColor: '#FFD700',
              circleRadius: 11,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff',
            }}
          />
        </Mapbox.ShapeSource>

        {spotsWithPhotos.map(spot => (
          <PhotoSpotAnnotation
            key={spot.id}
            spot={spot}
            selected={selectedSpot?.id === spot.id}
            saved={savedSpotIds.has(spot.id)}
            onSelect={() => {
              setSelectedShop(null);
              setSelectedSpot(spot);
            }}
          />
        ))}

        {filteredShops.length > 0 && (
          <Mapbox.ShapeSource
            id="skate-shops"
            shape={{
              type: 'FeatureCollection',
              features: filteredShops.map(shop => ({
                type: 'Feature',
                id: shop.id,
                geometry: { type: 'Point', coordinates: [shop.longitude, shop.latitude] },
                properties: { shopId: shop.id, name: shop.name },
              })),
            }}
            onPress={(event: any) => {
              const f = event.features[0];
              const shop = filteredShops.find(item => item.id === f?.properties?.shopId);
              if (shop) {
                setSelectedSpot(null);
                setSelectedShop(shop);
              }
            }}
          >
            <Mapbox.CircleLayer
              id="shop-points"
              style={{
                circleColor: '#795548',
                circleRadius: 9,
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        <Mapbox.PointAnnotation
          ref={portalMarkerRef}
          id="portal-dimension-newport"
          coordinate={PORTAL_DIMENSION_COORDINATES}
          anchor={{ x: 0.5, y: 1 }}
          onSelected={() => void openPortalDimension()}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: '#D2673D',
              backgroundColor: '#FFFFFF',
              padding: 3,
              shadowColor: '#000000',
              shadowOpacity: 0.35,
              shadowRadius: 7,
              shadowOffset: { width: 0, height: 3 },
              elevation: 7,
              overflow: 'hidden',
            }}
          >
            <Image
              source={require('../assets/supporters/portal-dimension.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              accessibilityLabel="Portal Dimension"
              onLoad={() => portalMarkerRef.current?.refresh?.()}
            />
          </View>
          <Mapbox.Callout title="Portal Dimension · Newport, Oregon skatepark partner" />
        </Mapbox.PointAnnotation>

        {showDirections && userLocation && (selectedSpot || selectedShop) && (
          <MapDirections
            from={[userLocation.coords.longitude, userLocation.coords.latitude]}
            to={
              selectedSpot
                ? [selectedSpot.longitude, selectedSpot.latitude]
                : [selectedShop!.longitude, selectedShop!.latitude]
            }
            onClose={() => {
              setShowDirections(false);
              setSelectedSpot(null);
              setSelectedShop(null);
            }}
          />
        )}
      </Mapbox.MapView>

      <MapStyleSelector currentStyle={mapStyle} onStyleChange={setMapStyle} />

      {mapError && (
        <View className="absolute bottom-[104px] left-5 right-5 rounded-2xl border border-[#6B3325] bg-[#15100F] p-4 z-20">
          <View className="flex-row items-start gap-3">
            <TriangleAlert color="#D2673D" size={22} />
            <View className="flex-1">
              <Text className="text-base font-black text-white">Map could not load</Text>
              <Text className="mt-1 text-sm text-gray-400">{mapError}</Text>
            </View>
          </View>
          <TouchableOpacity
            className="mt-4 min-h-[46px] flex-row items-center justify-center gap-2 rounded-xl bg-[#D2673D]"
            onPress={() => {
              setMapError(null);
              setMapStyle(Mapbox.StyleURL.Street);
              setMapInstance(value => value + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading the map"
          >
            <RotateCcw color="#FFFFFF" size={18} />
            <Text className="font-black text-white">Retry map</Text>
          </TouchableOpacity>
        </View>
      )}

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

      <View className="absolute top-[50px] left-5 bg-[#D2673D] px-4 py-2 rounded-full shadow-lg">
        <Text className="text-white font-bold text-sm">
          {loading
            ? 'Finding nearby spots…'
            : `${filteredSpots.length} spots${activeFilters.shop ? ` · ${filteredShops.length} shops` : ''} nearby`}
        </Text>
      </View>

      {savedSpotIds.size > 0 && (
        <View className="absolute top-[90px] left-5 bg-yellow-500 px-3 py-1.5 rounded-full shadow">
          <Text className="text-white font-bold text-xs">⭐ {savedSpotIds.size} saved</Text>
        </View>
      )}

      {!selectedSpot &&
        !selectedShop &&
        !showDirections &&
        !mapError &&
        filteredSpots.length > 0 && (
          <View className="absolute bottom-[92px] left-0 right-0">
            <Text className="px-5 mb-2 text-xs font-black tracking-widest text-white">
              NEARBY SPOTS
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {filteredSpots.slice(0, 12).map(spot => (
                <TouchableOpacity
                  key={spot.id}
                  className="w-[210px] rounded-2xl border border-[#2A303A] bg-[#10151D] p-4"
                  onPress={() => {
                    setSelectedSpot(spot);
                    cameraRef.current?.setCamera({
                      centerCoordinate: [spot.longitude, spot.latitude],
                      zoomLevel: 15,
                      animationDuration: 700,
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${spot.name}`}
                >
                  <Text className="text-base font-black text-white" numberOfLines={1}>
                    {spot.name}
                  </Text>
                  <Text className="mt-1 text-xs font-bold uppercase text-[#D2673D]">
                    {(spot.spot_type ?? 'Park').toLowerCase()} · {spot.difficulty || 'Unrated'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      {selectedSpot && !showDirections && (
        <View className="absolute bottom-[100px] left-5 right-5 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
          {selectedSpot.image_url ? (
            <Image
              source={{ uri: selectedSpot.image_url }}
              className="w-full h-28 rounded-xl mb-3"
              resizeMode="cover"
              accessibilityLabel={`Photo of ${selectedSpot.name}`}
            />
          ) : null}
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-1 mr-2">
              <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-0.5">
                {selectedSpot.name}
              </Text>
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedSpot.difficulty || 'Unknown'}
                </Text>
                {spotCondition && (
                  <View className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {CONDITION_LABELS[spotCondition] ?? spotCondition}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => toggleSave(selectedSpot)}
                accessibilityLabel={savedSpotIds.has(selectedSpot.id) ? 'Unsave spot' : 'Save spot'}
                accessibilityRole="button"
              >
                {savedSpotIds.has(selectedSpot.id) ? (
                  <BookmarkCheck color="#d2673d" size={22} />
                ) : (
                  <Bookmark color="#9CA3AF" size={22} />
                )}
              </TouchableOpacity>
              <TouchableOpacity className="p-1" onPress={() => setSelectedSpot(null)}>
                <Text className="text-xl text-gray-500">✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-xs text-gray-400 mb-1.5 font-medium">Report conditions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {CONDITION_OPTIONS.map(opt => {
                  const isActive = spotCondition === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => reportCondition(opt.key)}
                      disabled={reportingCondition}
                      className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${
                        isActive
                          ? 'bg-[#D2673D] border-brand-terracotta'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <Text className="text-sm">{opt.emoji}</Text>
                      <Text
                        className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View className="flex-row gap-2.5">
            <TouchableOpacity
              className="flex-1 bg-[#D2673D] p-3 rounded-lg items-center flex-row justify-center gap-1.5"
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

      {selectedShop && !showDirections && (
        <View className="absolute bottom-[100px] left-5 right-5 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg z-10">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {selectedShop.name}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedShop.address}
              </Text>
              {selectedShop.verified && (
                <Text className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
                  Verified skate shop
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedShop(null)}>
              <Text className="text-xl text-gray-500">✕</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              className="flex-1 bg-[#D2673D] p-3 rounded-lg items-center flex-row justify-center gap-1.5"
              onPress={() => setShowDirections(true)}
            >
              <Navigation color="#fff" size={14} />
              <Text className="text-white font-semibold text-sm">Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-brand-beige dark:bg-gray-700 p-3 rounded-lg items-center"
              disabled={!selectedShop.website}
              onPress={() => selectedShop.website && Linking.openURL(selectedShop.website)}
              style={{ opacity: selectedShop.website ? 1 : 0.5 }}
            >
              <Text className="text-gray-800 dark:text-gray-100 font-semibold text-sm">
                {selectedShop.website ? 'Website' : 'No Website'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        className="absolute bottom-6 right-5 bg-[#D2673D] rounded-full w-14 h-14 justify-center items-center shadow-lg"
        onPress={() => void openAddSpot()}
        accessibilityRole="button"
        accessibilityLabel="Add a skate spot"
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}

function PhotoSpotAnnotation({
  spot,
  selected,
  saved,
  onSelect,
}: {
  spot: SkateSpot;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
}) {
  const annotationRef = useRef<any>(null);

  return (
    <Mapbox.PointAnnotation
      ref={annotationRef}
      id={`photo-spot-${spot.id}`}
      coordinate={[spot.longitude, spot.latitude]}
      anchor={{ x: 0.5, y: 0.5 }}
      onSelected={onSelect}
    >
      <View
        style={{
          width: selected ? 54 : 46,
          height: selected ? 54 : 46,
          borderRadius: 14,
          borderWidth: selected ? 4 : 3,
          borderColor: selected ? '#D2673D' : saved ? '#FFD700' : '#FFFFFF',
          backgroundColor: '#101722',
          padding: 2,
          overflow: 'hidden',
          elevation: selected ? 9 : 6,
        }}
      >
        <Image
          source={{ uri: spot.image_url! }}
          style={{ width: '100%', height: '100%', borderRadius: 9 }}
          resizeMode="cover"
          accessibilityLabel={`${spot.name} skate spot`}
          onLoad={() => annotationRef.current?.refresh?.()}
        />
      </View>
    </Mapbox.PointAnnotation>
  );
}
