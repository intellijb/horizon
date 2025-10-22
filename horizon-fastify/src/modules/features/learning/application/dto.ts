import { z } from "zod"

// Category DTOs
export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type CreateCategoryDto = z.infer<typeof createCategorySchema>
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>

// Problem DTOs
export const createProblemSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: z.string(),
  solution: z.string(),
  explanation: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  tags: z.array(z.string()).optional().default([]),
  llmModel: z.string().max(100).optional(),
  llmPrompt: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateProblemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  solution: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  tags: z.array(z.string()).optional(),
  llmModel: z.string().max(100).optional(),
  llmPrompt: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
})

export type CreateProblemDto = z.infer<typeof createProblemSchema>
export type UpdateProblemDto = z.infer<typeof updateProblemSchema>

// Submission DTOs
export const createSubmissionSchema = z.object({
  userId: z.string().uuid(),
  problemId: z.string().uuid(),
  answer: z.string(),
  timeSpent: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type CreateSubmissionDto = z.infer<typeof createSubmissionSchema>

// Update submission DTO (for evaluation results)
export const updateSubmissionSchema = z.object({
  isCorrect: z.boolean().optional(),
  aiEvaluationId: z.string().uuid().optional(),
})

export type UpdateSubmissionDto = z.infer<typeof updateSubmissionSchema>

// Evaluation DTOs
export const createEvaluationSchema = z.object({
  submissionId: z.string().uuid(),
  accuracy: z.number().min(0).max(100),
  feedback: z.string(),
  suggestions: z.array(z.string()).optional().default([]),
  strengths: z.array(z.string()).optional().default([]),
  weaknesses: z.array(z.string()).optional().default([]),
  llmModel: z.string().max(100),
  llmResponse: z.record(z.string(), z.any()).optional(),
})

export type CreateEvaluationDto = z.infer<typeof createEvaluationSchema>

// Schedule DTOs
export const createScheduleSchema = z.object({
  userId: z.string().uuid(),
  problemId: z.string().uuid(),
  easeFactor: z.number().min(1.3).max(2.5).optional().default(2.5),
  interval: z.number().int().min(1).optional().default(1),
  repetitions: z.number().int().min(0).optional().default(0),
})

export const updateScheduleSchema = z.object({
  easeFactor: z.number().min(1.3).max(2.5).optional(),
  interval: z.number().int().min(1).optional(),
  repetitions: z.number().int().min(0).optional(),
  lastReviewedAt: z.string().datetime().optional(),
  nextReviewAt: z.string().datetime().optional(),
  totalAttempts: z.number().int().min(0).optional(),
  correctAttempts: z.number().int().min(0).optional(),
  averageAccuracy: z.number().min(0).max(100).optional(),
})

export type CreateScheduleDto = z.infer<typeof createScheduleSchema>
export type UpdateScheduleDto = z.infer<typeof updateScheduleSchema>

// Query DTOs
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const categoryQuerySchema = paginationSchema.extend({
  parentId: z.string().uuid().optional(),
})

export const problemQuerySchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.coerce.boolean().optional(),
})

export const submissionQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  problemId: z.string().uuid().optional(),
})

export const scheduleQuerySchema = paginationSchema.extend({
  userId: z.string().uuid(),
  dueOnly: z.coerce.boolean().optional(),
})