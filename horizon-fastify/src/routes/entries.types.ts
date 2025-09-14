import { z } from "zod"

// Request schemas
export const CreateEntryBodySchema = z.object({
  content: z.string().min(1),
  type: z.string().default("text").optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const UpdateEntryBodySchema = z.object({
  content: z.string().min(1).optional(),
  type: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const EntryParamsSchema = z.object({
  id: z.string().uuid(),
})

export const ListEntriesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  type: z.string().optional(),
})

// Attachment schemas
export const CreateAttachmentBodySchema = z.object({
  entryId: z.string().uuid(),
  data: z.string().min(1),
  mimeType: z.string().optional(),
})

export const AttachmentParamsSchema = z.object({
  id: z.string().uuid(),
})

export const ListAttachmentsQuerySchema = z.object({
  entryId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

// Type exports
export type CreateEntryBody = z.infer<typeof CreateEntryBodySchema>
export type UpdateEntryBody = z.infer<typeof UpdateEntryBodySchema>
export type EntryParams = z.infer<typeof EntryParamsSchema>
export type ListEntriesQuery = z.infer<typeof ListEntriesQuerySchema>

export type CreateAttachmentBody = z.infer<typeof CreateAttachmentBodySchema>
export type AttachmentParams = z.infer<typeof AttachmentParamsSchema>
export type ListAttachmentsQuery = z.infer<typeof ListAttachmentsQuerySchema>