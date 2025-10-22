import { relations } from "drizzle-orm"
import {
  categories,
  problems,
  submissions,
  aiEvaluations,
  spacedRepetitionSchedules,
} from "./learning.schema"

// Categories relations - tree structure
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryTree",
  }),
  children: many(categories, {
    relationName: "categoryTree",
  }),
  problems: many(problems),
}))

// Problems relations
export const problemsRelations = relations(problems, ({ one, many }) => ({
  category: one(categories, {
    fields: [problems.categoryId],
    references: [categories.id],
  }),
  submissions: many(submissions),
  schedules: many(spacedRepetitionSchedules),
}))

// Submissions relations
export const submissionsRelations = relations(submissions, ({ one }) => ({
  problem: one(problems, {
    fields: [submissions.problemId],
    references: [problems.id],
  }),
  evaluation: one(aiEvaluations, {
    fields: [submissions.id],
    references: [aiEvaluations.submissionId],
  }),
}))

// AI Evaluations relations
export const aiEvaluationsRelations = relations(aiEvaluations, ({ one }) => ({
  submission: one(submissions, {
    fields: [aiEvaluations.submissionId],
    references: [submissions.id],
  }),
}))

// Spaced Repetition Schedules relations
export const spacedRepetitionSchedulesRelations = relations(
  spacedRepetitionSchedules,
  ({ one }) => ({
    problem: one(problems, {
      fields: [spacedRepetitionSchedules.problemId],
      references: [problems.id],
    }),
  }),
)
