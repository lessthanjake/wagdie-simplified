import { ElizaError } from './ElizaError.js';
/**
 * Error for validation failures
 */
export declare class ElizaValidationError extends ElizaError {
    readonly code = "VALIDATION_ERROR";
    readonly statusCode = 400;
    readonly fieldErrors: Record<string, string[]>;
    constructor(message?: string, fieldErrors?: Record<string, string[]>);
    static fromFields(fieldErrors: Record<string, string[]>): ElizaValidationError;
}
