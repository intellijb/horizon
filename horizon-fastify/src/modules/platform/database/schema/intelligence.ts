import { pgSchema, pgTable, varchar, text, jsonb, timestamp, pgEnum, unique, index } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// Create the intelligence schema
export const intelligenceSchema = pgSchema("intelligence")

// Enum for status
export const statusEnum = pgEnum("status", ["active", "archived", "deleted"])

// Enum for conversation providers
export const conversationProviderEnum = pgEnum("conversation_provider", ["openai"])

// TABLE: intelligence_topics
export const intelligenceTopics = intelligenceSchema.table("intelligence_topics", {
  id: varchar("id", { length: 255 }).primaryKey().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  idIdx: index("topics_id_idx").on(table.id),
}))

// TABLE: intelligence_topic_schema
export const intelligenceTopicSchema = intelligenceSchema.table("intelligence_topic_schema", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id", { length: 255 }).notNull().references(() => intelligenceTopics.id, { onDelete: "cascade" }),
  columnName: varchar("column_name", { length: 255 }).notNull(),
  columnType: varchar("column_type", { length: 100 }).notNull(),
  columnDescription: text("column_description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  topicColumnUnique: unique().on(table.topicId, table.columnName),
  topicIdIdx: index("schema_topic_id_idx").on(table.topicId),
}))

// TABLE: intelligence_topic_inputs
export const intelligenceTopicInputs = intelligenceSchema.table("intelligence_topic_inputs", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id", { length: 255 }).notNull().references(() => intelligenceTopics.id, { onDelete: "cascade" }),
  status: statusEnum("status").notNull().default("active"),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  topicIdIdx: index("inputs_topic_id_idx").on(table.topicId),
  statusIdx: index("inputs_status_idx").on(table.status),
}))

// TABLE: intelligence_topic_conversations
export const intelligenceTopicConversations = intelligenceSchema.table("intelligence_topic_conversations", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id", { length: 255 }).notNull().references(() => intelligenceTopics.id, { onDelete: "cascade" }),
  conversationProvider: conversationProviderEnum("conversation_provider").notNull().default("openai"),
  conversationId: varchar("conversation_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  topicIdIdx: index("conversations_topic_id_idx").on(table.topicId),
  conversationIdIdx: index("conversations_conversation_id_idx").on(table.conversationId),
}))

// TABLE: intelligence_topic_notes
export const intelligenceTopicNotes = intelligenceSchema.table("intelligence_topic_notes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id", { length: 255 }).notNull().references(() => intelligenceTopics.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  topicIdIdx: index("notes_topic_id_idx").on(table.topicId),
}))

// Relations
export const intelligenceTopicsRelations = relations(intelligenceTopics, ({ many }) => ({
  schema: many(intelligenceTopicSchema),
  inputs: many(intelligenceTopicInputs),
  conversations: many(intelligenceTopicConversations),
  notes: many(intelligenceTopicNotes),
}))

export const intelligenceTopicSchemaRelations = relations(intelligenceTopicSchema, ({ one }) => ({
  topic: one(intelligenceTopics, {
    fields: [intelligenceTopicSchema.topicId],
    references: [intelligenceTopics.id],
  }),
}))

export const intelligenceTopicInputsRelations = relations(intelligenceTopicInputs, ({ one }) => ({
  topic: one(intelligenceTopics, {
    fields: [intelligenceTopicInputs.topicId],
    references: [intelligenceTopics.id],
  }),
}))

export const intelligenceTopicConversationsRelations = relations(intelligenceTopicConversations, ({ one }) => ({
  topic: one(intelligenceTopics, {
    fields: [intelligenceTopicConversations.topicId],
    references: [intelligenceTopics.id],
  }),
}))

export const intelligenceTopicNotesRelations = relations(intelligenceTopicNotes, ({ one }) => ({
  topic: one(intelligenceTopics, {
    fields: [intelligenceTopicNotes.topicId],
    references: [intelligenceTopics.id],
  }),
}))

// Type exports
export type IntelligenceTopic = typeof intelligenceTopics.$inferSelect
export type NewIntelligenceTopic = typeof intelligenceTopics.$inferInsert

export type IntelligenceTopicSchema = typeof intelligenceTopicSchema.$inferSelect
export type NewIntelligenceTopicSchema = typeof intelligenceTopicSchema.$inferInsert

export type IntelligenceTopicInput = typeof intelligenceTopicInputs.$inferSelect
export type NewIntelligenceTopicInput = typeof intelligenceTopicInputs.$inferInsert

export type IntelligenceTopicConversation = typeof intelligenceTopicConversations.$inferSelect
export type NewIntelligenceTopicConversation = typeof intelligenceTopicConversations.$inferInsert

export type IntelligenceTopicNote = typeof intelligenceTopicNotes.$inferSelect
export type NewIntelligenceTopicNote = typeof intelligenceTopicNotes.$inferInsert