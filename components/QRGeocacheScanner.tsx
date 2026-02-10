import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const { width, height } = Dimensions.get('window');
const PROXIMITY_THRESHOLD = 15; // 15 meters

interface QRGeocacheScannerProps {
  spotId: string;
  spotLat: number;
  spotLng: number;
  onSuccess: (ghostClipUrl?: string) => void;
  onCancel: () => void;
}

export default function QRGeocacheScanner({
  spotId,
  spotLat,
  spotLng,
  onSuccess,
  onCancel,
}: QRGeocacheScannerProps) {
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    getUserLocation();
  }, [permission]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setUserLocation(location);

        const dist = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          spotLat,
          spotLng
        );
        setDistance(dist);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    try {
      // Verify GPS proximity first
      if (!userLocation || distance === null || distance > PROXIMITY_THRESHOLD) {
        Alert.alert(
          'Too Far Away!',
          `You must be within ${PROXIMITY_THRESHOLD}m of the spot to scan.\n\nCurrent distance: ${distance ? Math.round(distance) : '???'}m`,
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
        setProcessing(false);
        return;
      }

      // Verify QR code belongs to this spot
      const { data: qrScan, error } = await supabase
        .from('qr_scans')
        .select('*, skate_spots(*), ghost_clips(*)')
        .eq('qr_code', data)
        .eq('spot_id', spotId)
        .single();

      if (error || !qrScan) {
        Alert.alert('Invalid QR Code', 'This QR code does not belong to this spot.', [
          { text: 'Try Again', onPress: () => setScanned(false) },
        ]);
        setProcessing(false);
        return;
      }

      // Check if already scanned by this user
      const { data: existingScan } = await supabase
        .from('qr_scans')
        .select('*')
        .eq('spot_id', spotId)
        .eq('user_id', user?.id)
        .single();

      if (existingScan) {
        Alert.alert('Already Scanned!', 'You have already found this QR code.', [
          { text: 'OK', onPress: onCancel },
        ]);
        setProcessing(false);
        return;
      }

      // Record the scan
      await supabase.from('qr_scans').insert({
        spot_id: spotId,
        user_id: user?.id,
        qr_code: data,
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        distance_from_spot: distance,
      });

      // Award XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user?.id)
        .single();

      if (profile) {
        const xpReward = 50;
        await supabase
          .from('profiles')
          .update({ xp: (profile.xp || 0) + xpReward })
          .eq('id', user?.id);

        // Create activity
        await supabase.from('activities').insert({
          user_id: user?.id,
          activity_type: 'qr_geocache_found',
          title: 'Found QR Geocache!',
          description: `Scanned QR code at spot`,
          xp_earned: xpReward,
        });
      }

      // Check for ghost clip unlock
      const { data: ghostClip } = await supabase
        .from('ghost_clips')
        .select('*')
        .eq('spot_id', spotId)
        .single();

      let ghostClipUrl;
      if (ghostClip) {
        // Unlock ghost clip for user
        await supabase.from('user_unlocks').insert({
          user_id: user?.id,
          ghost_clip_id: ghostClip.id,
        });
        ghostClipUrl = ghostClip.video_url;
      }

      Alert.alert(
        '🎉 QR Found!',
        `+50 XP earned!\n\n${ghostClip ? '🎬 Ghost Clip unlocked!' : 'Keep skating!'}`,
        [{ text: 'Awesome!', onPress: () => onSuccess(ghostClipUrl) }]
      );

      setProcessing(false);
    } catch (err) {
      console.error('Error scanning QR code:', err);
      Alert.alert('Error', 'Failed to process QR code. Please try again.', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  if (!permission.granted || !locationPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera and location access required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { marginTop: 10, backgroundColor: '#666' }]} onPress={onCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan QR Geocache</Text>
            <Text style={styles.subtitle}>Must be within 15 meters!</Text>
            {distance !== null && (
              <Text style={[styles.distance, distance <= PROXIMITY_THRESHOLD ? styles.distanceGood : styles.distanceBad]}>
                {Math.round(distance)}m away
              </Text>
            )}
          </View>

          <View style={styles.scanArea}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>

          <View style={styles.footer}>
            {processing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Text style={styles.instruction}>
                  {scanned ? 'Processing...' : 'Point your camera at the QR code'}
                </Text>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 8,
  },
  distance: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  distanceGood: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  distanceBad: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 50,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.15,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#d2673d',
  },
  cornerTopRight: {
    position: 'absolute',
    top: height * 0.25,
    right: width * 0.15,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#d2673d',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: height * 0.25,
    left: width * 0.15,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#d2673d',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: height * 0.25,
    right: width * 0.15,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#d2673d',
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#d2673d',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#d2673d',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
