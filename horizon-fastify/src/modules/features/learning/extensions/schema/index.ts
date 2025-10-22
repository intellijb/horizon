// Export all enums
export * from "./enums"

// Export all tables from learning schema
export * from "./learning.schema"

// Export all relations
export * from "./relations"

// Re-export the learning schema namespace
export { learningSchema } from "./learning.schema"

// Re-export types for convenience
export type {
  Category,
  NewCategory,
  Problem,
  NewProblem,
  Submission,
  NewSubmission,
  AiEvaluation,
  NewAiEvaluation,
  SpacedRepetitionSchedule,
  NewSpacedRepetitionSchedule,
} from "./learning.schema"
