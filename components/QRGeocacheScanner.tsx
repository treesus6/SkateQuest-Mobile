import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { profilesService } from '../lib/profilesService';
import { useAuthStore } from '../stores/useAuthStore';
import Button from './ui/Button';

const { width, height } = Dimensions.get('window');
const PROXIMITY_THRESHOLD = 15;

interface QRGeocacheScannerProps {
  spotId: string;
  spotLat: number;
  spotLng: number;
  onSuccess: (ghostClipUrl?: string) => void;
  onCancel: () => void;
}

export default function QRGeocacheScanner({ spotId, spotLat, spotLng, onSuccess, onCancel }: QRGeocacheScannerProps) {
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
        setDistance(calculateDistance(location.coords.latitude, location.coords.longitude, spotLat, spotLng));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      if (!userLocation || distance === null || distance > PROXIMITY_THRESHOLD) {
        Alert.alert('Too Far Away!', `You must be within ${PROXIMITY_THRESHOLD}m of the spot to scan.\n\nCurrent distance: ${distance ? Math.round(distance) : '???'}m`, [
          { text: 'Try Again', onPress: () => setScanned(false) },
        ]);
        setProcessing(false);
        return;
      }

      const { data: qrScan, error } = await supabase
        .from('qr_scans')
        .select('*, skate_spots(*), ghost_clips(*)')
        .eq('qr_code', data)
        .eq('spot_id', spotId)
        .single();

      if (error || !qrScan) {
        Alert.alert('Invalid QR Code', 'This QR code does not belong to this spot.', [{ text: 'Try Again', onPress: () => setScanned(false) }]);
        setProcessing(false);
        return;
      }

      const { data: existingScan } = await supabase
        .from('qr_scans')
        .select('*')
        .eq('spot_id', spotId)
        .eq('user_id', user?.id)
        .single();

      if (existingScan) {
        Alert.alert('Already Scanned!', 'You have already found this QR code.', [{ text: 'OK', onPress: onCancel }]);
        setProcessing(false);
        return;
      }

      await supabase.from('qr_scans').insert({
        spot_id: spotId, user_id: user?.id, qr_code: data,
        latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude,
        distance_from_spot: distance,
      });

      const xpReward = 50;
      const { data: profile } = await profilesService.getById(user?.id || '');
      if (profile) {
        await profilesService.update(user?.id || '', { xp: (profile.xp || 0) + xpReward });
      }

      const { data: ghostClip } = await supabase.from('ghost_clips').select('*').eq('spot_id', spotId).single();
      let ghostClipUrl;
      if (ghostClip) {
        await supabase.from('user_unlocks').insert({ user_id: user?.id, ghost_clip_id: ghostClip.id });
        ghostClipUrl = ghostClip.video_url;
      }

      Alert.alert('QR Found!', `+50 XP earned!\n\n${ghostClip ? 'Ghost Clip unlocked!' : 'Keep skating!'}`, [
        { text: 'Awesome!', onPress: () => onSuccess(ghostClipUrl) },
      ]);
      setProcessing(false);
    } catch (err) {
      console.error('Error scanning QR code:', err);
      Alert.alert('Error', 'Failed to process QR code. Please try again.', [{ text: 'Try Again', onPress: () => setScanned(false) }]);
      setProcessing(false);
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator size="large" color="#d2673d" /></View>;
  }

  if (!permission.granted || !locationPermission) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-5">
        <Text className="text-lg text-white mb-5 text-center">Camera and location access required</Text>
        <Button title="Grant Permission" onPress={requestPermission} variant="primary" size="lg" />
        <View className="mt-2.5">
          <Button title="Cancel" onPress={onCancel} variant="secondary" size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1, width: '100%' }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="pt-[60px] px-5 items-center">
            <Text className="text-[28px] font-bold text-white mb-2">Scan QR Geocache</Text>
            <Text className="text-base text-gray-300 text-center mb-2">Must be within 15 meters!</Text>
            {distance !== null && (
              <View className={`px-4 py-2 rounded-full ${distance <= PROXIMITY_THRESHOLD ? 'bg-emerald-500' : 'bg-red-500'}`}>
                <Text className="text-xl font-bold text-white">{Math.round(distance)}m away</Text>
              </View>
            )}
          </View>

          <View className="flex-1 justify-center items-center my-12">
            <View style={{ position: 'absolute', top: height * 0.25, left: width * 0.15, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#d2673d' }} />
            <View style={{ position: 'absolute', top: height * 0.25, right: width * 0.15, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#d2673d' }} />
            <View style={{ position: 'absolute', bottom: height * 0.25, left: width * 0.15, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#d2673d' }} />
            <View style={{ position: 'absolute', bottom: height * 0.25, right: width * 0.15, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#d2673d' }} />
          </View>

          <View className="pb-[60px] px-5 items-center">
            {processing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Text className="text-base text-white text-center mb-5">
                  {scanned ? 'Processing...' : 'Point your camera at the QR code'}
                </Text>
                <Button title="Cancel" onPress={onCancel} variant="primary" size="lg" />
              </>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}
