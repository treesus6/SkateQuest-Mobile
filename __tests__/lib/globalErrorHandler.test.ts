/// <reference path="../../types/testEnvShims.d.ts" />
import { describe, expect, it } from '@jest/globals';
import { setupGlobalErrorHandler } from '../../lib/globalErrorHandler';

describe('setupGlobalErrorHandler', () => {
  it('does not replace Promise.prototype.catch', () => {
    const originalCatch = Promise.prototype.catch;

    setupGlobalErrorHandler();

    expect(Promise.prototype.catch).toBe(originalCatch);
  });
});
