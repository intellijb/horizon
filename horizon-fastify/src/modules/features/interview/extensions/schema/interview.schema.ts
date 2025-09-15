import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  pgEnum,
  pgSchema,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Create interview schema
export const interviewSchema = pgSchema("interview")

// Enums
export const sessionStatusEnum = pgEnum("session_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
])

export const languageEnum = pgEnum("language", ["ko", "en", "ja"])

export const seniorityEnum = pgEnum("seniority", [
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
])

export const interviewStyleEnum = pgEnum("interview_style", [
  "friendly",
  "socratic",
  "bar-raiser",
  "structured",
  "conversational",
])

export const categoryTypeEnum = pgEnum("category_type", [
  "tech",
  "leadership",
  "behavioral",
])

// Sessions table
export const sessions = interviewSchema.table(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(), // Added for protected access
    topicIds: jsonb("topic_ids").$type<string[]>().default([]),
    title: text("title").notNull(),

    // Progress and scoring
    progress: integer("progress").default(0).notNull(),
    score: integer("score").default(0).notNull(),
    targetScore: integer("target_score").default(100),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),

    // References
    interviewerId: uuid("interviewer_id")
      .notNull()
      .references(() => interviewers.id),
    conversationId: text("conversation_id"),

    // Status
    status: sessionStatusEnum("status").default("draft").notNull(),

    // Retry policy
    retryPolicy: jsonb("retry_policy").$type<{
      minCooldownHours?: number
      autoSuggestIfBelow?: number
    }>(),

    // Metadata
    labels: jsonb("labels").$type<string[]>(),
    notes: text("notes"),
    language: languageEnum("language").default("ko"),
    difficulty: integer("difficulty"),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    interviewerIdIdx: index("sessions_interviewer_id_idx").on(table.interviewerId),
    statusIdx: index("sessions_status_idx").on(table.status),
    createdAtIdx: index("sessions_created_at_idx").on(table.createdAt),
    updatedAtIdx: index("sessions_updated_at_idx").on(table.updatedAt),
  }),
)

// Interviewers table
export const interviewers = interviewSchema.table(
  "interviewers",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Identification
    displayName: text("display_name").notNull(),
    company: text("company"),
    role: text("role"),
    seniority: seniorityEnum("seniority"),

    // Coverage
    typeCoverage: jsonb("type_coverage").$type<("tech" | "leadership" | "behavioral")[]>().notNull(),
    topicIds: jsonb("topic_ids").$type<string[]>().default([]),

    // Style and difficulty
    style: interviewStyleEnum("style"),
    difficulty: integer("difficulty"),

    // Knowledge scope
    knowledgeScope: jsonb("knowledge_scope").$type<{
      usesCompanyTrends?: boolean
      refreshPolicy?: "manual" | "auto"
      knowledgeCutoff?: string
    }>(),

    // Prompt and options
    promptTemplateId: text("prompt_template_id"),
    language: languageEnum("language").default("ko"),
    timezone: text("timezone"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    version: text("version").default("1.0.0"),
  },
  (table) => ({
    companyIdx: index("interviewers_company_idx").on(table.company),
    roleIdx: index("interviewers_role_idx").on(table.role),
    createdAtIdx: index("interviewers_created_at_idx").on(table.createdAt),
  }),
)

// Categories table
export const categories = interviewSchema.table(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Type
    type: categoryTypeEnum("type").notNull(),

    // Display
    name: text("name").notNull(),
    description: text("description"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    typeIdx: index("categories_type_idx").on(table.type),
    nameIdx: index("categories_name_idx").on(table.name),
  }),
)

// Topics table
export const topics = interviewSchema.table(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Parent reference
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),

    // Display
    name: text("name").notNull(),
    description: text("description"),

    // Difficulty and tags
    difficulty: integer("difficulty"),
    tags: jsonb("tags").$type<string[]>(),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    categoryIdIdx: index("topics_category_id_idx").on(table.categoryId),
    nameIdx: index("topics_name_idx").on(table.name),
    difficultyIdx: index("topics_difficulty_idx").on(table.difficulty),
  }),
)

// Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  interviewer: one(interviewers, {
    fields: [sessions.interviewerId],
    references: [interviewers.id],
  }),
}))

export const interviewersRelations = relations(interviewers, ({ many }) => ({
  sessions: many(sessions),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  topics: many(topics),
}))

export const topicsRelations = relations(topics, ({ one }) => ({
  category: one(categories, {
    fields: [topics.categoryId],
    references: [categories.id],
  }),
}))