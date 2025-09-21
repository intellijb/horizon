import type { IntelligenceRepository } from "../domain/ports"
import type {
  IntelligenceTopic,
  IntelligenceTopicSchema,
  IntelligenceTopicInput,
  IntelligenceTopicConversation,
  IntelligenceTopicNote,
  TopicWithRelations,
} from "../domain/entities"
import { IntelligenceErrors, INTELLIGENCE_CONSTANTS } from "../constants"

export class IntelligenceService {
  constructor(private readonly repository: IntelligenceRepository) {}

  // Topic Management
  async createTopic(id: string): Promise<IntelligenceTopic> {
    const existing = await this.repository.getTopic(id)
    if (existing) {
      throw new Error(IntelligenceErrors.TOPIC_ALREADY_EXISTS)
    }
    return this.repository.createTopic(id)
  }

  async getTopic(id: string): Promise<TopicWithRelations> {
    const topic = await this.repository.getTopic(id)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }
    return topic
  }

  async getAllTopics(): Promise<IntelligenceTopic[]> {
    return this.repository.getAllTopics()
  }

  async deleteTopic(id: string): Promise<boolean> {
    const exists = await this.repository.getTopic(id)
    if (!exists) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }
    return this.repository.deleteTopic(id)
  }

  // Schema Management
  async defineSchema(
    topicId: string,
    columnName: string,
    columnType: string,
    columnDescription?: string
  ): Promise<IntelligenceTopicSchema> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }

    return this.repository.createSchema(topicId, {
      columnName,
      columnType,
      columnDescription: columnDescription || null,
    })
  }

  async getTopicSchema(topicId: string): Promise<IntelligenceTopicSchema[]> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }
    return this.repository.getTopicSchema(topicId)
  }

  async updateSchema(
    id: string,
    updates: { columnType?: string; columnDescription?: string }
  ): Promise<IntelligenceTopicSchema> {
    const updated = await this.repository.updateSchema(id, updates)
    if (!updated) {
      throw new Error(IntelligenceErrors.SCHEMA_NOT_FOUND)
    }
    return updated
  }

  // Input Management
  async addInput(
    topicId: string,
    data: Record<string, any>,
    status?: "active" | "archived" | "deleted"
  ): Promise<IntelligenceTopicInput> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }

    // Validate against schema if exists
    const schema = await this.repository.getTopicSchema(topicId)
    if (schema.length > 0) {
      const schemaKeys = schema.map((s) => s.columnName)
      const dataKeys = Object.keys(data)
      const missingKeys = schemaKeys.filter((key) => !dataKeys.includes(key))

      if (missingKeys.length > 0) {
        throw new Error(`${IntelligenceErrors.INPUT_VALIDATION_FAILED}: Missing fields: ${missingKeys.join(", ")}`)
      }
    }

    return this.repository.createInput(
      topicId,
      data,
      status || INTELLIGENCE_CONSTANTS.DEFAULT_STATUS
    )
  }

  async getTopicInputs(
    topicId: string,
    status?: "active" | "archived" | "deleted"
  ): Promise<IntelligenceTopicInput[]> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }
    return this.repository.getTopicInputs(topicId, status)
  }

  async updateInputStatus(
    id: string,
    status: "active" | "archived" | "deleted"
  ): Promise<IntelligenceTopicInput> {
    if (!INTELLIGENCE_CONSTANTS.VALID_STATUSES.includes(status)) {
      throw new Error(IntelligenceErrors.INVALID_STATUS)
    }

    const updated = await this.repository.updateInputStatus(id, status)
    if (!updated) {
      throw new Error(IntelligenceErrors.INPUT_NOT_FOUND)
    }
    return updated
  }

  // Conversation Management
  async linkConversation(
    topicId: string,
    conversationId: string,
    provider: "openai" = INTELLIGENCE_CONSTANTS.DEFAULT_PROVIDER
  ): Promise<IntelligenceTopicConversation> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }

    if (!INTELLIGENCE_CONSTANTS.VALID_PROVIDERS.includes(provider)) {
      throw new Error(IntelligenceErrors.INVALID_PROVIDER)
    }

    return this.repository.createConversation(topicId, conversationId, provider)
  }

  async getTopicConversations(topicId: string): Promise<IntelligenceTopicConversation[]> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }
    return this.repository.getTopicConversations(topicId)
  }

  // Note Management
  async addNote(topicId: string, note: string): Promise<IntelligenceTopicNote> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }
    return this.repository.createNote(topicId, note)
  }

  async getTopicNotes(topicId: string): Promise<IntelligenceTopicNote[]> {
    const topic = await this.repository.getTopic(topicId)
    if (!topic) {
      throw new Error(IntelligenceErrors.TOPIC_NOT_FOUND)
    }
    return this.repository.getTopicNotes(topicId)
  }

  async updateNote(id: string, note: string): Promise<IntelligenceTopicNote> {
    const updated = await this.repository.updateNote(id, note)
    if (!updated) {
      throw new Error(IntelligenceErrors.NOTE_NOT_FOUND)
    }
    return updated
  }

  async deleteNote(id: string): Promise<boolean> {
    const deleted = await this.repository.deleteNote(id)
    if (!deleted) {
      throw new Error(IntelligenceErrors.NOTE_NOT_FOUND)
    }
    return deleted
  }
}