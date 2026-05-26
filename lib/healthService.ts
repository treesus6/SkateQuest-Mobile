/**
 * healthService.ts
 * Tracks SkateQuest skate sessions and estimates health metrics.
 *
 * Native HealthKit (iOS) / Health Connect (Android) integration is planned
 * for a future release. Currently uses built-in calorie estimation and
 * session timing — no native health modules required.
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
 * Currently returns false — native health module integration is planned
 * for a future release.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  Logger.info(`healthService: native health integration not yet enabled on ${Platform.OS}`);
  return false;
}

/**
 * Save a completed skate session as a workout to Apple Health / Google Fit.
 * Currently a no-op — native health module integration is planned for a future release.
 * Future: use react-native-health (iOS) and react-native-health-connect (Android).
 */
export async function saveSkateSessionToHealth(
  session: SkateSessionHealth
): Promise<{ success: boolean; message: string }> {
  const calories = session.caloriesBurned ?? estimateCalories(session.durationMinutes);
  Logger.info(
    `healthService: session logged locally — ${session.durationMinutes} min, ~${calories} cal (native health sync coming soon)`
  );
  return {
    success: false,
    message: 'Health app sync coming soon! Your session data is saved in SkateQuest.',
  };
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
