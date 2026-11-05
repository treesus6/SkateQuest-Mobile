/**
 * SkateQuest session timing and calorie estimation.
 *
 * This module intentionally contains only functionality SkateQuest provides today.
 */

// Skateboarding burns roughly 5–8 kcal/min depending on intensity.
const CALORIES_PER_MINUTE = 6.5;

export function estimateCalories(durationMinutes: number): number {
  return Math.round(Math.max(0, durationMinutes) * CALORIES_PER_MINUTE);
}

/**
 * In-memory timer used by the active-session UI.
 * The backend remains authoritative for final session duration and XP.
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
