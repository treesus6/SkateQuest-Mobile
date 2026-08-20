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
import { ArrowRight, CheckCircle2, Crosshair, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { supabase } from '../lib/supabase';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const savePassword = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (error) {
      Alert.alert(
        'Password not changed',
        error instanceof Error ? error.message : 'Open the newest reset link and try again.'
      );
    } finally {
      setSaving(false);
    }
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
                <Text style={s.posterChipText}>{done ? 'ACCESS RESTORED' : 'SECURE RESET'}</Text>
              </View>
            </View>

            <View style={s.posterCopy}>
              <Text style={s.posterTitle}>{done ? 'BACK IN\nTHE GAME.' : 'NEW KEY.\nSAME QUEST.'}</Text>
              <Text style={s.posterLine}>{done ? 'PASSWORD UPDATED' : 'LOCK IT DOWN // KEEP ROLLING'}</Text>
            </View>

            <View style={s.posterFooter}>
              <View style={s.posterFooterIcon}>
                {done ? <CheckCircle2 color={INK} size={22} strokeWidth={2.8} /> : <KeyRound color={INK} size={22} strokeWidth={2.8} />}
              </View>
              <Text style={s.posterFooterText}>{done ? 'YOUR ACCOUNT IS READY' : '8+ CHARACTERS REQUIRED'}</Text>
            </View>
          </View>

          <View style={s.formSheet}>
            <View style={s.formHeadingRow}>
              <View style={s.headingCopy}>
                <Text style={s.formKicker}>ACCOUNT ACCESS // 04</Text>
                <Text style={s.formTitle}>Set New Password</Text>
              </View>
              <View style={[s.formNumber, done && s.formNumberDone]}>
                <Text style={s.formNumberText}>{done ? '✓' : '04'}</Text>
              </View>
            </View>

            <Text style={s.formIntro}>
              {done
                ? 'Your SkateQuest password has been changed.'
                : 'Choose a new password for your SkateQuest account.'}
            </Text>

            {done ? (
              <>
                <View style={s.doneTicket}>
                  <View style={s.doneIcon}>
                    <CheckCircle2 color={INK} size={25} strokeWidth={2.8} />
                  </View>
                  <View style={s.doneCopy}>
                    <Text style={s.doneTitle}>PASSWORD UPDATED</Text>
                    <Text style={s.doneText}>Your new password is active. Jump back into SkateQuest.</Text>
                  </View>
                </View>
                <Pressable style={s.primaryButton} onPress={() => navigation.replace('Home')}>
                  <Text style={s.primaryButtonText}>Continue to SkateQuest</Text>
                  <View style={s.primaryArrow}>
                    <ArrowRight color={INK} size={19} strokeWidth={3} />
                  </View>
                </Pressable>
              </>
            ) : (
              <>
                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>NEW PASSWORD</Text>
                  <View style={s.inputRow}>
                    <LockKeyhole color="#777D87" size={18} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="New password"
                      placeholderTextColor="#777D87"
                      secureTextEntry
                      autoCapitalize="none"
                      style={s.input}
                    />
                  </View>
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>CONFIRM PASSWORD</Text>
                  <View style={s.inputRow}>
                    <LockKeyhole color="#777D87" size={18} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#777D87"
                      secureTextEntry
                      autoCapitalize="none"
                      style={s.input}
                    />
                  </View>
                </View>

                <Pressable
                  disabled={saving}
                  onPress={savePassword}
                  style={[s.primaryButton, saving && s.disabled]}
                >
                  {saving ? (
                    <ActivityIndicator color={INK} />
                  ) : (
                    <>
                      <Text style={s.primaryButtonText}>Change Password</Text>
                      <View style={s.primaryArrow}>
                        <ArrowRight color={INK} size={19} strokeWidth={3} />
                      </View>
                    </>
                  )}
                </Pressable>
              </>
            )}
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
  primaryButtonText: { color: INK, fontWeight: '900', fontSize: 14, letterSpacing: 0.4 },
  primaryArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  doneTicket: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E9E4DA', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#CFC8BB', marginBottom: 14 },
  doneIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  doneCopy: { flex: 1 },
  doneTitle: { color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  doneText: { color: '#666C75', fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 4 },
});