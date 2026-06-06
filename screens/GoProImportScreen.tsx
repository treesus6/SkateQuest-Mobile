/**
 * GoProImportScreen.tsx
 * Lets users browse their GoPro's SD card over WiFi and import clips
 * directly into SkateQuest for upload to the feed or SkateTV.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Wifi,
  WifiOff,
  Download,
  Video,
  Camera,
  CheckCircle,
  RefreshCw,
  Info,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  checkGoProConnection,
  listGoProMedia,
  downloadGoProClip,
  keepGoProAlive,
  GoProMediaItem,
  GoProConnectionStatus,
} from '../lib/goProService';
import { RootStackParamList } from '../types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ConnectionBanner({ status }: { status: GoProConnectionStatus | null }) {
  if (!status) return null;

  if (status.connected) {
    return (
      <View className="flex-row items-center gap-2 bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3 mx-4 mb-3">
        <Wifi size={16} color="#4CAF50" />
        <View className="flex-1">
          <Text className="text-brand-green font-bold text-sm">{status.cameraName} Connected</Text>
          {status.batteryLevel !== undefined && (
            <Text className="text-brand-green/70 text-xs">Battery: {status.batteryLevel}%</Text>
          )}
        </View>
        <View className="bg-brand-green/20 rounded-full px-2 py-0.5">
          <Text className="text-brand-green text-xs font-bold">LIVE</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mx-4 mb-3">
      <WifiOff size={16} color="#F59E0B" />
      <View className="flex-1">
        <Text className="text-amber-700 dark:text-amber-400 font-bold text-sm">GoPro Not Connected</Text>
        <Text className="text-amber-600/80 dark:text-amber-500 text-xs mt-0.5">
          On your GoPro: Connections → Connect Device → GoPro App, then connect your phone to the GoPro WiFi network.
        </Text>
      </View>
    </View>
  );
}

export default function GoProImportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [connectionStatus, setConnectionStatus] = useState<GoProConnectionStatus | null>(null);
  const [mediaItems, setMediaItems] = useState<GoProMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [importedItems, setImportedItems] = useState<Set<string>>(new Set());
  const [showHelpModal, setShowHelpModal] = useState(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkConnection();
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    };
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    const status = await checkGoProConnection();
    setConnectionStatus(status);
    if (status.connected) {
      await loadMedia();
      // Keep GoPro WiFi alive every 60s
      keepAliveRef.current = setInterval(keepGoProAlive, 60000);
    }
    setLoading(false);
  };

  const loadMedia = async () => {
    setLoading(true);
    const items = await listGoProMedia();
    setMediaItems(items);
    setLoading(false);
  };

  const handleImport = async (item: GoProMediaItem) => {
    Alert.alert(
      'Import Clip',
      `Import "${item.filename}" (${formatFileSize(item.size)}) to SkateQuest?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            setDownloading(item.filename);
            setDownloadProgress(0);

            const localUri = await downloadGoProClip(item, progress => {
              setDownloadProgress(Math.round(progress * 100));
            });

            setDownloading(null);

            if (localUri) {
              setImportedItems(prev => new Set([...prev, item.filename]));
              Alert.alert(
                'Import Complete!',
                'Clip saved. Would you like to upload it to SkateTV or your Feed?',
                [
                  { text: 'Later', style: 'cancel' },
                  {
                    text: 'Upload Now',
                    onPress: () => navigation.navigate('UploadMedia'),
                  },
                ]
              );
            } else {
              Alert.alert('Import Failed', 'Could not download the clip. Make sure you\'re still connected to the GoPro WiFi.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: GoProMediaItem }) => {
    const isDownloading = downloading === item.filename;
    const isImported = importedItems.has(item.filename);

    return (
      <View className="bg-white dark:bg-gray-800 rounded-2xl mb-3 overflow-hidden shadow-sm">
        <View className="flex-row">
          {/* Thumbnail */}
          <View className="w-24 h-20 bg-gray-200 dark:bg-gray-700 items-center justify-center">
            {connectionStatus?.connected ? (
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={{ width: 96, height: 80 }}
                resizeMode="cover"
              />
            ) : (
              item.type === 'video' ? (
                <Video size={28} color="#9CA3AF" />
              ) : (
                <Camera size={28} color="#9CA3AF" />
              )
            )}
            {item.type === 'video' && item.duration && (
              <View className="absolute bottom-1 right-1 bg-black/60 rounded px-1">
                <Text className="text-white text-[10px] font-bold">{formatDuration(item.duration)}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View className="flex-1 p-3 justify-between">
            <View>
              <Text className="text-sm font-bold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {item.filename}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {formatFileSize(item.size)} · {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {isDownloading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#d2673d" />
                <Text className="text-xs text-brand-terracotta font-bold">{downloadProgress}%</Text>
              </View>
            ) : isImported ? (
              <View className="flex-row items-center gap-1.5">
                <CheckCircle size={14} color="#4CAF50" />
                <Text className="text-xs text-brand-green font-bold">Imported</Text>
              </View>
            ) : (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 bg-brand-terracotta/10 border border-brand-terracotta/30 px-3 py-1.5 rounded-lg self-start"
                onPress={() => handleImport(item)}
              >
                <Download size={12} color="#d2673d" />
                <Text className="text-brand-terracotta text-xs font-bold">Import</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      {/* Header */}
      <View className="bg-brand-terracotta p-4 rounded-b-2xl flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-white">GoPro Import</Text>
          <Text className="text-white/70 text-xs mt-0.5">Import clips directly from your camera</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="bg-white/20 p-2 rounded-xl"
            onPress={() => setShowHelpModal(true)}
          >
            <Info size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white/20 p-2 rounded-xl"
            onPress={checkConnection}
            disabled={loading}
          >
            <RefreshCw size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={mediaItems}
        keyExtractor={item => `${item.directory}/${item.filename}`}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<ConnectionBanner status={connectionStatus} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View className="items-center mt-12 px-8">
            {loading ? (
              <ActivityIndicator size="large" color="#d2673d" />
            ) : connectionStatus?.connected ? (
              <>
                <Video size={48} color="#d1d5db" />
                <Text className="text-lg font-bold text-gray-400 mt-3">No media found</Text>
                <Text className="text-sm text-gray-300 mt-1 text-center">
                  Make sure your GoPro has clips on the SD card.
                </Text>
              </>
            ) : (
              <>
                <WifiOff size={48} color="#d1d5db" />
                <Text className="text-lg font-bold text-gray-400 mt-3">Connect your GoPro</Text>
                <Text className="text-sm text-gray-300 mt-1 text-center">
                  Connect to your GoPro's WiFi network, then tap the refresh button above.
                </Text>
                <TouchableOpacity
                  className="mt-4 bg-brand-terracotta px-6 py-3 rounded-xl flex-row items-center gap-2"
                  onPress={() => setShowHelpModal(true)}
                >
                  <Info size={14} color="#fff" />
                  <Text className="text-white font-bold">How to Connect</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      />

      {/* Help Modal */}
      <Modal visible={showHelpModal} transparent animationType="slide" onRequestClose={() => setShowHelpModal(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
            <Text className="text-xl font-black text-gray-800 dark:text-gray-100 mb-4">
              How to Connect Your GoPro
            </Text>
            <ScrollView>
              {[
                { step: '1', text: 'On your GoPro, swipe down to access the Dashboard.' },
                { step: '2', text: 'Tap "Connections" → "Connect Device" → "GoPro App".' },
                { step: '3', text: 'Your GoPro will create a WiFi hotspot (e.g. "GP12345678").' },
                { step: '4', text: 'On your phone, go to Settings → WiFi and connect to the GoPro network.' },
                { step: '5', text: 'Come back to SkateQuest and tap the refresh button — your clips will appear!' },
              ].map(({ step, text }) => (
                <View key={step} className="flex-row items-start gap-3 mb-4">
                  <View className="bg-brand-terracotta rounded-full w-7 h-7 items-center justify-center">
                    <Text className="text-white font-black text-sm">{step}</Text>
                  </View>
                  <Text className="flex-1 text-gray-700 dark:text-gray-300 text-sm leading-5">{text}</Text>
                </View>
              ))}
              <View className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 mb-4">
                <Text className="text-amber-700 dark:text-amber-400 text-xs">
                  Note: While connected to GoPro WiFi, your phone won't have internet access. Disconnect from GoPro WiFi after importing to resume normal connectivity.
                </Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              className="bg-brand-terracotta py-3 rounded-xl items-center mt-2"
              onPress={() => setShowHelpModal(false)}
            >
              <Text className="text-white font-bold">Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
