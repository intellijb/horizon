/**
 * Constants for the learning module
 */

export * from "./error.codes"

// Difficulty levels
export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const

// SM-2 Algorithm constants
export const SM2_DEFAULTS = {
  INITIAL_EASE_FACTOR: 2.5,
  MINIMUM_EASE_FACTOR: 1.3,
  INITIAL_INTERVAL: 1,
  PASSING_QUALITY: 3, // Minimum quality to be considered correct
  PASSING_SCORE: 70, // Minimum score (0-100) to be considered correct
} as const

// Submission status
export const SUBMISSION_STATUS = {
  PENDING: "pending",
  EVALUATED: "evaluated",
} as const

// Schedule status
export const SCHEDULE_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  PAUSED: "paused",
} as const
