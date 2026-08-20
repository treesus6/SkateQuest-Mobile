import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <View style={[s.page, { paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 18) }]}>
        <View style={s.poster}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.blueOrb} />
          <View style={s.posterStamp}>
            {sent ? <CheckCircle2 size={31} color={INK} strokeWidth={2.7} /> : <KeyRound size={31} color={INK} strokeWidth={2.7} />}
          </View>
          <Text style={s.posterKicker}>ACCOUNT ACCESS</Text>
          <Text style={s.posterTitle}>{sent ? 'CHECK YOUR\nEMAIL.' : 'GET BACK\nIN.'}</Text>
        </View>

        <View style={s.ticket}>
          <View style={s.ticketTop}>
            <View>
              <Text style={s.kicker}>SKATEQUEST RECOVERY</Text>
              <Text style={s.title}>{sent ? 'Check your email' : 'Reset password'}</Text>
            </View>
            <View style={[s.ticketNumber, sent && s.ticketNumberSent]}>
              <Text style={s.ticketNumberText}>{sent ? 'OK' : '03'}</Text>
            </View>
          </View>

          <Text style={s.body}>
            {sent
              ? `We sent password reset instructions to ${email.trim()}.`
              : 'Enter the email connected to your SkateQuest account.'}
          </Text>

          {!sent ? (
            <>
              <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
              <View style={s.inputWrap}>
                <Mail size={18} color="#6B706F" />
                <TextInput
                  style={s.input}
                  placeholder="Email address"
                  placeholderTextColor="#777D87"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <Pressable
                disabled={loading || !email.trim()}
                onPress={handleReset}
                style={[s.sendButton, (!email.trim() || loading) && s.disabled]}
              >
                {loading ? (
                  <ActivityIndicator color={INK} />
                ) : (
                  <>
                    <Text style={s.sendText}>SEND RESET LINK</Text>
                    <View style={s.sendArrow}><ArrowRight color={INK} size={19} strokeWidth={3} /></View>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <View style={s.sentPanel}>
              <CheckCircle2 color={INK} size={22} />
              <Text style={s.sentPanelText}>Open the newest reset email on this device, then come straight back to SkateQuest.</Text>
            </View>
          )}

          <Pressable onPress={() => navigation.goBack()} style={s.backButton}>
            <ArrowLeft size={16} color={INK} strokeWidth={2.8} />
            <Text style={s.backText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: 14 },
  poster: { minHeight: 235, backgroundColor: '#11141A', borderRadius: 28, borderWidth: 1, borderColor: '#2A2E36', padding: 20, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 245, height: 78, right: -84, top: 24, backgroundColor: ORANGE, transform: [{ rotate: '34deg' }] },
  acidSlash: { position: 'absolute', width: 190, height: 24, left: -65, bottom: 38, backgroundColor: ACID, transform: [{ rotate: '-12deg' }] },
  blueOrb: { position: 'absolute', width: 110, height: 110, borderRadius: 55, right: 18, bottom: -38, backgroundColor: BLUE, opacity: 0.15 },
  posterStamp: { width: 66, height: 66, borderRadius: 19, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  posterKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 23 },
  posterTitle: { color: PAPER, fontSize: 40, lineHeight: 37, fontWeight: '900', letterSpacing: -2, marginTop: 4 },

  ticket: { marginTop: -8, backgroundColor: PAPER, borderRadius: 26, borderWidth: 2, borderColor: INK, padding: 19, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kicker: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.45 },
  title: { color: INK, fontSize: 28, fontWeight: '900', letterSpacing: -1.1, marginTop: 2 },
  ticketNumber: { width: 42, height: 42, borderRadius: 13, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  ticketNumberSent: { backgroundColor: ACID },
  ticketNumberText: { color: INK, fontSize: 13, fontWeight: '900' },
  body: { color: '#646963', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 9, marginBottom: 17 },
  fieldLabel: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.25, marginLeft: 2, marginBottom: 6 },
  inputWrap: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E9E4DA', borderRadius: 14, borderWidth: 1.5, borderColor: '#CFC8BB', paddingHorizontal: 13 },
  input: { flex: 1, color: INK, fontSize: 15, fontWeight: '700', paddingVertical: 13 },
  sendButton: { minHeight: 55, backgroundColor: ACID, borderRadius: 15, borderWidth: 2, borderColor: INK, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13, transform: [{ rotate: '-0.4deg' }] },
  sendText: { color: INK, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  sendArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  sentPanel: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 2, borderColor: INK, backgroundColor: ACID, padding: 13 },
  sentPanelText: { flex: 1, color: INK, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  backButton: { marginTop: 16, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderTopWidth: 1, borderTopColor: '#D6CFC3', paddingTop: 13 },
  backText: { color: INK, fontSize: 11, fontWeight: '900' },
});
