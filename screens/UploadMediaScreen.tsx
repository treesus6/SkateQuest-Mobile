import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from '../components/VideoPlayer';
import { Camera, Film, ImageIcon, Video as VideoIcon, Bot } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { feedService } from '../lib/feedService';
import { pickImage, pickVideo, uploadImage, uploadVideo, saveMediaToDatabase } from '../lib/mediaUpload';
import { analyzeTrickVideo, saveAnalysisResult, TrickAnalysisResult } from '../lib/trickAnalyzer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useNavigation, useRoute } from '../lib/useNavigation';

export default function UploadMediaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const initialTrickName = route.params?.initialTrickName || '';
  const challengeId = route.params?.challengeId || null;
  const bountyId = route.params?.bountyId || null;
  const calloutId = route.params?.calloutId || null;
  const totwId = route.params?.totwId || null;
  const clipWeek = Number(route.params?.clipWeek || 0);
  const clipYear = Number(route.params?.clipYear || 0);
  const isClipOfWeek = clipWeek > 0 && clipYear > 0;
  const requiresProofVideo = Boolean(challengeId || bountyId || calloutId || totwId || isClipOfWeek);

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [trickName, setTrickName] = useState(initialTrickName);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TrickAnalysisResult | null>(null);

  const handlePickImage = async (useCamera = false) => {
    try { const result = await pickImage(useCamera); if (result) { setMediaUri(result.uri); setMediaType('photo'); } }
    catch (error: any) { Alert.alert('Error', error.message); }
  };

  const handlePickVideo = async (useCamera = false) => {
    try { const result = await pickVideo(useCamera); if (result) { setMediaUri(result.uri); setMediaType('video'); } }
    catch (error: any) { Alert.alert('Error', error.message); }
  };

  const handleAnalyzeTrick = async () => {
    if (mediaType !== 'video') return;
    const namedTrick = trickName.trim();
    if (!namedTrick) {
      Alert.alert('Add the trick name first', 'Enter the trick you are working on, then get coaching tips.');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeTrickVideo(namedTrick, caption || undefined);
      setAnalysis(result);
      Alert.alert('Coaching Ready', result.style_notes || `Coaching tips ready for ${namedTrick}.`);
    } catch {
      Alert.alert('Error', 'Could not get coaching tips right now. Your clip can still be uploaded.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!mediaUri || !user || !mediaType) return;
    setUploading(true);
    try {
      if (requiresProofVideo && mediaType !== 'video') {
        throw new Error('This submission requires a video clip. Choose or record a video.');
      }

      const mediaResult = mediaType === 'photo'
        ? await uploadImage(mediaUri, 'user_photos', user.id)
        : await uploadVideo(mediaUri, 'user_videos', user.id);
      const media = await saveMediaToDatabase(user.id, mediaResult, {
        caption: caption || undefined,
        trickName: trickName.trim() || undefined,
      });

      if (analysis && trickName.trim()) {
        await saveAnalysisResult(user.id, trickName.trim(), analysis, media.url);
      }

      if (challengeId) {
        const { error } = await supabase.rpc('submit_challenge_proof', { p_challenge_id: challengeId, p_media_id: media.id });
        if (error) throw error;
      }
      if (bountyId) {
        const { error } = await supabase.rpc('submit_bounty_claim', { p_bounty_id: bountyId, p_media_id: media.id });
        if (error) throw error;
      }
      if (calloutId) {
        const { error } = await supabase.rpc('submit_callout_proof', { p_callout_id: calloutId, p_media_id: media.id });
        if (error) throw error;
      }
      if (totwId) {
        const { error } = await supabase.from('trick_of_week_submissions').upsert({
          user_id: user.id,
          totw_id: totwId,
          video_url: media.url,
          thumbnail_url: media.thumbnail_url ?? null,
        }, { onConflict: 'user_id,totw_id' });
        if (error) throw error;
      }
      if (isClipOfWeek) {
        const { error } = await supabase.from('clip_of_week_submissions').insert({
          user_id: user.id,
          media_id: media.id,
          week_number: clipWeek,
          year: clipYear,
          trick_name: trickName.trim() || null,
        });
        if (error) throw error;
      }

      if (!bountyId && !calloutId) {
        const feedTitle = challengeId
          ? `Submitted challenge proof${trickName.trim() ? `: ${trickName.trim()}` : ''}`
          : totwId
            ? `Submitted Trick of the Week clip${trickName.trim() ? `: ${trickName.trim()}` : ''}`
            : isClipOfWeek
              ? `Submitted Clip of the Week${trickName.trim() ? `: ${trickName.trim()}` : ''}`
              : trickName.trim()
                ? `Posted a ${trickName.trim()} clip`
                : `Posted a new ${mediaType}`;
        const { error: feedError } = await feedService.create({
          user_id: user.id,
          activity_type: 'media_uploaded',
          title: feedTitle,
          description: caption || analysis?.style_notes || undefined,
          xp_earned: 10,
          media_id: media.id,
        });
        if (feedError) console.warn('Media uploaded but feed activity could not be created:', feedError.message);
      }

      const successMessage = calloutId
        ? 'Call Out proof uploaded. The challenger must review the real video before XP is awarded.'
        : challengeId
          ? 'Challenge proof uploaded and sent to the Judge’s Booth. Challenge XP is awarded only after community approval.'
          : bountyId
            ? 'Bounty proof uploaded and sent to the Judge’s Booth. Bounty XP is awarded only after community approval.'
            : totwId
              ? 'Media uploaded and Trick of the Week entry submitted!'
              : isClipOfWeek
                ? 'Media uploaded and Clip of the Week entry submitted!'
                : 'Media uploaded!';
      Alert.alert('Success', successMessage, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error?.message || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const submitButtonTitle = uploading
    ? 'Uploading...'
    : calloutId
      ? 'Submit Call Out Proof'
      : challengeId
        ? 'Submit Challenge Proof'
        : bountyId
          ? 'Submit Bounty Proof'
          : 'Upload';

  return (
    <ScrollView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}><Text className="text-white text-base">← Back</Text></TouchableOpacity>
        <Text className="text-xl font-bold text-white">Upload Media</Text><View style={{ width: 60 }} />
      </View>
      {!mediaUri ? (
        <View className="p-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Choose Media Type</Text>
          {!requiresProofVideo ? <>
            <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickImage(false)}><ImageIcon color="#d2673d" size={28}/><Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Photo from Gallery</Text></TouchableOpacity>
            <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickImage(true)}><Camera color="#d2673d" size={28}/><Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Take Photo</Text></TouchableOpacity>
          </> : <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">This is proof for a real skate challenge, so a video clip is required.</Text>}
          <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickVideo(false)}><Film color="#d2673d" size={28}/><Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Video from Gallery</Text></TouchableOpacity>
          <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickVideo(true)}><VideoIcon color="#d2673d" size={28}/><Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Record Video</Text></TouchableOpacity>
        </View>
      ) : (
        <View className="p-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Preview</Text>
          {mediaType === 'photo' ? <Image source={{uri:mediaUri}} style={{width:'100%',height:300,borderRadius:12,backgroundColor:'#000',marginBottom:16}}/> : <Video source={{uri:mediaUri}} style={{width:'100%',height:300,borderRadius:12,marginBottom:16}} useNativeControls resizeMode={ResizeMode.CONTAIN}/>} 
          <Button title="Change Media" onPress={() => {setMediaUri(null);setMediaType(null);setAnalysis(null);}} variant="secondary" size="md" className="mb-5"/>
          <View className="mb-5"><Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Trick Name {bountyId || challengeId || calloutId ? '(proof target)' : '(optional)'}</Text><TextInput className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100" placeholder="e.g., Kickflip, Heelflip" placeholderTextColor="#999" value={trickName} onChangeText={setTrickName}/></View>
          {mediaType === 'video' && !analysis && <TouchableOpacity className={`flex-row bg-purple-600 p-3.5 rounded-lg items-center justify-center mb-4 ${analyzing?'opacity-60':''}`} onPress={handleAnalyzeTrick} disabled={analyzing}>{analyzing ? <><ActivityIndicator color="#fff" size="small"/><Text className="text-white text-[15px] font-bold ml-2">Getting coaching...</Text></> : <><Bot color="#fff" size={20}/><Text className="text-white text-[15px] font-bold ml-2">Get AI Coaching Tips</Text></>}</TouchableOpacity>}
          {analysis && <Card className="border-l-4 border-l-purple-600 mb-5"><View className="flex-row items-center gap-2 mb-2"><Bot color="#9C27B0" size={18}/><Text className="text-base font-bold text-gray-800 dark:text-gray-100">AI Coaching</Text></View><Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Coaching for <Text className="font-bold text-purple-600">{trickName.trim()}</Text> · {analysis.difficulty}</Text><Text className="text-sm text-gray-800 dark:text-gray-200 italic mb-2.5">{analysis.style_notes}</Text>{(analysis.tips?.length??0)>0 && <View className="mt-1"><Text className="text-xs font-bold text-gray-500 mb-1">Tips</Text>{analysis.tips.slice(0,3).map((tip:string,index:number)=><Text key={index} className="text-xs text-gray-600 dark:text-gray-300 mb-1">• {tip}</Text>)}</View>}<Text className="text-xs text-gray-500 mt-2">Coaching is based on the trick name you entered. It does not verify proof.</Text></Card>}
          <View className="mb-5"><Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Caption (optional)</Text><TextInput className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100" placeholder="Say something about this..." placeholderTextColor="#999" value={caption} onChangeText={setCaption} multiline numberOfLines={3} style={{height:80,textAlignVertical:'top'}}/></View>
          <Button title={submitButtonTitle} onPress={handleUpload} variant="primary" size="lg" className="bg-brand-green mt-2.5" disabled={uploading}/>
        </View>
      )}
    </ScrollView>
  );
}
