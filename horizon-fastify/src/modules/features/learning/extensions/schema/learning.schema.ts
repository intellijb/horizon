import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  index,
  unique,
  pgSchema,
} from "drizzle-orm/pg-core"
import { difficultyEnum } from "./enums"

// Create learning schema namespace
export const learningSchema = pgSchema("learning")

// Categories table - Tree structure for organizing problems
export const categories = learningSchema.table(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): any => categories.id, {
      onDelete: "set null",
    }),
    level: integer("level").notNull().default(0),
    path: text("path").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    parentIdIdx: index("categories_parent_id_idx").on(table.parentId),
    levelIdx: index("categories_level_idx").on(table.level),
    pathIdx: index("categories_path_idx").on(table.path),
  }),
)

// Problems table - LLM-generated problems shared across users
export const problems = learningSchema.table(
  "problems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    solution: text("solution").notNull(),
    explanation: text("explanation"),
    difficulty: difficultyEnum("difficulty").notNull(),
    tags: text("tags").array().notNull().default([]),
    llmModel: varchar("llm_model", { length: 100 }).notNull(),
    llmPrompt: text("llm_prompt"),
    metadata: jsonb("metadata"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    categoryIdIdx: index("problems_category_id_idx").on(table.categoryId),
    difficultyIdx: index("problems_difficulty_idx").on(table.difficulty),
    tagsIdx: index("problems_tags_idx").using("gin", table.tags),
    isActiveIdx: index("problems_is_active_idx").on(table.isActive),
  }),
)

// Submissions table - Multiple attempts per user per problem
export const submissions = learningSchema.table(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(), // Reference to auth.users, but not FK since different schema
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    answer: text("answer").notNull(),
    isCorrect: boolean("is_correct"),
    timeSpent: integer("time_spent").notNull(), // seconds
    metadata: jsonb("metadata"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("submissions_user_id_idx").on(table.userId),
    problemIdIdx: index("submissions_problem_id_idx").on(table.problemId),
    submittedAtIdx: index("submissions_submitted_at_idx").on(table.submittedAt),
    userProblemIdx: index("submissions_user_problem_idx").on(
      table.userId,
      table.problemId,
    ),
    uniqueAttempt: unique("submissions_user_problem_attempt_unique").on(
      table.userId,
      table.problemId,
      table.attemptNumber,
    ),
  }),
)

// AI Evaluations table - LLM evaluation of submissions (one-to-one with submissions)
export const aiEvaluations = learningSchema.table(
  "ai_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .unique()
      .references(() => submissions.id, { onDelete: "cascade" }),
    accuracy: decimal("accuracy", { precision: 5, scale: 2 }).notNull(), // 0-100
    feedback: text("feedback").notNull(),
    suggestions: text("suggestions").array().notNull().default([]),
    strengths: text("strengths").array().notNull().default([]),
    weaknesses: text("weaknesses").array().notNull().default([]),
    llmModel: varchar("llm_model", { length: 100 }).notNull(),
    llmResponse: jsonb("llm_response"),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    submissionIdIdx: index("ai_evaluations_submission_id_idx").on(
      table.submissionId,
    ),
    accuracyIdx: index("ai_evaluations_accuracy_idx").on(table.accuracy),
  }),
)

// Spaced Repetition Schedules table - SM-2 algorithm data per user-problem
export const spacedRepetitionSchedules = learningSchema.table(
  "spaced_repetition_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(), // Reference to auth.users
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    easeFactor: decimal("ease_factor", { precision: 3, scale: 2 })
      .notNull()
      .default("2.50"), // SM-2 E-Factor, range 1.3-2.5
    interval: integer("interval").notNull().default(1), // days until next review
    repetitions: integer("repetitions").notNull().default(0), // consecutive correct responses
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
    totalAttempts: integer("total_attempts").notNull().default(0),
    correctAttempts: integer("correct_attempts").notNull().default(0),
    averageAccuracy: decimal("average_accuracy", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("schedules_user_id_idx").on(table.userId),
    nextReviewIdx: index("schedules_next_review_idx").on(table.nextReviewAt),
    userNextReviewIdx: index("schedules_user_next_review_idx").on(
      table.userId,
      table.nextReviewAt,
    ),
    uniqueUserProblem: unique("schedules_user_problem_unique").on(
      table.userId,
      table.problemId,
    ),
  }),
)

// TypeScript types for each table
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

export type Problem = typeof problems.$inferSelect
export type NewProblem = typeof problems.$inferInsert

export type Submission = typeof submissions.$inferSelect
export type NewSubmission = typeof submissions.$inferInsert

export type AiEvaluation = typeof aiEvaluations.$inferSelect
export type NewAiEvaluation = typeof aiEvaluations.$inferInsert

export type SpacedRepetitionSchedule =
  typeof spacedRepetitionSchedules.$inferSelect
export type NewSpacedRepetitionSchedule =
  typeof spacedRepetitionSchedules.$inferInsert
