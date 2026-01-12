import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Logger } from './logger';

/**
 * Media optimization utilities
 * Compress images and videos to reduce storage costs and improve performance
 */

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

interface OptimizedImage {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

/**
 * Compress and optimize image
 */
export async function optimizeImage(
  uri: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8, format = 'jpeg' } = options;

  try {
    // Get original image info
    const originalInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = (originalInfo as any).size || 0;

    Logger.media('Optimizing image', 'image', {
      originalUri: uri,
      originalSize,
      maxWidth,
      maxHeight,
    });

    // Resize and compress
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      {
        compress: quality,
        format:
          format === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Get optimized file info
    const optimizedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
    const optimizedSize = (optimizedInfo as any).size || 0;

    const savings = originalSize - optimizedSize;
    const savingsPercent = Math.round((savings / originalSize) * 100);

    Logger.media('Image optimized', 'image', {
      originalSize,
      optimizedSize,
      savings,
      savingsPercent: `${savingsPercent}%`,
    });

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      fileSize: optimizedSize,
    };
  } catch (error) {
    Logger.error('Image optimization failed', error);
    throw error;
  }
}

/**
 * Generate thumbnail for image
 */
export async function generateThumbnail(uri: string, size: number = 200): Promise<string> {
  try {
    const thumbnail = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size, height: size } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return thumbnail.uri;
  } catch (error) {
    Logger.error('Thumbnail generation failed', error);
    throw error;
  }
}

/**
 * Generate multiple image sizes (responsive images)
 */
export async function generateImageSizes(uri: string): Promise<{
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
}> {
  try {
    const [thumbnail, small, medium, large] = await Promise.all([
      optimizeImage(uri, { maxWidth: 200, maxHeight: 200, quality: 0.7 }),
      optimizeImage(uri, { maxWidth: 640, maxHeight: 640, quality: 0.75 }),
      optimizeImage(uri, { maxWidth: 1280, maxHeight: 1280, quality: 0.8 }),
      optimizeImage(uri, { maxWidth: 1920, maxHeight: 1920, quality: 0.85 }),
    ]);

    return {
      thumbnail: thumbnail.uri,
      small: small.uri,
      medium: medium.uri,
      large: large.uri,
    };
  } catch (error) {
    Logger.error('Image size generation failed', error);
    throw error;
  }
}

/**
 * Validate and optimize video (placeholder - actual video compression requires native modules)
 */
export async function optimizeVideo(uri: string): Promise<{ uri: string; fileSize: number }> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const fileSize = (info as any).size || 0;

    // For now, just return the original
    // In production, you'd use expo-av or a cloud service for video compression
    Logger.media('Video optimization', 'video', {
      uri,
      fileSize,
      note: 'Video compression requires server-side processing',
    });

    // Check file size limit (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (fileSize > maxSize) {
      throw new Error(
        `Video file too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum size is 100MB.`
      );
    }

    return { uri, fileSize };
  } catch (error) {
    Logger.error('Video optimization failed', error);
    throw error;
  }
}

/**
 * Generate video thumbnail (extract first frame)
 */
export async function generateVideoThumbnail(videoUri: string): Promise<string> {
  try {
    // This requires expo-video-thumbnails or similar
    // For now, return a placeholder
    Logger.info('Video thumbnail generation', { videoUri });

    // In production, use:
    // import { getThumbnailAsync } from 'expo-video-thumbnails';
    // const { uri } = await getThumbnailAsync(videoUri, { time: 1000 });
    // return uri;

    throw new Error('Video thumbnail generation not implemented - requires expo-video-thumbnails');
  } catch (error) {
    Logger.error('Video thumbnail generation failed', error);
    throw error;
  }
}

/**
 * Progressive image loading helper
 * Returns base64 blur placeholder for fast initial load
 */
export async function generateBlurPlaceholder(uri: string): Promise<string> {
  try {
    // Create very small version (20x20)
    const tiny = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 20, height: 20 } }],
      {
        compress: 0.1,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (tiny.base64) {
      return `data:image/jpeg;base64,${tiny.base64}`;
    }

    throw new Error('Failed to generate base64');
  } catch (error) {
    Logger.error('Blur placeholder generation failed', error);
    // Return transparent pixel as fallback
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
}

/**
 * Calculate storage cost estimate
 */
export function estimateStorageCost(
  fileSizeBytes: number,
  monthlyUploads: number = 100
): {
  sizePerFile: string;
  monthlySize: string;
  monthlyCost: number;
} {
  const fileSizeMB = fileSizeBytes / 1024 / 1024;
  const monthlyMB = fileSizeMB * monthlyUploads;
  const monthlyGB = monthlyMB / 1024;

  // Supabase pricing: $0.021 per GB per month
  const costPerGB = 0.021;
  const monthlyCost = monthlyGB * costPerGB;

  return {
    sizePerFile: `${fileSizeMB.toFixed(2)} MB`,
    monthlySize: `${monthlyGB.toFixed(2)} GB`,
    monthlyCost: parseFloat(monthlyCost.toFixed(2)),
  };
}

/**
 * Lazy load image hook helper
 */
export function getImageLoadingStrategy(imageSize: number): {
  priority: 'high' | 'normal' | 'low';
  shouldPreload: boolean;
} {
  // High priority for small images (< 100KB) or thumbnails
  if (imageSize < 100 * 1024) {
    return { priority: 'high', shouldPreload: true };
  }

  // Normal priority for medium images (< 1MB)
  if (imageSize < 1024 * 1024) {
    return { priority: 'normal', shouldPreload: false };
  }

  // Low priority for large images
  return { priority: 'low', shouldPreload: false };
}

export default {
  optimizeImage,
  generateThumbnail,
  generateImageSizes,
  optimizeVideo,
  generateVideoThumbnail,
  generateBlurPlaceholder,
  estimateStorageCost,
  getImageLoadingStrategy,
};
