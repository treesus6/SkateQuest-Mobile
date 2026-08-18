import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getCurrentLocation, CurrentLocation } from '../lib/currentLocation';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';

const PREVIEW_THRESHOLD_METERS = 150;

type Props = {
  spotId: string;
  spotLat: number;
  spotLng: number;
  onSuccess: (ghostClipUrl?: string) => void;
  onCancel: () => void;
};

export default function QRGeocacheScannerVerified({ spotId, spotLat, spotLng, onSuccess, onCancel }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const refreshLocation = async () => {
    setLocationError(null);
    try {
      const next = await getCurrentLocation();
      setLocation(next);
      setDistance(distanceMeters(next.latitude, next.longitude, spotLat, spotLng));
    } catch (error) {
      setLocation(null);
      setDistance(null);
      setLocationError(error instanceof Error ? error.message : 'Location is unavailable.');
    }
  };

  useEffect(() => { void refreshLocation(); }, [spotLat, spotLng]);

  const onScan = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    try {
      const fresh = await getCurrentLocation();
      const previewDistance = distanceMeters(fresh.latitude, fresh.longitude, spotLat, spotLng);
      setLocation(fresh);
      setDistance(previewDistance);

      if (previewDistance > PREVIEW_THRESHOLD_METERS) {
        throw new Error(`Move closer to this skate spot. You are about ${Math.round(previewDistance)}m away.`);
      }

      const { data: result, error } = await supabase.rpc('claim_hidden_qr', {
        p_code: data,
        p_latitude: fresh.latitude,
        p_longitude: fresh.longitude,
        p_spot_id: spotId,
      });
      if (error) throw error;

      const claim = (result || {}) as any;
      if (claim.requires_proof) {
        Alert.alert(
          'Proof required',
          claim.trick_challenge
            ? `This QR requires proof: ${claim.trick_challenge}. It has not been claimed or paid yet.`
            : 'This QR requires proof. It has not been claimed or paid yet.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        return;
      }

      const xp = Number(claim.xp_awarded || 0);
      const ghost = typeof claim.ghost_clip_url === 'string' ? claim.ghost_clip_url : undefined;
      Alert.alert(
        'QR verified!',
        `${xp > 0 ? `+${xp} XP awarded.\n\n` : ''}${ghost ? 'Ghost Clip unlocked!' : 'Find logged successfully.'}`,
        [{ text: 'Awesome', onPress: () => onSuccess(ghost) }]
      );
    } catch (error: any) {
      Alert.alert('QR scan failed', error?.message || 'This code could not be verified.', [
        { text: 'Try again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  if (!cameraPermission) {
    return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator size="large" color="#D2673D" /></View>;
  }

  if (!cameraPermission.granted) {
    return <Permission message="Camera access is required to scan a physical QR." primary="Allow camera" onPrimary={requestCameraPermission} onCancel={onCancel} />;
  }

  if (!location) {
    return <Permission message={locationError || 'Location is required to verify the QR physically.'} primary="Try location again" onPrimary={refreshLocation} onCancel={onCancel} />;
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1, width: '100%' }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : onScan}
      >
        <View className="flex-1 bg-black/40 px-5 justify-between">
          <View className="items-center pt-14">
            <Text className="text-white text-3xl font-black">Scan QR Geocache</Text>
            <Text className="text-gray-300 mt-2 text-center">The server verifies the code and your real location before anything unlocks.</Text>
            {distance !== null ? <View className={`mt-3 px-4 py-2 rounded-full ${distance <= PREVIEW_THRESHOLD_METERS ? 'bg-emerald-600' : 'bg-red-600'}`}><Text className="text-white font-black">~{Math.round(distance)}m from spot</Text></View> : null}
          </View>
          <View className="items-center pb-12 gap-3">
            {processing ? <ActivityIndicator size="large" color="#fff" /> : <Text className="text-white font-bold">Point the camera at the physical SkateQuest QR</Text>}
            <Button title="Cancel" onPress={onCancel} variant="primary" size="lg" />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

function Permission({ message, primary, onPrimary, onCancel }: { message: string; primary: string; onPrimary: () => void | Promise<void>; onCancel: () => void }) {
  return <View className="flex-1 bg-black items-center justify-center px-6 gap-3"><Text className="text-white text-center text-base">{message}</Text><Button title={primary} onPress={() => void onPrimary()} variant="primary" size="lg" /><Button title="Cancel" onPress={onCancel} variant="secondary" size="lg" /></View>;
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp/2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
