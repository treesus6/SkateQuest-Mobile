import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddSpot'>;
type AddSpotRouteProp = RouteProp<RootStackParamList, 'AddSpot'>;

const { height } = Dimensions.get('window');

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
  const [hasQR, setHasQR] = useState(false);
  const [tricks, setTricks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  const OBSTACLES = ['Stairs', 'Handrail', 'Flatbar', 'Ledge', 'Hubba', 'Manual Pad', 'Quarterpipe', 'Bowl', 'Gap', 'Wallride'];

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);

        // If no coordinates selected yet, center on user location
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
    if (geometry && geometry.coordinates) {
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
      const tricksArray = tricks ? tricks.split(',').map(t => t.trim()) : [];

      const { error } = await supabase.from('skate_spots').insert([
        {
          name,
          latitude: lat,
          longitude: lng,
          difficulty,
          spot_type: spotType,
          obstacles,
          bust_risk: spotType === 'street' ? bustRisk : null,
          has_qr: hasQR,
          tricks: tricksArray,
          added_by: user?.id,
        },
      ]);

      if (error) throw error;

      // Update user's spots_added count
      const { data: userData } = await supabase
        .from('profiles')
        .select('spots_added, xp')
        .eq('id', user?.id)
        .single();

      if (userData) {
        await supabase
          .from('profiles')
          .update({
            spots_added: (userData.spots_added || 0) + 1,
            xp: (userData.xp || 0) + 100,
          })
          .eq('id', user?.id);
      }

      Alert.alert('Success', 'Spot added! You earned 100 XP!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Interactive Map */}
      <View style={styles.mapContainer}>
        <Text style={styles.mapLabel}>Tap on the map to select spot location</Text>
        <Mapbox.MapView
          style={styles.map}
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

          {/* User location */}
          {userLocation && (
            <Mapbox.UserLocation
              visible={true}
              showsUserHeadingIndicator={true}
            />
          )}

          {/* Selected location marker */}
          {selectedCoordinates && (
            <Mapbox.PointAnnotation
              id="selected-spot"
              coordinate={selectedCoordinates}
            >
              <View style={styles.marker}>
                <Text style={styles.markerText}>📍</Text>
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Spot Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Downtown Ledges"
          editable={!submitting}
        />

        <Text style={styles.label}>Latitude *</Text>
        <TextInput
          style={styles.input}
          value={latitude}
          onChangeText={(text) => {
            setLatitude(text);
            const lat = parseFloat(text);
            const lng = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              setSelectedCoordinates([lng, lat]);
            }
          }}
          placeholder="37.7749"
          keyboardType="numeric"
          editable={!submitting}
        />

        <Text style={styles.label}>Longitude *</Text>
        <TextInput
          style={styles.input}
          value={longitude}
          onChangeText={(text) => {
            setLongitude(text);
            const lat = parseFloat(latitude);
            const lng = parseFloat(text);
            if (!isNaN(lat) && !isNaN(lng)) {
              setSelectedCoordinates([lng, lat]);
            }
          }}
          placeholder="-122.4194"
          keyboardType="numeric"
          editable={!submitting}
        />

        <Text style={styles.label}>Spot Type *</Text>
        <View style={styles.typeContainer}>
          {(['park', 'street', 'diy', 'quest', 'shop'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                spotType === type && styles.typeButtonActive,
              ]}
              onPress={() => setSpotType(type)}
              disabled={submitting}
            >
              <Text style={[styles.typeText, spotType === type && styles.typeTextActive]}>
                {type === 'park' && '🛹'}
                {type === 'street' && '🏙️'}
                {type === 'diy' && '🔨'}
                {type === 'quest' && '📱'}
                {type === 'shop' && '🛒'}
              </Text>
              <Text style={[styles.typeLabel, spotType === type && styles.typeLabelActive]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Obstacles</Text>
        <View style={styles.obstaclesContainer}>
          {OBSTACLES.map(obstacle => {
            const isSelected = obstacles.includes(obstacle);
            return (
              <TouchableOpacity
                key={obstacle}
                style={[styles.obstacleChip, isSelected && styles.obstacleChipActive]}
                onPress={() => {
                  if (isSelected) {
                    setObstacles(obstacles.filter(o => o !== obstacle));
                  } else {
                    setObstacles([...obstacles, obstacle]);
                  }
                }}
                disabled={submitting}
              >
                <Text style={[styles.obstacleText, isSelected && styles.obstacleTextActive]}>
                  {obstacle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {spotType === 'street' && (
          <>
            <Text style={styles.label}>Bust Risk</Text>
            <View style={styles.bustContainer}>
              {(['low', 'medium', 'high'] as const).map(risk => (
                <TouchableOpacity
                  key={risk}
                  style={[
                    styles.bustButton,
                    bustRisk === risk && styles.bustButtonActive,
                    risk === 'low' && styles.bustLow,
                    risk === 'medium' && styles.bustMedium,
                    risk === 'high' && styles.bustHigh,
                  ]}
                  onPress={() => setBustRisk(risk)}
                  disabled={submitting}
                >
                  <Text style={[styles.bustText, bustRisk === risk && styles.bustTextActive]}>
                    {risk === 'low' && '😎 Chill'}
                    {risk === 'medium' && '👀 Watch Out'}
                    {risk === 'high' && '🚨 Immediate Bust'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {spotType === 'quest' && (
          <View style={styles.qrContainer}>
            <TouchableOpacity
              style={styles.qrToggle}
              onPress={() => setHasQR(!hasQR)}
              disabled={submitting}
            >
              <Text style={styles.qrCheckbox}>{hasQR ? '☑️' : '⬜'}</Text>
              <Text style={styles.qrLabel}>This spot has a physical QR code</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.difficultyContainer}>
          {(['Beginner', 'Intermediate', 'Advanced'] as const).map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyButton,
                difficulty === level && styles.difficultyButtonActive,
              ]}
              onPress={() => setDifficulty(level)}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.difficultyButtonText,
                  difficulty === level && styles.difficultyButtonTextActive,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tricks (comma separated)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={tricks}
          onChangeText={setTricks}
          placeholder="e.g., kickflip, 50-50, manual"
          multiline
          numberOfLines={3}
          editable={!submitting}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Adding Spot...' : 'Add Spot (+100 XP)'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  mapContainer: {
    height: height * 0.4,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  mapLabel: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    backgroundColor: 'rgba(210, 103, 61, 0.9)',
    color: '#fff',
    padding: 10,
    fontSize: 14,
    fontWeight: '600',
    zIndex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontSize: 40,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  difficultyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#d2673d',
    borderColor: '#d2673d',
  },
  difficultyButtonText: {
    fontSize: 14,
    color: '#666',
  },
  difficultyButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginHorizontal: 3,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#d2673d',
    borderColor: '#d2673d',
  },
  typeText: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  typeLabelActive: {
    color: '#fff',
  },
  typeTextActive: {
    opacity: 1,
  },
  obstaclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  obstacleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  obstacleChipActive: {
    backgroundColor: '#d2673d',
    borderColor: '#d2673d',
  },
  obstacleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  obstacleTextActive: {
    color: '#fff',
  },
  bustContainer: {
    gap: 8,
    marginBottom: 10,
  },
  bustButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  bustButtonActive: {
    borderWidth: 3,
  },
  bustLow: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  bustMedium: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  bustHigh: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  bustText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  bustTextActive: {
    fontWeight: 'bold',
  },
  qrContainer: {
    marginBottom: 10,
  },
  qrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  qrCheckbox: {
    fontSize: 24,
    marginRight: 12,
  },
  qrLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});
