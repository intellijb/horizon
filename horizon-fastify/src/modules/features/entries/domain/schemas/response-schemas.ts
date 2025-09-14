import { z } from "zod"

// Response schemas
export const entryResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  type: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
})

export const attachmentResponseSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  data: z.string(),
  mimeType: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
})

export const paginatedEntriesResponseSchema = z.object({
  items: z.array(entryResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export const paginatedAttachmentsResponseSchema = z.object({
  items: z.array(attachmentResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export const singleEntryResponseSchema = entryResponseSchema

export const singleAttachmentResponseSchema = attachmentResponseSchema

// Response schema collections
export const entriesResponseSchemas = {
  entry: singleEntryResponseSchema,
  entryList: paginatedEntriesResponseSchema,
  attachment: singleAttachmentResponseSchema,
  attachmentList: paginatedAttachmentsResponseSchema,
} as const

export const entriesErrorResponseSchema = z.object({
  error: z.string(),
})