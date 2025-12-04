import { ElizaError } from './ElizaError.js';

/**
 * Error for network-related failures
 */
export class ElizaNetworkError extends ElizaError {
  readonly code = 'NETWORK_ERROR';
  readonly statusCode = 0;

  constructor(message: string = 'Network request failed', cause?: Error) {
    super(message, true, cause ? { cause: cause.message } : undefined);
    if (cause) {
      this.cause = cause;
    }
  }
}
