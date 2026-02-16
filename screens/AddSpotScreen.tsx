import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { spotsService } from '../lib/spotsService';
import { profilesService } from '../lib/profilesService';
import Button from '../components/ui/Button';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddSpot'>;
type AddSpotRouteProp = RouteProp<RootStackParamList, 'AddSpot'>;

const { height } = Dimensions.get('window');

const OBSTACLES = [
  'Stairs',
  'Handrail',
  'Flatbar',
  'Ledge',
  'Hubba',
  'Manual Pad',
  'Quarterpipe',
  'Bowl',
  'Gap',
  'Wallride',
];

export default function AddSpotScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddSpotRouteProp>();
  const { user } = useAuthStore();
  const cameraRef = useRef<Mapbox.Camera>(null);

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState(route.params?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(route.params?.longitude?.toString() || '');
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(
    route.params?.latitude && route.params?.longitude
      ? [route.params.longitude, route.params.latitude]
      : null
  );
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(
    'Beginner'
  );
  const [spotType, setSpotType] = useState<'park' | 'street' | 'diy' | 'quest' | 'shop'>('park');
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [bustRisk, setBustRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [tricks, setTricks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        if (!selectedCoordinates && cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [location.coords.longitude, location.coords.latitude],
            zoomLevel: 15,
            animationDuration: 1000,
          });
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleMapPress = (event: any) => {
    const { geometry } = event;
    if (geometry?.coordinates) {
      const [lng, lat] = geometry.coordinates;
      setSelectedCoordinates([lng, lat]);
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
    }
  };

  const handleSubmit = async () => {
    if (!name || !latitude || !longitude) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Invalid coordinates');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await spotsService.create({
        name,
        latitude: lat,
        longitude: lng,
        difficulty,
        obstacles,
        added_by: user?.id || '',
      });
      if (error) throw error;

      const { data: userData } = await profilesService.getById(user?.id || '');
      if (userData) {
        await profilesService.update(user?.id || '', {
          spots_added: (userData.spots_added || 0) + 1,
          xp: (userData.xp || 0) + 100,
        });
      }
      Alert.alert('Success', 'Spot added! You earned 100 XP!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View style={{ height: height * 0.4 }} className="bg-white dark:bg-gray-800 mb-2.5 relative">
        <View className="absolute top-2.5 left-0 right-0 z-10 items-center">
          <View className="bg-brand-terracotta/90 px-4 py-2.5 rounded-full">
            <Text className="text-white text-sm font-semibold">Tap map to select location</Text>
          </View>
        </View>
        <Mapbox.MapView
          style={{ flex: 1 }}
          styleURL={Mapbox.StyleURL.Street}
          onPress={handleMapPress}
        >
          <Mapbox.Camera
            ref={cameraRef}
            zoomLevel={15}
            centerCoordinate={
              selectedCoordinates ||
              (userLocation
                ? [userLocation.coords.longitude, userLocation.coords.latitude]
                : [-122.4324, 37.78825])
            }
          />
          {userLocation && <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />}
          {selectedCoordinates && (
            <Mapbox.PointAnnotation id="selected-spot" coordinate={selectedCoordinates}>
              <View className="items-center justify-center">
                <MapPin color="#d2673d" size={40} />
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      </View>

      <View className="px-5 pb-8">
        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
          Spot Name *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Downtown Ledges"
          placeholderTextColor="#999"
          editable={!submitting}
        />

        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
          Latitude *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          value={latitude}
          onChangeText={text => {
            setLatitude(text);
            const lat = parseFloat(text);
            const lng = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lng)) setSelectedCoordinates([lng, lat]);
          }}
          placeholder="37.7749"
          placeholderTextColor="#999"
          keyboardType="numeric"
          editable={!submitting}
        />

        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
          Longitude *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          value={longitude}
          onChangeText={text => {
            setLongitude(text);
            const lat = parseFloat(latitude);
            const lng = parseFloat(text);
            if (!isNaN(lat) && !isNaN(lng)) setSelectedCoordinates([lng, lat]);
          }}
          placeholder="-122.4194"
          placeholderTextColor="#999"
          keyboardType="numeric"
          editable={!submitting}
        />

        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
          Spot Type *
        </Text>
        <View className="flex-row justify-between mb-2.5">
          {(['park', 'street', 'diy', 'quest', 'shop'] as const).map(type => (
            <TouchableOpacity
              key={type}
              className={`flex-1 p-2.5 rounded-lg border mx-0.5 items-center ${spotType === type ? 'bg-brand-terracotta border-brand-terracotta' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              onPress={() => setSpotType(type)}
              disabled={submitting}
            >
              <Text
                className={`text-[10px] font-semibold ${spotType === type ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
          Obstacles
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-2.5">
          {OBSTACLES.map(obstacle => {
            const isSelected = obstacles.includes(obstacle);
            return (
              <TouchableOpacity
                key={obstacle}
                className={`px-3 py-2 rounded-full border ${isSelected ? 'bg-brand-terracotta border-brand-terracotta' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                onPress={() =>
                  isSelected
                    ? setObstacles(obstacles.filter(o => o !== obstacle))
                    : setObstacles([...obstacles, obstacle])
                }
                disabled={submitting}
              >
                <Text
                  className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {obstacle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {spotType === 'street' && (
          <>
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
              Bust Risk
            </Text>
            <View className="gap-2 mb-2.5">
              {(['low', 'medium', 'high'] as const).map(risk => (
                <TouchableOpacity
                  key={risk}
                  className={`p-3.5 rounded-lg border-2 items-center ${risk === 'low' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : risk === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'} ${bustRisk === risk ? 'border-[3px]' : ''}`}
                  onPress={() => setBustRisk(risk)}
                  disabled={submitting}
                >
                  <Text
                    className={`text-sm font-semibold text-gray-800 dark:text-gray-100 ${bustRisk === risk ? 'font-bold' : ''}`}
                  >
                    {risk === 'low' ? 'Chill' : risk === 'medium' ? 'Watch Out' : 'Immediate Bust'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
          Difficulty
        </Text>
        <View className="flex-row justify-between mb-2.5">
          {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => (
            <TouchableOpacity
              key={level}
              className={`flex-1 p-3 rounded-lg border mx-1 items-center ${difficulty === level ? 'bg-brand-terracotta border-brand-terracotta' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              onPress={() => setDifficulty(level)}
              disabled={submitting}
            >
              <Text
                className={`text-sm ${difficulty === level ? 'text-white font-bold' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-4">
          Tricks (comma separated)
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
          value={tricks}
          onChangeText={setTricks}
          placeholder="e.g., kickflip, 50-50, manual"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
          editable={!submitting}
        />

        <View className="mt-8">
          <Button
            title={submitting ? 'Adding Spot...' : 'Add Spot (+100 XP)'}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            className="bg-brand-green"
            disabled={submitting}
          />
        </View>
      </View>
    </ScrollView>
  );
}
