import { z } from "zod"

// Journal Card Schemas
export const createJournalCardSchema = z.object({
  category: z.string(),
  type: z.string(),
  name: z.string(),
  order: z.number().optional(),
})

export const updateJournalCardSchema = z.object({
  category: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  order: z.number().optional(),
})

export const journalCardParamsSchema = z.object({
  id: z.string(),
})

// Journal Card Input Schemas
export const createJournalCardInputSchema = z.object({
  cardId: z.string(),
  order: z.number().optional(),
  value: z.string(),
  status: z.enum(["active", "archived", "deleted"]).optional(),
})

export const updateJournalCardInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  status: z.enum(["active", "archived", "deleted"]).optional(),
  order: z.number().optional(),
  value: z.string().optional(),
})

export const journalCardInputParamsSchema = z.object({
  id: z.string(),
})

export const journalDateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
})

export const journalCardIdQuerySchema = z.object({
  cardId: z.string(),
})

// Type exports
export type CreateJournalCardBody = z.infer<typeof createJournalCardSchema>
export type UpdateJournalCardBody = z.infer<typeof updateJournalCardSchema>
export type JournalCardParams = z.infer<typeof journalCardParamsSchema>
export type CreateJournalCardInputBody = z.infer<typeof createJournalCardInputSchema>
export type UpdateJournalCardInputBody = z.infer<typeof updateJournalCardInputSchema>
export type JournalCardInputParams = z.infer<typeof journalCardInputParamsSchema>
export type JournalDateQuery = z.infer<typeof journalDateQuerySchema>
export type JournalCardIdQuery = z.infer<typeof journalCardIdQuerySchema>