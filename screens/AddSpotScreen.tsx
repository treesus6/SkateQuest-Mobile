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
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddSpot'>;
type AddSpotRouteProp = RouteProp<RootStackParamList, 'AddSpot'>;

const { height } = Dimensions.get('window');

export default function AddSpotScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddSpotRouteProp>();
  const { user } = useAuth();
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
});
