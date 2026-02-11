import React, { useState, useEffect, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Image, Modal, Linking } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Camera, MapPin, Star, Target, AlertTriangle } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { spotsService } from '../lib/spotsService';
import { challengesService } from '../lib/challengesService';
import { SkateSpot, SpotPhoto, SpotCondition, Challenge } from '../types';
import { pickImage, uploadImage, saveMediaToDatabase } from '../lib/mediaUpload';
import PortalDimensionLogo from '../components/PortalDimensionLogo';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const { width } = Dimensions.get('window');

const CONDITION_OPTIONS = [
  { value: 'dry', label: 'Dry' }, { value: 'wet', label: 'Wet' }, { value: 'crowded', label: 'Crowded' },
  { value: 'empty', label: 'Empty' }, { value: 'cops', label: 'Cops' }, { value: 'clear', label: 'Clear' },
  { value: 'under_construction', label: 'Construction' },
];

const SpotDetailScreen = memo(({ route, navigation }: any) => {
  const { spotId } = route.params;
  const { user } = useAuthStore();
  const [spot, setSpot] = useState<SkateSpot | null>(null);
  const [photos, setPhotos] = useState<SpotPhoto[]>([]);
  const [conditions, setConditions] = useState<SpotCondition[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);

  useEffect(() => { loadSpotData(); }, [spotId]);

  const loadSpotData = async () => {
    try {
      const { data: spotData, error: spotError } = await spotsService.getById(spotId);
      if (spotError) throw spotError;
      setSpot(spotData);
      setPhotos(spotData?.spot_photos || []);
      setConditions(spotData?.spot_conditions?.filter((c: any) => new Date(c.expires_at) > new Date()) || []);

      const { data: challengesData } = await challengesService.getForSpot(spotId);
      setChallenges(challengesData || []);
    } catch (error: any) {
      console.error('Error loading spot:', error);
      Alert.alert('Error', error.message);
    } finally { setLoading(false); }
  };

  const uploadSpotPhoto = async () => {
    if (!user) return;
    try {
      setUploading(true);
      const result = await pickImage();
      if (!result) return;
      const photoResult = await uploadImage(result.uri, 'spot_photos', user.id);
      const media = await saveMediaToDatabase(user.id, photoResult, { caption: `Photo of ${spot?.name}`, spotId });
      await spotsService.uploadPhoto(spotId, media.id, user.id, photos.length === 0);
      Alert.alert('Success', 'Photo uploaded!');
      loadSpotData();
    } catch (error: any) { Alert.alert('Error', error.message); }
    finally { setUploading(false); }
  };

  const reportCondition = async (condition: string) => {
    if (!user) return;
    try {
      const { error } = await spotsService.reportCondition(spotId, user.id, condition);
      if (error) throw error;
      Alert.alert('Success', 'Condition reported!');
      setShowConditionsModal(false);
      loadSpotData();
    } catch (error: any) { Alert.alert('Error', error.message); }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) { case 'Beginner': return '#4CAF50'; case 'Intermediate': return '#FF9800'; case 'Advanced': return '#f44336'; default: return '#999'; }
  };

  const getConditionLabel = (condition: string) => condition.replace('_', ' ').toUpperCase();

  if (loading) {
    return (<View className="flex-1 bg-brand-beige dark:bg-gray-900 p-4"><LoadingSkeleton height={300} className="mb-4" /><LoadingSkeleton height={100} className="mb-4" /><LoadingSkeleton height={80} className="mb-4" /></View>);
  }

  if (!spot) {
    return (<View className="flex-1 bg-brand-beige dark:bg-gray-900 justify-center items-center"><Text className="text-lg text-gray-400">Spot not found</Text></View>);
  }

  return (
    <ScrollView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View style={{ height: 300 }} className="bg-black relative">
        {photos.length > 0 ? (
          <>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setActivePhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
              {photos.map(photo => (<Image key={photo.id} source={{ uri: photo.media?.url }} style={{ width, height: 300 }} resizeMode="cover" />))}
            </ScrollView>
            <View className="absolute bottom-[60px] left-0 right-0 flex-row justify-center gap-1.5">
              {photos.map((_, index) => (<View key={index} className={`w-2 h-2 rounded-full ${index === activePhotoIndex ? 'bg-white' : 'bg-white/50'}`} />))}
            </View>
          </>
        ) : (
          <View className="flex-1 justify-center items-center bg-gray-800">
            <Text className="text-lg font-bold text-white">No photos yet</Text>
            <Text className="text-sm text-gray-400 mt-1">Be the first to add one!</Text>
          </View>
        )}
        <TouchableOpacity className="absolute bottom-4 right-4 bg-brand-terracotta px-5 py-2.5 rounded-full shadow-lg flex-row items-center gap-1.5" onPress={uploadSpotPhoto} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : (<><Camera color="#fff" size={14} /><Text className="text-white text-sm font-bold">Add Photo</Text></>)}
        </TouchableOpacity>
      </View>

      <View className="bg-white dark:bg-gray-800 p-5 -mt-5 rounded-t-2xl">
        <Text className="text-[28px] font-bold text-gray-800 dark:text-gray-100 mb-3">{spot.name}</Text>
        <View className="flex-row items-center gap-3 mb-4">
          <View className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: getDifficultyColor(spot.difficulty) }}>
            <Text className="text-white text-xs font-bold">{spot.difficulty || 'Unknown'}</Text>
          </View>
          {spot.rating && (<View className="flex-row items-center gap-1"><Star color="#FFD700" size={16} /><Text className="text-sm font-bold text-gray-800 dark:text-gray-100">{spot.rating.toFixed(1)}</Text></View>)}
        </View>
        {spot.tricks && spot.tricks.length > 0 && (
          <View className="mt-2.5">
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Popular Tricks:</Text>
            <View className="flex-row flex-wrap gap-2">
              {spot.tricks.map((trick, index) => (<View key={index} className="bg-brand-beige dark:bg-gray-700 px-3 py-1.5 rounded-xl"><Text className="text-sm text-brand-terracotta font-semibold">{trick}</Text></View>))}
            </View>
          </View>
        )}
        {spot.sponsor_name && spot.sponsor_url && (
          <TouchableOpacity className="mt-4 p-4 bg-brand-terracotta rounded-xl flex-row items-center justify-between" onPress={() => Linking.openURL(spot.sponsor_url!)}>
            <View className="flex-1"><Text className="text-[11px] text-white/80 font-semibold mb-1">Supported by</Text><Text className="text-base text-white font-bold">{spot.sponsor_name}</Text></View>
            <Text className="text-2xl text-white ml-2.5">→</Text>
          </TouchableOpacity>
        )}
      </View>

      <Card className="mx-4">
        <View className="flex-row items-center gap-2 mb-2.5"><MapPin color="#d2673d" size={18} /><Text className="text-lg font-bold text-gray-800 dark:text-gray-100">Location</Text></View>
        <TouchableOpacity style={{ height: 200, borderRadius: 10, overflow: 'hidden' }} onPress={() => navigation.navigate('Map')}>
          <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Street} scrollEnabled={false} pitchEnabled={false} rotateEnabled={false} zoomEnabled={false}>
            <Mapbox.Camera zoomLevel={14} centerCoordinate={[spot.longitude, spot.latitude]} />
            <Mapbox.PointAnnotation id="spot-location" coordinate={[spot.longitude, spot.latitude]}>
              <View className="items-center justify-center"><MapPin color="#d2673d" size={32} /></View>
            </Mapbox.PointAnnotation>
          </Mapbox.MapView>
          <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-2.5 items-center"><Text className="text-white text-sm font-semibold">Tap to view on map</Text></View>
        </TouchableOpacity>
        <View className="mt-2.5 p-2.5 bg-brand-beige dark:bg-gray-700 rounded-lg">
          <Text className="text-xs text-gray-500 dark:text-gray-400 font-mono">{spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}</Text>
        </View>
      </Card>

      <PortalDimensionLogo skateparkName={spot.name} />

      <Card className="mx-4">
        <View className="flex-row items-center gap-2 mb-3"><AlertTriangle color="#ef4444" size={18} /><Text className="text-lg font-bold text-gray-800 dark:text-gray-100">Live Conditions</Text></View>
        {conditions.length > 0 ? conditions.map(c => (
          <View key={c.id} className="flex-row items-center py-2.5 border-b border-gray-100 dark:border-gray-700">
            <View className="flex-1 ml-3">
              <Text className="text-[15px] font-bold text-gray-800 dark:text-gray-100">{getConditionLabel(c.condition)}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">by {c.reporter?.username} · {getTimeAgo(c.created_at)}</Text>
            </View>
          </View>
        )) : <Text className="text-sm text-gray-400 text-center mb-3">No recent conditions reported</Text>}
        <Button title="+ Report Condition" onPress={() => setShowConditionsModal(true)} variant="primary" size="sm" className="bg-brand-green mt-2.5" />
      </Card>

      {challenges.length > 0 && (
        <Card className="mx-4">
          <View className="flex-row items-center gap-2 mb-3"><Target color="#d2673d" size={18} /><Text className="text-lg font-bold text-gray-800 dark:text-gray-100">Active Challenges</Text></View>
          {challenges.map(ch => (
            <TouchableOpacity key={ch.id} className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700" onPress={() => navigation.navigate('Challenges')}>
              <Text className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">{ch.trick}</Text>
              <Text className="text-sm font-bold text-brand-terracotta">+{ch.xp_reward} XP</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      <View className="px-4 pb-8">
        <Button title="View All Challenges" onPress={() => navigation.navigate('Challenges', { spotId: spot.id })} variant="primary" size="lg" />
      </View>

      <Modal visible={showConditionsModal} transparent animationType="slide" onRequestClose={() => setShowConditionsModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 pb-10">
            <Text className="text-[22px] font-bold text-gray-800 dark:text-gray-100 mb-1">Report Condition</Text>
            <Text className="text-sm text-gray-500 mb-5">What's the spot like right now?</Text>
            <View className="flex-row flex-wrap gap-2.5 mb-5">
              {CONDITION_OPTIONS.map(option => (
                <TouchableOpacity key={option.value} className="w-[31%] bg-gray-100 dark:bg-gray-700 p-4 rounded-xl items-center" onPress={() => reportCondition(option.value)}>
                  <Text className="text-[11px] text-gray-800 dark:text-gray-100 font-semibold text-center mt-1">{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Cancel" onPress={() => setShowConditionsModal(false)} variant="secondary" size="lg" />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});

function getTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default SpotDetailScreen;
