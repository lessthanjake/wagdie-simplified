/**
 * Base error class for all Eliza SDK errors
 */
export declare abstract class ElizaError extends Error {
    abstract readonly code: string;
    abstract readonly statusCode: number;
    readonly isRetryable: boolean;
    readonly details?: Record<string, unknown>;
    constructor(message: string, isRetryable?: boolean, details?: Record<string, unknown>);
    toJSON(): Record<string, unknown>;
}
