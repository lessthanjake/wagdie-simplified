/**
 * Base error class for all Eliza SDK errors
 */
export abstract class ElizaError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly isRetryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(message: string, isRetryable: boolean = false, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.isRetryable = isRetryable;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      isRetryable: this.isRetryable,
      ...(this.details && { details: this.details }),
    };
  }
}
