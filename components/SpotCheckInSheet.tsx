import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { discoveryService, reportDiscoveryError } from '../lib/discoveryService';
import { getVerifiedCoordinates } from '../lib/verifiedLocation';
import { SCENE_COLORS as C, SCENE_TYPE as T } from '../lib/sceneTheme';
import { Haptics } from '../lib/haptics';
type Spot = { id: string; name: string };
export default function SpotCheckInSheet({
  spot,
  onClose,
  onSaved,
}: {
  spot: Spot | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthStore();
  const [minutes, setMinutes] = useState(60),
    [stance, setStance] = useState('regular'),
    [message, setMessage] = useState('');
  const [ownId, setOwnId] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [retry, setRetry] = useState(0);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    setError(null);
    setOwnId(null);
    setMinutes(60);
    setStance('regular');
    setMessage('');
    if (!spot) return;
    if (!user) {
      setError('Sign in to check in at a real spot.');
      return;
    }
    void (async () => {
      try {
        const result = await supabase
          .from('live_checkins')
          .select('id,message,stance')
          .eq('user_id', user.id)
          .eq('park_id', spot.id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (result.error) throw result.error;
        if (active) {
          setOwnId(result.data?.id ?? null);
          setMessage(result.data?.message ?? '');
          setStance(result.data?.stance ?? 'regular');
          setReady(true);
        }
      } catch (err) {
        if (active) setError(reportDiscoveryError('Own check-in lookup failed', err));
      }
    })();
    return () => {
      active = false;
    };
  }, [spot?.id, user?.id, retry]);
  const save = async (checkout = false) => {
    if (!spot || !user || !ready || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      if (checkout && ownId) await discoveryService.endSession(ownId);
      else {
        const position = await getVerifiedCoordinates();
        await discoveryService.startSession(spot.id, position, minutes, stance, message);
      }
      Haptics.success();
      onSaved();
      onClose();
      Alert.alert(
        checkout ? 'Checked out' : 'Check-in saved',
        checkout
          ? 'Your spot is no longer shown as live.'
          : `${spot.name} · ${minutes} minute session saved.`
      );
    } catch (err) {
      setError(reportDiscoveryError('Spot check-in failed', err));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      visible={spot !== null}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{
            maxHeight: '85%',
            backgroundColor: C.card,
            borderTopWidth: 2,
            borderColor: C.acid,
          }}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        >
          <Pressable
            disabled={busy}
            accessibilityLabel="Close check-in"
            onPress={onClose}
            style={{ minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <Text style={{ ...T.strong, color: C.paper }}>CLOSE ✕</Text>
          </Pressable>
          <Text style={{ ...T.metric, color: C.acid, fontSize: 11 }}>LIVE SPOT SESSION</Text>
          <Text style={{ ...T.display, color: C.paper, fontSize: 26, marginVertical: 8 }}>
            {spot?.name}
          </Text>
          <Text style={{ ...T.body, color: '#A9B0BA', marginBottom: 14 }}>
            Your profile and this spot are visible to other skaters until checkout or expiry.
            Check-in requires a fresh device location within 150m.
          </Text>
          <ScrollView horizontal contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {[30, 60, 120, 240].map(value => (
              <Pressable
                key={value}
                accessibilityState={{ selected: minutes === value }}
                onPress={() => setMinutes(value)}
                style={{
                  padding: 12,
                  borderWidth: 2,
                  borderColor: minutes === value ? C.acid : '#343B47',
                }}
              >
                <Text style={{ ...T.metric, color: C.paper }}>{value}m</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {['regular', 'goofy', 'switch'].map(value => (
              <Pressable
                key={value}
                accessibilityState={{ selected: stance === value }}
                onPress={() => setStance(value)}
                style={{
                  padding: 12,
                  borderWidth: 2,
                  borderColor: stance === value ? C.acid : '#343B47',
                }}
              >
                <Text style={{ ...T.strong, color: C.paper }}>{value.toUpperCase()}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            accessibilityLabel="Session note"
            placeholder="Flatground, learning kickflips…"
            placeholderTextColor="#979EAA"
            value={message}
            onChangeText={setMessage}
            maxLength={280}
            multiline
            style={{
              ...T.body,
              color: C.paper,
              minHeight: 70,
              borderWidth: 2,
              borderColor: '#343B47',
              padding: 12,
              marginBottom: 14,
            }}
          />
          {error ? (
            <View>
              <Text
                accessibilityRole="alert"
                style={{ ...T.body, color: '#FFAF8B', marginBottom: 10 }}
              >
                {error}
              </Text>
              {!ready ? (
                <Pressable onPress={() => setRetry(n => n + 1)} style={{ padding: 12 }}>
                  <Text style={{ color: C.acid }}>RETRY</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Pressable
            disabled={!ready || busy}
            onPress={() => void save()}
            style={{
              minHeight: 50,
              backgroundColor: C.acid,
              opacity: !ready || busy ? 0.5 : 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? (
              <ActivityIndicator color={C.ink} />
            ) : (
              <Text style={{ ...T.strong, color: C.ink }}>
                {ownId ? 'UPDATE SESSION' : 'CHECK IN HERE'}
              </Text>
            )}
          </Pressable>
          {ownId ? (
            <Pressable
              disabled={busy}
              onPress={() => void save(true)}
              style={{ minHeight: 50, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ ...T.strong, color: C.orange }}>CHECK OUT</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
