import { ElizaError } from './ElizaError.js';
/**
 * Error for general API errors
 */
export declare class ElizaAPIError extends ElizaError {
    readonly code = "API_ERROR";
    readonly statusCode: number;
    constructor(message: string, statusCode?: number, details?: Record<string, unknown>);
    static fromResponse(statusCode: number, body?: {
        error?: string;
        message?: string;
        details?: Record<string, unknown>;
    }): ElizaAPIError;
}
