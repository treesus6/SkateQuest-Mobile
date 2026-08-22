import type * as Sentry from '@sentry/react-native';

const UNKNOWN_OPTIONAL_IMPORT =
  'Requiring unknown module "[unknown optional import]"';

/**
 * Browser automation can call Metro's internal module loader without a module
 * id while inspecting the page. That produces a fatal-looking Metro error
 * whose stack belongs to Playwright's UtilityScript, not SkateQuest.
 *
 * Keep real unknown-module failures. Drop only the exact synthetic signature
 * when a browser-automation frame is present.
 */
export function isBrowserAutomationMetroProbe(event: Sentry.ErrorEvent): boolean {
  return (event.exception?.values ?? []).some(exception => {
    if (!exception.value?.includes(UNKNOWN_OPTIONAL_IMPORT)) {
      return false;
    }

    return (exception.stacktrace?.frames ?? []).some(frame =>
      frame.function?.startsWith('UtilityScript.')
    );
  });
}

export function shouldDropSentryEvent(event: Sentry.ErrorEvent): boolean {
  return isBrowserAutomationMetroProbe(event);
}
