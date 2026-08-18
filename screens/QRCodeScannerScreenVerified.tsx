import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '../lib/useNavigation';
import { getCurrentLocation } from '../lib/currentLocation';
import { supabase } from '../lib/supabase';
import { pickVideo, uploadVideo } from '../lib/mediaUpload';
import { useAuthStore } from '../stores/useAuthStore';
import Button from '../components/ui/Button';

type PendingClaim = {
  qrId: string;
  trick: string;
  message?: string | null;
  xpReward: number;
};

export default function QRCodeScannerScreenVerified() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [claim, setClaim] = useState<PendingClaim | null>(null);
  const [uploading, setUploading] = useState(false);

  const checkLocation = async () => {
    setLocationError(null);
    try {
      await getCurrentLocation();
      setLocationReady(true);
    } catch (error) {
      setLocationReady(false);
      setLocationError(error instanceof Error ? error.message : 'Location is unavailable.');
    }
  };

  useEffect(() => { void checkLocation(); }, []);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    if (!user) {
      Alert.alert('Login required', 'Sign in before joining a QR Hunt.');
      return;
    }
    setScanned(true);
    setProcessing(true);
    try {
      const loc = await getCurrentLocation();
      const { data: result, error } = await supabase.rpc('claim_hidden_qr', {
        p_code: data,
        p_latitude: loc.latitude,
        p_longitude: loc.longitude,
        p_spot_id: null,
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
      Alert.alert('Could not verify QR', error?.message || 'This code could not be verified.', [
        { text: 'Scan again', onPress: () => setScanned(false) },
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
        `${claim.trick} is waiting for the hider to review. No XP is awarded until they approve the clip.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Could not submit proof', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!permission) return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator size="large" color="#D2673D" /></View>;

  if (!permission.granted) {
    return <View className="flex-1 bg-black justify-center items-center px-6 gap-3"><Text className="text-white text-center">Camera access is required to scan a physical SkateQuest QR.</Text><Button title="Allow camera" onPress={requestPermission} variant="primary" size="lg" /><Button title="Go back" onPress={() => navigation.goBack()} variant="secondary" size="lg" /></View>;
  }

  if (!locationReady) {
    return <View className="flex-1 bg-black justify-center items-center px-6 gap-3"><Text className="text-white text-center">{locationError || 'Checking location…'}</Text><Button title="Try location again" onPress={checkLocation} variant="primary" size="lg" /><Button title="Go back" onPress={() => navigation.goBack()} variant="secondary" size="lg" /></View>;
  }

  if (claim) {
    return (
      <View className="flex-1 bg-[#05070B] px-6 pt-16 pb-10">
        <Text className="text-[#FF8A63] font-black text-sm tracking-widest">QR FOUND</Text>
        <Text className="text-white text-3xl font-black mt-2">Now land the trick.</Text>
        <View className="bg-[#121826] border border-[#2A3344] rounded-2xl p-5 mt-6">
          <Text className="text-gray-400 text-xs font-black tracking-widest">YOUR TRICK</Text>
          <Text className="text-white text-3xl font-black mt-2">{claim.trick}</Text>
          {claim.message ? <Text className="text-gray-300 mt-3">“{claim.message}”</Text> : null}
          <Text className="text-emerald-300 font-black mt-4">{claim.xpReward} XP after approval</Text>
        </View>
        <Text className="text-gray-400 text-sm mt-5">Record the actual attempt or choose the clip you just filmed. The hider reviews the video before this QR is completed.</Text>
        <TouchableOpacity className={`bg-[#FF5A3C] py-4 rounded-xl items-center mt-6 ${uploading ? 'opacity-50' : ''}`} onPress={() => submitProof(true)} disabled={uploading}><Text className="text-white font-black">{uploading ? 'Uploading proof…' : 'Record Trick Proof'}</Text></TouchableOpacity>
        <TouchableOpacity className={`bg-[#182131] py-4 rounded-xl items-center mt-3 ${uploading ? 'opacity-50' : ''}`} onPress={() => submitProof(false)} disabled={uploading}><Text className="text-white font-black">Choose Existing Trick Clip</Text></TouchableOpacity>
        <TouchableOpacity className="py-4 items-center mt-auto" onPress={() => navigation.goBack()}><Text className="text-gray-400 font-bold">Leave without claiming</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : handleScan}>
        <View className="flex-1 bg-black/40 px-5 justify-between">
          <View className="pt-14 items-center">
            <Text className="text-white text-3xl font-black">QR Hunt</Text>
            <Text className="text-gray-300 text-center mt-2">Find it. Scan it at the real hiding point. Then land the trick attached to the code.</Text>
            <TouchableOpacity className="mt-4" onPress={() => navigation.navigate('HideQRCode')}><Text className="text-[#FF8A63] font-black underline">Hide a $2 trick QR for another skater →</Text></TouchableOpacity>
          </View>
          <View className="pb-12 items-center gap-3">
            {processing ? <ActivityIndicator size="large" color="#fff" /> : <Text className="text-white font-bold">Point the camera at the QR</Text>}
            <Button title="Cancel" onPress={() => navigation.goBack()} variant="primary" size="lg" />
          </View>
        </View>
      </CameraView>
    </View>
  );
}
