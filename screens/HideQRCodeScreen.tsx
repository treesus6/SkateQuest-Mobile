import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, MapPin, Check } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { qrCodeService } from '../lib/qrCodeService';
import { useAuthStore } from '../stores/useAuthStore';
import { profilesService } from '../lib/profilesService';
import { SkateEvents } from '../lib/analytics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const XP_OPTIONS = [50, 100, 150, 200];

export default function HideQRCodeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();

  const [locating, setLocating] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  const [trickChallenge, setTrickChallenge] = useState('');
  const [challengeMessage, setChallengeMessage] = useState('');
  const [bonusReward, setBonusReward] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [xpReward, setXpReward] = useState(100);
  const [proofRequired, setProofRequired] = useState(false);

  const [saving, setSaving] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission is needed to hide a code here.');
          setLocating(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        setLocationError('Could not get your location. Try again.');
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  const handleHideCode = async () => {
    if (!user) return;
    if (!coords) {
      Alert.alert('No Location', 'We need your location to hide a code here.');
      return;
    }
    setSaving(true);
    try {
      const { data: profile } = await profilesService.getById(user.id);
      const { data, error } = await qrCodeService.create({
        userId: user.id,
        userName: profile?.username || 'A skater',
        latitude: coords.lat,
        longitude: coords.lng,
        locationDescription: locationDescription.trim() || undefined,
        trickChallenge: trickChallenge.trim() || undefined,
        challengeMessage: challengeMessage.trim() || undefined,
        xpReward,
        bonusReward: bonusReward.trim() || undefined,
        proofRequired,
      });

      if (error || !data) {
        Alert.alert('Error', 'Could not hide the code. Please try again.');
        setSaving(false);
        return;
      }

      SkateEvents.qrCodeHidden();
      setCreatedCode(data.code);
    } catch (err) {
      console.error('Error creating QR code:', err);
      Alert.alert('Error', 'Could not hide the code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Success state: show the generated QR code to print/screenshot ──────────
  if (createdCode) {
    return (
      <View className="flex-1 bg-[#05070B] px-6 pt-16 items-center">
        <View className="w-16 h-16 rounded-full bg-green-500/20 items-center justify-center mb-4">
          <Check size={32} color="#22C55E" />
        </View>
        <Text className="text-2xl font-black text-gray-100 mb-1 text-center">Code Hidden!</Text>
        <Text className="text-sm text-gray-400 mb-6 text-center px-4">
          Screenshot or print this and stash it at your spot. Whoever finds it scans it in-app.
        </Text>

        <View className="bg-white rounded-2xl p-5 mb-5">
          <QRCode value={createdCode} size={220} />
        </View>

        <Text className="text-gray-300 font-mono text-base mb-1">{createdCode}</Text>
        <Text className="text-gray-500 text-xs mb-8 text-center px-8">
          This donation helps kids get skateboards. Thanks for keeping the hunt alive. 🛹
        </Text>

        <TouchableOpacity
          className="bg-[#FF5A3C] py-3.5 px-8 rounded-lg items-center w-full"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-gray-100 font-bold text-base">Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#05070B]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ChevronLeft size={26} color="#E5E7EB" />
          </TouchableOpacity>
          <Text className="text-2xl font-black text-gray-100">Hide a Charity Code</Text>
        </View>
        <Text className="text-sm text-gray-400 mb-6">
          Stash a QR code somewhere in the wild with a trick challenge attached.
          The next skater who finds it scans it, earns XP, and the find supports the charity fund.
        </Text>

        {locating ? (
          <View className="flex-row items-center bg-[#121826] rounded-lg p-3 mb-5">
            <ActivityIndicator color="#d2673d" />
            <Text className="text-gray-400 ml-3">Getting your location...</Text>
          </View>
        ) : locationError ? (
          <View className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-5">
            <Text className="text-red-400 text-sm">{locationError}</Text>
          </View>
        ) : (
          <View className="flex-row items-center bg-[#121826] rounded-lg p-3 mb-5">
            <MapPin size={16} color="#d2673d" />
            <Text className="text-gray-300 ml-2 text-sm">Hiding it at your current location</Text>
          </View>
        )}

        <Text className="text-gray-300 font-semibold mb-2">Trick Challenge (optional)</Text>
        <TextInput
          className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-4"
          placeholder="e.g. Kickflip, 50-50 grind..."
          placeholderTextColor="#6B7280"
          value={trickChallenge}
          onChangeText={setTrickChallenge}
        />

        <Text className="text-gray-300 font-semibold mb-2">Message for the Finder (optional)</Text>
        <TextInput
          className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-4"
          placeholder="Leave a note..."
          placeholderTextColor="#6B7280"
          value={challengeMessage}
          onChangeText={setChallengeMessage}
          multiline
          numberOfLines={3}
        />

        <Text className="text-gray-300 font-semibold mb-2">Bonus Reward (optional)</Text>
        <TextInput
          className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-4"
          placeholder="e.g. Free sticker pack, shoutout..."
          placeholderTextColor="#6B7280"
          value={bonusReward}
          onChangeText={setBonusReward}
        />

        <Text className="text-gray-300 font-semibold mb-2">Hiding Spot Description (optional)</Text>
        <TextInput
          className="bg-[#121826] text-gray-100 p-3 rounded-lg mb-4"
          placeholder="e.g. Taped under the rail by the bowl..."
          placeholderTextColor="#6B7280"
          value={locationDescription}
          onChangeText={setLocationDescription}
        />

        <Text className="text-gray-300 font-semibold mb-2">XP Reward</Text>
        <View className="flex-row gap-2 mb-5">
          {XP_OPTIONS.map((xp) => (
            <TouchableOpacity
              key={xp}
              onPress={() => setXpReward(xp)}
              className={`flex-1 py-2.5 rounded-lg items-center border ${
                xpReward === xp
                  ? 'bg-[#FF5A3C] border-[#FF5A3C]'
                  : 'bg-[#121826] border-gray-700'
              }`}
            >
              <Text className={`font-bold ${xpReward === xp ? 'text-white' : 'text-gray-400'}`}>
                {xp} XP
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="flex-row items-center justify-between bg-[#121826] rounded-lg p-3 mb-8"
          onPress={() => setProofRequired(!proofRequired)}
        >
          <Text className="text-gray-300">Require video proof of the trick</Text>
          <View
            className={`w-6 h-6 rounded items-center justify-center border ${
              proofRequired ? 'bg-[#FF5A3C] border-[#FF5A3C]' : 'border-gray-600'
            }`}
          >
            {proofRequired && <Check size={16} color="white" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className={`bg-[#FF5A3C] py-3.5 rounded-lg items-center ${
            saving || locating || !coords ? 'opacity-50' : ''
          }`}
          onPress={handleHideCode}
          disabled={saving || locating || !coords}
        >
          <Text className="text-gray-100 font-bold text-base">
            {saving ? 'Hiding Code...' : 'Generate & Hide Code'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
