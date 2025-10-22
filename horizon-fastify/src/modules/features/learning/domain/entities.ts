/**
 * Domain entities for the learning module
 * Supports spaced-repetition learning platform with:
 * - Categories (tree structure)
 * - Problems (LLM-generated content)
 * - User submissions (multiple attempts per problem)
 * - Spaced repetition schedules (SM-2 algorithm)
 * - AI evaluations
 */

// Category Entity
export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  level?: number
  path?: string
  order: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// Problem Entity
export interface Problem {
  id: string
  categoryId: string
  title: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced" | "expert"
  content: string // LLM-generated content
  hints?: string[]
  solution?: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

// User Submission Entity
export interface Submission {
  id: string
  userId: string
  problemId: string
  attemptNumber: number
  answer: string
  isCorrect: boolean
  timeSpent?: number
  aiEvaluationId?: string
  metadata?: Record<string, any>
  submittedAt: Date
}

// AI Evaluation Entity
export interface Evaluation {
  id: string
  submissionId: string
  score: number // 0-100
  feedback: string
  strengths?: string[]
  improvements?: string[]
  evaluatedAt: Date
}

// Spaced Repetition Schedule Entity (SM-2 Algorithm)
export interface Schedule {
  id: string
  userId: string
  problemId: string
  easeFactor: number // SM-2 ease factor (default 2.5)
  interval: number // Days until next review
  repetitions: number // Number of successful repetitions
  lastReviewedAt?: Date
  nextReviewDate: Date
  nextReviewAt?: Date // Alternative naming
  totalAttempts?: number
  correctAttempts?: number
  averageAccuracy?: number
  createdAt: Date
  updatedAt: Date
}


