import { z } from "zod"
import { IntelligenceService } from "../business/intelligence.service"
import type { IntelligenceRepository } from "../domain/ports"

// Request/Response Schemas
export const CreateTopicSchema = z.object({
  id: z.string().min(1),
})

export const DefineSchemaSchema = z.object({
  topicId: z.string().min(1),
  columnName: z.string().min(1),
  columnType: z.string().min(1),
  columnDescription: z.string().optional(),
})

export const AddInputSchema = z.object({
  topicId: z.string().min(1),
  data: z.record(z.string(), z.any()),
  status: z.enum(["active", "archived", "deleted"]).optional(),
})

export const UpdateInputSchema = z.object({
  id: z.string().min(1),
  data: z.record(z.string(), z.any()),
})

export const UpdateInputStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "archived", "deleted"]),
})

export const LinkConversationSchema = z.object({
  topicId: z.string().min(1),
  conversationId: z.string().min(1),
  provider: z.enum(["openai"]).optional(),
})

export const AddNoteSchema = z.object({
  topicId: z.string().min(1),
  note: z.string().min(1),
})

export const UpdateNoteSchema = z.object({
  id: z.string().min(1),
  note: z.string().min(1),
})

// Use Cases
export class IntelligenceUseCases {
  private service: IntelligenceService

  constructor(repository: IntelligenceRepository) {
    this.service = new IntelligenceService(repository)
  }

  // Topic Use Cases
  async createTopic(data: z.infer<typeof CreateTopicSchema>) {
    const validated = CreateTopicSchema.parse(data)
    return this.service.createTopic(validated.id)
  }

  async getTopic(id: string) {
    return this.service.getTopic(id)
  }

  async getAllTopics() {
    return this.service.getAllTopics()
  }

  async deleteTopic(id: string) {
    return this.service.deleteTopic(id)
  }

  // Schema Use Cases
  async defineSchema(data: z.infer<typeof DefineSchemaSchema>) {
    const validated = DefineSchemaSchema.parse(data)
    return this.service.defineSchema(
      validated.topicId,
      validated.columnName,
      validated.columnType,
      validated.columnDescription
    )
  }

  async getTopicSchema(topicId: string) {
    return this.service.getTopicSchema(topicId)
  }

  async updateSchema(id: string, updates: { columnType?: string; columnDescription?: string }) {
    return this.service.updateSchema(id, updates)
  }

  // Input Use Cases
  async addInput(data: z.infer<typeof AddInputSchema>) {
    const validated = AddInputSchema.parse(data)
    return this.service.addInput(validated.topicId, validated.data, validated.status)
  }

  async getTopicInputs(topicId: string, status?: "active" | "archived" | "deleted") {
    return this.service.getTopicInputs(topicId, status)
  }

  async updateInput(data: z.infer<typeof UpdateInputSchema>) {
    const validated = UpdateInputSchema.parse(data)
    return this.service.updateInput(validated.id, validated.data)
  }

  async updateInputStatus(data: z.infer<typeof UpdateInputStatusSchema>) {
    const validated = UpdateInputStatusSchema.parse(data)
    return this.service.updateInputStatus(validated.id, validated.status)
  }

  // Conversation Use Cases
  async linkConversation(data: z.infer<typeof LinkConversationSchema>) {
    const validated = LinkConversationSchema.parse(data)
    return this.service.linkConversation(
      validated.topicId,
      validated.conversationId,
      validated.provider
    )
  }

  async getTopicConversations(topicId: string) {
    return this.service.getTopicConversations(topicId)
  }

  // Note Use Cases
  async addNote(data: z.infer<typeof AddNoteSchema>) {
    const validated = AddNoteSchema.parse(data)
    return this.service.addNote(validated.topicId, validated.note)
  }

  async getTopicNotes(topicId: string) {
    return this.service.getTopicNotes(topicId)
  }

  async updateNote(data: z.infer<typeof UpdateNoteSchema>) {
    const validated = UpdateNoteSchema.parse(data)
    return this.service.updateNote(validated.id, validated.note)
  }

  async deleteNote(id: string) {
    return this.service.deleteNote(id)
  }
}