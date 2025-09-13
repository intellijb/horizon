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

// Response schemas
export const EntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  type: z.string(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export const EntryListSchema = z.object({
  items: z.array(EntrySchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

// Type exports
export type CreateEntryBody = z.infer<typeof CreateEntryBodySchema>
export type UpdateEntryBody = z.infer<typeof UpdateEntryBodySchema>
export type EntryParams = z.infer<typeof EntryParamsSchema>
export type ListEntriesQuery = z.infer<typeof ListEntriesQuerySchema>
export type Entry = z.infer<typeof EntrySchema>
export type EntryList = z.infer<typeof EntryListSchema>