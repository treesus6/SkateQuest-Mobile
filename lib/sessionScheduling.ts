/**
 * The Sessions form accepts a local calendar date and 24-hour local time.
 * Date.parse/new Date(string) silently normalizes impossible days and DST gaps;
 * reject those values instead of scheduling a different time than requested.
 */
export function parseLocalSessionDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const scheduled = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    Number.isNaN(scheduled.getTime()) ||
    scheduled.getFullYear() !== year ||
    scheduled.getMonth() !== month - 1 ||
    scheduled.getDate() !== day ||
    scheduled.getHours() !== hour ||
    scheduled.getMinutes() !== minute
  ) {
    return null;
  }
  return scheduled;
}

/** Use the device's local calendar, not UTC, for tomorrow's default date. */
export function getTomorrowLocalDate(now: Date = new Date()): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const year = String(tomorrow.getFullYear()).padStart(4, '0');
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
