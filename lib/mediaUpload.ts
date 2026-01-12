import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

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
  // Request permissions
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
        videoMaxDuration: 60, // 60 seconds max
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
 * Upload file to Supabase Storage
 */
export async function uploadToStorage(
  uri: string,
  bucket: string,
  folder: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Get file extension
    const ext = uri.split('.').pop() || 'jpg';
    const filePath = `${folder}/${Date.now()}_${fileName}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, decode(base64), {
      contentType: `${bucket === 'videos' ? 'video' : 'image'}/${ext}`,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    // Get public URL
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
 * Upload image and create thumbnail
 */
export async function uploadImage(
  uri: string,
  folder: string = 'photos',
  fileName: string = 'photo'
): Promise<MediaUploadResult> {
  const url = await uploadToStorage(uri, 'photos', folder, fileName);

  const fileInfo = await FileSystem.getInfoAsync(uri);
  const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size || 0 : 0;

  return {
    url,
    type: 'photo',
    fileSize,
  };
}

/**
 * Upload video
 */
export async function uploadVideo(
  uri: string,
  folder: string = 'videos',
  fileName: string = 'video',
  duration?: number
): Promise<MediaUploadResult> {
  const url = await uploadToStorage(uri, 'videos', folder, fileName);

  const fileInfo = await FileSystem.getInfoAsync(uri);
  const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size || 0 : 0;

  return {
    url,
    type: 'video',
    fileSize,
    duration,
  };
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFromStorage(url: string, bucket: string): Promise<void> {
  try {
    // Extract file path from URL
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
