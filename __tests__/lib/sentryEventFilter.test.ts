import { describe, expect, it } from '@jest/globals';
import {
  isBrowserAutomationMetroProbe,
  shouldDropSentryEvent,
} from '../../lib/sentryEventFilter';

const eventWith = (value: string, frameFunction: string) => ({
  exception: {
    values: [
      {
        type: 'Error',
        value,
        stacktrace: {
          frames: [{ function: frameFunction }],
        },
      },
    ],
  },
});

describe('sentryEventFilter', () => {
  it('drops the synthetic Metro error emitted by browser automation', () => {
    const event = eventWith(
      'Requiring unknown module "[unknown optional import]".',
      'UtilityScript.evaluate'
    );

    expect(isBrowserAutomationMetroProbe(event)).toBe(true);
    expect(shouldDropSentryEvent(event)).toBe(true);
  });

  it('keeps a real app unknown-module error', () => {
    const event = eventWith(
      'Requiring unknown module "[unknown optional import]".',
      'loadLoginScreen'
    );

    expect(shouldDropSentryEvent(event)).toBe(false);
  });

  it('keeps unrelated browser automation errors', () => {
    const event = eventWith('Unexpected login failure', 'UtilityScript.evaluate');

    expect(shouldDropSentryEvent(event)).toBe(false);
  });
});
