import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Entries table - stores any type of user input
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    content: text("content").notNull(),
    type: text("type").default("text"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    createdAtIdx: index("entries_created_at_idx").on(table.createdAt),
    typeIdx: index("entries_type_idx").on(table.type),
    deletedAtIdx: index("entries_deleted_at_idx").on(table.deletedAt),
  }),
)

// Attachments table - stores files related to entries
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    data: text("data").notNull(),
    mimeType: text("mime_type"),
    size: integer("size"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entryIdIdx: index("attachments_entry_id_idx").on(table.entryId),
    createdAtIdx: index("attachments_created_at_idx").on(table.createdAt),
  }),
)

// Relations
export const entriesRelations = relations(entries, ({ many }) => ({
  attachments: many(attachments),
}))

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  entry: one(entries, {
    fields: [attachments.entryId],
    references: [entries.id],
  }),
}))