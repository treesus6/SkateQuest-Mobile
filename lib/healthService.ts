/**
 * healthService.ts
 * Syncs SkateQuest skate sessions to Apple Health (iOS) and Google Fit (Android)
 * as "Skateboarding" workout entries.
 *
 * Uses expo-health (a community Expo module wrapping HealthKit / Health Connect).
 * Install: expo install expo-health
 *
 * Fallback: If expo-health is unavailable, gracefully degrades with no crash.
 */

import { Platform } from 'react-native';
import { Logger } from './logger';

export interface SkateSessionHealth {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  distanceMeters?: number;
  heartRateAvg?: number;
  spotName?: string;
}

// Skateboarding burns roughly 5–8 kcal/min depending on intensity
const CALORIES_PER_MINUTE = 6.5;

/**
 * Estimate calories burned during a skate session.
 */
export function estimateCalories(durationMinutes: number): number {
  return Math.round(durationMinutes * CALORIES_PER_MINUTE);
}

/**
 * Request permission to write workouts to Apple Health / Google Fit.
 * Returns true if permission granted.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      // expo-health for iOS HealthKit
      const Health = await import('expo-health').catch(() => null);
      if (!Health) {
        Logger.warn('healthService: expo-health not installed');
        return false;
      }
      const available = await Health.isAvailableAsync();
      if (!available) return false;

      await Health.requestPermissionsAsync({
        read: [],
        write: [
          Health.HealthDataType.Workout,
          Health.HealthDataType.ActiveEnergyBurned,
        ],
      });
      return true;
    }

    if (Platform.OS === 'android') {
      // expo-health for Android Health Connect
      const Health = await import('expo-health').catch(() => null);
      if (!Health) return false;
      const available = await Health.isAvailableAsync();
      if (!available) return false;
      await Health.requestPermissionsAsync({
        read: [],
        write: [Health.HealthDataType.Workout],
      });
      return true;
    }

    return false;
  } catch (err) {
    Logger.error('healthService: permission request failed', err);
    return false;
  }
}

/**
 * Save a completed skate session as a workout to Apple Health / Google Fit.
 */
export async function saveSkateSessionToHealth(
  session: SkateSessionHealth
): Promise<{ success: boolean; message: string }> {
  try {
    const Health = await import('expo-health').catch(() => null);
    if (!Health) {
      return { success: false, message: 'Health integration not available on this device.' };
    }

    const available = await Health.isAvailableAsync();
    if (!available) {
      return { success: false, message: 'Health app not available on this device.' };
    }

    const calories = session.caloriesBurned ?? estimateCalories(session.durationMinutes);

    await Health.saveWorkoutAsync({
      activityType: Health.WorkoutActivityType.Skateboarding,
      startDate: session.startTime,
      endDate: session.endTime,
      energyBurned: calories,
      energyBurnedUnit: 'kilocalorie',
      distance: session.distanceMeters,
      distanceUnit: 'meter',
      metadata: {
        HKMetadataKeyWorkoutBrandName: 'SkateQuest',
        ...(session.spotName ? { location: session.spotName } : {}),
      },
    });

    return {
      success: true,
      message: `Saved to Health: ${session.durationMinutes} min skate session, ~${calories} cal burned`,
    };
  } catch (err: any) {
    Logger.error('healthService: saveWorkout failed', err);
    return {
      success: false,
      message: err?.message || 'Could not save to Health app.',
    };
  }
}

/**
 * A simple in-memory session timer that tracks start/end time.
 * Used by the active session UI to measure duration.
 */
export class SessionTimer {
  private startTime: Date | null = null;
  private endTime: Date | null = null;

  start(): void {
    this.startTime = new Date();
    this.endTime = null;
  }

  stop(): void {
    this.endTime = new Date();
  }

  getDurationMinutes(): number {
    if (!this.startTime) return 0;
    const end = this.endTime || new Date();
    return Math.round((end.getTime() - this.startTime.getTime()) / 60000);
  }

  getDurationSeconds(): number {
    if (!this.startTime) return 0;
    const end = this.endTime || new Date();
    return Math.round((end.getTime() - this.startTime.getTime()) / 1000);
  }

  isRunning(): boolean {
    return this.startTime !== null && this.endTime === null;
  }

  getStartTime(): Date | null {
    return this.startTime;
  }

  getEndTime(): Date | null {
    return this.endTime;
  }

  reset(): void {
    this.startTime = null;
    this.endTime = null;
  }
}
