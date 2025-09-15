import {
  text,
  timestamp,
  jsonb,
  integer,
  pgSchema,
  index,
} from "drizzle-orm/pg-core";

// Create llm schema
export const llmSchema = pgSchema("llm");

// Conversations OpenAI table (simplified)
export const conversationsOpenai = llmSchema.table(
  "conversations_openai",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(),
    metadata: jsonb("metadata"), // JSON of any
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdAtIdx: index("conversations_openai_created_at_idx").on(
      table.createdAt
    ),
    statusIdx: index("conversations_openai_status_idx").on(table.status),
  })
);

// Conversation Messages OpenAI table
export const conversationMessagesOpenai = llmSchema.table(
  "conversation_messages_openai",
  {
    id: text("id").primaryKey(), // resp_67ccd3a9da748190baa7f1570fe91ac604becb25c45c1d41 (formatted)
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversationsOpenai.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // completed, failed, in_progress, cancelled, queued, or incomplete
    model: text("model").notNull(),
    output: jsonb("output").notNull(), // JSON array with message format
    temperature: integer("temperature"),
    usage: jsonb("usage"), // JSON with input_tokens, output_tokens, etc.
    metadata: jsonb("metadata"), // JSON of any
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    conversationIdIdx: index(
      "conversation_messages_openai_conversation_id_idx"
    ).on(table.conversationId),
    createdAtIdx: index("conversation_messages_openai_created_at_idx").on(
      table.createdAt
    ),
    statusIdx: index("conversation_messages_openai_status_idx").on(
      table.status
    ),
    modelIdx: index("conversation_messages_openai_model_idx").on(table.model),
  })
);
