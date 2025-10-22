import { pgEnum } from "drizzle-orm/pg-core"

// Problem difficulty levels
export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
])
