import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Sentry from '@sentry/react-native';
import { Logger } from './logger';

/**
 * In-app bug reporting system
 * Allows users to report bugs with context
 */

export interface BugReport {
  description: string;
  screenshot?: string;
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
  logs?: string[];
}

interface DeviceInfo {
  model: string;
  brand: string;
  osName: string;
  osVersion: string;
  totalMemory?: number;
}

interface AppInfo {
  version: string;
  buildNumber: string;
  updateId?: string;
}

/**
 * Collect device information for bug report
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  return {
    model: Device.modelName || 'Unknown',
    brand: Device.brand || 'Unknown',
    osName: Device.osName || 'Unknown',
    osVersion: Device.osVersion || 'Unknown',
    totalMemory: Device.totalMemory,
  };
}

/**
 * Collect app information for bug report
 */
export function getAppInfo(): AppInfo {
  return {
    version: Application.nativeApplicationVersion || 'Unknown',
    buildNumber: Application.nativeBuildVersion || 'Unknown',
  };
}

/**
 * Submit bug report
 */
export async function submitBugReport(
  description: string,
  screenshot?: string
): Promise<{ success: boolean; ticketId?: string }> {
  try {
    const deviceInfo = await getDeviceInfo();
    const appInfo = getAppInfo();

    const report: BugReport = {
      description,
      screenshot,
      deviceInfo,
      appInfo,
    };

    // Log to Sentry
    Sentry.captureMessage(`Bug Report: ${description}`, {
      level: 'info',
      tags: {
        type: 'bug_report',
        device_model: deviceInfo.model,
        os_version: deviceInfo.osVersion,
        app_version: appInfo.version,
      },
      extra: {
        device_info: deviceInfo,
        app_info: appInfo,
      },
    });

    // Generate ticket ID
    const ticketId = generateTicketId();

    Logger.info('Bug report submitted', {
      ticketId,
      description,
    });

    // In production, you might also send to:
    // - Your backend API
    // - Email
    // - Support ticket system (Zendesk, Intercom, etc.)

    return {
      success: true,
      ticketId,
    };
  } catch (error) {
    Logger.error('Failed to submit bug report', error);
    return { success: false };
  }
}

/**
 * Generate unique ticket ID
 */
function generateTicketId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `BUG-${timestamp}-${random}`.toUpperCase();
}

/**
 * Shake to report feature detector
 * Returns cleanup function
 */
export function enableShakeToReport(
  onShake: () => void
): () => void {
  // This would use react-native-shake or accelerometer
  // For now, this is a placeholder
  Logger.info('Shake to report enabled');

  // Return cleanup function
  return () => {
    Logger.info('Shake to report disabled');
  };
}

export default {
  submitBugReport,
  getDeviceInfo,
  getAppInfo,
  enableShakeToReport,
};
