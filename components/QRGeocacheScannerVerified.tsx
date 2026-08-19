import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getCurrentLocation, type CurrentLocation } from '../lib/currentLocation';
import { pickVideo, uploadVideo } from '../lib/mediaUpload';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import Button from './ui/Button';

const PREVIEW_THRESHOLD_METERS = 150;

type Props = {
  spotId: string;
  spotLat: number;
  spotLng: number;
  onSuccess: (ghostClipUrl?: string) => void;
  onCancel: () => void;
};

type PendingClaim = {
  qrId: string;
  trick: string;
  message?: string | null;
  xpReward: number;
};

export default function QRGeocacheScannerVerified({ spotId, spotLat, spotLng, onSuccess: _onSuccess, onCancel }: Props) {
  const { user } = useAuthStore();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [claim, setClaim] = useState<PendingClaim | null>(null);
  const [uploading, setUploading] = useState(false);

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
    if (!user) {
      Alert.alert('Login required', 'Sign in before joining a QR Hunt.');
      return;
    }
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

      const row = (result || {}) as any;
      if (!row?.qr_id || !row?.trick_challenge) throw new Error('This QR is missing its required trick.');
      setClaim({
        qrId: String(row.qr_id),
        trick: String(row.trick_challenge),
        message: row.challenge_message || null,
        xpReward: Number(row.xp_reward || 50),
      });
    } catch (error: any) {
      Alert.alert('QR scan failed', error?.message || 'This code could not be verified.', [
        { text: 'Try again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const submitProof = async (useCamera: boolean) => {
    if (!claim || !user) return;
    setUploading(true);
    try {
      const asset = await pickVideo(useCamera);
      if (!asset) return;
      const uploaded = await uploadVideo(asset.uri, 'qr_proofs', user.id, asset.duration || undefined);
      if (!uploaded.url) throw new Error('Video upload did not return a URL.');

      const { error } = await supabase.rpc('submit_hidden_qr_trick_proof', {
        p_qr_id: claim.qrId,
        p_proof_url: uploaded.url,
      });
      if (error) throw error;

      Alert.alert(
        'Trick proof sent',
        `${claim.trick} is waiting for the QR hider to review. No XP is awarded until they approve the clip.`,
        [{ text: 'Done', onPress: onCancel }],
      );
    } catch (error: any) {
      Alert.alert('Could not submit proof', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!cameraPermission) {
    return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator size="large" color="#D2673D" /></View>;
  }

  if (!cameraPermission.granted) {
    return <Permission message="Camera access is required to scan a physical QR." primary="Allow camera" onPrimary={async () => { await requestCameraPermission(); }} onCancel={onCancel} />;
  }

  if (!location) {
    return <Permission message={locationError || 'Location is required to verify the QR physically.'} primary="Try location again" onPrimary={refreshLocation} onCancel={onCancel} />;
  }

  if (claim) {
    return (
      <View className="flex-1 bg-[#05070B] px-6 pt-14 pb-10">
        <Text className="text-[#FF8A63] font-black text-xs tracking-widest">QR FOUND AT THIS SPOT</Text>
        <Text className="text-white text-3xl font-black mt-2">Land the trick.</Text>
        <View className="bg-[#121826] border border-[#2A3344] rounded-2xl p-5 mt-6">
          <Text className="text-gray-500 text-xs font-black tracking-widest">REQUIRED TRICK</Text>
          <Text className="text-white text-3xl font-black mt-2">{claim.trick}</Text>
          {claim.message ? <Text className="text-gray-300 mt-3">“{claim.message}”</Text> : null}
          <Text className="text-emerald-300 font-black mt-4">{claim.xpReward} XP after hider approval</Text>
        </View>
        <Text className="text-gray-400 text-sm mt-5">Record the actual attempt or choose the clip you just filmed. This hunt stays incomplete until the hider watches and approves it.</Text>
        <TouchableOpacity className={`bg-[#FF5A3C] py-4 rounded-xl items-center mt-6 ${uploading ? 'opacity-50' : ''}`} disabled={uploading} onPress={() => void submitProof(true)}>
          <Text className="text-white font-black">{uploading ? 'Uploading proof…' : 'Record Trick Proof'}</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`bg-[#182131] py-4 rounded-xl items-center mt-3 ${uploading ? 'opacity-50' : ''}`} disabled={uploading} onPress={() => void submitProof(false)}>
          <Text className="text-white font-black">Choose Existing Trick Clip</Text>
        </TouchableOpacity>
        <TouchableOpacity className="py-4 items-center mt-auto" onPress={onCancel}><Text className="text-gray-400 font-bold">Leave without submitting</Text></TouchableOpacity>
      </View>
    );
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
            <Text className="text-white text-3xl font-black">Scan QR Hunt</Text>
            <Text className="text-gray-300 mt-2 text-center">The server verifies this exact paid QR, this skate spot, and your real location before showing the trick.</Text>
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
