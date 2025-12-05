import { ElizaError } from './ElizaError.js';
/**
 * Error for network-related failures
 */
export declare class ElizaNetworkError extends ElizaError {
    readonly code = "NETWORK_ERROR";
    readonly statusCode = 0;
    constructor(message?: string, cause?: Error);
}
