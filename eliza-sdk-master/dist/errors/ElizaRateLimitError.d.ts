import { ElizaError } from './ElizaError.js';
/**
 * Error for rate limit exceeded
 */
export declare class ElizaRateLimitError extends ElizaError {
    readonly code = "RATE_LIMIT";
    readonly statusCode = 429;
    readonly retryAfter?: number;
    constructor(message?: string, retryAfter?: number);
    static fromHeaders(headers: Headers): ElizaRateLimitError;
}
