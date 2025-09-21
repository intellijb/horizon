import { z } from "zod"

// Request Types
export const CreateTopicRequest = z.object({
  id: z.string().min(1),
})

export const DefineSchemaRequest = z.object({
  columnName: z.string().min(1),
  columnType: z.string().min(1),
  columnDescription: z.string().optional(),
})

export const AddInputRequest = z.object({
  data: z.record(z.string(), z.any()),
  status: z.enum(["active", "archived", "deleted"]).optional(),
})

export const UpdateInputStatusRequest = z.object({
  status: z.enum(["active", "archived", "deleted"]),
})

export const LinkConversationRequest = z.object({
  conversationId: z.string().min(1),
  provider: z.enum(["openai"]).optional(),
})

export const AddNoteRequest = z.object({
  note: z.string().min(1),
})

export const UpdateNoteRequest = z.object({
  note: z.string().min(1),
})

// Type Exports
export type CreateTopicRequest = z.infer<typeof CreateTopicRequest>
export type DefineSchemaRequest = z.infer<typeof DefineSchemaRequest>
export type AddInputRequest = z.infer<typeof AddInputRequest>
export type UpdateInputStatusRequest = z.infer<typeof UpdateInputStatusRequest>
export type LinkConversationRequest = z.infer<typeof LinkConversationRequest>
export type AddNoteRequest = z.infer<typeof AddNoteRequest>
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequest>