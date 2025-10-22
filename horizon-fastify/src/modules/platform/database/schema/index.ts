// Re-export schemas from modules
// This file serves as a central point for Drizzle configuration
export * from "@/modules/features/auth/extensions/schema"
export * from "@/modules/features/entries/extensions/schema"
export * from "@/modules/platform/openai/extensions/schema"
export * from "./intelligence"

// Import interview schema tables with namespace to avoid conflicts
export {
  interviewSchema,
  sessions,
  sessionsRelations,
  interviewers,
  interviewersRelations,
  categories as interviewCategories,
  categoriesRelations as interviewCategoriesRelations,
  topics as interviewTopics,
  topicsRelations as interviewTopicsRelations,
  sessionStatusEnum,
  languageEnum,
  seniorityEnum,
  interviewStyleEnum,
  categoryTypeEnum,
} from "@/modules/features/interview/extensions/schema/interview.schema"

// Import learning schema tables with namespace to avoid conflicts
export {
  learningSchema,
  categories as learningCategories,
  categoriesRelations as learningCategoriesRelations,
  problems,
  problemsRelations,
  submissions,
  submissionsRelations,
  aiEvaluations,
  aiEvaluationsRelations,
  spacedRepetitionSchedules,
  spacedRepetitionSchedulesRelations,
  difficultyEnum,
} from "@/modules/features/learning/extensions/schema"