import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Path } from 'react-native-svg';
import { Check, ChevronLeft, HeartHandshake, MapPin } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { getCurrentLocation } from '../lib/currentLocation';
import { supabase } from '../lib/supabase';
import { SkateEvents } from '../lib/analytics';

function SkateboardQRCode({ value }: { value: string }) {
  return (
    <View style={{ width: 280, height: 390, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      <Svg width={280} height={390} viewBox="0 0 280 390" style={{ position: 'absolute' }}>
        <Path d="M140 8 C194 8 222 36 224 76 L238 304 C240 342 208 376 164 380 L116 380 C72 376 40 342 42 304 L56 76 C58 36 86 8 140 8 Z" fill="#D2673D" stroke="#0B0F16" strokeWidth="8" />
        <Path d="M73 83 H207" stroke="#0B0F16" strokeWidth="8" strokeLinecap="round" />
        <Path d="M73 307 H207" stroke="#0B0F16" strokeWidth="8" strokeLinecap="round" />
        {[91, 111, 169, 189].map((cx) => <Circle key={`t${cx}`} cx={cx} cy="61" r="5" fill="#F9FAFB" />)}
        {[91, 111, 169, 189].map((cx) => <Circle key={`b${cx}`} cx={cx} cy="329" r="5" fill="#F9FAFB" />)}
        <Circle cx="38" cy="92" r="14" fill="#111827" stroke="#F9FAFB" strokeWidth="4" />
        <Circle cx="242" cy="92" r="14" fill="#111827" stroke="#F9FAFB" strokeWidth="4" />
        <Circle cx="38" cy="298" r="14" fill="#111827" stroke="#F9FAFB" strokeWidth="4" />
        <Circle cx="242" cy="298" r="14" fill="#111827" stroke="#F9FAFB" strokeWidth="4" />
      </Svg>
      <View style={{ backgroundColor: 'white', padding: 14, borderRadius: 14 }}>
        <QRCode value={value} size={196} quietZone={8} backgroundColor="#FFFFFF" color="#05070B" />
      </View>
      <View style={{ position: 'absolute', bottom: 24, alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.8 }}>SKATEQUEST</Text>
        <Text style={{ color: '#111827', fontSize: 10, fontWeight: '900', marginTop: 2 }}>HUNT • LAND IT • GIVE BACK</Text>
      </View>
    </View>
  );
}

export default function HideQRCodeScreenVerified() {
  const navigation = useNavigation<any>();
  const [locating, setLocating] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [trick, setTrick] = useState('');
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);
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

  const refreshPayment = async (showMessage = false) => {
    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.rpc('get_unused_qr_support_purchase');
      if (error) throw error;
      const id = typeof data === 'string' ? data : null;
      setPurchaseId(id);
      if (showMessage) {
        Alert.alert(id ? 'Payment confirmed' : 'Still waiting', id ? 'Your $2 QR purchase is ready to use.' : 'Stripe has not confirmed a paid QR purchase yet.');
      }
    } catch (error: any) {
      if (showMessage) Alert.alert('Payment check failed', error?.message || 'Please try again.');
    } finally {
      setCheckingPayment(false);
    }
  };

  useEffect(() => {
    void locate();
    void refreshPayment(false);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPayment(false);
    });
    return () => sub.remove();
  }, []);

  const startCheckout = async () => {
    setStartingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-qr-support-checkout', { body: {} });
      if (error) throw error;
      const url = data?.checkout_url;
      if (!url) throw new Error(data?.error || 'Stripe checkout did not return a payment page.');
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('Could not open the secure payment page.');
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert('Could not start $2 checkout', error?.message || 'Please try again.');
    } finally {
      setStartingPayment(false);
    }
  };

  const createCode = async () => {
    if (!coords) {
      Alert.alert('Location required', 'Get a real GPS location before hiding the QR.');
      return;
    }
    if (!purchaseId) {
      Alert.alert('Payment required', 'A confirmed $2 QR purchase is required before a code can be hidden.');
      return;
    }
    if (!trick.trim()) {
      Alert.alert('Trick required', 'Every QR Hunt code must include a trick for the finder to land.');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_hidden_qr', {
        p_latitude: coords.lat,
        p_longitude: coords.lng,
        p_location_description: description.trim() || null,
        p_trick_challenge: trick.trim(),
        p_challenge_message: message.trim() || null,
        p_proof_required: true,
        p_support_purchase_id: purchaseId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.code) throw new Error('The server did not return a QR code.');
      SkateEvents.qrCodeHidden();
      setCreatedCode(row.code);
      setPurchaseId(null);
    } catch (error: any) {
      Alert.alert('Could not hide QR', error?.message || 'Please try again.');
      await refreshPayment(false);
    } finally {
      setSaving(false);
    }
  };

  if (createdCode) {
    return (
      <ScrollView className="flex-1 bg-[#05070B]" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40, alignItems: 'center' }}>
        <View className="w-16 h-16 rounded-full bg-green-500/20 items-center justify-center mb-4"><Check size={32} color="#22C55E" /></View>
        <Text className="text-2xl font-black text-gray-100 text-center">Paid QR Hunt ready</Text>
        <Text className="text-sm text-gray-400 mt-2 mb-5 text-center">Print or save this board and physically hide it at the GPS point you just locked. The finder must scan it there, land your trick, upload video proof, and wait for your approval.</Text>
        <SkateboardQRCode value={createdCode} />
        <Text selectable className="text-gray-300 font-mono text-base mb-2">{createdCode}</Text>
        <Text className="text-gray-500 text-xs text-center mb-8">$2 support purchase recorded · 50 XP only after approved trick proof.</Text>
        <TouchableOpacity className="bg-[#FF5A3C] py-4 px-8 rounded-xl items-center w-full" onPress={() => navigation.goBack()}><Text className="text-white font-black">Done</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#05070B]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}>
        <View className="flex-row items-center mb-3"><TouchableOpacity onPress={() => navigation.goBack()} className="mr-3"><ChevronLeft size={26} color="#E5E7EB" /></TouchableOpacity><Text className="text-2xl font-black text-gray-100">Hide a $2 QR Hunt</Text></View>

        <View className="bg-[#121826] border border-[#2A3344] rounded-2xl p-4 mb-5">
          <View className="flex-row items-center"><HeartHandshake size={22} color="#FF8A63" /><Text className="text-white font-black text-lg ml-2">Hunt + trick + give back</Text></View>
          <Text className="text-gray-300 text-sm mt-2">Every hidden QR costs $2. The payment is tracked in SkateQuest's skateboard support fund for boards, gear, and youth skate access. A QR cannot be generated until Stripe confirms payment.</Text>
        </View>

        <View className={`rounded-xl p-4 mb-5 border ${purchaseId ? 'bg-emerald-500/10 border-emerald-700' : 'bg-[#121826] border-[#2A3344]'}`}>
          <Text className={purchaseId ? 'text-emerald-300 font-black' : 'text-white font-black'}>{purchaseId ? '✓ $2 payment confirmed' : '$2 payment required'}</Text>
          <Text className="text-gray-400 text-xs mt-1">One confirmed payment unlocks exactly one hidden QR.</Text>
          {!purchaseId ? (
            <TouchableOpacity className="bg-[#FF5A3C] py-3 rounded-xl items-center mt-4" onPress={startCheckout} disabled={startingPayment}>
              <Text className="text-white font-black">{startingPayment ? 'Opening secure checkout…' : 'Pay $2 & Support Skateboarding'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity className="py-3 items-center mt-1" onPress={() => refreshPayment(true)} disabled={checkingPayment}>
            <Text className="text-gray-300 font-bold">{checkingPayment ? 'Checking payment…' : 'Check payment status'}</Text>
          </TouchableOpacity>
        </View>

        {locating ? <View className="flex-row items-center bg-[#121826] rounded-xl p-4 mb-5"><ActivityIndicator color="#D2673D" /><Text className="text-gray-400 ml-3">Getting real GPS location…</Text></View> : locationError ? <View className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-5"><Text className="text-red-300">{locationError}</Text><TouchableOpacity onPress={locate} className="mt-3"><Text className="text-white font-black">Try location again</Text></TouchableOpacity></View> : <View className="flex-row items-center bg-[#121826] rounded-xl p-4 mb-5"><MapPin size={17} color="#D2673D" /><Text className="text-gray-300 ml-2 flex-1">Hide point locked to your current GPS position</Text></View>}

        <Text className="text-gray-200 font-black mb-2">Required trick</Text>
        <TextInput className="bg-[#121826] text-gray-100 p-4 rounded-xl mb-4" placeholder="Example: kickflip, frontside 180, 50-50" placeholderTextColor="#6B7280" value={trick} onChangeText={setTrick} />

        <Text className="text-gray-300 font-bold mb-2">Hide spot description (optional)</Text>
        <TextInput className="bg-[#121826] text-gray-100 p-4 rounded-xl mb-4" placeholder="Example: under the bench beside the bowl" placeholderTextColor="#6B7280" value={description} onChangeText={setDescription} />

        <Text className="text-gray-300 font-bold mb-2">Message for finder (optional)</Text>
        <TextInput className="bg-[#121826] text-gray-100 p-4 rounded-xl mb-5" placeholder="Leave a short note" placeholderTextColor="#6B7280" value={message} onChangeText={setMessage} multiline />

        <View className="bg-emerald-500/10 border border-emerald-700 rounded-xl p-4 mb-6"><Text className="text-emerald-300 font-black">50 XP · proof required</Text><Text className="text-gray-400 text-xs mt-1">Scanning only verifies the hunt. XP is awarded after the finder uploads the trick and the hider approves it.</Text></View>

        <TouchableOpacity className={`bg-[#FF5A3C] py-4 rounded-xl items-center ${saving || locating || !coords || !purchaseId || !trick.trim() ? 'opacity-50' : ''}`} onPress={createCode} disabled={saving || locating || !coords || !purchaseId || !trick.trim()}><Text className="text-white font-black">{saving ? 'Generating…' : 'Generate Paid Trick QR'}</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
