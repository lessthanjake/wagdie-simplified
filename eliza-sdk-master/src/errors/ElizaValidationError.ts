import { ElizaError } from './ElizaError.js';

/**
 * Error for validation failures
 */
export class ElizaValidationError extends ElizaError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    fieldErrors: Record<string, string[]> = {}
  ) {
    super(message, false, { fieldErrors });
    this.fieldErrors = fieldErrors;
  }

  static fromFields(fieldErrors: Record<string, string[]>): ElizaValidationError {
    const fieldNames = Object.keys(fieldErrors);
    const message =
      fieldNames.length > 0
        ? `Validation failed for: ${fieldNames.join(', ')}`
        : 'Validation failed';
    return new ElizaValidationError(message, fieldErrors);
  }
}
