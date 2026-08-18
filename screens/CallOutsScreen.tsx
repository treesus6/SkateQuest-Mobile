import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Crosshair, MapPin, Clock, Check, X, Ban, Film } from 'lucide-react-native';
import { Video, ResizeMode } from '../components/VideoPlayer';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { callOutsService } from '../lib/callOutsService';
import { Logger } from '../lib/logger';
import { CallOut, UserProfile, SkateSpot } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';

type TabType = 'received' | 'sent';
const STATUS_COLORS: Record<string, string> = { pending: '#FFA500', accepted: '#2196F3', completed: '#4CAF50', declined: '#666', failed: '#F44336', expired: '#555' };

export default function CallOutsScreen() {
  const { user } = useAuthStore();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [proofToReview, setProofToReview] = useState<CallOut | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [selectedUser, setSelectedUser] = useState(route.params?.targetId || '');
  const [selectedSpot, setSelectedSpot] = useState('');
  const [trickName, setTrickName] = useState('');
  const [message, setMessage] = useState('');
  const [xpReward, setXpReward] = useState('100');

  useEffect(() => { if (route.params?.targetId) setShowCreateModal(true); }, [route.params]);

  const queryFn = useCallback(() => {
    if (!user) return Promise.resolve({ data: [], error: null });
    return activeTab === 'received' ? callOutsService.getReceived(user.id) : callOutsService.getSent(user.id);
  }, [user, activeTab]);

  const { data: callOuts, loading, refetch } = useSupabaseQuery<CallOut[]>(queryFn, [activeTab, user?.id], {
    cacheKey: `callouts-${activeTab}-${user?.id}`,
    enabled: !!user,
  });

  useEffect(() => {
    if (!showCreateModal) return;
    void loadUsers();
    void loadNearbySpots();
  }, [showCreateModal]);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id,username,level,xp,created_at').neq('id', user?.id).order('xp', { ascending: false }).limit(50);
    setUsers((data ?? []) as UserProfile[]);
  };

  const loadNearbySpots = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setSpots([]);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { data, error } = await supabase.rpc('get_nearby_spots', { lat: position.coords.latitude, lng: position.coords.longitude, radius_meters: 50000 });
      if (error) throw error;
      setSpots(((data ?? []) as SkateSpot[]).slice(0, 20));
    } catch (error) {
      Logger.error('CallOutsScreen.loadNearbySpots failed', error);
      setSpots([]);
    }
  };

  const resetForm = () => { setSelectedUser(''); setSelectedSpot(''); setTrickName(''); setMessage(''); setXpReward('100'); };

  const createCallOut = async () => {
    if (!user || !selectedUser || !trickName.trim()) return Alert.alert('Missing info', 'Choose a skater and enter a trick.');
    const stake = Number.parseInt(xpReward, 10);
    if (!Number.isInteger(stake) || stake < 25 || stake > 200 || stake % 25 !== 0) return Alert.alert('Invalid XP stake', 'Use 25–200 XP in 25 XP steps.');
    try {
      const { error } = await callOutsService.create({ caller_id: user.id, target_id: selectedUser, trick_name: trickName.trim(), spot_id: selectedSpot || undefined, message: message.trim() || undefined, xp_reward: stake });
      if (error) throw error;
      setShowCreateModal(false); resetForm(); setActiveTab('sent'); await refetch();
      Alert.alert('Call Out sent', 'They must accept it and upload real video proof.');
    } catch (error: any) { Alert.alert('Could not send Call Out', error?.message || 'Please try again.'); }
  };

  const respond = async (callOut: CallOut, accept: boolean) => {
    try {
      const { error } = await callOutsService.respond(callOut.id, accept);
      if (error) throw error;
      await refetch();
      Alert.alert(accept ? 'Accepted' : 'Declined', accept ? 'Land it, then upload your proof clip.' : 'Call Out declined.');
    } catch (error: any) { Alert.alert('Could not respond', error?.message || 'Please try again.'); }
  };

  const openProofUpload = (callOut: CallOut) => navigation.navigate('UploadMedia', { calloutId: callOut.id, initialTrickName: callOut.trick_name });

  const verifyProof = async (approve: boolean) => {
    if (!proofToReview || reviewing) return;
    setReviewing(true);
    try {
      const { data, error } = await callOutsService.verify(proofToReview.id, approve);
      if (error) throw error;
      setProofToReview(null);
      await refetch();
      const xp = Number((data as any)?.xp_awarded ?? 0);
      Alert.alert(approve ? 'Proof approved' : 'Proof rejected', approve ? `Call Out complete${xp ? ` — +${xp} XP awarded` : ''}.` : 'They can upload a new proof clip.');
    } catch (error: any) { Alert.alert('Could not verify proof', error?.message || 'Please try again.'); }
    finally { setReviewing(false); }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'pending') return <Clock color="#FFA500" size={14} />;
    if (status === 'accepted' || status === 'completed') return <Check color={status === 'completed' ? '#4CAF50' : '#2196F3'} size={14} />;
    if (status === 'declined') return <X color="#666" size={14} />;
    if (status === 'failed' || status === 'expired') return <Ban color="#F44336" size={14} />;
    return null;
  };

  const renderCallOut = ({ item }: { item: CallOut }) => {
    const isReceived = activeTab === 'received';
    const otherUser = isReceived ? item.challenger : item.challenged_user;
    const hasProof = Boolean(item.proof_video_url);
    return <Card>
      <View className="flex-row justify-between items-start mb-2"><View className="flex-1 pr-3"><View className="flex-row items-center gap-1.5"><Crosshair color={isReceived ? '#d2673d' : '#2196F3'} size={16} /><Text className="text-base font-bold text-gray-800 dark:text-gray-100">{otherUser?.username || 'Skater'}</Text></View><Text className="text-xl font-bold text-brand-terracotta mt-1">{item.trick_name}</Text></View><View className="px-3 py-1.5 rounded-full flex-row items-center gap-1" style={{ backgroundColor: STATUS_COLORS[item.status] || '#777' }}>{getStatusIcon(item.status)}<Text className="text-white text-xs font-bold capitalize">{item.status}</Text></View></View>
      {item.message ? <Text className="text-sm italic text-gray-500 dark:text-gray-400 mb-2">“{item.message}”</Text> : null}
      {item.spot ? <View className="flex-row items-center gap-1 mb-2"><MapPin color="#888" size={14}/><Text className="text-sm text-gray-400">{item.spot.name}</Text></View> : null}
      <Text className="text-lg font-bold text-brand-green mb-3">+{item.xp_reward} XP</Text>
      {isReceived && item.status === 'pending' && <View className="flex-row gap-2"><Button title="Decline" onPress={() => void respond(item, false)} variant="secondary" size="sm" className="flex-1"/><Button title="Accept" onPress={() => void respond(item, true)} variant="primary" size="sm" className="flex-1"/></View>}
      {isReceived && item.status === 'accepted' && !hasProof && <Button title="Upload Proof Video" onPress={() => openProofUpload(item)} variant="primary" size="sm" className="bg-brand-green"/>}
      {isReceived && item.status === 'accepted' && hasProof && <View className="flex-row items-center gap-2"><Film size={16} color="#2196F3"/><Text className="text-sm text-gray-500 dark:text-gray-400">Proof submitted — waiting for challenger review.</Text></View>}
      {!isReceived && item.status === 'accepted' && !hasProof && <Text className="text-sm text-gray-500 dark:text-gray-400">Waiting for their proof video.</Text>}
      {!isReceived && item.status === 'accepted' && hasProof && <Button title="Review Proof Video" onPress={() => setProofToReview(item)} variant="primary" size="sm" className="bg-brand-green"/>}
      {item.status === 'completed' && <Text className="text-sm font-bold text-green-500">Verified complete. XP paid by the server.</Text>}
    </Card>;
  };

  return <View className="flex-1 bg-brand-beige dark:bg-gray-900">
    <View className="flex-row bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">{(['received','sent'] as TabType[]).map(tab => <TouchableOpacity key={tab} className={`flex-1 py-4 items-center ${activeTab === tab ? 'border-b-[3px] border-brand-terracotta' : ''}`} onPress={() => setActiveTab(tab)}><Text className={`text-base font-semibold capitalize ${activeTab === tab ? 'text-brand-terracotta' : 'text-gray-500'}`}>{tab}</Text></TouchableOpacity>)}</View>
    <FlatList data={callOuts ?? []} renderItem={renderCallOut} keyExtractor={item => item.id} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshing={loading} onRefresh={refetch} ListEmptyComponent={<View className="items-center mt-24"><Text className="text-lg font-bold text-gray-400">No Call Outs here yet</Text></View>}/>
    <TouchableOpacity className="absolute bottom-8 right-8 bg-brand-terracotta px-6 py-4 rounded-full shadow-lg" onPress={() => setShowCreateModal(true)}><Text className="text-white text-base font-bold">+ Call Out</Text></TouchableOpacity>

    <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}><View className="flex-1 bg-black/50 justify-end"><View className="bg-white dark:bg-gray-800 rounded-t-2xl p-6" style={{ maxHeight: '90%' }}><ScrollView>
      <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-5">Create Call Out</Text>
      <Text className="text-sm font-semibold text-gray-500 mb-2">Challenge who?</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">{users.map(u => <TouchableOpacity key={u.id} className={`px-4 py-2.5 rounded-full mr-2 border-2 ${selectedUser === u.id ? 'bg-brand-terracotta border-brand-terracotta' : 'bg-gray-100 dark:bg-gray-700 border-transparent'}`} onPress={() => setSelectedUser(u.id)}><Text className={selectedUser === u.id ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-200 font-semibold'}>{u.username}</Text></TouchableOpacity>)}</ScrollView>
      <Text className="text-sm font-semibold text-gray-500 mb-2">Trick *</Text><TextInput className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-4 text-gray-800 dark:text-gray-100" placeholder="Kickflip, Treflip, 50-50..." placeholderTextColor="#999" value={trickName} onChangeText={setTrickName}/>
      <Text className="text-sm font-semibold text-gray-500 mb-2">Spot (optional)</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4"><TouchableOpacity className={`px-4 py-2.5 rounded-full mr-2 ${!selectedSpot ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`} onPress={() => setSelectedSpot('')}><Text className={!selectedSpot ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-200 font-semibold'}>Any Spot</Text></TouchableOpacity>{spots.map(spot => <TouchableOpacity key={spot.id} className={`px-4 py-2.5 rounded-full mr-2 ${selectedSpot === spot.id ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`} onPress={() => setSelectedSpot(spot.id)}><Text className={selectedSpot === spot.id ? 'text-white font-semibold' : 'text-gray-700 dark:text-gray-200 font-semibold'}>{spot.name}</Text></TouchableOpacity>)}</ScrollView>
      <Text className="text-sm font-semibold text-gray-500 mb-2">XP stake (25–200)</Text><TextInput keyboardType="number-pad" className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-4 text-gray-800 dark:text-gray-100" value={xpReward} onChangeText={setXpReward}/>
      <Text className="text-sm font-semibold text-gray-500 mb-2">Message (optional)</Text><TextInput multiline className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-5 text-gray-800 dark:text-gray-100" placeholder="Talk your trash..." placeholderTextColor="#999" value={message} onChangeText={setMessage}/>
      <View className="flex-row gap-3"><Button title="Cancel" onPress={() => setShowCreateModal(false)} variant="secondary" size="lg" className="flex-1"/><Button title="Send Call Out" onPress={() => void createCallOut()} variant="primary" size="lg" className="flex-1"/></View>
    </ScrollView></View></View></Modal>

    <Modal visible={!!proofToReview} transparent animationType="fade" onRequestClose={() => setProofToReview(null)}><View className="flex-1 bg-black/90 justify-center p-5"><View className="bg-gray-900 rounded-2xl overflow-hidden"><Text className="text-white text-xl font-black p-4">Review {proofToReview?.trick_name}</Text>{proofToReview?.proof_video_url ? <Video source={{ uri: proofToReview.proof_video_url }} style={{ width: '100%', height: 420 }} resizeMode={ResizeMode.CONTAIN} useNativeControls shouldPlay /> : null}<Text className="text-gray-400 px-4 pt-4">Approve only if the clip really shows the called-out trick.</Text><View className="flex-row gap-3 p-4"><TouchableOpacity disabled={reviewing} onPress={() => void verifyProof(false)} className="flex-1 bg-red-600 rounded-xl py-4 items-center"><Text className="text-white font-black">REJECT</Text></TouchableOpacity><TouchableOpacity disabled={reviewing} onPress={() => void verifyProof(true)} className="flex-1 bg-green-600 rounded-xl py-4 items-center">{reviewing ? <ActivityIndicator color="white"/> : <Text className="text-white font-black">APPROVE</Text>}</TouchableOpacity></View><TouchableOpacity onPress={() => setProofToReview(null)} className="pb-5 items-center"><Text className="text-gray-400">Close</Text></TouchableOpacity></View></View></Modal>
  </View>;
}
