/**
 * Error codes and constants for the learning module
 */

export enum ErrorCode {
  // Category errors
  CATEGORY_NOT_FOUND = "CATEGORY_NOT_FOUND",
  CATEGORY_ALREADY_EXISTS = "CATEGORY_ALREADY_EXISTS",
  CATEGORY_HAS_CHILDREN = "CATEGORY_HAS_CHILDREN",
  CATEGORY_CIRCULAR_REFERENCE = "CATEGORY_CIRCULAR_REFERENCE",

  // Problem errors
  PROBLEM_NOT_FOUND = "PROBLEM_NOT_FOUND",
  PROBLEM_ALREADY_EXISTS = "PROBLEM_ALREADY_EXISTS",
  PROBLEM_CONTENT_INVALID = "PROBLEM_CONTENT_INVALID",
  INVALID_DIFFICULTY = "INVALID_DIFFICULTY",

  // Submission errors
  SUBMISSION_NOT_FOUND = "SUBMISSION_NOT_FOUND",
  SUBMISSION_ALREADY_EVALUATED = "SUBMISSION_ALREADY_EVALUATED",
  SUBMISSION_LIMIT_EXCEEDED = "SUBMISSION_LIMIT_EXCEEDED",
  SUBMISSION_TOO_SOON = "SUBMISSION_TOO_SOON",
  MAX_ATTEMPTS_REACHED = "MAX_ATTEMPTS_REACHED",

  // Evaluation errors
  EVALUATION_NOT_FOUND = "EVALUATION_NOT_FOUND",
  EVALUATION_EXISTS = "EVALUATION_EXISTS",
  EVALUATION_ALREADY_EXISTS = "EVALUATION_ALREADY_EXISTS",
  EVALUATION_FAILED = "EVALUATION_FAILED",
  INVALID_SCORE = "INVALID_SCORE",

  // Schedule errors
  SCHEDULE_NOT_FOUND = "SCHEDULE_NOT_FOUND",
  SCHEDULE_EXISTS = "SCHEDULE_EXISTS",
  SCHEDULE_ALREADY_EXISTS = "SCHEDULE_ALREADY_EXISTS",
  SCHEDULE_INVALID_PARAMS = "SCHEDULE_INVALID_PARAMS",
  INVALID_SCHEDULE_DATE = "INVALID_SCHEDULE_DATE",

  // General errors
  VALIDATION_FAILED = "VALIDATION_FAILED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// Keep the old enum name as an alias for backward compatibility
export const LearningErrorCode = ErrorCode

export class LearningError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = "LearningError"
    Object.setPrototypeOf(this, LearningError.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    }
  }

  static isLearningError(error: unknown): error is LearningError {
    return error instanceof LearningError
  }
}