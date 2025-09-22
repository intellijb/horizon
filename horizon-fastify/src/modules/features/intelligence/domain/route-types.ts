import { z } from "zod"

// Chat Session Schemas
export const createChatSessionBodySchema = z.object({
  topicId: z.string(),
  persona: z.object({
    name: z.string(),
    instructions: z.string().optional(),
    role: z.enum(["system", "developer"]).optional(),
  }).optional(),
  initialMessage: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

export const sendMessageBodySchema = z.object({
  message: z.string(),
  temperature: z.number().min(0).max(2).optional(),
})

export const sendMessageParamsSchema = z.object({
  topicId: z.string(),
  conversationId: z.string(),
})

// Topic Schemas
export const createTopicParamsSchema = z.object({
  id: z.string(),
})

export const getTopicParamsSchema = z.object({
  id: z.string(),
})

export const deleteTopicParamsSchema = z.object({
  id: z.string(),
})

// Schema Management Schemas
export const defineSchemaBodySchema = z.object({
  columnName: z.string(),
  columnType: z.string(),
  columnDescription: z.string().optional(),
})

export const defineSchemaParamsSchema = z.object({
  topicId: z.string(),
})

export const getSchemaParamsSchema = z.object({
  topicId: z.string(),
})

// Input Management Schemas
export const addInputBodySchema = z.object({
  data: z.record(z.string(), z.any()),
  status: z.enum(["active", "archived", "deleted"]).optional(),
})

export const addInputParamsSchema = z.object({
  topicId: z.string(),
})

export const getInputsParamsSchema = z.object({
  topicId: z.string(),
})

export const getInputsQuerySchema = z.object({
  status: z.enum(["active", "archived", "deleted"]).optional(),
})

// Note Management Schemas
export const addNoteBodySchema = z.object({
  note: z.string(),
})

export const addNoteParamsSchema = z.object({
  topicId: z.string(),
})

export const getNotesParamsSchema = z.object({
  topicId: z.string(),
})

// Conversation History Schemas
export const getConversationHistoryParamsSchema = z.object({
  topicId: z.string(),
  conversationId: z.string(),
})

export const getConversationsParamsSchema = z.object({
  topicId: z.string(),
})

// Type exports
export type CreateChatSessionBody = z.infer<typeof createChatSessionBodySchema>
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>
export type SendMessageParams = z.infer<typeof sendMessageParamsSchema>
export type CreateTopicParams = z.infer<typeof createTopicParamsSchema>
export type GetTopicParams = z.infer<typeof getTopicParamsSchema>
export type DeleteTopicParams = z.infer<typeof deleteTopicParamsSchema>
export type DefineSchemaBody = z.infer<typeof defineSchemaBodySchema>
export type DefineSchemaParams = z.infer<typeof defineSchemaParamsSchema>
export type GetSchemaParams = z.infer<typeof getSchemaParamsSchema>
export type AddInputBody = z.infer<typeof addInputBodySchema>
export type AddInputParams = z.infer<typeof addInputParamsSchema>
export type GetInputsParams = z.infer<typeof getInputsParamsSchema>
export type GetInputsQuery = z.infer<typeof getInputsQuerySchema>
export type AddNoteBody = z.infer<typeof addNoteBodySchema>
export type AddNoteParams = z.infer<typeof addNoteParamsSchema>
export type GetNotesParams = z.infer<typeof getNotesParamsSchema>
export type GetConversationHistoryParams = z.infer<typeof getConversationHistoryParamsSchema>
export type GetConversationsParams = z.infer<typeof getConversationsParamsSchema>