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
 * Pause is real: paused time accumulates in pausedTotalMs and is excluded
 * from every duration read, matching the server (paused_total_seconds on
 * skate_activity_sessions). The backend remains authoritative for final
 * session duration and XP.
 */
export class SessionTimer {
  private startTime: Date | null = null;
  private endTime: Date | null = null;
  private pausedTotalMs = 0;
  private pausedAt: Date | null = null;

  /**
   * Start (or restore) the timer. When resuming a server session after the
   * app was killed, pass the server started_at and paused_total_seconds so
   * the displayed time matches the server's active time. Pass the server
   * paused_at as well when restoring an already-paused session so the
   * frozen display matches the server's pause moment, not the restore time.
   */
  start(startedAt?: Date, pausedTotalSeconds = 0, pausedAt?: Date | null): void {
    this.startTime = startedAt ? new Date(startedAt) : new Date();
    this.endTime = null;
    this.pausedTotalMs = Math.max(0, pausedTotalSeconds) * 1000;
    this.pausedAt = pausedAt ? new Date(pausedAt) : null;
  }

  stop(): void {
    if (this.pausedAt) {
      this.pausedTotalMs += new Date().getTime() - this.pausedAt.getTime();
      this.pausedAt = null;
    }
    this.endTime = new Date();
  }

  /** Freeze the clock: further wall-clock time no longer counts. */
  pause(): void {
    if (!this.startTime || this.endTime || this.pausedAt) return;
    this.pausedAt = new Date();
  }

  /**
   * Resume the clock, keeping all previously paused time excluded. When the
   * server returns the authoritative paused_total_seconds (the normal
   * resume path), pass it so the client clock matches the server exactly.
   * Also clears a previous stop, so resuming after cancelling the end
   * dialog continues the same session instead of leaving the clock frozen.
   */
  resume(pausedTotalSeconds?: number): void {
    this.endTime = null;
    if (typeof pausedTotalSeconds === 'number') {
      this.pausedTotalMs = Math.max(0, pausedTotalSeconds) * 1000;
      this.pausedAt = null;
      return;
    }
    if (!this.pausedAt) return;
    this.pausedTotalMs += new Date().getTime() - this.pausedAt.getTime();
    this.pausedAt = null;
  }

  isPaused(): boolean {
    return this.pausedAt !== null;
  }

  getPausedTotalSeconds(): number {
    const openPauseMs = this.pausedAt ? new Date().getTime() - this.pausedAt.getTime() : 0;
    return Math.round((this.pausedTotalMs + openPauseMs) / 1000);
  }

  private getActiveMs(): number {
    if (!this.startTime) return 0;
    const end = this.endTime || new Date();
    const openPauseMs =
      !this.endTime && this.pausedAt ? end.getTime() - this.pausedAt.getTime() : 0;
    return Math.max(0, end.getTime() - this.startTime.getTime() - this.pausedTotalMs - openPauseMs);
  }

  getDurationMinutes(): number {
    return Math.round(this.getActiveMs() / 60000);
  }

  getDurationSeconds(): number {
    return Math.round(this.getActiveMs() / 1000);
  }

  isRunning(): boolean {
    return this.startTime !== null && this.endTime === null && this.pausedAt === null;
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
    this.pausedTotalMs = 0;
    this.pausedAt = null;
  }
}
