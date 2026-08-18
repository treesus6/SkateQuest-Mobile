import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Check, ChevronLeft, MapPin } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { getCurrentLocation } from '../lib/currentLocation';
import { supabase } from '../lib/supabase';
import { SkateEvents } from '../lib/analytics';

export default function HideQRCodeScreenVerified() {
  const navigation = useNavigation<any>();
  const [locating, setLocating] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const locate = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      setCoords({ lat: loc.latitude, lng: loc.longitude });
    } catch (error) {
      setCoords(null);
      setLocationError(error instanceof Error ? error.message : 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => { void locate(); }, []);

  const createCode = async () => {
    if (!coords) {
      Alert.alert('Location required', 'Get a real GPS location before generating the QR.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_hidden_qr', {
        p_latitude: coords.lat,
        p_longitude: coords.lng,
        p_location_description: description.trim() || null,
        p_trick_challenge: null,
        p_challenge_message: message.trim() || null,
        p_proof_required: false,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.code) throw new Error('The server did not return a QR code.');
      SkateEvents.qrCodeHidden();
      setCreatedCode(row.code);
    } catch (error: any) {
      Alert.alert('Could not hide QR', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (createdCode) {
    return (
      <View className="flex-1 bg-[#05070B] px-6 pt-16 items-center">
        <View className="w-16 h-16 rounded-full bg-green-500/20 items-center justify-center mb-4"><Check size={32} color="#22C55E" /></View>
        <Text className="text-2xl font-black text-gray-100 text-center">QR Hunt code ready</Text>
        <Text className="text-sm text-gray-400 mt-2 mb-6 text-center">Print or save this QR and physically place it at the GPS location where you generated it. A finder must be near that exact hide point.</Text>
        <View className="bg-white rounded-2xl p-5 mb-5"><QRCode value={createdCode} size={220} /></View>
        <Text selectable className="text-gray-300 font-mono text-base mb-2">{createdCode}</Text>
        <Text className="text-gray-500 text-xs text-center mb-8">Verified find reward: 50 XP. You cannot claim your own code.</Text>
        <TouchableOpacity className="bg-[#FF5A3C] py-4 px-8 rounded-xl items-center w-full" onPress={() => navigation.goBack()}><Text className="text-white font-black">Done</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#05070B]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
        <View className="flex-row items-center mb-3"><TouchableOpacity onPress={() => navigation.goBack()} className="mr-3"><ChevronLeft size={26} color="#E5E7EB" /></TouchableOpacity><Text className="text-2xl font-black text-gray-100">Hide a QR Hunt Code</Text></View>
        <Text className="text-sm text-gray-400 mb-6">Generate a physical SkateQuest QR at your current GPS position. Another skater has to find the real code at this location before the server awards 50 XP.</Text>

        {locating ? <View className="flex-row items-center bg-[#121826] rounded-xl p-4 mb-5"><ActivityIndicator color="#D2673D" /><Text className="text-gray-400 ml-3">Getting real GPS location…</Text></View> : locationError ? <View className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-5"><Text className="text-red-300">{locationError}</Text><TouchableOpacity onPress={locate} className="mt-3"><Text className="text-white font-black">Try location again</Text></TouchableOpacity></View> : <View className="flex-row items-center bg-[#121826] rounded-xl p-4 mb-5"><MapPin size={17} color="#D2673D" /><Text className="text-gray-300 ml-2 flex-1">Hide point locked to your current GPS position</Text></View>}

        <Text className="text-gray-300 font-bold mb-2">Hide spot description (optional)</Text>
        <TextInput className="bg-[#121826] text-gray-100 p-4 rounded-xl mb-4" placeholder="Example: under the bench beside the bowl" placeholderTextColor="#6B7280" value={description} onChangeText={setDescription} />

        <Text className="text-gray-300 font-bold mb-2">Message for finder (optional)</Text>
        <TextInput className="bg-[#121826] text-gray-100 p-4 rounded-xl mb-5" placeholder="Leave a short note" placeholderTextColor="#6B7280" value={message} onChangeText={setMessage} multiline />

        <View className="bg-emerald-500/10 border border-emerald-700 rounded-xl p-4 mb-6"><Text className="text-emerald-300 font-black">50 XP · server verified</Text><Text className="text-gray-400 text-xs mt-1">The reward is fixed so users cannot create unlimited custom XP payouts.</Text></View>

        <TouchableOpacity className={`bg-[#FF5A3C] py-4 rounded-xl items-center ${saving || locating || !coords ? 'opacity-50' : ''}`} onPress={createCode} disabled={saving || locating || !coords}><Text className="text-white font-black">{saving ? 'Generating…' : 'Generate QR at This Location'}</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
