export { ElizaError } from './ElizaError.js';
export { ElizaAPIError } from './ElizaAPIError.js';
export { ElizaAuthError } from './ElizaAuthError.js';
export { ElizaRateLimitError } from './ElizaRateLimitError.js';
export { ElizaNetworkError } from './ElizaNetworkError.js';
export { ElizaValidationError } from './ElizaValidationError.js';

// Type guard for checking if an error is an Eliza error
import { ElizaError } from './ElizaError.js';

export function isElizaError(error: unknown): error is ElizaError {
  return error instanceof ElizaError;
}
