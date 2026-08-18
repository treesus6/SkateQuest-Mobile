import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface MediaUploadResult {
  url: string;
  thumbnailUrl?: string;
  type: 'photo' | 'video';
  fileSize: number;
  duration?: number;
}

/**
 * Pick image from library or camera
 */
export async function pickImage(
  useCamera: boolean = false
): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Permission denied');
  }

  const result = useCamera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

/**
 * Pick video from library or camera
 */
export async function pickVideo(
  useCamera: boolean = false
): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Permission denied');
  }

  const result = useCamera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        videoMaxDuration: 60,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        videoMaxDuration: 60,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

/**
 * Upload file to Supabase Storage.
 *
 * SkateQuest storage policies require the second path segment to be the signed-in
 * user id. Callers pass that id as fileName, so paths are folder/userId/file.
 */
export async function uploadToStorage(
  uri: string,
  bucket: string,
  folder: string,
  fileName: string,
  _onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    const response = Platform.OS === 'web' ? await fetch(uri) : null;
    if (response && !response.ok) throw new Error('The selected media could not be read.');
    const webBlob = response ? await response.blob() : null;
    const base64 = webBlob
      ? null
      : await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const contentType = webBlob?.type || '';
    const extFromType = contentType.split('/')[1]?.replace('quicktime', 'mov').replace('jpeg', 'jpg');
    const ext =
      extFromType || uri.split(/[?#]/)[0].split('.').pop() || 'jpg';
    const normalizedExt = ext.toLowerCase();
    const isVideo = ['mp4', 'mov', 'm4v', 'webm'].includes(normalizedExt);
    const filePath = `${folder}/${fileName}/${Date.now()}.${normalizedExt}`;

    const body = webBlob ?? decode(base64!);
    const { error } = await supabase.storage.from(bucket).upload(filePath, body, {
      contentType:
        contentType ||
        `${isVideo ? 'video' : 'image'}/${normalizedExt === 'jpg' ? 'jpeg' : normalizedExt}`,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Upload image. Spot photos use their dedicated bucket; general user/feed photos
 * share the SkateTV media bucket, which accepts image posts as well as clips.
 */
export async function uploadImage(
  uri: string,
  folder: string = 'photos',
  fileName: string = 'photo'
): Promise<MediaUploadResult> {
  const bucket = folder === 'spot_photos' ? 'spot-photos' : 'skatetv-clips';
  const url = await uploadToStorage(uri, bucket, folder, fileName);

  const fileSize = Platform.OS === 'web' ? (await (await fetch(uri)).blob()).size : null;
  const fileInfo = Platform.OS === 'web' ? null : await FileSystem.getInfoAsync(uri);

  return {
    url,
    type: 'photo',
    fileSize:
      fileInfo && fileInfo.exists && 'size' in fileInfo
        ? fileInfo.size || 0
        : Number(fileSize ?? 0),
  };
}

/**
 * Upload video to the live SkateTV/user-media bucket.
 */
export async function uploadVideo(
  uri: string,
  folder: string = 'videos',
  fileName: string = 'video',
  duration?: number
): Promise<MediaUploadResult> {
  const url = await uploadToStorage(uri, 'skatetv-clips', folder, fileName);

  const webBlob = Platform.OS === 'web' ? await (await fetch(uri)).blob() : null;
  const fileInfo = Platform.OS === 'web' ? null : await FileSystem.getInfoAsync(uri);

  return {
    url,
    type: 'video',
    fileSize:
      fileInfo && fileInfo.exists && 'size' in fileInfo
        ? fileInfo.size || 0
        : Number(webBlob?.size ?? 0),
    duration,
  };
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFromStorage(url: string, bucket: string): Promise<void> {
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === bucket);
    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

/**
 * Save media to database
 */
export async function saveMediaToDatabase(
  userId: string,
  mediaResult: MediaUploadResult,
  options?: {
    caption?: string;
    trickName?: string;
    spotId?: string;
  }
): Promise<any> {
  const { data, error } = await supabase
    .from('media')
    .insert([
      {
        user_id: userId,
        type: mediaResult.type,
        url: mediaResult.url,
        thumbnail_url: mediaResult.thumbnailUrl,
        file_size: mediaResult.fileSize,
        duration: mediaResult.duration,
        caption: options?.caption,
        trick_name: options?.trickName,
        spot_id: options?.spotId,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
