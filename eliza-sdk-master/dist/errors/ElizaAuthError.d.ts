import { ElizaError } from './ElizaError.js';
/**
 * Error for authentication failures
 */
export declare class ElizaAuthError extends ElizaError {
    readonly code = "AUTH_ERROR";
    readonly statusCode = 401;
    constructor(message?: string);
}
