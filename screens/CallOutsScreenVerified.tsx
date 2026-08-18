import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Clock, Crosshair, MapPin, Play, Upload, X } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useRoute } from '../lib/useNavigation';
import { supabase } from '../lib/supabase';
import { getCurrentLocation } from '../lib/currentLocation';
import { pickVideo, uploadVideo } from '../lib/mediaUpload';

const XP_OPTIONS = [25, 50, 100, 150, 200];
type Tab = 'received' | 'sent';

type CallOutRow = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  trick_name: string;
  park_id: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'declined' | 'expired';
  challenged_video_url: string | null;
  xp_stake: number;
  created_at: string;
  expires_at: string;
  challenger?: { id: string; username: string | null; display_name: string | null } | null;
  challenged?: { id: string; username: string | null; display_name: string | null } | null;
  spot?: { id: string; name: string } | null;
};

type Person = { id: string; username: string | null; display_name: string | null; level: number | null };
type Spot = { id: string; name: string };

export default function CallOutsScreenVerified() {
  const { user } = useAuthStore();
  const route = useRoute<any>();
  const [tab, setTab] = useState<Tab>('received');
  const [rows, setRows] = useState<CallOutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [targetId, setTargetId] = useState(route.params?.targetId || '');
  const [spotId, setSpotId] = useState('');
  const [trick, setTrick] = useState('');
  const [message, setMessage] = useState('');
  const [xp, setXp] = useState(100);

  const loadRows = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const filter = tab === 'received' ? ['challenged_id', user.id] : ['challenger_id', user.id];
      const { data, error } = await supabase
        .from('callouts')
        .select(`
          id, challenger_id, challenged_id, trick_name, park_id, message, status,
          challenged_video_url, xp_stake, created_at, expires_at,
          challenger:profiles!callouts_challenger_id_fkey(id,username,display_name),
          challenged:profiles!callouts_challenged_id_fkey(id,username,display_name),
          spot:skate_spots!callouts_park_id_fkey(id,name)
        `)
        .eq(filter[0], filter[1])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data || []) as unknown as CallOutRow[]);
    } catch (error: any) {
      Alert.alert('Call Outs unavailable', error?.message || 'Could not load Call Outs.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, user]);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => {
    if (route.params?.targetId) {
      setTargetId(route.params.targetId);
      setCreateOpen(true);
    }
  }, [route.params?.targetId]);

  const loadCreateData = useCallback(async () => {
    if (!user) return;
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id,username,display_name,level')
      .neq('id', user.id)
      .order('xp', { ascending: false })
      .limit(50);
    setPeople((usersData || []) as Person[]);

    try {
      const loc = await getCurrentLocation();
      const { data, error } = await supabase.rpc('get_nearby_spots', {
        lat: loc.latitude,
        lng: loc.longitude,
        radius_meters: 50000,
      });
      if (error) throw error;
      setSpots(((data || []) as any[]).slice(0, 30).map(s => ({ id: s.id, name: s.name })));
    } catch {
      setSpots([]);
    }
  }, [user]);

  useEffect(() => { if (createOpen) loadCreateData(); }, [createOpen, loadCreateData]);

  const createCallOut = async () => {
    if (!targetId || trick.trim().length < 2) {
      Alert.alert('Missing info', 'Choose a skater and enter a trick.');
      return;
    }
    try {
      const { error } = await supabase.rpc('create_callout', {
        p_target_id: targetId,
        p_trick_name: trick.trim(),
        p_park_id: spotId || null,
        p_message: message.trim() || null,
        p_xp_stake: xp,
      });
      if (error) throw error;
      setCreateOpen(false);
      setTrick(''); setMessage(''); setSpotId(''); setXp(100);
      setTab('sent');
      await loadRows();
      Alert.alert('Call Out sent', 'They have to accept and submit a real video before XP can be awarded.');
    } catch (error: any) {
      Alert.alert('Could not send', error?.message || 'Please try again.');
    }
  };

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc('respond_callout', { p_callout_id: id, p_accept: accept });
      if (error) throw error;
      await loadRows();
    } catch (error: any) {
      Alert.alert('Could not update', error?.message || 'Please try again.');
    } finally { setBusyId(null); }
  };

  const submitProof = async (row: CallOutRow) => {
    if (!user) return;
    setBusyId(row.id);
    try {
      const asset = await pickVideo(false);
      if (!asset) return;
      const uploaded = await uploadVideo(asset.uri, `callout-${row.id}`, user.id, asset.duration ?? undefined);
      const { error } = await supabase.rpc('submit_callout_proof', {
        p_callout_id: row.id,
        p_video_url: uploaded.url,
      });
      if (error) throw error;
      await loadRows();
      Alert.alert('Proof submitted', 'The challenger can now watch the clip and verify the landing.');
    } catch (error: any) {
      Alert.alert('Proof upload failed', error?.message || 'Please try again.');
    } finally { setBusyId(null); }
  };

  const verify = async (row: CallOutRow, approve: boolean) => {
    setBusyId(row.id);
    try {
      const { data, error } = await supabase.rpc('verify_callout', { p_callout_id: row.id, p_approve: approve });
      if (error) throw error;
      await loadRows();
      if (approve) {
        const reward = Number((data as any)?.xp_awarded || 0);
        Alert.alert('Landing verified', reward > 0 ? `+${reward} XP awarded.` : 'Already awarded.');
      } else {
        Alert.alert('Proof rejected', 'They can upload a new clip.');
      }
    } catch (error: any) {
      Alert.alert('Could not verify', error?.message || 'Please try again.');
    } finally { setBusyId(null); }
  };

  const personName = (p?: { username: string | null; display_name: string | null } | null) =>
    p?.display_name || p?.username || 'Skater';

  const renderRow = ({ item }: { item: CallOutRow }) => {
    const received = tab === 'received';
    const other = received ? item.challenger : item.challenged;
    const busy = busyId === item.id;
    return (
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-200 dark:border-gray-700">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-black uppercase tracking-widest text-brand-terracotta">{received ? 'Called out by' : 'You called out'}</Text>
            <Text className="text-lg font-black text-gray-900 dark:text-white">{personName(other)}</Text>
            <Text className="text-2xl font-black text-brand-terracotta mt-2">{item.trick_name}</Text>
            {item.spot?.name ? <Text className="text-sm text-gray-500 mt-1">📍 {item.spot.name}</Text> : null}
            {item.message ? <Text className="text-sm text-gray-500 mt-2">“{item.message}”</Text> : null}
          </View>
          <View className="items-end">
            <Text className="text-brand-green font-black text-lg">+{item.xp_stake} XP</Text>
            <Text className="text-xs text-gray-400 uppercase font-bold mt-1">{item.status}</Text>
          </View>
        </View>

        {item.challenged_video_url ? (
          <TouchableOpacity className="mt-4 bg-gray-900 rounded-xl py-3 flex-row items-center justify-center gap-2" onPress={() => Linking.openURL(item.challenged_video_url!)}>
            <Play size={17} color="#fff" />
            <Text className="text-white font-bold">Watch proof video</Text>
          </TouchableOpacity>
        ) : null}

        {busy ? <ActivityIndicator className="mt-4" /> : null}

        {!busy && received && item.status === 'pending' ? (
          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl py-3 items-center" onPress={() => respond(item.id, false)}>
              <Text className="font-bold text-gray-700 dark:text-gray-200">Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-brand-terracotta rounded-xl py-3 items-center" onPress={() => respond(item.id, true)}>
              <Text className="font-bold text-white">Accept</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!busy && received && item.status === 'accepted' && !item.challenged_video_url ? (
          <TouchableOpacity className="mt-4 bg-brand-green rounded-xl py-3 flex-row justify-center items-center gap-2" onPress={() => submitProof(item)}>
            <Upload size={17} color="#fff" />
            <Text className="font-bold text-white">Upload landing video</Text>
          </TouchableOpacity>
        ) : null}

        {!busy && !received && item.status === 'accepted' && item.challenged_video_url ? (
          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity className="flex-1 bg-red-500 rounded-xl py-3 items-center" onPress={() => verify(item, false)}>
              <Text className="font-bold text-white">Reject proof</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-brand-green rounded-xl py-3 items-center" onPress={() => verify(item, true)}>
              <Text className="font-bold text-white">Verify landing</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="px-5 pt-12 pb-4 bg-gray-950">
        <View className="flex-row items-center gap-2"><Crosshair size={20} color="#D2673D" /><Text className="text-white text-2xl font-black">Call Outs</Text></View>
        <Text className="text-gray-400 text-sm mt-1">Challenge. Accept. Upload the landing. Verify it. Then XP pays.</Text>
      </View>

      <View className="flex-row bg-white dark:bg-gray-800">
        {(['received','sent'] as Tab[]).map(t => (
          <TouchableOpacity key={t} className={`flex-1 py-4 items-center ${tab===t ? 'border-b-[3px] border-brand-terracotta' : ''}`} onPress={() => setTab(t)}>
            <Text className={tab===t ? 'font-black text-brand-terracotta' : 'font-bold text-gray-500'}>{t === 'received' ? 'Received' : 'Sent'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator className="mt-10" /> : (
        <FlatList
          data={rows}
          renderItem={renderRow}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          refreshing={loading}
          onRefresh={loadRows}
          ListEmptyComponent={<View className="items-center mt-20"><Text className="text-gray-500 font-bold">No Call Outs here yet.</Text></View>}
        />
      )}

      <TouchableOpacity className="absolute right-5 bottom-8 bg-brand-terracotta rounded-full px-6 py-4" onPress={() => setCreateOpen(true)}>
        <Text className="text-white font-black">+ Call Out</Text>
      </TouchableOpacity>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-5" style={{ maxHeight: '90%' }}>
            <ScrollView>
              <Text className="text-2xl font-black text-gray-900 dark:text-white">Create a real Call Out</Text>
              <Text className="text-sm text-gray-500 mt-1 mb-4">XP is only paid after a submitted video is verified.</Text>

              <Text className="font-bold text-gray-600 dark:text-gray-300 mb-2">Skater</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {people.map(p => (
                  <TouchableOpacity key={p.id} className={`mr-2 rounded-full px-4 py-3 ${targetId===p.id ? 'bg-brand-terracotta' : 'bg-gray-100 dark:bg-gray-700'}`} onPress={() => setTargetId(p.id)}>
                    <Text className={targetId===p.id ? 'text-white font-bold' : 'text-gray-800 dark:text-gray-100 font-bold'}>{p.display_name || p.username || 'Skater'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="font-bold text-gray-600 dark:text-gray-300 mb-2">Trick</Text>
              <TextInput value={trick} onChangeText={setTrick} placeholder="Kickflip, tre flip, 50-50..." placeholderTextColor="#999" className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 mb-4" />

              <Text className="font-bold text-gray-600 dark:text-gray-300 mb-2">Spot (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <TouchableOpacity className={`mr-2 rounded-full px-4 py-3 ${!spotId ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`} onPress={() => setSpotId('')}><Text className={!spotId ? 'text-white font-bold' : 'text-gray-700 dark:text-gray-200 font-bold'}>Any spot</Text></TouchableOpacity>
                {spots.map(s => <TouchableOpacity key={s.id} className={`mr-2 rounded-full px-4 py-3 ${spotId===s.id ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`} onPress={() => setSpotId(s.id)}><Text className={spotId===s.id ? 'text-white font-bold' : 'text-gray-700 dark:text-gray-200 font-bold'}>{s.name}</Text></TouchableOpacity>)}
              </ScrollView>

              <Text className="font-bold text-gray-600 dark:text-gray-300 mb-2">XP reward</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">{XP_OPTIONS.map(v => <TouchableOpacity key={v} className={`rounded-full px-4 py-3 ${xp===v ? 'bg-brand-green' : 'bg-gray-100 dark:bg-gray-700'}`} onPress={() => setXp(v)}><Text className={xp===v ? 'text-white font-black' : 'text-gray-700 dark:text-gray-200 font-bold'}>{v} XP</Text></TouchableOpacity>)}</View>

              <TextInput value={message} onChangeText={setMessage} placeholder="Message (optional)" placeholderTextColor="#999" multiline className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 mb-4" />

              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl py-4 items-center" onPress={() => setCreateOpen(false)}><Text className="font-bold text-gray-700 dark:text-gray-200">Cancel</Text></TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-brand-terracotta rounded-xl py-4 items-center" onPress={createCallOut}><Text className="font-black text-white">Send Call Out</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
