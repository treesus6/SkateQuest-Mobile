/**
 * goProService.ts
 * Integrates with the Open GoPro API over WiFi to browse and import
 * clips directly from a GoPro camera into SkateQuest.
 *
 * Open GoPro WiFi API docs: https://gopro.github.io/OpenGoPro/http
 *
 * How it works:
 *  1. User connects their phone to the GoPro's WiFi hotspot (GoPro creates one)
 *  2. The GoPro exposes an HTTP API at 10.5.5.9:8080
 *  3. We list media, get thumbnails, and download clips
 *
 * This service is purely HTTP-based — no BLE required for media access.
 */

const GOPRO_BASE_URL = 'http://10.5.5.9:8080';
const GOPRO_MEDIA_URL = 'http://10.5.5.9:8080/gopro/media';
const TIMEOUT_MS = 8000;

export interface GoProMediaItem {
  filename: string;
  directory: string;
  size: number;
  createdAt: string;
  duration?: number; // seconds, for videos
  type: 'video' | 'photo';
  thumbnailUrl: string;
  downloadUrl: string;
}

export interface GoProConnectionStatus {
  connected: boolean;
  cameraName?: string;
  batteryLevel?: number;
  remainingSpace?: number;
}

async function fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Check if a GoPro is connected via WiFi and reachable.
 */
export async function checkGoProConnection(): Promise<GoProConnectionStatus> {
  try {
    const res = await fetchWithTimeout(`${GOPRO_BASE_URL}/gopro/camera/info`);
    if (!res.ok) return { connected: false };
    const data = await res.json();
    return {
      connected: true,
      cameraName: data?.info?.model_name || 'GoPro Camera',
      batteryLevel: data?.status?.['70'] ?? undefined,
      remainingSpace: data?.status?.['54'] ?? undefined,
    };
  } catch {
    return { connected: false };
  }
}

/**
 * List all media files on the GoPro's SD card.
 * Returns videos and photos sorted by creation date (newest first).
 */
export async function listGoProMedia(): Promise<GoProMediaItem[]> {
  try {
    const res = await fetchWithTimeout(`${GOPRO_MEDIA_URL}/list`);
    if (!res.ok) throw new Error(`GoPro returned ${res.status}`);
    const data = await res.json();

    const items: GoProMediaItem[] = [];

    for (const folder of data?.media || []) {
      const dir: string = folder.d;
      for (const file of folder.fs || []) {
        const filename: string = file.n;
        const isVideo = /\.(mp4|lrv|360)$/i.test(filename);
        const isPhoto = /\.(jpg|jpeg|gpr|raw)$/i.test(filename);
        if (!isVideo && !isPhoto) continue;

        items.push({
          filename,
          directory: dir,
          size: parseInt(file.s || '0', 10),
          createdAt: file.cre
            ? new Date(parseInt(file.cre, 10) * 1000).toISOString()
            : new Date().toISOString(),
          duration: file.dur ? parseInt(file.dur, 10) : undefined,
          type: isVideo ? 'video' : 'photo',
          thumbnailUrl: `${GOPRO_BASE_URL}/gopro/media/thumbnail?path=${dir}/${filename}`,
          downloadUrl: `${GOPRO_BASE_URL}/videos/DCIM/${dir}/${filename}`,
        });
      }
    }

    // Sort newest first
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('listGoProMedia error:', err);
    return [];
  }
}

/**
 * Download a single GoPro media file and return a local file URI.
 * Uses expo-file-system for React Native compatibility.
 */
export async function downloadGoProClip(
  item: GoProMediaItem,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    // Dynamically import expo-file-system to avoid hard dependency at module level
    const FileSystem = await import('expo-file-system');
    const destUri = `${(FileSystem as any).cacheDirectory ?? "/tmp/"}gopro_${item.filename}`;

    const downloadResumable = FileSystem.createDownloadResumable(
      item.downloadUrl,
      destUri,
      {},
      progress => {
        if (onProgress && progress.totalBytesExpectedToWrite > 0) {
          onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    return result?.uri || null;
  } catch (err) {
    console.error('downloadGoProClip error:', err);
    return null;
  }
}

/**
 * Keep the GoPro's WiFi hotspot alive by sending a keep-alive request.
 * Call this every 60 seconds while the user is browsing media.
 */
export async function keepGoProAlive(): Promise<void> {
  try {
    await fetchWithTimeout(`${GOPRO_BASE_URL}/gopro/camera/keep_alive`, 3000);
  } catch {
    // Silently fail — camera may have gone to sleep
  }
}
