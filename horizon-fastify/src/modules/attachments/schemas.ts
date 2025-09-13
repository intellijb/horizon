import { z } from "zod"

// Request schemas
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

// Response schemas
export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
  data: z.string(),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  createdAt: z.string().datetime(),
})

export const AttachmentListSchema = z.object({
  items: z.array(AttachmentSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

// Type exports
export type CreateAttachmentBody = z.infer<typeof CreateAttachmentBodySchema>
export type AttachmentParams = z.infer<typeof AttachmentParamsSchema>
export type ListAttachmentsQuery = z.infer<typeof ListAttachmentsQuerySchema>
export type Attachment = z.infer<typeof AttachmentSchema>
export type AttachmentList = z.infer<typeof AttachmentListSchema>