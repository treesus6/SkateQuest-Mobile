import { supabase } from './supabase';

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

export interface WebMediaAsset {
  uri: string;
  width: number;
  height: number;
  type: 'image' | 'video';
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
  duration?: number | null;
}

function pickBrowserFile(
  kind: 'image' | 'video',
  useCamera: boolean
): Promise<WebMediaAsset | null> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Media picker is unavailable in this browser.'));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = kind === 'image' ? 'image/*' : 'video/*';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    // Mobile Safari/Chrome can hand this directly to the rear camera.
    if (useCamera) input.setAttribute('capture', 'environment');

    const cleanup = () => {
      input.onchange = null;
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }

      const uri = URL.createObjectURL(file);
      cleanup();
      resolve({
        uri,
        width: 0,
        height: 0,
        type: kind,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        duration: null,
      });
    };

    document.body.appendChild(input);
    input.click();
  });
}

export async function pickImage(useCamera = false): Promise<WebMediaAsset | null> {
  return pickBrowserFile('image', useCamera);
}

export async function pickVideo(useCamera = false): Promise<WebMediaAsset | null> {
  return pickBrowserFile('video', useCamera);
}

async function readBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('The selected media could not be read.');
  return response.blob();
}

function extensionFor(blob: Blob, uri: string, fallback: string): string {
  const mimeExtension = blob.type.split('/')[1]?.replace('quicktime', 'mov').replace('jpeg', 'jpg');
  if (mimeExtension) return mimeExtension;
  const uriExtension = uri.split(/[?#]/)[0].split('.').pop();
  return uriExtension && uriExtension.length <= 5 ? uriExtension : fallback;
}

export async function uploadToStorage(
  uri: string,
  bucket: string,
  folder: string,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const blob = await readBlob(uri);
  const ext = extensionFor(blob, uri, bucket === 'videos' ? 'mp4' : 'jpg');
  const filePath = `${folder}/${Date.now()}_${fileName}.${ext}`;

  onProgress?.({ loaded: 0, total: blob.size, percentage: 0 });

  const { error } = await supabase.storage.from(bucket).upload(filePath, blob, {
    contentType: blob.type || `${bucket === 'videos' ? 'video' : 'image'}/${ext}`,
    upsert: false,
  });
  if (error) throw error;

  onProgress?.({ loaded: blob.size, total: blob.size, percentage: 100 });

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}

export async function uploadImage(
  uri: string,
  folder = 'photos',
  fileName = 'photo'
): Promise<MediaUploadResult> {
  const blob = await readBlob(uri);
  const url = await uploadToStorage(uri, 'photos', folder, fileName);
  URL.revokeObjectURL(uri);
  return {
    url,
    type: 'photo',
    fileSize: blob.size,
  };
}

export async function uploadVideo(
  uri: string,
  folder = 'videos',
  fileName = 'video',
  duration?: number
): Promise<MediaUploadResult> {
  const blob = await readBlob(uri);
  const url = await uploadToStorage(uri, 'videos', folder, fileName);
  URL.revokeObjectURL(uri);
  return {
    url,
    type: 'video',
    fileSize: blob.size,
    duration,
  };
}

export async function deleteFromStorage(url: string, bucket: string): Promise<void> {
  const urlParts = url.split('/');
  const bucketIndex = urlParts.findIndex(part => part === bucket);
  if (bucketIndex < 0) throw new Error('Could not determine the stored file path.');
  const filePath = urlParts.slice(bucketIndex + 1).join('/');
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw error;
}

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

  if (error) throw error;
  return data;
}
