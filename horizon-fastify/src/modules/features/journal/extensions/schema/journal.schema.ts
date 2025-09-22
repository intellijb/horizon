import { pgTable, text, integer, pgEnum, timestamp } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"

export const journalCardStatusEnum = pgEnum("journal_card_status", ["active", "archived", "deleted"])

export const journalCard = pgTable("journal_card", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  category: text("category").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const journalCardInput = pgTable("journal_card_input", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  date: text("date")
    .notNull()
    .$defaultFn(() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const day = String(now.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }),
  status: journalCardStatusEnum("status").notNull().default("active"),
  cardId: text("card_id")
    .notNull()
    .references(() => journalCard.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type JournalCardSelect = typeof journalCard.$inferSelect
export type JournalCardInsert = typeof journalCard.$inferInsert
export type JournalCardInputSelect = typeof journalCardInput.$inferSelect
export type JournalCardInputInsert = typeof journalCardInput.$inferInsert