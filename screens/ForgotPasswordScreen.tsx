import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, CheckCircle2, Crosshair, KeyRound, Mail, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
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
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.poster}>
            <View style={s.posterOrange} />
            <View style={s.posterAcid} />
            <View style={s.posterBlue} />

            <View style={s.posterTop}>
              <View style={s.brandStamp}>
                <Crosshair color={INK} size={18} strokeWidth={3} />
                <Text style={s.brandStampText}>SQ</Text>
              </View>
              <View style={s.posterChip}>
                <ShieldCheck color={ACID} size={13} />
                <Text style={s.posterChipText}>ACCOUNT RECOVERY</Text>
              </View>
            </View>

            <View style={s.posterCopy}>
              <Text style={s.posterTitle}>{sent ? 'LINK\nSENT.' : 'GET BACK\nON BOARD.'}</Text>
              <Text style={s.posterLine}>{sent ? 'CHECK THE NEWEST EMAIL' : 'RESET // RETURN // ROLL'}</Text>
            </View>

            <View style={s.posterFooter}>
              <View style={s.posterFooterIcon}>
                {sent ? <CheckCircle2 color={INK} size={22} strokeWidth={2.8} /> : <KeyRound color={INK} size={22} strokeWidth={2.8} />}
              </View>
              <Text style={s.posterFooterText}>{sent ? 'RECOVERY LINK READY' : 'SECURE PASSWORD RESET'}</Text>
            </View>
          </View>

          <View style={s.formSheet}>
            <View style={s.formHeadingRow}>
              <View style={s.headingCopy}>
                <Text style={s.formKicker}>ACCOUNT ACCESS // 03</Text>
                <Text style={s.formTitle}>{sent ? 'Check your email' : 'Reset password'}</Text>
              </View>
              <View style={[s.formNumber, sent && s.formNumberDone]}>
                <Text style={s.formNumberText}>{sent ? '✓' : '03'}</Text>
              </View>
            </View>

            <Text style={s.formIntro}>
              {sent
                ? `We sent password reset instructions to ${email.trim()}.`
                : 'Enter the email connected to your SkateQuest account.'}
            </Text>

            {!sent ? (
              <>
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>EMAIL</Text>
                  <View style={s.inputRow}>
                    <Mail size={18} color="#777D87" />
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
                </View>

                <Pressable
                  disabled={loading || !email.trim()}
                  onPress={handleReset}
                  style={[s.primaryButton, (!email.trim() || loading) && s.disabled]}
                >
                  {loading ? (
                    <ActivityIndicator color={INK} />
                  ) : (
                    <>
                      <Text style={s.primaryButtonText}>SEND RESET LINK</Text>
                      <View style={s.primaryArrow}>
                        <ArrowRight color={INK} size={19} strokeWidth={3} />
                      </View>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <View style={s.sentTicket}>
                <View style={s.sentIcon}>
                  <CheckCircle2 color={INK} size={24} strokeWidth={2.8} />
                </View>
                <View style={s.sentCopy}>
                  <Text style={s.sentTitle}>USE THE NEWEST LINK</Text>
                  <Text style={s.sentText}>Open the reset email on this device to continue back into SkateQuest.</Text>
                </View>
              </View>
            )}

            <Pressable onPress={() => navigation.goBack()} style={s.backButton}>
              <ArrowLeft size={16} color={ORANGE} strokeWidth={2.8} />
              <Text style={s.backText}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 28 },
  poster: {
    height: 286,
    margin: 14,
    marginBottom: 0,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#11141A',
    borderWidth: 1,
    borderColor: '#2A2E36',
    position: 'relative',
  },
  posterOrange: { position: 'absolute', width: 250, height: 82, right: -90, top: 32, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  posterAcid: { position: 'absolute', width: 230, height: 25, left: -92, bottom: 67, backgroundColor: ACID, transform: [{ rotate: '-12deg' }] },
  posterBlue: { position: 'absolute', width: 116, height: 116, borderRadius: 58, right: 16, bottom: 10, backgroundColor: BLUE, opacity: 0.17 },
  posterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  brandStamp: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACID, borderRadius: 12, paddingHorizontal: 10, minHeight: 38, transform: [{ rotate: '-3deg' }] },
  brandStampText: { color: INK, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  posterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 9, minHeight: 31, borderRadius: 999 },
  posterChipText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  posterCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 2 },
  posterTitle: { color: PAPER, fontSize: 46, lineHeight: 42, fontWeight: '900', letterSpacing: -2.7 },
  posterLine: { color: ORANGE, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 12 },
  posterFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, paddingTop: 0 },
  posterFooterIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  posterFooterText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  formSheet: { marginTop: -8, marginHorizontal: 14, backgroundColor: PAPER, borderRadius: 27, padding: 19, borderWidth: 2, borderColor: INK, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  formHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  headingCopy: { flex: 1 },
  formKicker: { color: ORANGE, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.6 },
  formTitle: { color: INK, fontSize: 30, fontWeight: '900', letterSpacing: -1.3, marginTop: 2 },
  formNumber: { width: 42, height: 42, borderRadius: 13, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  formNumberDone: { backgroundColor: ACID },
  formNumberText: { color: INK, fontSize: 15, fontWeight: '900' },
  formIntro: { color: '#666C75', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 8, marginBottom: 17 },
  fieldWrap: { marginBottom: 11 },
  fieldLabel: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.35, marginBottom: 6, marginLeft: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E9E4DA', borderRadius: 14, minHeight: 52, paddingHorizontal: 13, borderWidth: 1.5, borderColor: '#CFC8BB' },
  input: { flex: 1, color: INK, fontSize: 15, fontWeight: '700', paddingVertical: 13 },
  primaryButton: { minHeight: 55, backgroundColor: ACID, borderRadius: 15, borderWidth: 2, borderColor: INK, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, transform: [{ rotate: '-0.4deg' }] },
  primaryButtonText: { color: INK, fontWeight: '900', fontSize: 14, letterSpacing: 0.6 },
  primaryArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.48 },
  sentTicket: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E9E4DA', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#CFC8BB' },
  sentIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sentCopy: { flex: 1 },
  sentTitle: { color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  sentText: { color: '#666C75', fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, paddingVertical: 10 },
  backText: { color: ORANGE, fontSize: 12, fontWeight: '900' },
});