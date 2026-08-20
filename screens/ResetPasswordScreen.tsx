import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole } from 'lucide-react-native';
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
      <View style={s.page}>
        <View style={s.poster}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.blueOrb} />
          <View style={[s.stamp, done && s.stampDone]}>
            {done ? <CheckCircle2 color={INK} size={32} strokeWidth={2.8} /> : <KeyRound color={INK} size={32} strokeWidth={2.8} />}
          </View>
          <Text style={s.posterKicker}>{done ? 'ACCESS RESTORED' : 'NEW KEY'}</Text>
          <Text style={s.posterTitle}>{done ? 'YOU’RE\nBACK IN.' : 'LOCK IT\nDOWN.'}</Text>
        </View>

        <View style={s.ticket}>
          <View style={s.ticketTop}>
            <View>
              <Text style={s.kicker}>SKATEQUEST ACCOUNT</Text>
              <Text style={s.title}>Set New Password</Text>
            </View>
            <View style={[s.numberStamp, done && s.numberStampDone]}>
              <Text style={s.numberText}>{done ? 'OK' : '04'}</Text>
            </View>
          </View>

          <Text style={s.body}>
            {done ? 'Your SkateQuest password has been changed.' : 'Choose a new password for your SkateQuest account.'}
          </Text>

          {done ? (
            <View>
              <View style={s.successPanel}>
                <CheckCircle2 color={INK} size={22} />
                <Text style={s.successText}>New password saved. Your account is ready for the next session.</Text>
              </View>
              <Pressable onPress={() => navigation.replace('Home')} style={s.primaryButton}>
                <Text style={s.primaryText}>Continue to SkateQuest</Text>
                <View style={s.primaryArrow}><ArrowRight color={INK} size={19} strokeWidth={3} /></View>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={s.fieldLabel}>NEW PASSWORD</Text>
              <View style={s.inputWrap}>
                <LockKeyhole color="#666B70" size={18} />
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

              <View style={s.fieldLabelRow}>
                <Text style={s.fieldLabel}>CONFIRM PASSWORD</Text>
                <Text style={s.fieldHint}>8+ CHARACTERS</Text>
              </View>
              <View style={s.inputWrap}>
                <LockKeyhole color="#666B70" size={18} />
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

              <Pressable disabled={saving} onPress={savePassword} style={[s.primaryButton, saving && s.disabled]}>
                {saving ? (
                  <ActivityIndicator color={INK} />
                ) : (
                  <>
                    <Text style={s.primaryText}>Change Password</Text>
                    <View style={s.primaryArrow}><ArrowRight color={INK} size={19} strokeWidth={3} /></View>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 18, width: '100%', maxWidth: 540, alignSelf: 'center' },
  poster: { minHeight: 230, backgroundColor: '#11141A', borderRadius: 28, borderWidth: 1, borderColor: '#2A2E36', padding: 20, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 245, height: 78, right: -84, top: 24, backgroundColor: ORANGE, transform: [{ rotate: '34deg' }] },
  acidSlash: { position: 'absolute', width: 190, height: 24, left: -65, bottom: 38, backgroundColor: ACID, transform: [{ rotate: '-12deg' }] },
  blueOrb: { position: 'absolute', width: 110, height: 110, borderRadius: 55, right: 18, bottom: -38, backgroundColor: BLUE, opacity: 0.15 },
  stamp: { width: 66, height: 66, borderRadius: 19, backgroundColor: ORANGE, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  stampDone: { backgroundColor: ACID },
  posterKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 22 },
  posterTitle: { color: PAPER, fontSize: 40, lineHeight: 37, fontWeight: '900', letterSpacing: -2, marginTop: 4 },

  ticket: { marginTop: -8, backgroundColor: PAPER, borderRadius: 26, borderWidth: 2, borderColor: INK, padding: 19, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kicker: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.45 },
  title: { color: INK, fontSize: 28, fontWeight: '900', letterSpacing: -1.1, marginTop: 2 },
  numberStamp: { width: 42, height: 42, borderRadius: 13, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  numberStampDone: { backgroundColor: ACID },
  numberText: { color: INK, fontSize: 13, fontWeight: '900' },
  body: { color: '#646963', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 9, marginBottom: 17 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  fieldLabel: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.25, marginLeft: 2, marginBottom: 6 },
  fieldHint: { color: ORANGE, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8, marginBottom: 6 },
  inputWrap: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E9E4DA', borderRadius: 14, borderWidth: 1.5, borderColor: '#CFC8BB', paddingHorizontal: 13 },
  input: { flex: 1, color: INK, fontSize: 15, fontWeight: '700', paddingVertical: 13 },
  primaryButton: { minHeight: 55, backgroundColor: ACID, borderRadius: 15, borderWidth: 2, borderColor: INK, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, transform: [{ rotate: '-0.4deg' }] },
  primaryText: { color: INK, fontSize: 12.5, fontWeight: '900', letterSpacing: 0.4 },
  primaryArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  successPanel: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 2, borderColor: INK, backgroundColor: ACID, padding: 13 },
  successText: { flex: 1, color: INK, fontSize: 11, lineHeight: 16, fontWeight: '800' },
});
