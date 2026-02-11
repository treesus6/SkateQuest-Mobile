import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Camera, Film, ImageIcon, Video as VideoIcon, Bot, Check } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { feedService } from '../lib/feedService';
import { pickImage, pickVideo, uploadImage, uploadVideo, saveMediaToDatabase } from '../lib/mediaUpload';
import { analyzeTrickVideo, saveAnalysisResult, TrickAnalysisResult } from '../lib/trickAnalyzer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function UploadMediaScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [trickName, setTrickName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TrickAnalysisResult | null>(null);

  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      const result = await pickImage(useCamera);
      if (result) { setMediaUri(result.uri); setMediaType('photo'); }
    } catch (error: any) { Alert.alert('Error', error.message); }
  };

  const handlePickVideo = async (useCamera: boolean = false) => {
    try {
      const result = await pickVideo(useCamera);
      if (result) { setMediaUri(result.uri); setMediaType('video'); }
    } catch (error: any) { Alert.alert('Error', error.message); }
  };

  const handleAnalyzeTrick = async () => {
    if (!mediaUri || mediaType !== 'video') return;
    setAnalyzing(true);
    try {
      const result = await analyzeTrickVideo(mediaUri);
      setAnalysis(result);
      setTrickName(result.trickName);
      Alert.alert('Analysis Complete!', `Detected: ${result.trickName}\nScore: ${result.score}/100\n\n${result.feedback}`);
    } catch { Alert.alert('Error', 'Failed to analyze trick'); }
    finally { setAnalyzing(false); }
  };

  const handleUpload = async () => {
    if (!mediaUri || !user) return;
    setUploading(true);
    try {
      const mediaResult = mediaType === 'photo'
        ? await uploadImage(mediaUri, 'user_photos', user.id)
        : await uploadVideo(mediaUri, 'user_videos', user.id);

      const media = await saveMediaToDatabase(user.id, mediaResult, {
        caption: caption || undefined,
        trickName: trickName || analysis?.trickName || undefined,
      });

      if (analysis) await saveAnalysisResult(media.id, analysis);

      await feedService.create({
        user_id: user.id,
        activity_type: 'media_uploaded',
        title: trickName || analysis?.trickName ? `Landed a ${trickName || analysis?.trickName}!` : `Posted a new ${mediaType}`,
        description: caption || analysis?.feedback || undefined,
        xp_earned: 10,
        media_id: media.id,
      });

      Alert.alert('Success', 'Media uploaded!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally { setUploading(false); }
  };

  return (
    <ScrollView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-white text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Upload Media</Text>
        <View style={{ width: 60 }} />
      </View>

      {!mediaUri ? (
        <View className="p-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Choose Media Type</Text>

          <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickImage(false)}>
            <ImageIcon color="#d2673d" size={28} />
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Photo from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickImage(true)}>
            <Camera color="#d2673d" size={28} />
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickVideo(false)}>
            <Film color="#d2673d" size={28} />
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Video from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-800 p-[18px] rounded-xl mb-3 shadow-sm" onPress={() => handlePickVideo(true)}>
            <VideoIcon color="#d2673d" size={28} />
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 ml-4">Record Video</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="p-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Preview</Text>

          {mediaType === 'photo' ? (
            <Image source={{ uri: mediaUri }} style={{ width: '100%', height: 300, borderRadius: 12, backgroundColor: '#000', marginBottom: 16 }} />
          ) : (
            <Video source={{ uri: mediaUri }} style={{ width: '100%', height: 300, borderRadius: 12, marginBottom: 16 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
          )}

          <Button title="Change Media" onPress={() => { setMediaUri(null); setMediaType(null); setAnalysis(null); }} variant="secondary" size="md" className="mb-5" />

          {mediaType === 'video' && !analysis && (
            <TouchableOpacity
              className={`flex-row bg-purple-600 p-3.5 rounded-lg items-center justify-center mb-4 ${analyzing ? 'opacity-60' : ''}`}
              onPress={handleAnalyzeTrick}
              disabled={analyzing}
            >
              {analyzing ? (
                <><ActivityIndicator color="#fff" size="small" /><Text className="text-white text-[15px] font-bold ml-2">Analyzing...</Text></>
              ) : (
                <><Bot color="#fff" size={20} /><Text className="text-white text-[15px] font-bold ml-2">Analyze Trick with AI</Text></>
              )}
            </TouchableOpacity>
          )}

          {analysis && (
            <Card className="border-l-4 border-l-purple-600 mb-5">
              <View className="flex-row items-center gap-2 mb-2">
                <Bot color="#9C27B0" size={18} />
                <Text className="text-base font-bold text-gray-800 dark:text-gray-100">AI Analysis</Text>
              </View>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Detected: <Text className="font-bold text-purple-600 text-base">{analysis.trickName}</Text>
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Score: {analysis.score}/100</Text>
              <Text className="text-sm text-gray-800 dark:text-gray-200 italic mb-2.5">{analysis.feedback}</Text>
              {analysis.detectedElements.length > 0 && (
                <View className="mt-2">
                  <Text className="text-xs font-bold text-gray-500 mb-1">Detected:</Text>
                  {analysis.detectedElements.map((element, index) => (
                    <View key={index} className="flex-row items-center gap-1 ml-1 mb-0.5">
                      <Check color="#4CAF50" size={12} />
                      <Text className="text-xs text-gray-600 dark:text-gray-300">{element}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}

          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Trick Name {analysis ? '(AI detected)' : '(optional)'}
            </Text>
            <TextInput
              className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
              placeholder="e.g., Kickflip, Heelflip"
              placeholderTextColor="#999"
              value={trickName}
              onChangeText={setTrickName}
            />
          </View>

          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Caption (optional)</Text>
            <TextInput
              className="bg-white dark:bg-gray-800 rounded-lg p-3 text-base border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
              placeholder="Say something about this..."
              placeholderTextColor="#999"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: 'top' }}
            />
          </View>

          <Button
            title={uploading ? 'Uploading...' : 'Upload'}
            onPress={handleUpload}
            variant="primary"
            size="lg"
            className="bg-brand-green mt-2.5"
            disabled={uploading}
          />
        </View>
      )}
    </ScrollView>
  );
}
