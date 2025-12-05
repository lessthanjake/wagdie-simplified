import { ElizaError } from './ElizaError.js';

/**
 * Error for rate limit exceeded
 */
export class ElizaRateLimitError extends ElizaError {
  readonly code = 'RATE_LIMIT';
  readonly statusCode = 429;
  readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, true, retryAfter ? { retryAfter } : undefined);
    this.retryAfter = retryAfter;
  }

  static fromHeaders(headers: Headers): ElizaRateLimitError {
    const retryAfterHeader = headers.get('Retry-After');
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    return new ElizaRateLimitError('Rate limit exceeded', retryAfter);
  }
}
