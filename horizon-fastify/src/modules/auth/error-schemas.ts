import { z } from "zod"

// Define error response schema for consistency
export const ErrorResponseSchema = z.object({
  error: z.string(),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>