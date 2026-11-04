import { getTomorrowLocalDate, parseLocalSessionDateTime } from '../../lib/sessionScheduling';

describe('Sessions local scheduling', () => {
  it('accepts a real local date and 24-hour time without shifting the chosen day', () => {
    const scheduled = parseLocalSessionDateTime('2026-11-05', '14:30');
    expect(scheduled).not.toBeNull();
    expect(scheduled?.getFullYear()).toBe(2026);
    expect(scheduled?.getMonth()).toBe(10);
    expect(scheduled?.getDate()).toBe(5);
    expect(scheduled?.getHours()).toBe(14);
    expect(scheduled?.getMinutes()).toBe(30);
  });

  it.each([
    ['2026-02-30', '14:00'],
    ['2026-04-31', '14:00'],
    ['2026-13-01', '14:00'],
    ['2026-00-15', '14:00'],
    ['2026-02-29', '14:00'],
    ['2026-11-05', '24:00'],
    ['2026-11-05', '14:60'],
    ['2026-11-05', '2:30'],
    ['not-a-date', '14:00'],
  ])('rejects an invalid local calendar or clock value (%s %s)', (date, time) => {
    expect(parseLocalSessionDateTime(date, time)).toBeNull();
  });

  it('accepts leap day only in a leap year', () => {
    expect(parseLocalSessionDateTime('2028-02-29', '09:00')?.getDate()).toBe(29);
    expect(parseLocalSessionDateTime('2027-02-29', '09:00')).toBeNull();
  });

  it('defaults to tomorrow in local time, including month and year rollover', () => {
    expect(getTomorrowLocalDate(new Date(2026, 10, 30, 23, 59))).toBe('2026-12-01');
    expect(getTomorrowLocalDate(new Date(2026, 11, 31, 23, 59))).toBe('2027-01-01');
  });
});
