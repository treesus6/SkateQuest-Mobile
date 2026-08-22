/// <reference path="../../types/testEnvShims.d.ts" />
import { describe, expect, it, jest } from '@jest/globals';
import { setupGlobalErrorHandler } from '../../lib/globalErrorHandler';

jest.mock('../../lib/logger', () => ({
  Logger: {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined,
  },
}));

describe('setupGlobalErrorHandler', () => {
  it('does not replace Promise.prototype.catch', () => {
    const originalCatch = Promise.prototype.catch;

    setupGlobalErrorHandler();

    expect(Promise.prototype.catch).toBe(originalCatch);
  });
});
