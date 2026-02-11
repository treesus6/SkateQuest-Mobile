/**
 * Standardized error class for service-layer operations.
 *
 * Every service method wraps unexpected failures in a ServiceError so that
 * callers can rely on a single, consistent shape:
 *   - `message`  – human-readable description
 *   - `code`     – machine-readable error code (e.g. "CREWS_GET_ALL_FAILED")
 *   - `cause`    – the original error that triggered this one (if any)
 */
export class ServiceError extends Error {
  /** Machine-readable error code, e.g. "CREWS_GET_ALL_FAILED". */
  code: string;

  /** The original error that was caught, preserved for debugging. */
  cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.cause = cause;

    // Maintain proper prototype chain for instanceof checks.
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}
