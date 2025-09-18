import { z } from "zod"

// Request schemas
export const createInterviewBodySchema = z.object({
  topicIds: z.array(z.string().uuid()).optional(), // Made optional to support custom topics from title
  title: z.string().min(1).max(200),
  language: z.enum(["ko", "en", "ja"]).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
})

export const answerInterviewBodySchema = z.object({
  message: z.string().min(1).max(5000),
  temperature: z.number().min(0).max(1).optional(),
})

export const interviewIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
})

export const completeInterviewBodySchema = z.object({
  finalScore: z.number().min(0).max(100).optional(),
})

export const emptyBodySchema = z.object({}).strict()

export const listInterviewsQuerySchema = z.object({
  status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
  interviewerId: z.string().uuid().optional(),
  language: z.enum(["ko", "en", "ja"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export const listCategoriesQuerySchema = z.object({
  type: z.enum(["tech", "leadership", "behavioral"]).optional(),
})

export const listTopicsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  tags: z.string().optional(), // comma-separated tags
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

export const listInterviewersQuerySchema = z.object({
  company: z.string().optional(),
  role: z.string().optional(),
  seniority: z.enum(["junior", "mid", "senior", "staff", "principal"]).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  language: z.enum(["ko", "en", "ja"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// Response schemas
export const interviewSessionSchema = z.object({
  id: z.string(),
  topicIds: z.array(z.string()),
  topicLabels: z.array(z.string()).optional(),
  title: z.string(),
  progress: z.number(),
  score: z.number(),
  targetScore: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastInteractionAt: z.string().optional(),
  interviewerId: z.string(),
  conversationId: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]),
  retryPolicy: z.object({
    minCooldownHours: z.number().optional(),
    autoSuggestIfBelow: z.number().optional(),
  }).optional(),
  labels: z.array(z.string()).optional(),
  notes: z.string().optional(),
  language: z.enum(["ko", "en", "ja"]).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  recentMessages: z.array(z.object({
    id: z.string(),
    conversationId: z.string(),
    status: z.string(),
    model: z.string().optional(),
    input: z.any().nullable().optional(), // User's input message
    output: z.any(),
    temperature: z.number().optional(),
    usage: z.any(),
    metadata: z.any(),
    emotion: z.string().optional(), // Emotion extracted from the response
    cleanMessage: z.string().nullable().optional(), // Message without emotion tags
    createdAt: z.string(),
  })).optional(),
})

export const interviewerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  company: z.string().optional(),
  role: z.string().optional(),
  seniority: z.enum(["junior", "mid", "senior", "staff", "principal"]).optional(),
  typeCoverage: z.array(z.enum(["tech", "leadership", "behavioral"])),
  topicIds: z.array(z.string()),
  style: z.enum(["friendly", "socratic", "bar-raiser", "structured", "conversational"]).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  knowledgeScope: z.object({
    usesCompanyTrends: z.boolean().optional(),
    refreshPolicy: z.enum(["manual", "auto"]).optional(),
    knowledgeCutoff: z.string().optional(),
  }).optional(),
  promptTemplateId: z.string().optional(),
  language: z.enum(["ko", "en", "ja"]).optional(),
  timezone: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.string().optional(),
})

export const categorySchema = z.object({
  id: z.string(),
  type: z.enum(["tech", "leadership", "behavioral"]),
  name: z.string(),
  description: z.string().optional(),
  topics: z.array(z.lazy(() => topicSchema)).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const topicSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  categoryName: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createInterviewResponseSchema = z.object({
  session: interviewSessionSchema,
  interviewer: interviewerSchema,
  initialMessage: z.string(),
})

export const answerInterviewResponseSchema = z.object({
  message: z.string(),
  session: interviewSessionSchema,
  emotion: z.string(), // Single word describing interviewer's emotional state
})

export const interviewHistoryResponseSchema = z.object({
  session: interviewSessionSchema,
  messages: z.array(z.object({
    id: z.string(),
    conversationId: z.string(),
    status: z.string(),
    model: z.string().optional(),
    output: z.any(),
    temperature: z.number().optional(),
    usage: z.any(),
    metadata: z.any(),
    createdAt: z.string(),
  })),
})

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
})

// Type exports
export type CreateInterviewBody = z.infer<typeof createInterviewBodySchema>
export type AnswerInterviewBody = z.infer<typeof answerInterviewBodySchema>
export type CompleteInterviewBody = z.infer<typeof completeInterviewBodySchema>
export type EmptyBody = z.infer<typeof emptyBodySchema>
export type InterviewIdParams = z.infer<typeof interviewIdParamsSchema>
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>
export type ListInterviewsQuery = z.infer<typeof listInterviewsQuerySchema>
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>
export type ListTopicsQuery = z.infer<typeof listTopicsQuerySchema>
export type ListInterviewersQuery = z.infer<typeof listInterviewersQuerySchema>