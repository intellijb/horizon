import { eq, and } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "@/modules/platform/database/schema"
import type { IntelligenceRepository } from "../domain/ports"
import type {
  IntelligenceTopic,
  IntelligenceTopicSchema,
  IntelligenceTopicInput,
  IntelligenceTopicConversation,
  IntelligenceTopicNote,
  TopicWithRelations,
} from "../domain/entities"

export class DrizzleIntelligenceRepository implements IntelligenceRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  // Topics
  async createTopic(id: string): Promise<IntelligenceTopic> {
    const [topic] = await this.db
      .insert(schema.intelligenceTopics)
      .values({ id })
      .returning()

    return topic
  }

  async getTopic(id: string): Promise<TopicWithRelations | null> {
    const [topic] = await this.db
      .select()
      .from(schema.intelligenceTopics)
      .where(eq(schema.intelligenceTopics.id, id))
      .limit(1)

    if (!topic) {
      return null
    }

    // Fetch relations separately
    const [topicSchema, inputs, conversations, notes] = await Promise.all([
      this.getTopicSchema(id),
      this.getTopicInputs(id),
      this.getTopicConversations(id),
      this.getTopicNotes(id),
    ])

    return {
      ...topic,
      schema: topicSchema,
      inputs,
      conversations,
      notes,
    }
  }

  async getAllTopics(): Promise<IntelligenceTopic[]> {
    return this.db
      .select()
      .from(schema.intelligenceTopics)
      .orderBy(schema.intelligenceTopics.createdAt)
  }

  async deleteTopic(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.intelligenceTopics)
      .where(eq(schema.intelligenceTopics.id, id))
      .returning()

    return result.length > 0
  }

  // Schema
  async createSchema(
    topicId: string,
    schemaData: Omit<IntelligenceTopicSchema, "id" | "topicId" | "createdAt" | "updatedAt">
  ): Promise<IntelligenceTopicSchema> {
    const [created] = await this.db
      .insert(schema.intelligenceTopicSchema)
      .values({
        topicId,
        columnName: schemaData.columnName,
        columnType: schemaData.columnType,
        columnDescription: schemaData.columnDescription,
      })
      .returning()

    return created
  }

  async getTopicSchema(topicId: string): Promise<IntelligenceTopicSchema[]> {
    return this.db
      .select()
      .from(schema.intelligenceTopicSchema)
      .where(eq(schema.intelligenceTopicSchema.topicId, topicId))
      .orderBy(schema.intelligenceTopicSchema.createdAt)
  }

  async updateSchema(
    id: string,
    updates: Partial<Omit<IntelligenceTopicSchema, "id" | "topicId" | "createdAt" | "updatedAt">>
  ): Promise<IntelligenceTopicSchema | null> {
    const [updated] = await this.db
      .update(schema.intelligenceTopicSchema)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.intelligenceTopicSchema.id, id))
      .returning()

    return updated || null
  }

  async deleteSchema(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.intelligenceTopicSchema)
      .where(eq(schema.intelligenceTopicSchema.id, id))
      .returning()

    return result.length > 0
  }

  // Inputs
  async createInput(
    topicId: string,
    data: Record<string, any>,
    status: "active" | "archived" | "deleted" = "active"
  ): Promise<IntelligenceTopicInput> {
    const [input] = await this.db
      .insert(schema.intelligenceTopicInputs)
      .values({
        topicId,
        data,
        status,
      })
      .returning()

    return input as IntelligenceTopicInput
  }

  async getTopicInputs(
    topicId: string,
    status?: "active" | "archived" | "deleted"
  ): Promise<IntelligenceTopicInput[]> {
    const conditions = [eq(schema.intelligenceTopicInputs.topicId, topicId)]

    if (status) {
      conditions.push(eq(schema.intelligenceTopicInputs.status, status))
    }

    const results = await this.db
      .select()
      .from(schema.intelligenceTopicInputs)
      .where(and(...conditions))
      .orderBy(schema.intelligenceTopicInputs.createdAt)

    return results as IntelligenceTopicInput[]
  }

  async updateInputStatus(
    id: string,
    status: "active" | "archived" | "deleted"
  ): Promise<IntelligenceTopicInput | null> {
    const [updated] = await this.db
      .update(schema.intelligenceTopicInputs)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.intelligenceTopicInputs.id, id))
      .returning()

    return updated ? (updated as IntelligenceTopicInput) : null
  }

  async deleteInput(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.intelligenceTopicInputs)
      .where(eq(schema.intelligenceTopicInputs.id, id))
      .returning()

    return result.length > 0
  }

  // Conversations
  async createConversation(
    topicId: string,
    conversationId: string,
    provider: "openai" = "openai"
  ): Promise<IntelligenceTopicConversation> {
    const [conversation] = await this.db
      .insert(schema.intelligenceTopicConversations)
      .values({
        topicId,
        conversationId,
        conversationProvider: provider,
      })
      .returning()

    return conversation
  }

  async getTopicConversations(topicId: string): Promise<IntelligenceTopicConversation[]> {
    return this.db
      .select()
      .from(schema.intelligenceTopicConversations)
      .where(eq(schema.intelligenceTopicConversations.topicId, topicId))
      .orderBy(schema.intelligenceTopicConversations.createdAt)
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.intelligenceTopicConversations)
      .where(eq(schema.intelligenceTopicConversations.id, id))
      .returning()

    return result.length > 0
  }

  // Notes
  async createNote(topicId: string, note: string): Promise<IntelligenceTopicNote> {
    const [created] = await this.db
      .insert(schema.intelligenceTopicNotes)
      .values({
        topicId,
        note,
      })
      .returning()

    return created
  }

  async getTopicNotes(topicId: string): Promise<IntelligenceTopicNote[]> {
    return this.db
      .select()
      .from(schema.intelligenceTopicNotes)
      .where(eq(schema.intelligenceTopicNotes.topicId, topicId))
      .orderBy(schema.intelligenceTopicNotes.createdAt)
  }

  async updateNote(id: string, note: string): Promise<IntelligenceTopicNote | null> {
    const [updated] = await this.db
      .update(schema.intelligenceTopicNotes)
      .set({
        note,
        updatedAt: new Date(),
      })
      .where(eq(schema.intelligenceTopicNotes.id, id))
      .returning()

    return updated || null
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.intelligenceTopicNotes)
      .where(eq(schema.intelligenceTopicNotes.id, id))
      .returning()

    return result.length > 0
  }
}