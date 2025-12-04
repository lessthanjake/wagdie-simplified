import { ElizaError } from './ElizaError.js';

/**
 * Error for general API errors
 */
export class ElizaAPIError extends ElizaError {
  readonly code = 'API_ERROR';
  readonly statusCode: number;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    // 5xx errors are retryable by default
    const isRetryable = statusCode >= 500 && statusCode < 600;
    super(message, isRetryable, details);
    this.statusCode = statusCode;
  }

  static fromResponse(
    statusCode: number,
    body?: { error?: string; message?: string; details?: Record<string, unknown> }
  ): ElizaAPIError {
    const message = body?.message || body?.error || `API error (${statusCode})`;
    return new ElizaAPIError(message, statusCode, body?.details);
  }
}
