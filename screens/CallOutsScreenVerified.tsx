import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Check, Clock, Crosshair, Flame, MapPin, Play, Trophy, Upload, X, Zap } from 'lucide-react-native';
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

const STATUS_STYLE: Record<CallOutRow['status'], { bg: string; text: string; label: string }> = {
  pending: { bg: '#2B2112', text: '#F2B84B', label: 'WAITING' },
  accepted: { bg: '#112D23', text: '#4ADE80', label: 'ACTIVE' },
  completed: { bg: '#18243C', text: '#60A5FA', label: 'VERIFIED' },
  declined: { bg: '#2C1515', text: '#F87171', label: 'DECLINED' },
  expired: { bg: '#1C212A', text: '#8E97A4', label: 'EXPIRED' },
};

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

  useEffect(() => { void loadRows(); }, [loadRows]);
  useEffect(() => {
    if (route.params?.targetId) {
      setTargetId(route.params.targetId);
      setCreateOpen(true);
    }
  }, [route.params?.targetId]);

  const loadCreateData = useCallback(async () => {
    if (!user) return;
    const { data: usersData } = await supabase.from('profiles').select('id,username,display_name,level').neq('id', user.id).order('xp', { ascending: false }).limit(50);
    setPeople((usersData || []) as Person[]);
    try {
      const loc = await getCurrentLocation();
      const { data, error } = await supabase.rpc('get_nearby_spots', { lat: loc.latitude, lng: loc.longitude, radius_meters: 50000 });
      if (error) throw error;
      setSpots(((data || []) as any[]).slice(0, 30).map(s => ({ id: s.id, name: s.name })));
    } catch {
      setSpots([]);
    }
  }, [user]);

  useEffect(() => { if (createOpen) void loadCreateData(); }, [createOpen, loadCreateData]);

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
      setTrick('');
      setMessage('');
      setSpotId('');
      setXp(100);
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
      const { error } = await supabase.rpc('submit_callout_proof', { p_callout_id: row.id, p_video_url: uploaded.url });
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

  const personName = (p?: { username: string | null; display_name: string | null } | null) => p?.display_name || p?.username || 'Skater';
  const activeCount = useMemo(() => rows.filter(row => row.status === 'pending' || row.status === 'accepted').length, [rows]);
  const verifiedCount = useMemo(() => rows.filter(row => row.status === 'completed').length, [rows]);

  const renderRow = ({ item }: { item: CallOutRow }) => {
    const received = tab === 'received';
    const other = received ? item.challenger : item.challenged;
    const busy = busyId === item.id;
    const status = STATUS_STYLE[item.status];
    return (
      <View className="bg-[#10151D] rounded-3xl p-4 mb-4 border border-[#252D39]">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[11px] font-black tracking-[2px] text-[#D2673D]">{received ? 'CALLED OUT BY' : 'YOU CALLED OUT'}</Text>
            <Text className="text-[#F7F4EF] text-xl font-black mt-1">{personName(other)}</Text>
          </View>
          <View style={{ backgroundColor: status.bg }} className="px-3 py-2 rounded-full"><Text style={{ color: status.text }} className="text-[10px] font-black tracking-widest">{status.label}</Text></View>
        </View>

        <View className="mt-4 bg-[#0B1017] rounded-2xl p-4 border border-[#202733]">
          <Text className="text-[#F7F4EF] text-3xl font-black">{item.trick_name}</Text>
          <View className="flex-row items-center justify-between mt-3">
            <View className="flex-1">
              {item.spot?.name ? <View className="flex-row items-center gap-1.5"><MapPin size={14} color="#8E97A4" /><Text className="text-[#9CA3AF] text-sm">{item.spot.name}</Text></View> : <Text className="text-[#687383] text-sm">Any spot</Text>}
            </View>
            <View className="flex-row items-center gap-1.5 bg-[#16281E] px-3 py-2 rounded-xl"><Zap size={15} color="#4ADE80" /><Text className="text-[#4ADE80] font-black">{item.xp_stake} XP</Text></View>
          </View>
          {item.message ? <Text className="text-[#8E97A4] text-sm mt-3 italic">“{item.message}”</Text> : null}
        </View>

        {item.challenged_video_url ? (
          <TouchableOpacity className="mt-3 bg-[#171D27] border border-[#303947] rounded-2xl py-3 flex-row items-center justify-center gap-2" onPress={() => Linking.openURL(item.challenged_video_url!)}>
            <Play size={17} color="#F7F4EF" />
            <Text className="text-[#F7F4EF] font-black">WATCH PROOF</Text>
          </TouchableOpacity>
        ) : null}

        {busy ? <ActivityIndicator className="mt-4" color="#D2673D" /> : null}

        {!busy && received && item.status === 'pending' ? (
          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity className="flex-1 bg-[#1A202A] border border-[#343D4A] rounded-2xl py-4 items-center" onPress={() => void respond(item.id, false)}><Text className="font-black text-[#9CA3AF]">DECLINE</Text></TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-[#D2673D] rounded-2xl py-4 items-center" onPress={() => void respond(item.id, true)}><Text className="font-black text-white">ACCEPT</Text></TouchableOpacity>
          </View>
        ) : null}

        {!busy && received && item.status === 'accepted' && !item.challenged_video_url ? (
          <TouchableOpacity className="mt-4 bg-[#1F7A4D] rounded-2xl py-4 flex-row justify-center items-center gap-2" onPress={() => void submitProof(item)}><Upload size={17} color="#fff" /><Text className="font-black text-white">UPLOAD LANDING</Text></TouchableOpacity>
        ) : null}

        {!busy && !received && item.status === 'accepted' && item.challenged_video_url ? (
          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity className="flex-1 bg-[#392020] rounded-2xl py-4 items-center" onPress={() => void verify(item, false)}><Text className="font-black text-[#FCA5A5]">REJECT</Text></TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-[#1F7A4D] rounded-2xl py-4 items-center" onPress={() => void verify(item, true)}><Text className="font-black text-white">VERIFY</Text></TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-5 bg-[#0A0E14] border-b border-[#1D2530]">
        <View className="flex-row items-center gap-2"><Crosshair size={22} color="#D2673D" /><Text className="text-[#F7F4EF] text-3xl font-black">Call Outs</Text></View>
        <Text className="text-[#8E97A4] text-sm mt-2">Challenge a skater. Real clip proof. Real verification. Then XP pays.</Text>
        <View className="flex-row gap-3 mt-5">
          <View className="flex-1 bg-[#111721] rounded-2xl p-4 border border-[#252D39]"><Flame size={17} color="#D2673D" /><Text className="text-[#F7F4EF] text-2xl font-black mt-2">{activeCount}</Text><Text className="text-[#7E8897] text-xs">active</Text></View>
          <View className="flex-1 bg-[#111721] rounded-2xl p-4 border border-[#252D39]"><Trophy size={17} color="#F2C94C" /><Text className="text-[#F7F4EF] text-2xl font-black mt-2">{verifiedCount}</Text><Text className="text-[#7E8897] text-xs">verified</Text></View>
        </View>
      </View>

      <View className="flex-row p-2 bg-[#0A0E14] border-b border-[#1D2530]">
        {(['received', 'sent'] as Tab[]).map(t => (
          <TouchableOpacity key={t} className={`flex-1 py-3 rounded-xl items-center ${tab === t ? 'bg-[#D2673D]' : ''}`} onPress={() => setTab(t)}>
            <Text className={tab === t ? 'font-black text-white' : 'font-bold text-[#7E8897]'}>{t === 'received' ? 'Received' : 'Sent'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator className="mt-10" color="#D2673D" /> : (
        <FlatList
          data={rows}
          renderItem={renderRow}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshing={loading}
          onRefresh={loadRows}
          ListEmptyComponent={<View className="items-center mt-20 px-8"><Crosshair size={38} color="#48515F" /><Text className="text-[#F7F4EF] font-black text-lg mt-4">No Call Outs here yet</Text><Text className="text-[#6F7885] text-center mt-2">Start one and put a real trick on the line.</Text></View>}
        />
      )}

      <TouchableOpacity className="absolute right-5 bottom-8 bg-[#D2673D] rounded-full px-6 py-4 shadow-lg" onPress={() => setCreateOpen(true)}><Text className="text-white font-black">+ CALL OUT</Text></TouchableOpacity>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 bg-black/75 justify-end">
          <View className="bg-[#0F141C] rounded-t-[28px] px-5 pt-5 pb-8 border-t border-[#303947]" style={{ maxHeight: '92%' }}>
            <View className="flex-row items-center justify-between mb-3"><View><Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">REAL CHALLENGE</Text><Text className="text-2xl font-black text-[#F7F4EF] mt-1">Create a Call Out</Text></View><TouchableOpacity onPress={() => setCreateOpen(false)} className="w-10 h-10 rounded-full bg-[#1A202A] items-center justify-center"><X color="#9CA3AF" size={20} /></TouchableOpacity></View>
            <Text className="text-sm text-[#7E8897] mb-5">XP only pays after the challenged skater uploads proof and the landing is verified.</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-black text-[#C9D0D8] mb-2">Skater</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                {people.map(p => <TouchableOpacity key={p.id} className={`mr-2 rounded-full px-4 py-3 border ${targetId === p.id ? 'bg-[#D2673D] border-[#D2673D]' : 'bg-[#171D27] border-[#303947]'}`} onPress={() => setTargetId(p.id)}><Text className={targetId === p.id ? 'text-white font-black' : 'text-[#D9DEE5] font-bold'}>{p.display_name || p.username || 'Skater'}</Text></TouchableOpacity>)}
              </ScrollView>

              <Text className="font-black text-[#C9D0D8] mb-2">Trick</Text>
              <TextInput value={trick} onChangeText={setTrick} placeholder="Kickflip, tre flip, 50-50..." placeholderTextColor="#626C79" className="bg-[#171D27] border border-[#303947] text-[#F7F4EF] rounded-2xl px-4 py-4 mb-5" />

              <Text className="font-black text-[#C9D0D8] mb-2">Spot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                <TouchableOpacity className={`mr-2 rounded-full px-4 py-3 border ${!spotId ? 'bg-[#263E64] border-[#3B82F6]' : 'bg-[#171D27] border-[#303947]'}`} onPress={() => setSpotId('')}><Text className={!spotId ? 'text-white font-black' : 'text-[#D9DEE5] font-bold'}>Any spot</Text></TouchableOpacity>
                {spots.map(s => <TouchableOpacity key={s.id} className={`mr-2 rounded-full px-4 py-3 border ${spotId === s.id ? 'bg-[#263E64] border-[#3B82F6]' : 'bg-[#171D27] border-[#303947]'}`} onPress={() => setSpotId(s.id)}><Text className={spotId === s.id ? 'text-white font-black' : 'text-[#D9DEE5] font-bold'}>{s.name}</Text></TouchableOpacity>)}
              </ScrollView>

              <Text className="font-black text-[#C9D0D8] mb-2">XP stake</Text>
              <View className="flex-row flex-wrap gap-2 mb-5">{XP_OPTIONS.map(v => <TouchableOpacity key={v} className={`rounded-full px-4 py-3 border ${xp === v ? 'bg-[#1F7A4D] border-[#38A169]' : 'bg-[#171D27] border-[#303947]'}`} onPress={() => setXp(v)}><Text className={xp === v ? 'text-white font-black' : 'text-[#D9DEE5] font-bold'}>{v} XP</Text></TouchableOpacity>)}</View>

              <Text className="font-black text-[#C9D0D8] mb-2">Message</Text>
              <TextInput value={message} onChangeText={setMessage} placeholder="Talk your talk… (optional)" placeholderTextColor="#626C79" multiline className="bg-[#171D27] border border-[#303947] text-[#F7F4EF] rounded-2xl px-4 py-4 mb-5 min-h-[90px]" style={{ textAlignVertical: 'top' }} />

              <View className="flex-row gap-3 mb-2">
                <TouchableOpacity className="flex-1 bg-[#1A202A] border border-[#343D4A] rounded-2xl py-4 items-center" onPress={() => setCreateOpen(false)}><Text className="font-black text-[#9CA3AF]">CANCEL</Text></TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-[#D2673D] rounded-2xl py-4 items-center" onPress={() => void createCallOut()}><Text className="font-black text-white">SEND IT</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
