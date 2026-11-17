import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { SessionTimer } from '../../lib/healthService';

const T0 = new Date('2026-11-17T10:00:00.000Z');

describe('SessionTimer pause', () => {
  let nowMs: number;

  beforeEach(() => {
    jest.useFakeTimers();
    nowMs = T0.getTime();
    jest.setSystemTime(new Date(nowMs));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Move the fake clock forward by the given seconds.
  function advance(seconds: number): void {
    nowMs += seconds * 1000;
    jest.setSystemTime(new Date(nowMs));
  }

  it('counts wall-clock time while running', () => {
    const timer = new SessionTimer();
    timer.start();
    advance(90);
    expect(timer.getDurationSeconds()).toBe(90);
    expect(timer.isRunning()).toBe(true);
    expect(timer.isPaused()).toBe(false);
  });

  it('freezes while paused and excludes paused time on resume', () => {
    const timer = new SessionTimer();
    timer.start();
    advance(60);
    timer.pause();
    expect(timer.isRunning()).toBe(false);
    expect(timer.isPaused()).toBe(true);
    expect(timer.getDurationSeconds()).toBe(60);
    // 5 minutes pass while paused: the clock must not move.
    advance(300);
    expect(timer.getDurationSeconds()).toBe(60);
    expect(timer.getPausedTotalSeconds()).toBe(300);
    timer.resume();
    expect(timer.isRunning()).toBe(true);
    expect(timer.isPaused()).toBe(false);
    advance(60);
    // 60s before pause + 60s after resume; the 300s pause is excluded.
    expect(timer.getDurationSeconds()).toBe(120);
    expect(timer.getPausedTotalSeconds()).toBe(300);
  });

  it('accumulates several pauses', () => {
    const timer = new SessionTimer();
    timer.start();
    advance(30);
    timer.pause();
    advance(60);
    timer.resume();
    advance(30);
    timer.pause();
    advance(120);
    timer.resume();
    advance(30);
    expect(timer.getDurationSeconds()).toBe(90);
    expect(timer.getPausedTotalSeconds()).toBe(60 + 120);
  });

  it('ignores a double pause and a resume without a pause', () => {
    const timer = new SessionTimer();
    timer.start();
    timer.resume();
    advance(10);
    timer.pause();
    advance(60);
    timer.pause();
    advance(60);
    expect(timer.getDurationSeconds()).toBe(10);
    timer.resume();
    timer.resume();
    advance(10);
    expect(timer.getDurationSeconds()).toBe(20);
  });

  it('restores a server session, including an already-paused one', () => {
    const timer = new SessionTimer();
    // Started 20 min ago, 5 min already paused, paused again 2 min ago.
    timer.start(
      new Date(T0.getTime() - 20 * 60 * 1000),
      300,
      new Date(T0.getTime() - 2 * 60 * 1000)
    );
    expect(timer.isPaused()).toBe(true);
    expect(timer.isRunning()).toBe(false);
    // Active time at the server pause moment: 20 - 5 - 2 = 13 min.
    expect(timer.getDurationSeconds()).toBe(13 * 60);
    expect(timer.getPausedTotalSeconds()).toBe(300 + 120);
    // Resuming with the server's authoritative paused total keeps the
    // clock in sync instead of adding a second client-side pause.
    timer.resume(420);
    advance(60);
    expect(timer.getDurationSeconds()).toBe(13 * 60 + 60);
  });

  it('folds an open pause into the total when stopped', () => {
    const timer = new SessionTimer();
    timer.start();
    advance(120);
    timer.pause();
    advance(60);
    timer.stop();
    // Stopping freezes the clock at the active time; the open pause is
    // folded in so a later read cannot resurrect it.
    expect(timer.getDurationSeconds()).toBe(120);
    expect(timer.getPausedTotalSeconds()).toBe(60);
  });

  it('resuming after a stop continues the same session', () => {
    const timer = new SessionTimer();
    timer.start();
    advance(30);
    timer.stop();
    expect(timer.getDurationSeconds()).toBe(30);
    timer.resume();
    advance(60);
    expect(timer.getDurationSeconds()).toBe(90);
  });

  it('reports duration minutes from active time, not wall time', () => {
    const timer = new SessionTimer();
    timer.start();
    advance(90);
    timer.pause();
    advance(600);
    expect(timer.getDurationMinutes()).toBe(2);
  });

  it('reset clears pause state', () => {
    const timer = new SessionTimer();
    timer.start();
    advance(10);
    timer.pause();
    timer.reset();
    expect(timer.getDurationSeconds()).toBe(0);
    expect(timer.getPausedTotalSeconds()).toBe(0);
    expect(timer.isPaused()).toBe(false);
  });
});
