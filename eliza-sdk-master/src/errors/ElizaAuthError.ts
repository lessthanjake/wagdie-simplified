import { ElizaError } from './ElizaError.js';

/**
 * Error for authentication failures
 */
export class ElizaAuthError extends ElizaError {
  readonly code = 'AUTH_ERROR';
  readonly statusCode = 401;

  constructor(message: string = 'Authentication failed') {
    super(message, false); // Auth errors should not be automatically retried
  }
}
