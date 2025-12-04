export { ElizaError } from './ElizaError.js';
export { ElizaAPIError } from './ElizaAPIError.js';
export { ElizaAuthError } from './ElizaAuthError.js';
export { ElizaRateLimitError } from './ElizaRateLimitError.js';
export { ElizaNetworkError } from './ElizaNetworkError.js';
export { ElizaValidationError } from './ElizaValidationError.js';
import { ElizaError } from './ElizaError.js';
export declare function isElizaError(error: unknown): error is ElizaError;
