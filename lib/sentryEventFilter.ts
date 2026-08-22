const UNKNOWN_OPTIONAL_IMPORT =
  'Requiring unknown module "[unknown optional import]"';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

/**
 * Browser automation can call Metro's internal module loader without a module
 * id while inspecting the page. That produces a fatal-looking Metro error
 * whose stack belongs to Playwright's UtilityScript, not SkateQuest.
 *
 * Keep real unknown-module failures. Drop only the exact synthetic signature
 * when a browser-automation frame is present.
 */
export function isBrowserAutomationMetroProbe(event: unknown): boolean {
  if (!isRecord(event) || !isRecord(event.exception)) {
    return false;
  }

  const values = event.exception.values;
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some(exception => {
    if (
      !isRecord(exception) ||
      typeof exception.value !== 'string' ||
      !exception.value.includes(UNKNOWN_OPTIONAL_IMPORT) ||
      !isRecord(exception.stacktrace)
    ) {
      return false;
    }

    const frames = exception.stacktrace.frames;
    if (!Array.isArray(frames)) {
      return false;
    }

    return frames.some(frame => {
      if (!isRecord(frame)) {
        return false;
      }

      return (
        typeof frame.function === 'string' &&
        frame.function.startsWith('UtilityScript.')
      );
    });
  });
}

export function shouldDropSentryEvent(event: unknown): boolean {
  return isBrowserAutomationMetroProbe(event);
}
